import type { CheerioAPI } from "cheerio";
import type { Rules, RulesOptions } from "metascraper";

/**
 * This is a metascraper plugin to fix bookmarking of LinkedIn posts
 * (www.linkedin.com/posts/...).
 *
 * Problem: When a LinkedIn post is saved, the browser-rendered page is the
 * logged-out "guest" view of the feed. On that page:
 *
 *  - `og:title` and `og:description` are empty, so metascraper falls back to
 *    the `<title>` tag, which contains the whole post text (huge title).
 *  - `og:image` points at a generic LinkedIn brand placeholder image hosted
 *    on static.licdn.com/aero-v1/... rather than the post's actual image.
 *  - Readability returns null (the page is a control-heavy feed shell, not an
 *    article), so the bookmark ends up with no readable content at all.
 *
 * However, the guest page embeds a `application/ld+json` block of type
 * `SocialMediaPosting` that contains the full post text (`articleBody`), the
 * author name, and the publish date. This plugin uses that structured data to
 * provide:
 *
 *  - `readableContentHtml`: a small reader-view HTML document built from the
 *    post text (author, date, body paragraphs).
 *  - `description`: the post text itself (instead of empty).
 *  - `image`: the og:image only when it is a real media image; otherwise the
 *    author's avatar from the JSON-LD (better than the generic brand image
 *    metascraper-image would otherwise pick).
 *
 * When the JSON-LD block is missing (e.g. a different LinkedIn page type), the
 * rules return undefined and the default metascraper behaviour applies.
 **/

interface LinkedInAuthor {
  name?: string;
  image?: { url?: string };
}

interface LinkedInPosting {
  "@type"?: string | string[];
  headline?: string;
  articleBody?: string;
  datePublished?: string;
  author?: LinkedInAuthor;
}

const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * LinkedIn serves this generic brand placeholder as og:image on guest-rendered
 * pages when the post has no image (or when the real image is only exposed to
 * the unauthenticated prefetcher). It's the LinkedIn logo — not useful as a
 * bookmark thumbnail.
 */
const isGenericLinkedInImage = (url: string): boolean =>
  url.startsWith("https://static.licdn.com/aero-v1/");

/**
 * LinkedIn appends platform attribution to a post's og:title, e.g.
 * "VCs panic as AI-first companies scale on less funding | NYELF posted on the
 * topic | LinkedIn". Those trailing segments are navigation chrome rather than
 * part of the title, so they're stripped before the title is stored.
 */
const LINKEDIN_TITLE_ATTRIBUTION_PATTERN =
  /\s*\|\s*(?:[^|]{1,120}?\s+posted on the topic\s*)?\|\s*LinkedIn\s*$/i;

const stripLinkedInTitleAttribution = (title: string): string =>
  title.replace(LINKEDIN_TITLE_ATTRIBUTION_PATTERN, "").trim();

const parseJsonLdPostings = (htmlDom: CheerioAPI): LinkedInPosting[] => {
  const postings: LinkedInPosting[] = [];
  htmlDom('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse(htmlDom(el).text());
      const candidates = Array.isArray(data) ? data : [data];
      for (const candidate of candidates) {
        const types = Array.isArray(candidate?.["@type"])
          ? candidate["@type"]
          : [candidate?.["@type"]];
        if (types.includes("SocialMediaPosting") || candidate?.articleBody) {
          postings.push(candidate as LinkedInPosting);
        }
      }
    } catch {
      // Malformed JSON-LD — skip this block.
    }
  });
  return postings;
};

/**
 * Builds a minimal reader-view document out of post text. Empty newlines
 * separate paragraphs; single newlines become <br> (LinkedIn posts rely on
 * line breaks heavily).
 */
const buildPostHtml = ({
  author,
  datePublished,
  headline,
  body,
}: {
  author?: string;
  datePublished?: string;
  headline?: string;
  body?: string;
}): string | null => {
  const text = body?.trim() || headline?.trim();
  if (!text) {
    return null;
  }
  const parts: string[] = [];
  if (author) {
    const dateStr = datePublished
      ? new Date(datePublished).toISOString().slice(0, 10)
      : null;
    parts.push(
      `<p><strong>${escapeHtml(author)}</strong>${
        dateStr ? ` · ${escapeHtml(dateStr)}` : ""
      }</p>`,
    );
  }
  for (const paragraph of text.split(/\n{2,}/)) {
    const escaped = escapeHtml(paragraph.trim()).replace(/\n/g, "<br>");
    if (escaped) {
      parts.push(`<p>${escaped}</p>`);
    }
  }
  return parts.join("\n");
};

