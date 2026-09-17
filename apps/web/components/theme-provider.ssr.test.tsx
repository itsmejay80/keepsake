import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "./theme-provider";

describe("ThemeProvider SSR", () => {
  it("keeps the bootstrap script in server-rendered HTML", () => {
    const html = renderToStaticMarkup(
      <ThemeProvider>
        <div>Content</div>
      </ThemeProvider>,
    );

    expect(html).toContain("<script");
    expect(html).toContain('data-cfasync="false"');
  });
});
