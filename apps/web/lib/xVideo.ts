import { BookmarkTypes, ZBookmark } from "@karakeep/shared/types/bookmarks";

import { extractTweetId } from "./xThread";

const X_VIDEO_THUMB_PATHS = [
  "/ext_tw_video_thumb/",
  "/amplify_video_thumb/",
  "/tweet_video_thumb/",
  "/amplify_video/",
  "/ext_tw_video/",
  "/tweet_video/",
];

export function isXVideoThumbnailUrl(url: string | null | undefined): boolean {
  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    if (
      hostname !== "video.twimg.com" &&
      !hostname.endsWith(".twimg.com") &&
      hostname !== "twimg.com" &&
      hostname !== "pbs.twimg.com"
    ) {
      return false;
    }
    return X_VIDEO_THUMB_PATHS.some((path) => parsed.pathname.includes(path));
  } catch {
    return false;
  }
}

function htmlIndicatesXVideo(html: string | null | undefined): boolean {
  if (!html) {
    return false;
  }

  return (
    /data-x-has-video=["']?true["']?/i.test(html) ||
    /data-testid=["']videoPlayer["']/i.test(html) ||
    /data-testid=["']videoComponent["']/i.test(html) ||
    html.includes("video.twimg.com") ||
    X_VIDEO_THUMB_PATHS.some((path) => html.includes(path))
  );
}

export function xBookmarkHasAttachedVideo(bookmark: ZBookmark): boolean {
  if (bookmark.content.type !== BookmarkTypes.LINK) {
    return false;
  }

  const { url, videoAssetId, imageUrl, htmlContent } = bookmark.content;
  if (!extractTweetId(url)) {
    return false;
  }

  return (
    !!videoAssetId ||
    isXVideoThumbnailUrl(imageUrl) ||
    htmlIndicatesXVideo(htmlContent)
  );
}
