import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import { getBookmarkTitle } from "@karakeep/shared/utils/bookmarkUtils";

import { api } from "@/server/api/client";
import { useTranslation } from "@/lib/i18n/server";

export default async function ContinueReading() {
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();
  const { bookmarks } = await api.bookmarks.getBookmarks({
    archived: false,
    readingState: "reading",
    limit: 4,
  });

  if (bookmarks.length === 0) return null;

  return (
    <section aria-labelledby="continue-reading-title" className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-primary" aria-hidden="true" />
          <h2 id="continue-reading-title" className="font-semibold">
            {t("reading.continue_reading", {
              defaultValue: "Continue reading",
            })}
          </h2>
        </div>
        <Link
          href="/dashboard/bookmarks?reading=reading"
          className="flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {t("reading.view_all", { defaultValue: "View all" })}{" "}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {bookmarks.map((bookmark) => {
          const percent = bookmark.readingProgressPercent ?? 0;
          return (
            <Link
              key={bookmark.id}
              href={`/dashboard/preview/${bookmark.id}`}
              className="group rounded-xl border border-border/70 bg-card p-3 shadow-sm transition-[border-color,box-shadow] hover:border-foreground/25 hover:shadow-md"
            >
              <p className="line-clamp-2 min-h-10 text-sm font-medium leading-5">
                {getBookmarkTitle(bookmark) ?? "Untitled"}
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label={t("reading.percent_read", {
                    defaultValue: "{{percent}}% read",
                    percent,
                  })}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-transform motion-reduce:transition-none"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                  {percent}%
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
