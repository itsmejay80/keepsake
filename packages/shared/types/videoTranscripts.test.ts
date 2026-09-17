import { describe, expect, test } from "vitest";

import {
  videoTranscriptToText,
  videoTranscriptToTimestampedText,
} from "./videoTranscripts";

describe("video transcripts", () => {
  const transcript = {
    segments: [
      { startMs: 5_000, endMs: 7_000, text: "  First   passage " },
      { startMs: 3_665_000, endMs: 3_670_000, text: "Second passage" },
    ],
  };

  test("normalizes segments into searchable text", () => {
    expect(videoTranscriptToText(transcript)).toBe(
      "First passage Second passage",
    );
  });

  test("preserves timestamps for AI citations and readable content", () => {
    expect(videoTranscriptToTimestampedText(transcript)).toBe(
      "[0:05] First passage\n[1:01:05] Second passage",
    );
  });

  test("returns null when no transcript is available", () => {
    expect(videoTranscriptToText(null)).toBeNull();
    expect(videoTranscriptToTimestampedText(undefined)).toBeNull();
  });
});