const isLinkedInUrl = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "linkedin.com" || host.endsWith(".linkedin.com");
  } catch {
    return false;
  }
};

const metascraperLinkedin = () => {
  const rules: Rules = {
    pkgName: "metascraper-linkedin",
    test,
    readableContentHtml: (async ({
      htmlDom,
    }: {
      url: string;
      htmlDom: CheerioAPI;
    }) => {
      const posting = parseJsonLdPostings(htmlDom).find((p) => p.articleBody);
      if (posting) {
        return buildPostHtml({
          author: posting.author?.name,
          datePublished: posting.datePublished,
          headline: posting.headline,
          body: posting.articleBody,
        });
      }

      // No JSON-LD (different page type or LinkedIn changed their markup):
      // fall back to the first post commentary node in the rendered DOM.
      const commentary = htmlDom(
        '[data-test-id$="__commentary"], [data-test-id$="__commentary-text"]',
      ).first();
      const text = commentary.text().trim();
      if (text) {
        return buildPostHtml({ body: text });
      }

      return undefined;
    }) as unknown as RulesOptions,
    description: (async ({ htmlDom }: { url: string; htmlDom: CheerioAPI }) => {
      // The guest-rendered page has an empty og:description; the post text is
      // the only meaningful description available.
      const posting = parseJsonLdPostings(htmlDom).find((p) => p.articleBody);
      if (posting?.articleBody) {
        return posting.articleBody.trim();
      }
      return undefined;
    }) as unknown as RulesOptions,
    title: (async ({ htmlDom }: { url: string; htmlDom: CheerioAPI }) => {
      // On the guest-rendered page og:title (and twitter:title) contains the
      // entire post text plus a " | Pooya Saeedi" suffix — a multi-line dump
      // that is useless as a title. Treat a long or multi-line og:title as
      // the dump and build a compact "Author on LinkedIn: <first line>" title
      // instead; only defer to the default rules for a genuine short title.
      const ogTitle = htmlDom('meta[property="og:title"]').attr("content");
      const ogTitleLooksLikeDump =
        !!ogTitle && (ogTitle.includes("\n") || ogTitle.trim().length > 120);
      if (ogTitle && !ogTitleLooksLikeDump) {
        // A real, compact og:title is present. LinkedIn usually decorates it
        // with its own attribution ("... | <name> posted on the topic |
        // LinkedIn"); strip that and use the result when something is left.
        // Otherwise defer to the default title rules.
        const cleaned = stripLinkedInTitleAttribution(ogTitle);
        return cleaned && cleaned !== ogTitle.trim() ? cleaned : undefined;
      }
      const posting = parseJsonLdPostings(htmlDom).find((p) => p.articleBody);
      if (!posting) {
        return undefined;
      }
      const firstLine = (posting.articleBody ?? posting.headline ?? "")
        .split("\n")
        .map((line) => line.trim())
        .find(Boolean);
      if (!firstLine) {
        return undefined;
      }
      const clipped =
        firstLine.length > 80
          ? `${firstLine.slice(0, 77).trimEnd()}…`
          : firstLine;
      return posting.author?.name
        ? `${posting.author.name} on LinkedIn: ${clipped}`
        : clipped;
    }) as unknown as RulesOptions,
    image: (async ({ htmlDom }: { url: string; htmlDom: CheerioAPI }) => {
      const ogImage = htmlDom('meta[property="og:image"]').attr("content");
      if (ogImage && !isGenericLinkedInImage(ogImage)) {
        return ogImage;
      }
      // The render only exposes the generic LinkedIn brand image; the author
      // avatar is more meaningful as a bookmark thumbnail.
      const posting = parseJsonLdPostings(htmlDom).find((p) => p.author?.name);
      const avatar = posting?.author?.image?.url;
      if (avatar) {
        return avatar;
      }
      return undefined;
    }) as unknown as RulesOptions,
  };

  return rules;
};

export default metascraperLinkedin;

const test = ({ url }: { url: string }) => isLinkedInUrl(url);
