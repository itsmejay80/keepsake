import { describe, expect, test } from "vitest";

import {
  getXEmbedWidth,
  getXStatusPermalink,
  X_WIDGETS_SCRIPT_SRC,
} from "./xEmbed";

describe("getXEmbedWidth", () => {
  test("clamps to X widget limits and follows the container", () => {
    expect(getXEmbedWidth(180)).toBe(220);
    expect(getXEmbedWidth(360)).toBe(360);
    expect(getXEmbedWidth(900)).toBe(550);
    expect(getXEmbedWidth(0)).toBe(220);
  });
});

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
