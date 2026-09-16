"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";

import { useTRPC } from "@karakeep/shared-react/trpc";
import { BookmarkTypes, ZBookmark } from "@karakeep/shared/types/bookmarks";

import { getXStatusPermalink, loadXWidgets } from "@/lib/xEmbed";
import { extractTweetId, extractXThreadStatusIds } from "@/lib/xThread";
import { xBookmarkHasAttachedVideo } from "@/lib/xVideo";

import { ContentRenderer } from "./types";

function canRenderX(bookmark: ZBookmark): boolean {
  if (bookmark.content.type !== BookmarkTypes.LINK) {
    return false;
  }

  return extractTweetId(bookmark.content.url) !== null;
}

function XTweetEmbeds({ statusIds }: { statusIds: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const statusKey = statusIds.join("-");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;

    void loadXWidgets()
      .then(async (twttr) => {
        if (cancelled) {
          return;
        }

        container.replaceChildren();

        if (twttr.widgets.createTweet) {
          for (const id of statusIds) {
            if (cancelled) {
              return;
            }
            const mount = document.createElement("div");
            mount.className = "w-full";
            container.append(mount);
            await twttr.widgets.createTweet(id, mount, {
              align: "center",
              dnt: true,
              width: 550,
            });
          }
          return;
        }

        for (const id of statusIds) {
          const blockquote = document.createElement("blockquote");
          blockquote.className = "twitter-tweet";
          blockquote.setAttribute("data-media-max-width", "560");
          blockquote.setAttribute("data-width", "550");
          const link = document.createElement("a");
          link.href = getXStatusPermalink(id);
          link.textContent = "View post on X";
          blockquote.append(link);
          container.append(blockquote);
        }
        twttr.widgets.load(container);
      })
      .catch(() => {
        if (cancelled || !containerRef.current) {
          return;
        }
        containerRef.current.replaceChildren();
        for (const id of statusIds) {
          const link = document.createElement("a");
          link.href = getXStatusPermalink(id);
          link.target = "_blank";
          link.rel = "noreferrer";
          link.textContent = "View post on X";
          containerRef.current.append(link);
        }
      });

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [statusKey]);

  return (
    <div
      ref={containerRef}
      className="flex w-full flex-col items-center gap-4"
    />
  );
}

function XRendererComponent({ bookmark }: { bookmark: ZBookmark }) {
  const api = useTRPC();
  const { data: htmlContent } = useQuery(
    api.bookmarks.getBookmark.queryOptions(
      {
        bookmarkId: bookmark.id,
        includeContent: true,
      },
      {
        select: (data) =>
          data.content.type === BookmarkTypes.LINK
            ? data.content.htmlContent
            : null,
      },
    ),
  );

  if (bookmark.content.type !== BookmarkTypes.LINK) {
    return null;
  }

  const tweetId = extractTweetId(bookmark.content.url);
  if (!tweetId) {
    return null;
  }

  const threadIds = extractXThreadStatusIds(htmlContent, tweetId);

  return (
    <div className="relative h-full w-full overflow-auto">
      <div className="flex justify-center px-6 py-8">
        <div className="w-full max-w-[550px] origin-top [zoom:1.35] motion-reduce:[zoom:1]">
          <XTweetEmbeds statusIds={threadIds} />
        </div>
      </div>
    </div>
  );
}

export const xRenderer: ContentRenderer = {
  id: "x",
  name: "X (Twitter)",
  icon: MessageSquare,
  canRender: canRenderX,
  component: XRendererComponent,
  priority: 10,
  preferAsDefault: xBookmarkHasAttachedVideo,
};
