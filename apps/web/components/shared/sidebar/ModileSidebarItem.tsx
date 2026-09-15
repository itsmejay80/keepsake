"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { haptic } from "@/lib/haptic";
import { cn } from "@/lib/utils";

export default function MobileSidebarItem({
  logo,
  name,
  path,
}: {
  logo: React.ReactNode;
  name: string;
  path: string;
}) {
  const currentPath = usePathname();
  const isActive = path == currentPath;
  return (
    <li
      className={cn(
        "flex rounded-xl text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground",
        isActive ? "bg-accent font-semibold text-accent-foreground" : "",
      )}
    >
      <Link
        onClick={haptic}
        href={path}
        aria-current={isActive ? "page" : undefined}
        className="m-auto flex min-h-11 items-center gap-2 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="flex shrink-0" aria-hidden="true">
          {logo}
        </span>
        <span>{name}</span>
      </Link>
    </li>
  );
}
