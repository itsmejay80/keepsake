import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "@/lib/auth/client";
import { Trans, useTranslation } from "@/lib/i18n/client";
import { useReaderSettings } from "@/lib/readerSettings";
import {
  AlertTriangle,
  Archive,
  BookOpen,
  Camera,
  ExpandIcon,
  ExternalLink,
  FileText,
  Info,
  LayoutPanelTop,
  Video,
} from "lucide-react";
import { useQueryState } from "nuqs";
import { ErrorBoundary } from "react-error-boundary";
import { TooltipPortal } from "@/components/ui/tooltip";
import useRelativeTime from "@/lib/hooks/relative-time";

import {
  BookmarkTypes,
  ZBookmark,
  ZBookmarkedLink,
} from "@karakeep/shared/types/bookmarks";
import { READER_FONT_FAMILIES } from "@karakeep/shared/types/readers";

import { contentRendererRegistry } from "./content-renderers";
import { getDefaultLinkSection } from "./content-renderers/getDefaultLinkSection";
import {
  getBookmarkTitle,
  getSourceUrl,
} from "@karakeep/shared/utils/bookmarkUtils";
import ReaderSettingsPopover from "./ReaderSettingsPopover";
import ReaderView from "./ReaderView";
import SavedPageOverview from "./SavedPageOverview";

function MetadataRow({
  bookmark,
  sourceUrl,
}: {
  bookmark: ZBookmark;
  sourceUrl?: string | null;
}) {
  const { i18n, t } = useTranslation();
  let { author, publisher, datePublished } =
    bookmark.content.type !== BookmarkTypes.LINK
      ? {
          author: null,
          publisher: null,
          datePublished: null,
        }
      : bookmark.content;
  const { fromNow, localCreatedAt } = useRelativeTime(
    bookmark.createdAt,
    i18n.language,
  );

  const parts: React.ReactNode[] = [];
  if (sourceUrl) {
    parts.push(
      <Link
        key="source"
        href={sourceUrl}
        target="_blank"
        className="flex items-center gap-1 hover:text-foreground"
      >
        <ExternalLink className="size-3" />
        <span className="hidden sm:inline">{t("preview.view_original")}</span>
      </Link>,
    );
  }
  parts.push(
    <Tooltip key="created" delayDuration={0}>
      <TooltipTrigger asChild>
        <span className="cursor-default">{fromNow}</span>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent>{localCreatedAt}</TooltipContent>
      </TooltipPortal>
    </Tooltip>,
  );
  if (author) {
    parts.push(<span key="author">By {author}</span>);
  }
  if (publisher) {
    parts.push(<span key="publisher">{publisher}</span>);
  }
  if (datePublished) {
    parts.push(
      <span key="published">
        Published{" "}
        {new Date(datePublished).toLocaleDateString(i18n.language, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </span>,
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-muted-foreground">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="text-muted-foreground/50">·</span>}
          {part}
        </Fragment>
      ))}
    </div>
  );
}

function CustomRendererErrorFallback({ error }: { error: Error }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-md">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Renderer Error</AlertTitle>
        <AlertDescription>
          Failed to load custom content renderer.{" "}
          <details className="mt-2">
            <summary className="cursor-pointer text-xs">
              Technical details
            </summary>
            <code className="mt-1 block text-xs">{error.message}</code>
          </details>
        </AlertDescription>
      </Alert>
    </div>
  );
}

function FullPageArchiveSection({ link }: { link: ZBookmarkedLink }) {
  const archiveAssetId =
    link.fullPageArchiveAssetId ?? link.precrawledArchiveAssetId;
  return (
    <iframe
      sandbox=""
      title={link.url}
      src={`/api/assets/${archiveAssetId}`}
      className="relative h-full min-w-full"
    />
  );
}

function ScreenshotSection({ link }: { link: ZBookmarkedLink }) {
  return (
    <div className="relative h-full min-w-full overflow-y-auto overflow-x-hidden">
      <Image
        alt="screenshot"
        src={`/api/assets/${link.screenshotAssetId}`}
        width={0}
        height={0}
        unoptimized
        sizes="100vw"
        style={{ width: "100%", height: "auto" }}
      />
    </div>
  );
}

function VideoSection({ link }: { link: ZBookmarkedLink }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 h-full w-full">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- captions not (yet) available */}
        <video className="m-auto max-h-full max-w-full" controls>
          <source src={`/api/assets/${link.videoAssetId}`} />
          Not supported by your browser
        </video>
      </div>
    </div>
  );
}

function PDFSection({ link }: { link: ZBookmarkedLink }) {
  return (
    <iframe
      title="PDF Viewer"
      src={`/api/assets/${link.pdfAssetId}`}
      className="relative h-full min-w-full"
    />
  );
}

