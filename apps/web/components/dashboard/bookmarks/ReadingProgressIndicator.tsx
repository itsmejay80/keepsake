"use client";

import { useTranslation } from "@/lib/i18n/client";
import { Check } from "lucide-react";

import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";

export function ReadingProgressIndicator({
  bookmark,
  compact = false,
}: {
  bookmark: ZBookmark;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  if (
    bookmark.content.type !== BookmarkTypes.LINK ||
    (!bookmark.readingProgressSeen && !bookmark.readingProgressPercent)
  ) {
    return null;
  }

  const percent = bookmark.readingProgressPercent ?? 0;
  const finished = percent >= 100;
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const label = finished
    ? t("reading.finished", { defaultValue: "Finished" })
    : t("reading.percent_read", {
        defaultValue: "{{percent}}% read",
        percent,
      });

  return (
    <span
      className="flex shrink-0 items-center gap-1.5 font-medium text-primary"
      role="img"
      aria-label={label}
      title={label}
    >
      <span className="relative size-5" aria-hidden="true">
        <svg className="size-5 -rotate-90" viewBox="0 0 20 20">
          <circle
            cx="10"
            cy="10"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.18"
            strokeWidth="2.5"
          />
          <circle
            cx="10"
            cy="10"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - percent / 100)}
            strokeLinecap="round"
            strokeWidth="2.5"
          />
        </svg>
        {finished && (
          <Check className="absolute inset-0 m-auto size-3" strokeWidth={3} />
        )}
      </span>
      {!compact && (
        <span>
          {finished
            ? t("reading.finished", { defaultValue: "Finished" })
            : `${percent}%`}
        </span>
      )}
    </span>
  );
}
