import { describe, expect, test } from "vitest";

import { getDefaultLinkSection } from "./getDefaultLinkSection";

describe("getDefaultLinkSection", () => {
  test("defaults X bookmarks to reader view", () => {
    expect(
      getDefaultLinkSection({
        availableRenderers: [{ id: "x", preferAsDefault: false }],
        preferredPreview: "reader_view",
      }),
    ).toBe("cached");
  });

  test("defaults X video tweets to the X view", () => {
    expect(
      getDefaultLinkSection({
        availableRenderers: [{ id: "x", preferAsDefault: true }],
        preferredPreview: "reader_view",
      }),
    ).toBe("x");
  });

  test("still defaults YouTube to the custom renderer", () => {
    expect(
      getDefaultLinkSection({
        availableRenderers: [{ id: "youtube" }],
        preferredPreview: "reader_view",
      }),
    ).toBe("youtube");
  });

  test("uses screenshot when that is the preferred preview", () => {
    expect(
      getDefaultLinkSection({
        availableRenderers: [],
        preferredPreview: "screenshot",
      }),
    ).toBe("screenshot");
  });

  test("uses overview when that is the preferred preview", () => {
    expect(
      getDefaultLinkSection({
        availableRenderers: [{ id: "x", preferAsDefault: false }],
        preferredPreview: "overview",
      }),
    ).toBe("overview");
  });
});
