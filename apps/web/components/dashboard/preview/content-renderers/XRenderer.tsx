import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { Tweet } from "react-tweet";

import { useTRPC } from "@karakeep/shared-react/trpc";
import { BookmarkTypes, ZBookmark } from "@karakeep/shared/types/bookmarks";

import { extractTweetId, extractXThreadStatusIds } from "@/lib/xThread";
import { xBookmarkHasAttachedVideo } from "@/lib/xVideo";

import { ContentRenderer } from "./types";

function canRenderX(bookmark: ZBookmark): boolean {
  if (bookmark.content.type !== BookmarkTypes.LINK) {
    return false;
  }

  return extractTweetId(bookmark.content.url) !== null;
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
      <div className="flex flex-col items-center gap-4 p-4">
        {threadIds.map((id) => (
          <Tweet key={id} id={id} />
        ))}
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
