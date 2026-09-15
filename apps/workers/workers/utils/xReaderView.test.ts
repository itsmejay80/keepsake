import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";

import {
  buildXPostReaderDocument,
  selectHarvestedXThread,
} from "./xReaderView";

function tweetArticle({
  statusId,
  handle,
  displayName = handle,
  text,
  datetime = "2026-01-01T00:00:00.000Z",
  images = [],
  quote,
}: {
  statusId: string;
  handle: string;
  displayName?: string;
  text?: string;
  datetime?: string;
  images?: string[];
  quote?: { statusId: string; handle: string; text: string };
}): string {
  const imageHtml = images
    .map(
      (src) =>
        `<div data-testid="tweetPhoto"><img src="${src}" alt="photo"></div>`,
    )
    .join("");
  const quoteHtml = quote
    ? `<article>
         <div data-testid="User-Name"><a href="/${quote.handle}">${quote.handle}</a></div>
         <a href="/${quote.handle}/status/${quote.statusId}"><time datetime="${datetime}">now</time></a>
         <div data-testid="tweetText">${quote.text}</div>
       </article>`
    : "";
  const textHtml = text ? `<div data-testid="tweetText">${text}</div>` : "";

  return `<article>
    <div data-testid="User-Name">
      <a href="/${handle}"><span>${displayName}</span></a>
      <a href="/${handle}"><span>@${handle}</span></a>
    </div>
    <a href="/${handle}/status/${statusId}"><time datetime="${datetime}">Jan 1</time></a>
    ${textHtml}
    ${imageHtml}
    ${quoteHtml}
  </article>`;
}

function renderThread(pageHtml: string, url: string): Document | null {
  const dom = new JSDOM(`<!doctype html><title>Post</title>${pageHtml}`, {
    url,
  });
  return buildXPostReaderDocument(dom.window.document, url);
}

