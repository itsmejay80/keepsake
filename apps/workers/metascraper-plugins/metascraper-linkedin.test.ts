import { load as cheerioLoad } from "cheerio";
import { describe, expect, test } from "vitest";

import metascraperLinkedin from "./metascraper-linkedin";

const POST_URL =
  "https://www.linkedin.com/posts/pooya-saeedi_im-hiring-activity-7507560825574825985-VVxQ";

interface RuleArgs {
  url: string;
  htmlDom: ReturnType<typeof cheerioLoad>;
}
type Rule = (args: RuleArgs) => Promise<string | undefined>;

const rules = metascraperLinkedin() as unknown as {
  test: (args: { url: string }) => boolean;
  readableContentHtml: Rule;
  description: Rule;
  title: Rule;
  image: Rule;
};

const GENERIC_IMAGE =
  "https://static.licdn.com/aero-v1/sc/h/c45fy346jw096z9pbphyyhdz7";
const POST_IMAGE =
  "https://media.licdn.com/dms/image/sync/v2/articleshare-shrink_1280_800/hero.jpg";
const AVATAR = "https://media.licdn.com/dms/image/v2/avatar.jpg";

const jsonLdPosting = ({
  articleBody,
  author = "Pooya Saeedi",
}: {
  articleBody: string;
  author?: string;
}) =>
  JSON.stringify({
    "@context": "http://schema.org",
    "@type": "SocialMediaPosting",
    headline: "I'm hiring!",
    datePublished: "2026-09-20T22:06:24.551Z",
    articleBody,
    author: { name: author, image: { url: AVATAR } },
  });

const page = (head: string, body = "") =>
  `<html><head>${head}</head><body>${body}</body></html>`;

const argsFor = (html: string): RuleArgs => {
  const htmlDom = cheerioLoad(html, { baseURI: POST_URL });
  return { url: POST_URL, htmlDom };
};

describe("metascraper-linkedin", () => {
  describe("test", () => {
    test("applies to linkedin.com urls only", () => {
      expect(rules.test({ url: POST_URL })).toBe(true);
      expect(rules.test({ url: "https://linkedin.com/feed/" })).toBe(true);
      expect(rules.test({ url: "https://evil-linkedin.com/posts/x" })).toBe(
        false,
      );
      expect(rules.test({ url: "https://notlinkedin.com/posts/x" })).toBe(
        false,
      );
      expect(rules.test({ url: "not a url" })).toBe(false);
    });
  });

  describe("title", () => {
    // The rendered page's og:title is the entire post text plus a trailing
    // author attribution, which is useless as a title.
    test("builds a compact title from the JSON-LD post text", async () => {
      const args = argsFor(
        page(`<meta property="og:title" content="I&#39;m hiring! 🚀

We're building the developer platform. | Pooya Saeedi">
<script type="application/ld+json">${jsonLdPosting({
          articleBody:
            "I'm hiring! 🚀\n\nWe're building the developer platform.",
        })}</script>`),
      );
      await expect(rules.title(args)).resolves.toBe(
        "Pooya Saeedi on LinkedIn: I'm hiring! 🚀",
      );
    });

    // A compact og:title is LinkedIn's own title for the post; it only needs
    // its platform attribution removed.
    test("strips the LinkedIn attribution from a compact og:title", async () => {
      const args = argsFor(
        page(
          `<meta property="og:title" content="VCs panic as AI companies scale on less funding | NYELF posted on the topic | LinkedIn">`,
        ),
      );
      await expect(rules.title(args)).resolves.toBe(
        "VCs panic as AI companies scale on less funding",
      );
    });

    test("defers to the default rules when nothing can be derived", async () => {
      const args = argsFor(page("<title>Sign in | LinkedIn</title>"));
      await expect(rules.title(args)).resolves.toBeUndefined();
    });
  });

  describe("description", () => {
    test("uses the post text from the JSON-LD block", async () => {
      const body = "I'm hiring!\n\nWe're building the developer platform.";
      const args = argsFor(
        page(
          `<script type="application/ld+json">${jsonLdPosting({ articleBody: body })}</script>`,
        ),
      );
      await expect(rules.description(args)).resolves.toBe(body);
    });

    test("returns undefined without a JSON-LD block", async () => {
      const args = argsFor(page('<meta property="og:description" content="">'));
      await expect(rules.description(args)).resolves.toBeUndefined();
    });
  });

  describe("image", () => {
    // The guest-rendered page points og:image at LinkedIn's brand placeholder
    // when the post itself has no image; the author avatar is a far better
    // bookmark thumbnail than the logo.
    test("falls back to the author avatar for a generic og:image", async () => {
      const args = argsFor(
        page(
          `<meta property="og:image" content="${GENERIC_IMAGE}">
<script type="application/ld+json">${jsonLdPosting({ articleBody: "text" })}</script>`,
        ),
      );
      await expect(rules.image(args)).resolves.toBe(AVATAR);
    });

    test("keeps the post's own og:image", async () => {
      const args = argsFor(
        page(`<meta property="og:image" content="${POST_IMAGE}">`),
      );
      await expect(rules.image(args)).resolves.toBe(POST_IMAGE);
    });

    test("returns undefined when only a generic image is available", async () => {
      const args = argsFor(
        page(`<meta property="og:image" content="${GENERIC_IMAGE}">`),
      );
      await expect(rules.image(args)).resolves.toBeUndefined();
    });
  });

  describe("readableContentHtml", () => {
    // Readability returns null on the LinkedIn post page (it's a control-heavy
    // feed shell), so reader content has to be built from the post text.
    test("builds reader content from the JSON-LD post text", async () => {
      const args = argsFor(
        page(
          `<script type="application/ld+json">${jsonLdPosting({
            articleBody: "I'm hiring!\n\nLine one\nLine two",
          })}</script>`,
        ),
      );
      await expect(rules.readableContentHtml(args)).resolves.toBe(
        "<p><strong>Pooya Saeedi</strong> · 2026-09-20</p>\n" +
          "<p>I'm hiring!</p>\n" +
          "<p>Line one<br>Line two</p>",
      );
    });

    test("falls back to the rendered post commentary", async () => {
      const args = argsFor(
        page(
          "",
          `<p data-test-id="main-feed-activity-card__commentary">First line

Second line</p>`,
        ),
      );
      await expect(rules.readableContentHtml(args)).resolves.toBe(
        "<p>First line</p>\n<p>Second line</p>",
      );
    });

    test("returns undefined without any post text", async () => {
      const args = argsFor(page("<title>LinkedIn</title>"));
      await expect(rules.readableContentHtml(args)).resolves.toBeUndefined();
    });
  });
});
