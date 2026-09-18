import type { CheerioAPI } from "cheerio";
import type { Rules, RulesOptions } from "metascraper";
import { decode as decodeHtmlEntities } from "html-entities";
import { fetchWithProxy } from "network";
import { z } from "zod";

import logger from "@karakeep/shared/logger";

/**
 * This is a metascraper plugin to select a better
 * 'image' attribute for Reddit links, specifically
 * those sharing images. It will also extract the
 * Post Title for a Reddit post instead of use the
 * default.
 *
 * As of writing this, Reddit posts do not define
 * an open-graph image (og:image) attribute, so
 * metascraper resorts to looking for images in
 * the HTML DOM, and selects the first one.
 *
 * In Reddit posts, the first image is typically
 * the profile picture of the OP, which Karakeep
 * is using for the thumbnail.
 *
 * This metascraper plugin instead looks for images
 * with the domain i.redd.it, on which Reddit hosts
 * their preview images for posts. If this plugin
 * finds an i.redd.it image, it provides that for
 * the image metadata.
 *
 * If there is not a matching image, this plugin
 * will return 'undefined' and the next plugin
 * should continue to attempt to extract images.
 *
 * We also attempt to fetch the Reddit JSON response
 * (by appending '.json' to the URL) to grab the
 * title and preview images directly from the API.
 **/

const redditPreviewImageSchema = z.object({
  source: z.object({ url: z.string().optional() }).optional(),
  resolutions: z.array(z.object({ url: z.string().optional() })).optional(),
});

const redditMediaMetadataItemSchema = z.object({
  s: z.object({ u: z.string().optional() }).optional(),
  p: z.array(z.object({ u: z.string().optional() })).optional(),
});

const redditPostSchema = z.object({
  title: z.string().optional(),
  preview: z
    .object({ images: z.array(redditPreviewImageSchema).optional() })
    .optional(),
  url_overridden_by_dest: z.string().optional(),
  url: z.string().optional(),
  thumbnail: z.string().optional(),
  media_metadata: z
    .record(z.string(), redditMediaMetadataItemSchema)
    .optional(),
  author: z.string().optional(),
  created_utc: z.number().optional(),
  selftext: z.string().nullish(),
  selftext_html: z.string().nullish(),
  subreddit_name_prefixed: z.string().optional(),
});

type RedditPostData = z.infer<typeof redditPostSchema>;

const redditResponseSchema = z.array(
  z.object({
    data: z.object({
      children: z.array(z.object({ data: redditPostSchema })).optional(),
    }),
  }),
);

interface RedditFetchResult {
  fetched: boolean;
  post?: RedditPostData;
}

const REDDIT_CACHE_TTL_MS = 60 * 1000; // 1 minute TTL to avoid stale data

interface RedditCacheEntry {
  expiresAt: number;
  promise: Promise<RedditFetchResult>;
}

const redditJsonCache = new Map<string, RedditCacheEntry>();

const purgeExpiredCacheEntries = (now: number) => {
  for (const [key, entry] of redditJsonCache.entries()) {
    if (entry.expiresAt <= now) {
      redditJsonCache.delete(key);
    }
  }
};

const decodeRedditUrl = (url?: string): string | undefined => {
  if (!url) {
    return undefined;
  }
  const decoded = decodeHtmlEntities(url);
  return decoded || undefined;
};

const buildJsonUrl = (url: string): string => {
  const urlObj = new URL(url);

  if (!urlObj.pathname.endsWith(".json")) {
    urlObj.pathname = urlObj.pathname.replace(/\/?$/, ".json");
  }

  return urlObj.toString();
};

/**
 * Matches Reddit "share" links of the form /r/{subreddit}/s/{shareId}.
 * These are short links that redirect to the canonical post URL.
 */
const redditSharePathPattern = /^\/r\/[^/]+\/s\/[^/]+$/;

