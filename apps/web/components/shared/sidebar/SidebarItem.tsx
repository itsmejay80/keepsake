"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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
  return (
    <li
      className={cn(
        "relative flex justify-between rounded-xl text-sm transition-[color,background-color,box-shadow] duration-150",
        isActive
          ? "bg-accent font-semibold text-accent-foreground shadow-[inset_3px_0_0_hsl(var(--foreground))] rtl:shadow-[inset_-3px_0_0_hsl(var(--foreground))]"
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
      <div className="flex flex-1 items-center">
        {collapseButton}
        <Link
          href={path}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "flex min-h-11 flex-1 items-center gap-x-2.5 rounded-[inherit] px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            linkClassName,
          )}
        >
          <span className="flex shrink-0" aria-hidden="true">
            {logo}
          </span>
          <span title={name} className="line-clamp-1 break-all">
            {name}
          </span>
        </Link>
      </div>
      {right}
    </li>
  );
}
