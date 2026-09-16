"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";

import { useTRPC } from "@karakeep/shared-react/trpc";
import { BookmarkTypes, ZBookmark } from "@karakeep/shared/types/bookmarks";

import {
  getXEmbedWidth,
  getXStatusPermalink,
  loadXWidgets,
} from "@/lib/xEmbed";
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
    let lastWidth = 0;
    let renderGeneration = 0;

    const render = (containerWidth: number) => {
      if (containerWidth <= 0) {
        return;
      }
      const width = getXEmbedWidth(containerWidth);
      if (width === lastWidth && container.childElementCount > 0) {
        return;
      }
      lastWidth = width;
      const generation = ++renderGeneration;

      void loadXWidgets()
        .then(async (twttr) => {
          if (cancelled || generation !== renderGeneration) {
            return;
          }

          container.replaceChildren();

          if (twttr.widgets.createTweet) {
            for (const id of statusIds) {
              if (cancelled || generation !== renderGeneration) {
                return;
              }
              const mount = document.createElement("div");
              mount.className = "w-full min-w-0";
              container.append(mount);
              await twttr.widgets.createTweet(id, mount, {
                align: "center",
                dnt: true,
                width,
              });
            }
            return;
          }

          for (const id of statusIds) {
            const blockquote = document.createElement("blockquote");
            blockquote.className = "twitter-tweet";
            blockquote.setAttribute("data-media-max-width", String(width));
            blockquote.setAttribute("data-width", String(width));
            const link = document.createElement("a");
            link.href = getXStatusPermalink(id);
            link.textContent = "View post on X";
            blockquote.append(link);
            container.append(blockquote);
          }
          twttr.widgets.load(container);
        })
        .catch(() => {
          if (
            cancelled ||
            generation !== renderGeneration ||
            !containerRef.current
          ) {
            return;
          }
          containerRef.current.replaceChildren();
          for (const id of statusIds) {
            const link = document.createElement("a");
            link.href = getXStatusPermalink(id);
            link.target = "_blank";
            link.rel = "noreferrer";
            link.className = "text-sm text-primary underline";
            link.textContent = "View post on X";
            containerRef.current.append(link);
          }
        });
    };

    render(container.clientWidth);

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width;
      if (nextWidth) {
        render(nextWidth);
      }
    });
    observer.observe(container);

    return () => {
      cancelled = true;
      observer.disconnect();
      container.replaceChildren();
    };
  }, [statusKey]);

  return (
    <div
      ref={containerRef}
      className="flex w-full min-w-0 flex-col items-center gap-4 [&_iframe]:max-w-full"
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
    <div className="relative h-full w-full min-w-0 overflow-auto">
      <div className="mx-auto w-full min-w-0 max-w-[550px] px-1 py-4 sm:px-2 sm:py-6 lg:origin-top lg:px-0 lg:py-8 lg:[zoom:1.25] motion-reduce:lg:[zoom:1]">
        <XTweetEmbeds statusIds={threadIds} />
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
