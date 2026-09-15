import { describe, expect, test } from "vitest";

import { BookmarkTypes, ZBookmark } from "@karakeep/shared/types/bookmarks";

import { isXVideoThumbnailUrl, xBookmarkHasAttachedVideo } from "./xVideo";

function linkBookmark(
  content: Partial<Extract<ZBookmark["content"], { type: "link" }>> & {
    url: string;
  },
): ZBookmark {
  return {
    id: "bookmark",
    createdAt: new Date("2026-01-01"),
    modifiedAt: null,
    title: null,
    archived: false,
    favourited: false,
    taggingStatus: "success",
    summarizationStatus: "success",
    embeddingStatus: "success",
    note: null,
    summary: null,
    tags: [],
    content: {
      type: BookmarkTypes.LINK,
      title: null,
      description: null,
      imageUrl: null,
      imageAssetId: null,
      screenshotAssetId: null,
      pdfAssetId: null,
      fullPageArchiveAssetId: null,
      precrawledArchiveAssetId: null,
      videoAssetId: null,
      favicon: null,
      htmlContent: null,
      contentAssetId: null,
      crawledAt: null,
      author: null,
      publisher: null,
      datePublished: null,
      dateModified: null,
      ...content,
    },
    assets: [],
    userId: "user",
  };
}

describe("isXVideoThumbnailUrl", () => {
  test.each([
    "https://pbs.twimg.com/ext_tw_video_thumb/123/pu/img/abc.jpg",
    "https://pbs.twimg.com/amplify_video_thumb/123/img/abc.jpg",
    "https://pbs.twimg.com/tweet_video_thumb/abc.jpg",
  ])("detects %s", (url) => {
    expect(isXVideoThumbnailUrl(url)).toBe(true);
  });

  test.each([
    "https://pbs.twimg.com/media/photo.jpg",
    "https://pbs.twimg.com/profile_images/123/avatar.jpg",
    "https://example.com/ext_tw_video_thumb/123.jpg",
    null,
  ])("ignores %s", (url) => {
    expect(isXVideoThumbnailUrl(url)).toBe(false);
  });
});

describe("xBookmarkHasAttachedVideo", () => {
  test("treats a downloaded video asset as attached video", () => {
    expect(
      xBookmarkHasAttachedVideo(
        linkBookmark({
          url: "https://x.com/user/status/1",
          videoAssetId: "asset",
        }),
      ),
    ).toBe(true);
  });

  test("treats a video poster as attached video", () => {
    expect(
      xBookmarkHasAttachedVideo(
        linkBookmark({
          url: "https://x.com/user/status/1",
          imageUrl:
            "https://pbs.twimg.com/ext_tw_video_thumb/1/pu/img/poster.jpg",
        }),
      ),
    ).toBe(true);
  });

  test("does not treat text, photos, or quotes as video", () => {
    expect(
      xBookmarkHasAttachedVideo(
        linkBookmark({
          url: "https://x.com/user/status/1",
          imageUrl: "https://pbs.twimg.com/media/photo.jpg",
        }),
      ),
    ).toBe(false);
  });
});
