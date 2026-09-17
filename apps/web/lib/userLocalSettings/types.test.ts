import { describe, expect, it } from "vitest";

import { defaultUserLocalSettings, parseUserLocalSettings } from "./types";

describe("parseUserLocalSettings", () => {
  it("defaults sidebarCollapsed to false", () => {
    expect(defaultUserLocalSettings().sidebarCollapsed).toBe(false);
    expect(parseUserLocalSettings("{}")?.sidebarCollapsed).toBe(false);
  });

  it("reads a persisted collapsed sidebar", () => {
    expect(
      parseUserLocalSettings(JSON.stringify({ sidebarCollapsed: true }))
        ?.sidebarCollapsed,
    ).toBe(true);
  });

  it("keeps existing settings when sidebarCollapsed is omitted", () => {
    const parsed = parseUserLocalSettings(
      JSON.stringify({ bookmarkGridLayout: "list", lang: "de" }),
    );
    expect(parsed?.bookmarkGridLayout).toBe("list");
    expect(parsed?.lang).toBe("de");
    expect(parsed?.sidebarCollapsed).toBe(false);
  });
});
