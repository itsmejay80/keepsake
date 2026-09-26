// @vitest-environment jsdom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { updateSidebarCollapsed } from "@/lib/userLocalSettings/userLocalSettings";

import { SidebarCollapseProvider, useSidebarCollapse } from "./SidebarCollapse";

vi.mock("@/lib/userLocalSettings/userLocalSettings", () => ({
  updateSidebarCollapsed: vi.fn(async () => Promise.resolve()),
}));
vi.mock("react-hotkeys-hook", () => ({ useHotkeys: vi.fn() }));

function Toggle() {
  const { collapsed, toggle } = useSidebarCollapse();
  return (
    <button onClick={toggle}>{collapsed ? "collapsed" : "expanded"}</button>
  );
}

describe("SidebarCollapseProvider", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("updates optimistically within an action", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const errors: string[] = [];
    vi.spyOn(console, "error").mockImplementation((message: unknown) => {
      errors.push(String(message));
    });
    const container = document.createElement("div");
    document.body.appendChild(container);

    await act(async () => {
      createRoot(container).render(
        <SidebarCollapseProvider>
          <Toggle />
        </SidebarCollapseProvider>,
      );
    });

    await act(async () => {
      container.querySelector("button")?.click();
    });

    expect(updateSidebarCollapsed).toHaveBeenCalledWith(true);
    expect(errors.join(" ")).not.toContain(
      "An optimistic state update occurred outside a transition or action",
    );
  });
});
