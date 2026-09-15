import React from "react";
import Bookmarks from "@/components/dashboard/bookmarks/Bookmarks";
import { useTranslation } from "@/lib/i18n/server";

export default async function BookmarksPage() {
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();

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
      <Bookmarks query={{ archived: false }} showEditorCard={true} />
    </div>
  );
}
