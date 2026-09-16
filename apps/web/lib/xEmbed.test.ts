import { describe, expect, test } from "vitest";

import { getXStatusPermalink, X_WIDGETS_SCRIPT_SRC } from "./xEmbed";

describe("getXStatusPermalink", () => {
  test("builds the status URL X expects in official embeds", () => {
    expect(getXStatusPermalink("2099982397257232840")).toBe(
      "https://x.com/i/status/2099982397257232840",
    );
  });
});

describe("X_WIDGETS_SCRIPT_SRC", () => {
  test("uses the official widgets script", () => {
    expect(X_WIDGETS_SCRIPT_SRC).toBe("https://platform.x.com/widgets.js");
  });
});
