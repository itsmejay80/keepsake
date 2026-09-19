"use client";

import { useState } from "react";
import { BookmarkTagsEditor } from "@/components/dashboard/bookmarks/BookmarkTagsEditor";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/lib/auth/client";
import { useTranslation } from "@/lib/i18n/client";
import { useQuery } from "@tanstack/react-query";
import { Globe, PanelRightClose, PanelRightOpen } from "lucide-react";

import { useTRPC } from "@karakeep/shared-react/trpc";
import { BookmarkTypes, ZBookmark } from "@karakeep/shared/types/bookmarks";
import {
  getBookmarkRefreshInterval,
  isBookmarkStillCrawling,
} from "@karakeep/shared/utils/bookmarkUtils";

import SummarizeBookmarkArea from "../bookmarks/SummarizeBookmarkArea";
import ActionBar from "./ActionBar";
import { AssetContentSection } from "./AssetContentSection";
import AttachmentBox from "./AttachmentBox";
import HighlightsBox from "./HighlightsBox";
import LinkContentSection from "./LinkContentSection";
import { NoteEditor } from "./NoteEditor";
import { TextContentSection } from "./TextContentSection";

function ContentLoading() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <Globe className="h-12 w-12 animate-bounce text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        {t("preview.crawling_in_progress")}
      </p>
    </div>
  );
}

export default function BookmarkPreview({
  bookmarkId,
  initialData,
}: {
  bookmarkId: string;
  initialData?: ZBookmark;
  onClose?: () => void;
}) {
  const api = useTRPC();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>("content");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { data: session } = useSession();

  const { data: bookmark } = useQuery(
    api.bookmarks.getBookmark.queryOptions(
      {
        bookmarkId,
      },
      {
        initialData,
        refetchInterval: (query) => {
          const data = query.state.data;
          if (!data) {
            return false;
          }
          return getBookmarkRefreshInterval(data);
        },
      },
    ),
  );

  if (!bookmark) {
    return <FullPageSpinner />;
  }

  // Check if the current user owns this bookmark
  const isOwner = session?.user?.id === bookmark.userId;

  let content;
  switch (bookmark.content.type) {
    case BookmarkTypes.LINK: {
      content = <LinkContentSection bookmark={bookmark} />;
      break;
    }
    case BookmarkTypes.TEXT: {
      content = <TextContentSection bookmark={bookmark} />;
      break;
    }
    case BookmarkTypes.ASSET: {
      content = <AssetContentSection bookmark={bookmark} />;
      break;
    }
  }

  // Common content for both layouts
  const contentSection = isBookmarkStillCrawling(bookmark) ? (
    <ContentLoading />
  ) : (
    content
  );

  const detailsSection = (
    <div className="flex flex-col gap-5">
      <SummarizeBookmarkArea bookmark={bookmark} readOnly={!isOwner} />
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("common.tags")}
        </p>
        <BookmarkTagsEditor bookmark={bookmark} disabled={!isOwner} />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("common.note")}
        </p>
        <NoteEditor bookmark={bookmark} disabled={!isOwner} />
      </div>
      <AttachmentBox bookmark={bookmark} readOnly={!isOwner} />
      <HighlightsBox bookmarkId={bookmark.id} readOnly={!isOwner} />
      {isOwner && <ActionBar bookmark={bookmark} />}
    </div>
  );

  return (
    <>
      {/* Render original layout for wide screens */}
      <div className="hidden h-full flex-col overflow-hidden bg-background lg:flex">
        <div className="flex min-h-0 flex-1">
          <div className="thin-scrollbar relative h-full flex-1 overflow-auto px-4 py-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="absolute right-4 top-4 z-10 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {sidebarCollapsed ? (
                <PanelRightOpen size={20} />
              ) : (
                <PanelRightClose size={20} />
              )}
            </button>
            {contentSection}
          </div>
          {!sidebarCollapsed && (
            <div className="thin-scrollbar flex w-80 shrink-0 flex-col gap-5 overflow-auto border-l bg-muted/40 p-4 xl:w-[22rem] 2xl:w-96">
              {detailsSection}
            </div>
          )}
        </div>
      </div>
      {/* Render tabbed layout for narrow/vertical screens */}
      <div className="flex h-full w-full flex-col overflow-hidden lg:hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <TabsList className="z-10 mx-4 mt-2 grid w-auto grid-cols-2">
            <TabsTrigger value="content">
              {t("preview.tabs.content")}
            </TabsTrigger>
            <TabsTrigger value="details">
              {t("preview.tabs.details")}
            </TabsTrigger>
          </TabsList>
          <TabsContent
            value="content"
            className="h-full flex-1 overflow-hidden overflow-y-auto bg-background px-4 py-3 data-[state=inactive]:hidden"
          >
            {contentSection}
          </TabsContent>
          <TabsContent
            value="details"
            className="h-full overflow-y-auto bg-background px-4 py-3 data-[state=inactive]:hidden"
          >
            {detailsSection}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
