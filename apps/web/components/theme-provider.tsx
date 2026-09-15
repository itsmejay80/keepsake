"use client";

import type { ThemeProviderProps } from "next-themes";
import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider scriptProps={{ "data-cfasync": "false" }} {...props}>
      {children}
    </NextThemesProvider>
  );
}

export function useToggleTheme() {
  const { theme, setTheme } = useTheme();
  const changeTheme = (nextTheme: "light" | "dark") => {
    const style = document.createElement("style");
    style.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(style);
    setTheme(nextTheme);
    void window.getComputedStyle(document.body).opacity;
    window.requestAnimationFrame(() => style.remove());
  };
  if (theme == "dark") {
    return () => changeTheme("light");
  } else {
    return () => changeTheme("dark");
  }
}
