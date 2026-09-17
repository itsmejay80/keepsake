import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { useTranslation } from "@/lib/i18n/client";
import { getReaderViewWhiteSpace } from "@/lib/readerViewWhitespace";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, FileX } from "lucide-react";

import BookmarkHTMLHighlighter from "@karakeep/shared-react/components/BookmarkHtmlHighlighter";
import ScrollProgressTracker from "@karakeep/shared-react/components/ScrollProgressTracker";
import {
  useCreateHighlight,
  useDeleteHighlight,
  useUpdateHighlight,
} from "@karakeep/shared-react/hooks/highlights";
import { useReadingProgress } from "@karakeep/shared-react/hooks/reading-progress";
import { useTRPC } from "@karakeep/shared-react/trpc";
import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";

import ReadingProgressBanner from "./ReadingProgressBanner";

export default function ReaderView({
  bookmarkId,
  className,
  style,
  readOnly,
  progressBarStyle,
  sourceUrl,
}: {
  bookmarkId: string;
  className?: string;
  style?: React.CSSProperties;
  readOnly: boolean;
  progressBarStyle?: React.CSSProperties;
  sourceUrl?: string;
}) {
  const { t } = useTranslation();
  const api = useTRPC();
  const { data: highlights } = useQuery(
    api.highlights.getForBookmark.queryOptions({
      bookmarkId,
    }),
  );
  const { data: cachedContent, isPending: isCachedContentLoading } = useQuery(
    api.bookmarks.getBookmark.queryOptions(
      {
        bookmarkId,
        includeContent: true,
      },
      {
        select: (data) =>
          data.content.type == BookmarkTypes.LINK
            ? data.content.htmlContent
            : null,
      },
    ),
  );

  const {
    showBanner,
    bannerPercent,
    onContinue,
    onDismiss,
    restorePosition,
    readingProgressOffset,
    readingProgressAnchor,
    onSavePosition,
    onScrollPositionChange,
    isFinished,
    isUpdatingProgress,
    markFinished,
  } = useReadingProgress({
    bookmarkId,
  });

  const { mutate: createHighlight } = useCreateHighlight({
    onSuccess: () => {
      toast({
        description: "Highlight has been created!",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Something went wrong",
      });
    },
  });

  const { mutate: updateHighlight } = useUpdateHighlight({
    onSuccess: () => {
      toast({
        description: "Highlight has been updated!",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Something went wrong",
      });
    },
  });

  const { mutate: deleteHighlight } = useDeleteHighlight({
    onSuccess: () => {
      toast({
        description: "Highlight has been deleted!",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        description: "Something went wrong",
      });
    },
  });

  let content;
  if (isCachedContentLoading) {
    content = <FullPageSpinner />;
  } else if (!cachedContent) {
    content = (
      <div className="flex h-full w-full items-center justify-center p-4">
        <div className="max-w-sm space-y-4 text-center">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileX className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-foreground">
              {t("preview.fetch_error_title")}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("preview.fetch_error_description")}
            </p>
          </div>
        </div>
      </div>
    );
  } else {
    content = (
      <ScrollProgressTracker
        onSavePosition={onSavePosition}
        onScrollPositionChange={onScrollPositionChange}
        restorePosition={restorePosition}
        readingProgressOffset={readingProgressOffset}
        readingProgressAnchor={readingProgressAnchor}
        showProgressBar
        progressBarStyle={progressBarStyle}
      >
        {showBanner && (
          <ReadingProgressBanner
            percent={bannerPercent}
            onContinue={onContinue}
            onDismiss={onDismiss}
          />
        )}
        <BookmarkHTMLHighlighter
          className={className}
          style={{
            ...style,
            whiteSpace: getReaderViewWhiteSpace(sourceUrl) ?? style?.whiteSpace,
          }}
          htmlContent={cachedContent || ""}
          highlights={highlights?.highlights ?? []}
          readOnly={readOnly}
          onDeleteHighlight={(h) =>
            deleteHighlight({
              highlightId: h.id,
            })
          }
          onUpdateHighlight={(h) =>
            updateHighlight({
              highlightId: h.id,
              color: h.color,
              note: h.note,
            })
          }
          onHighlight={(h) =>
            createHighlight({
              startOffset: h.startOffset,
              endOffset: h.endOffset,
              color: h.color,
              bookmarkId,
              text: h.text,
              note: h.note ?? null,
            })
          }
        />
        {!isFinished && (
          <div className="my-12 flex flex-col items-center gap-3 border-t pt-8 print:hidden">
            <p className="text-sm text-muted-foreground">
              {t("reading.reached_end", {
                defaultValue: "You’ve reached the end of this article.",
              })}
            </p>
            <Button
              onClick={markFinished}
              disabled={isUpdatingProgress}
              className="min-h-11 px-5"
            >
              <CheckCircle2 className="mr-2 size-4" />
              {t("reading.mark_finished", { defaultValue: "Mark finished" })}
            </Button>
          </div>
        )}
      </ScrollProgressTracker>
    );
  }
  return content;
}
