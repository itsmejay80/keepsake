"use client";

import { useTranslation } from "@/lib/i18n/client";
import { Bookmark } from "lucide-react";

export default function NoBookmarksBanner() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-10 text-center sm:p-16">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
        <Bookmark className="size-6" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <h3 className="mb-2 text-xl font-semibold tracking-tight">
        {t("banners.no_bookmarks.title")}
      </h3>
      <p className="max-w-md leading-6 text-muted-foreground">
        {t("banners.no_bookmarks.description")}
      </p>
    </div>
  );
}
