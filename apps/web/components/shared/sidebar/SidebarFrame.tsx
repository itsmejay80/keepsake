"use client";

import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import {
  SIDEBAR_ID,
  SidebarToggle,
  sidebarWidthClass,
  useSidebarCollapse,
} from "./SidebarCollapse";

export default function SidebarFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const { collapsed } = useSidebarCollapse();
  const { t } = useTranslation();

  return (
    <aside
      id={SIDEBAR_ID}
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "group flex h-[calc(100vh-60px)] flex-col gap-3 overflow-hidden border-r border-border/70 bg-background px-2.5 py-2",
        sidebarWidthClass(collapsed),
      )}
      aria-label={t("common.navigation", { defaultValue: "Main navigation" })}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        {children}
      </div>
      <SidebarToggle />
    </aside>
  );
}
