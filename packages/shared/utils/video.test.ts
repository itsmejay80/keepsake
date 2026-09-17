import { describe, expect, test } from "vitest";

import { selectTranscriptLanguages, shouldProcessVideoUrl } from "./video";

describe("video processing", () => {
  test("processes YouTube for transcripts when video storage is disabled", () => {
    expect(shouldProcessVideoUrl("https://youtu.be/video", false)).toBe(true);
    expect(
      shouldProcessVideoUrl("https://www.youtube.com/watch?v=video", false),
    ).toBe(true);
    expect(shouldProcessVideoUrl("https://example.com/video", false)).toBe(
      false,
    );
  });

  test("keeps all creator-provided caption languages", () => {
    expect(
      selectTranscriptLanguages({
        subtitles: { en: [], fr: [], live_chat: [] },
        automatic_captions: { "en-orig": [], es: [] },
      }),
    ).toEqual(["en", "fr"]);
  });

  test("downloads only original automatic captions, not every translation", () => {
    expect(
      selectTranscriptLanguages({
        language: "en-US",
        automatic_captions: {
          ab: [],
          es: [],
          "en-orig": [],
          live_chat: [],
        },
      }),
    ).toEqual(["en-orig"]);
  });
});