export default function LinkContentSection({
  bookmark,
}: {
  bookmark: ZBookmark;
}) {
  const { t } = useTranslation();
  const { settings } = useReaderSettings();
  const availableRenderers = contentRendererRegistry.getRenderers(bookmark);
  const defaultSection = getDefaultLinkSection({
    availableRenderers,
    bookmark,
    preferredPreview:
      bookmark.content.type === BookmarkTypes.LINK
        ? bookmark.content.preferredPreview
        : null,
  });
  const [section, setSection] = useQueryState("section", {
    defaultValue: defaultSection,
  });
  const { data: session } = useSession();
  const isOwner = session?.user?.id === bookmark.userId;

  if (bookmark.content.type != BookmarkTypes.LINK) {
    throw new Error("Invalid content type");
  }

  const title = getBookmarkTitle(bookmark);
  const sourceUrl = getSourceUrl(bookmark);

  let content;

  // Check if current section is a custom renderer
  const customRenderer = availableRenderers.find((r) => r.id === section);
  if (customRenderer) {
    const RendererComponent = customRenderer.component;
    content = (
      <ErrorBoundary FallbackComponent={CustomRendererErrorFallback}>
        <RendererComponent bookmark={bookmark} />
      </ErrorBoundary>
    );
  } else if (section === "cached") {
    content = (
      <div className="thin-scrollbar h-full w-full overflow-y-auto overflow-x-hidden px-3 pb-12 pt-4 sm:px-6">
        <ReaderView
          className="mx-auto max-w-3xl"
          style={{
            fontFamily: READER_FONT_FAMILIES[settings.fontFamily],
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineHeight,
          }}
          bookmarkId={bookmark.id}
          readOnly={!isOwner}
          sourceUrl={bookmark.content.url}
        />
      </div>
    );
  } else if (section === "archive") {
    content = <FullPageArchiveSection link={bookmark.content} />;
  } else if (section === "video") {
    content = <VideoSection link={bookmark.content} />;
  } else if (section === "pdf") {
    content = <PDFSection link={bookmark.content} />;
  } else if (section === "screenshot") {
    content = <ScreenshotSection link={bookmark.content} />;
  } else {
    content = (
      <SavedPageOverview link={bookmark.content} onSelectSection={setSection} />
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col items-center overflow-hidden">
      <div className="flex w-full flex-col items-center gap-2 border-b px-4 pb-2.5 pt-3">
        <p className="line-clamp-2 w-full text-ellipsis break-words text-center text-lg font-medium">
          {!title ? "Untitled" : title}
        </p>
        <MetadataRow bookmark={bookmark} sourceUrl={sourceUrl} />
        <div className="flex items-center justify-center gap-2.5">
          <Select onValueChange={setSection} value={section}>
            <SelectTrigger className="h-9 w-fit gap-1 border-none bg-transparent px-3 shadow-none hover:bg-muted">
              <span>
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {/* Custom renderers first */}
                {availableRenderers.map((renderer) => {
                  const IconComponent = renderer.icon;
                  return (
                    <SelectItem key={renderer.id} value={renderer.id}>
                      <div className="flex items-center">
                        <IconComponent className="mr-2 h-4 w-4" />
                        {renderer.name}
                      </div>
                    </SelectItem>
                  );
                })}

                {/* Default renderers */}
                <SelectItem value="overview">
                  <div className="flex items-center">
                    <LayoutPanelTop className="mr-2 h-4 w-4" />
                    {t("preview.page_overview")}
                  </div>
                </SelectItem>
                <SelectItem
                  value="cached"
                  disabled={bookmark.content.readerViewStatus === "unavailable"}
                >
                  <div className="flex items-center">
                    <BookOpen className="mr-2 h-4 w-4" />
                    {t("preview.reader_view")}
                  </div>
                </SelectItem>
                <SelectItem
                  value="screenshot"
                  disabled={!bookmark.content.screenshotAssetId}
                >
                  <div className="flex items-center">
                    <Camera className="mr-2 h-4 w-4" />
                    {t("common.screenshot")}
                  </div>
                </SelectItem>
                <SelectItem value="pdf" disabled={!bookmark.content.pdfAssetId}>
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    {t("common.pdf")}
                  </div>
                </SelectItem>
                <SelectItem
                  value="archive"
                  disabled={
                    !bookmark.content.fullPageArchiveAssetId &&
                    !bookmark.content.precrawledArchiveAssetId
                  }
                >
                  <div className="flex items-center">
                    <Archive className="mr-2 h-4 w-4" />
                    {t("preview.archived_page")}
                  </div>
                </SelectItem>
                <SelectItem
                  value="video"
                  disabled={!bookmark.content.videoAssetId}
                >
                  <div className="flex items-center">
                    <Video className="mr-2 h-4 w-4" />
                    {t("common.video")}
                  </div>
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          {section === "cached" && (
            <>
              <ReaderSettingsPopover variant="ghost" />
              <Tooltip>
                <TooltipTrigger>
                  <Link
                    href={`/reader/${bookmark.id}`}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ExpandIcon className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">FullScreen</TooltipContent>
              </Tooltip>
            </>
          )}
          {section === "archive" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-10 items-center gap-1 rounded-md border border-blue-500/50 bg-blue-50 px-3 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  <Info className="h-4 w-4" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                <p className="text-sm">
                  <Trans
                    i18nKey="preview.archive_info"
                    components={{
                      1: (
                        <Link
                          prefetch={false}
                          href={`/api/assets/${bookmark.content.fullPageArchiveAssetId ?? bookmark.content.precrawledArchiveAssetId}`}
                          download
                          className="font-medium underline"
                        >
                          link
                        </Link>
                      ),
                    }}
                  />
                </p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      <div className="min-h-0 w-full min-w-0 flex-1">{content}</div>
    </div>
  );
}
