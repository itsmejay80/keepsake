"use client";

import {
  createContext,
  useCallback,
  useContext,
  useOptimistic,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/i18n/client";
import { useUserLocalSettings } from "@/lib/userLocalSettings/bookmarksLayout";
import { updateSidebarCollapsed } from "@/lib/userLocalSettings/userLocalSettings";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHotkeys } from "react-hotkeys-hook";

export const SIDEBAR_ID = "app-sidebar";

export function sidebarWidthClass(collapsed: boolean) {
  return cn(
    "sidebar-width shrink-0",
    collapsed ? "w-14 xl:w-14" : "w-52 xl:w-56",
  );
}

interface SidebarCollapseContextValue {
  collapsed: boolean;
  toggle: () => void;
}

const SidebarCollapseContext =
  createContext<SidebarCollapseContextValue | null>(null);

export function useSidebarCollapse() {
  const context = useContext(SidebarCollapseContext);
  if (!context) {
    throw new Error(
      "useSidebarCollapse must be used within SidebarCollapseProvider",
    );
  }
  return context;
}

export function SidebarCollapseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = useUserLocalSettings();
  const [collapsed, setCollapsed] = useOptimistic(
    settings.sidebarCollapsed ?? false,
  );
  const [, startTransition] = useTransition();

  const toggle = useCallback(() => {
    const next = !collapsed;
    setCollapsed(next);
    startTransition(() => {
      void updateSidebarCollapsed(next);
    });
  }, [collapsed, setCollapsed]);

  useHotkeys(
    "[",
    (event) => {
      event.preventDefault();
      toggle();
    },
    { preventDefault: true },
    [toggle],
  );

  return (
    <SidebarCollapseContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarCollapseContext.Provider>
  );
}

export function SidebarToggle({ className }: { className?: string }) {
  const { collapsed, toggle } = useSidebarCollapse();
  const { t } = useTranslation();
  const label = collapsed
    ? t("common.expand_sidebar", { defaultValue: "Expand sidebar" })
    : t("common.collapse_sidebar", { defaultValue: "Collapse sidebar" });

  return (
    <div className={cn("flex justify-start border-t border-border/70 pt-2")}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="none"
            onClick={toggle}
            aria-label={label}
            aria-expanded={!collapsed}
            aria-controls={SIDEBAR_ID}
            className={cn(
              "relative size-8 shrink-0 text-muted-foreground hover:bg-accent hover:text-foreground",
              className,
            )}
          >
            <span className="relative size-4">
              <ChevronLeft
                className={cn(
                  "sidebar-icon-swap absolute inset-0 size-4 rtl:-scale-x-100",
                  collapsed
                    ? "scale-[0.25] opacity-0 blur-[4px]"
                    : "scale-100 opacity-100 blur-0",
                )}
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <ChevronRight
                className={cn(
                  "sidebar-icon-swap size-4 rtl:-scale-x-100",
                  collapsed
                    ? "scale-100 opacity-100 blur-0"
                    : "scale-[0.25] opacity-0 blur-[4px]",
                )}
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipContent side="right" sideOffset={12}>
            {label}
          </TooltipContent>
        </TooltipPortal>
      </Tooltip>
    </div>
  );
}
