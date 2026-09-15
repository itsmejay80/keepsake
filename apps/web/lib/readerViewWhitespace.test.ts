import { describe, expect, test } from "vitest";

import { getReaderViewWhiteSpace } from "./readerViewWhitespace";

describe("getReaderViewWhiteSpace", () => {
  test.each([
    "https://x.com/user/status/123",
    "https://www.x.com/user/status/123?ref=share",
    "https://twitter.com/user/status/123",
    "https://mobile.twitter.com/user/status/123",
  ])("preserves saved post newlines for %s", (url) => {
    expect(getReaderViewWhiteSpace(url)).toBe("pre-line");
  });

  test.each([
    "https://x.com/user",
    "https://example.com/user/status/123",
    undefined,
  ])("keeps normal HTML whitespace for %s", (url) => {
    expect(getReaderViewWhiteSpace(url)).toBeUndefined();
  });
});
