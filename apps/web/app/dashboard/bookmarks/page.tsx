import React from "react";
import Bookmarks from "@/components/dashboard/bookmarks/Bookmarks";
import ContinueReading from "@/components/dashboard/bookmarks/ContinueReading";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/server";

import type { ZGetBookmarksRequest } from "@karakeep/shared/types/bookmarks";

type ReadingState = NonNullable<ZGetBookmarksRequest["readingState"]>;

export default async function BookmarksPage({
  searchParams,
}: {
  searchParams: Promise<{ reading?: string }>;
}) {
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();
  const requestedState = (await searchParams).reading;
  const readingState: ReadingState | undefined = [
    "unread",
    "reading",
    "finished",
  ].includes(requestedState ?? "")
    ? (requestedState as ReadingState)
    : undefined;
  const filters: { label: string; value?: ReadingState }[] = [
    { label: t("common.all", { defaultValue: "All" }) },
    { label: t("reading.unread", { defaultValue: "Unread" }), value: "unread" },
    {
      label: t("reading.reading", { defaultValue: "Reading" }),
      value: "reading",
    },
    {
      label: t("reading.finished", { defaultValue: "Finished" }),
      value: "finished",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between border-b border-border/70 pb-5">
        <div className="max-w-2xl">
          <h1 className="text-balance text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">
            {t("common.bookmarks")}
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground sm:text-base">
            {t("bookmarks.library_description", {
              defaultValue: "Everything worth keeping, close at hand.",
            })}
          </p>
        </div>
      </div>
      {!readingState && <ContinueReading />}
      <nav aria-label="Reading status" className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const active = filter.value === readingState;
          return (
            <Link
              key={filter.value ?? "all"}
              href={
                filter.value
                  ? `/dashboard/bookmarks?reading=${filter.value}`
                  : "/dashboard/bookmarks"
              }
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>
      <Bookmarks
        query={{ archived: false, readingState }}
        showEditorCard={!readingState}
      />
    </div>
  );
}