describe("buildXPostReaderDocument", () => {
  test("isolates the saved X post and preserves its formatting", () => {
    const firstParagraph =
      "Wild 24 hours for AI and lots of different proposals have been made.";
    const secondParagraph =
      "TLDR; this paragraph should remain visually separate in Reader View. ";
    const filler = "Additional post content for Readability. ".repeat(12);

    const readerDocument = renderThread(
      `${tweetArticle({
        statusId: "123",
        handle: "user",
        text: `${firstParagraph}\n\n${secondParagraph}<a href="https://example.com/source">source</a> ${filler}`,
      })}${tweetArticle({
        statusId: "456",
        handle: "other",
        text: "This reply must not appear.",
      })}`,
      "https://x.com/user/status/123",
    );

    expect(readerDocument).not.toBeNull();
    const paragraphs = [...(readerDocument?.querySelectorAll("p") ?? [])].map(
      (paragraph) => paragraph.textContent,
    );

    expect(paragraphs.some((text) => text === firstParagraph)).toBe(true);
    expect(
      paragraphs.some((text) => text?.includes(secondParagraph.trim())),
    ).toBe(true);
    expect(
      readerDocument?.querySelector('a[href="https://example.com/source"]'),
    ).not.toBeNull();
    expect(readerDocument?.body.textContent).not.toContain(
      "This reply must not appear.",
    );
  });

  test("saves the author's full thread in order and formats each post", () => {
    const readerDocument = renderThread(
      `${tweetArticle({
        statusId: "100",
        handle: "alice",
        displayName: "Alice",
        text: "Thread start",
      })}${tweetArticle({
        statusId: "101",
        handle: "alice",
        displayName: "Alice",
        text: "Second post with an image",
        images: ["https://pbs.twimg.com/media/abc.jpg?format=jpg&name=small"],
      })}${tweetArticle({
        statusId: "102",
        handle: "alice",
        displayName: "Alice",
        text: "Closing thought",
      })}${tweetArticle({
        statusId: "200",
        handle: "bob",
        text: "Nice thread!",
      })}`,
      "https://x.com/alice/status/100",
    );

    expect(readerDocument).not.toBeNull();
    const posts = [
      ...(readerDocument?.querySelectorAll("[data-x-status-id]") ?? []),
    ];
    expect(posts.map((post) => post.getAttribute("data-x-status-id"))).toEqual([
      "100",
      "101",
      "102",
    ]);
    expect(readerDocument?.body.textContent).toContain("Thread start");
    expect(readerDocument?.body.textContent).toContain(
      "Second post with an image",
    );
    expect(readerDocument?.body.textContent).toContain("Closing thought");
    expect(readerDocument?.body.textContent).toContain("Alice");
    expect(readerDocument?.body.textContent).toContain("@alice");
    expect(readerDocument?.body.textContent).not.toContain("Nice thread!");

    const image = readerDocument?.querySelector("img");
    expect(image?.getAttribute("src")).toContain("name=large");
    expect(
      readerDocument?.querySelector(
        '[data-x-status-id="101"] a[href*="/status/101"]',
      ),
    ).not.toBeNull();
  });

  test("includes earlier thread posts when a later status is saved", () => {
    const readerDocument = renderThread(
      `${tweetArticle({
        statusId: "10",
        handle: "alice",
        text: "First",
      })}${tweetArticle({
        statusId: "11",
        handle: "alice",
        text: "Second",
      })}${tweetArticle({
        statusId: "12",
        handle: "alice",
        text: "Third",
      })}`,
      "https://x.com/alice/status/11",
    );

    const posts = [
      ...(readerDocument?.querySelectorAll("[data-x-status-id]") ?? []),
    ];
    expect(posts.map((post) => post.getAttribute("data-x-status-id"))).toEqual([
      "10",
      "11",
      "12",
    ]);
  });

  test("keeps a quoted post nested instead of treating it as a reply", () => {
    const readerDocument = renderThread(
      tweetArticle({
        statusId: "300",
        handle: "alice",
        text: "Look at this",
        quote: {
          statusId: "299",
          handle: "bob",
          text: "Quoted insight",
        },
      }),
      "https://x.com/alice/status/300",
    );

    const posts = [
      ...(readerDocument?.querySelectorAll("[data-x-status-id]") ?? []),
    ];
    expect(posts.map((post) => post.getAttribute("data-x-status-id"))).toEqual([
      "300",
    ]);
    const quote = readerDocument?.querySelector("blockquote");
    expect(quote?.textContent).toContain("Quoted insight");
    expect(quote?.textContent).toContain("@bob");
  });

  test("includes image-only thread posts", () => {
    const readerDocument = renderThread(
      `${tweetArticle({
        statusId: "400",
        handle: "alice",
        text: "Chart below",
      })}${tweetArticle({
        statusId: "401",
        handle: "alice",
        images: ["https://pbs.twimg.com/media/chart.png?name=small"],
      })}`,
      "https://x.com/alice/status/400",
    );

    expect(
      readerDocument?.querySelector('[data-x-status-id="401"] img'),
    ).not.toBeNull();
  });

  test("rebuilds a harvested thread even when posts were collected out of order", () => {
    const harvested = `<div data-karakeep-x-thread="true">
      ${tweetArticle({
        statusId: "12",
        handle: "alice",
        text: "Third",
      })}
      ${tweetArticle({
        statusId: "10",
        handle: "alice",
        text: "First",
      })}
      ${tweetArticle({
        statusId: "11",
        handle: "alice",
        text: "Second",
      })}
    </div>`;

    const readerDocument = renderThread(
      harvested,
      "https://twitter.com/alice/status/10",
    );
    const posts = [
      ...(readerDocument?.querySelectorAll("[data-x-status-id]") ?? []),
    ];
    expect(posts.map((post) => post.getAttribute("data-x-status-id"))).toEqual([
      "10",
      "11",
      "12",
    ]);
  });

  test("does not modify non-X pages", () => {
    const dom = new JSDOM(
      '<article><div data-testid="tweetText">First\n\nSecond</div></article>',
      { url: "https://example.com/article" },
    );

    expect(
      buildXPostReaderDocument(
        dom.window.document,
        "https://example.com/article",
      ),
    ).toBeNull();
  });
});

describe("selectHarvestedXThread", () => {
  test("keeps same-author posts and sorts them chronologically", () => {
    expect(
      selectHarvestedXThread(
        [
          { statusId: "30", handle: "alice" },
          { statusId: "10", handle: "alice" },
          { statusId: "99", handle: "bob" },
          { statusId: "20", handle: "Alice" },
        ],
        "20",
      ).map((post) => post.statusId),
    ).toEqual(["10", "20", "30"]);
  });
});
