"use client";

import Link from "next/link";
import KarakeepLogo from "@/components/KarakeepIcon";
import { cn } from "@/lib/utils";

import { sidebarWidthClass, useSidebarCollapse } from "./SidebarCollapse";

export default function SidebarBrand() {
  const { collapsed } = useSidebarCollapse();

  return (
    <div
      className={cn(
        "hidden overflow-hidden sm:flex sm:items-center",
        "-ml-3 sm:-ml-4",
        sidebarWidthClass(collapsed),
        "pl-3 sm:pl-4",
      )}
    >
      <Link
        href="/dashboard/bookmarks"
        aria-label="Keepsake home"
        className="relative flex min-w-0 items-center overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span
          className={cn(
            "sidebar-fade flex items-center",
            collapsed ? "pointer-events-none opacity-0" : "opacity-100",
          )}
        >
          <KarakeepLogo height={28} />
        </span>
        <span
          className={cn(
            "sidebar-fade absolute left-0 flex items-center",
            collapsed ? "opacity-100" : "pointer-events-none opacity-0",
          )}
        >
          <KarakeepLogo height={16} compact />
        </span>
      </Link>
    </div>
  );
}
