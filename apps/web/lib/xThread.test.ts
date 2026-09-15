import { describe, expect, test } from "vitest";

import { extractTweetId, extractXThreadStatusIds } from "./xThread";

describe("extractTweetId", () => {
  test("reads status ids from x and twitter URLs", () => {
    expect(extractTweetId("https://x.com/user/status/123")).toBe("123");
    expect(extractTweetId("https://twitter.com/i/web/status/456")).toBe("456");
    expect(extractTweetId("https://example.com/status/123")).toBeNull();
  });
});

describe("extractXThreadStatusIds", () => {
  test("returns saved thread ids in document order", () => {
    expect(
      extractXThreadStatusIds(
        `<section data-x-status-id="10"></section><section data-x-status-id="11"></section>`,
        "10",
      ),
    ).toEqual(["10", "11"]);
  });

  test("falls back to the bookmarked status when content has no thread markup", () => {
    expect(extractXThreadStatusIds("<p>hello</p>", "99")).toEqual(["99"]);
  });
});