const isRedditShareUrl = (url: string): boolean => {
  try {
    return redditSharePathPattern.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

/**
 * Reddit's `.json` endpoints do NOT work on share links: requesting
 * `https://www.reddit.com/r/foo/s/abc.json` redirects to the subreddit's
 * HTML feed instead of the post's JSON. So before building the JSON URL we
 * must resolve the share link to the canonical post URL.
 */
const resolveRedditShareUrl = async (url: string): Promise<string> => {
  const urlObj = new URL(url);

  if (isRedditShareUrl(url)) {
    let response;
    try {
      // fetchWithProxy follows redirects and node-fetch exposes the final
      // URL on the response, so a single request resolves the share link
      // to the canonical post URL.
      response = await fetchWithProxy(url, {
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      logger.warn(
        `[MetascraperReddit] Failed to resolve Reddit share link ${url}`,
        error,
      );
      return url;
    }

    const finalUrl = response.url;
    if (finalUrl && !isRedditShareUrl(finalUrl)) {
      try {
        const resolved = new URL(finalUrl);
        // Strip share/tracking parameters so we get a clean canonical URL
        // (this also keeps the cache from blowing up on new share ids).
        resolved.search = "";
        resolved.hash = "";
        return resolved.toString();
      } catch (error) {
        logger.warn(
          `[MetascraperReddit] Invalid resolved URL for Reddit share link ${url}: ${finalUrl}`,
          error,
        );
        return url;
      }
    }

    logger.warn(
      `[MetascraperReddit] Could not resolve Reddit share link ${url} (final URL: ${finalUrl ?? "none"}); using it as-is.`,
    );
    return url;
  }

  // For regular post URLs, strip share/tracking parameters too.
  urlObj.search = "";
  urlObj.hash = "";
  return urlObj.toString();
};

const extractImageFromMediaMetadata = (
  media_metadata?: RedditPostData["media_metadata"],
): string | undefined => {
  if (!media_metadata) {
    return undefined;
  }
  const firstItem = Object.values(media_metadata)[0];
  if (!firstItem) {
    return undefined;
  }

  return (
    decodeRedditUrl(firstItem.s?.u) ??
    decodeRedditUrl(firstItem.p?.[0]?.u) ??
    undefined
  );
};

const isRedditImageHost = (urlCandidate: string): boolean => {
  try {
    const hostname = new URL(urlCandidate).hostname;
    return hostname.includes("redd.it");
  } catch {
    return false;
  }
};

const extractImageFromPost = (post: RedditPostData): string | undefined => {
  const previewImage = post.preview?.images?.[0];
  const previewUrl =
    decodeRedditUrl(previewImage?.source?.url) ??
    decodeRedditUrl(previewImage?.resolutions?.[0]?.url);
  if (previewUrl) {
    return previewUrl;
  }

  const mediaUrl = extractImageFromMediaMetadata(post.media_metadata);
  if (mediaUrl) {
    return mediaUrl;
  }

  const directUrl =
    decodeRedditUrl(post.url_overridden_by_dest) ??
    decodeRedditUrl(post.url) ??
    decodeRedditUrl(post.thumbnail);

  if (directUrl && isRedditImageHost(directUrl)) {
    return directUrl;
  }

  return undefined;
};

const extractTitleFromPost = (post: RedditPostData): string | undefined =>
  post.title?.trim() || undefined;

const extractAuthorFromPost = (post: RedditPostData): string | undefined =>
  post.author?.trim() || undefined;

const extractDateFromPost = (post: RedditPostData): string | undefined => {
  if (!post.created_utc) {
    return undefined;
  }
  const date = new Date(post.created_utc * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const extractPublisherFromPost = (post: RedditPostData): string | undefined =>
  post.subreddit_name_prefixed?.trim() || "Reddit";

const REDDIT_LOGO_URL =
  "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png";

const fallbackDomImage = ({ htmlDom }: { htmlDom: CheerioAPI }) => {
  // 'preview' subdomain images are more likely to be what we're after
  // but it could be in the 'i' subdomain.
  // returns undefined if neither exists
  const previewImages = htmlDom('img[src*="preview.redd.it"]')
    .map((_, el) => htmlDom(el).attr("src"))
    .get();
  const iImages = htmlDom('img[src*="i.redd.it"]')
    .map((_, el) => htmlDom(el).attr("src"))
    .get();
  return previewImages[0] || iImages[0];
};

const fallbackDomTitle = ({ htmlDom }: { htmlDom: CheerioAPI }) => {
  const title: string | undefined = htmlDom("shreddit-title[title]")
    .first()
    .attr("title");
  const postTitle: string | undefined =
    title ?? htmlDom("shreddit-post[post-title]").first().attr("post-title");
  return postTitle ? postTitle.trim() : undefined;
};

/**
 * Fallback readable content extracted from the rendered page DOM (used when
 * the Reddit JSON API is unavailable/blocked, e.g. rate-limited or 403).
 * Shreddit renders the post selftext inside a `.md` div within the
 * `shreddit-post` element (under the `text-body` slot).
 */
const fallbackDomReadableContent = ({ htmlDom }: { htmlDom: CheerioAPI }) => {
  const selfText =
    htmlDom('shreddit-post [slot="text-body"] .md').first().html() ??
    htmlDom("shreddit-post .md").first().html();
  if (selfText?.trim()) {
    return selfText;
  }

  // Link posts have no selftext; the title is the most useful content.
  const postTitle = fallbackDomTitle({ htmlDom });
  return postTitle || undefined;
};

const fetchRedditPostData = async (url: string): Promise<RedditFetchResult> => {
  const cached = redditJsonCache.get(url);
  const now = Date.now();

  purgeExpiredCacheEntries(now);

  if (cached && cached.expiresAt > now) {
    return cached.promise;
  }

  const promise = (async () => {
    let jsonUrl: string;
    try {
      // Resolve /r/foo/s/abc share links first: their `.json` endpoints
      // redirect to the subreddit HTML feed, not the post JSON.
      const canonicalUrl = await resolveRedditShareUrl(url);
      jsonUrl = buildJsonUrl(canonicalUrl);
    } catch (error) {
      logger.warn(
        "[MetascraperReddit] Failed to construct Reddit JSON URL",
        error,
      );
      return { fetched: false };
    }

    let response;
    try {
      response = await fetchWithProxy(jsonUrl, {
        headers: { accept: "application/json" },
      });
    } catch (error) {
      logger.warn(
        `[MetascraperReddit] Failed to fetch Reddit JSON for ${jsonUrl}`,
        error,
      );
      return { fetched: false };
    }

    if (response.status === 403) {
      // API forbidden; fall back to DOM scraping.
      return { fetched: false };
    }

    if (!response.ok) {
      logger.warn(
        `[MetascraperReddit] Reddit JSON request failed for ${jsonUrl} with status ${response.status}`,
      );
      return { fetched: false };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      logger.warn(
        `[MetascraperReddit] Failed to parse Reddit JSON for ${jsonUrl}`,
        error,
      );
      return { fetched: false };
    }

    const parsed = redditResponseSchema.safeParse(payload);
    if (!parsed.success) {
      logger.warn(
        "[MetascraperReddit] Reddit JSON schema validation failed",
        parsed.error,
      );
      return { fetched: false };
    }

    const firstListingWithChildren = parsed.data.find(
      (listing) => (listing.data.children?.length ?? 0) > 0,
    );

    return {
      fetched: true,
      post: firstListingWithChildren?.data.children?.[0]?.data,
    };
  })();

  redditJsonCache.set(url, {
    promise,
    expiresAt: now + REDDIT_CACHE_TTL_MS,
  });

  return promise;
};

const domainFromUrl = (url: string): string => {
  /**
   * First-party metascraper plugins import metascraper-helpers,
   * which exposes a parseUrl function from the tldtr package.
   * This function does similar to the 'domainWithoutSuffix'
   * field from the tldtr package, without requiring any
   * additional packages.
   **/
  try {
    // Create a URL instance to parse the hostname
    const hostname = new URL(url).hostname;
    const parts = hostname.split(".");
    // Return the part before the TLD (assuming at least two segments)
    // For example, "www.example.com" -> ["www", "example", "com"]
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return hostname;
  } catch (error) {
    logger.error(
      "[MetascraperReddit] Test>domainFromUrl received an invalid URL:",
      error,
    );
    return "";
  }
};

const test = ({ url }: { url: string }): boolean =>
  domainFromUrl(url).toLowerCase() === "reddit";

const metascraperReddit = () => {
  const rules: Rules = {
    pkgName: "metascraper-reddit",
    test,
    image: (async ({ url, htmlDom }: { url: string; htmlDom: CheerioAPI }) => {
      const result = await fetchRedditPostData(url);
      if (result.post) {
        const redditImage = extractImageFromPost(result.post);
        if (redditImage) {
          return redditImage;
        }
      }

      // If we successfully fetched JSON but found no Reddit image,
      // avoid falling back to random DOM images.
      if (result.fetched) {
        return undefined;
      }

      return fallbackDomImage({ htmlDom });
    }) as unknown as RulesOptions,
    title: (async ({ url, htmlDom }: { url: string; htmlDom: CheerioAPI }) => {
      const result = await fetchRedditPostData(url);
      if (result.post) {
        const redditTitle = extractTitleFromPost(result.post);
        if (redditTitle) {
          return redditTitle;
        }
      }

      return fallbackDomTitle({ htmlDom });
    }) as unknown as RulesOptions,
    author: (async ({ url, htmlDom }: { url: string; htmlDom: CheerioAPI }) => {
      const result = await fetchRedditPostData(url);
      if (result.post) {
        const redditAuthor = extractAuthorFromPost(result.post);
        if (redditAuthor) {
          return redditAuthor;
        }
      }

      // Fallback to the rendered DOM when the JSON API is unavailable.
      return (
        htmlDom("shreddit-post[author-name]").first().attr("author-name") ??
        undefined
      );
    }) as unknown as RulesOptions,
    datePublished: (async ({ url }: { url: string }) => {
      const result = await fetchRedditPostData(url);
      if (result.post) {
        return extractDateFromPost(result.post);
      }
      return undefined;
    }) as unknown as RulesOptions,
    publisher: (async ({
      url,
      htmlDom,
    }: {
      url: string;
      htmlDom: CheerioAPI;
    }) => {
      const result = await fetchRedditPostData(url);
      if (result.post) {
        return extractPublisherFromPost(result.post);
      }

      // Fallback to the rendered DOM when the JSON API is unavailable.
      const subreddit =
        htmlDom("shreddit-post[subreddit-name]")
          .first()
          .attr("subreddit-name") ?? undefined;
      return subreddit ? `r/${subreddit}` : "Reddit";
    }) as unknown as RulesOptions,
    logo: (async ({ url }: { url: string }) => {
      const result = await fetchRedditPostData(url);
      if (result.post) {
        return REDDIT_LOGO_URL;
      }
      return undefined;
    }) as unknown as RulesOptions,
    readableContentHtml: (async ({
      url,
      htmlDom,
    }: {
      url: string;
      htmlDom: CheerioAPI;
    }) => {
      const result = await fetchRedditPostData(url);
      if (result.post) {
        const decoded = decodeHtmlEntities(result.post.selftext_html ?? "");
        // The post has no content, return the title
        return (decoded || result.post.title) ?? null;
      }

      // JSON API unavailable (blocked/403/rate-limited) — fall back to the
      // browser-rendered DOM so the saved post still has its text.
      return fallbackDomReadableContent({ htmlDom });
    }) as unknown as RulesOptions,
  };

  return rules;
};

export default metascraperReddit;
