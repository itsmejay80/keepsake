"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useSidebarCollapse } from "./SidebarCollapse";

export default function SidebarItem({
  name,
  logo,
  path,
  className,
  linkClassName,
  style,
  collapseButton,
  right = null,
  dropHighlight = false,
  onDrop,
  onDragOver,
  onDragEnter,
  onDragLeave,
}: {
  name: string;
  logo: React.ReactNode;
  path: string;
  style?: React.CSSProperties;
  className?: string;
  linkClassName?: string;
  right?: React.ReactNode;
  collapseButton?: React.ReactNode;
  dropHighlight?: boolean;
  onDrop?: React.DragEventHandler;
  onDragOver?: React.DragEventHandler;
  onDragEnter?: React.DragEventHandler;
  onDragLeave?: React.DragEventHandler;
}) {
  const currentPath = usePathname();
  const isActive = path == currentPath;
  const { collapsed } = useSidebarCollapse();

  const link = (
    <Link
      href={path}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-10 min-w-0 flex-1 items-center gap-x-2.5 overflow-hidden rounded-[inherit] px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        linkClassName,
      )}
    >
      <span className="flex shrink-0" aria-hidden="true">
        {logo}
      </span>
      <span
        title={collapsed ? undefined : name}
        className={cn(
          "sidebar-fade min-w-0 truncate whitespace-nowrap",
          collapsed ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        {name}
      </span>
    </Link>
  );

  return (
    <li
      className={cn(
        "relative flex overflow-hidden rounded-xl text-sm transition-[color,background-color] duration-150",
        isActive
          ? "bg-accent font-semibold text-accent-foreground"
          : "font-normal text-muted-foreground hover:bg-accent/60 hover:text-foreground",
        dropHighlight && "bg-accent ring-2 ring-primary",
        className,
      )}
      style={style}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
    >
      <div className="flex min-w-0 flex-1 items-center overflow-hidden">
        {collapseButton ? (
          <span
            className={cn(
              "sidebar-fade flex shrink-0 items-center justify-center overflow-hidden",
              collapsed ? "w-0 opacity-0" : "w-4 opacity-100",
            )}
          >
            {collapseButton}
          </span>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          {collapsed ? (
            <TooltipPortal>
              <TooltipContent side="right" sideOffset={12}>
                {name}
              </TooltipContent>
            </TooltipPortal>
          ) : null}
        </Tooltip>
      </div>
      <span
        className={cn(
          "sidebar-fade flex shrink-0 items-center overflow-hidden",
          collapsed ? "w-0 opacity-0" : "opacity-100",
        )}
      >
        {right}
      </span>
    </li>
  );
}
