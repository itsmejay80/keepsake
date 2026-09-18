"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { useSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  Captions,
  ChevronDown,
  Highlighter,
  Languages,
  LoaderCircle,
  LocateFixed,
  Play,
} from "lucide-react";

import { useCreateHighlight } from "@karakeep/shared-react/hooks/highlights";
import { useTRPC } from "@karakeep/shared-react/trpc";
import { BookmarkTypes, ZBookmark } from "@karakeep/shared/types/bookmarks";
import type { ZHighlight } from "@karakeep/shared/types/highlights";
import type { ZVideoTranscriptSegment } from "@karakeep/shared/types/videoTranscripts";

import { useClientConfig } from "@/lib/clientConfig";

import { HIGHLIGHT_COLOR_MAP } from "../highlights";
import { ContentRenderer } from "./types";

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function canRenderYouTube(bookmark: ZBookmark): boolean {
  return (
    bookmark.content.type === BookmarkTypes.LINK &&
    extractYouTubeVideoId(bookmark.content.url) !== null
  );
}

function formatTime(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    : `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function nodeElement(node: Node) {
  return node instanceof Element ? node : node.parentElement;
}

function offsetWithin(element: Element, node: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(element);
  range.setEnd(node, offset);
  return range.toString().length;
}

interface PendingHighlight {
  startOffset: number;
  endOffset: number;
  startTime: number;
  endTime: number;
  text: string;
}

function SegmentText({
  segment,
  segmentOffset,
  highlights,
}: {
  segment: ZVideoTranscriptSegment;
  segmentOffset: number;
  highlights: ZHighlight[];
}) {
  const overlapping = highlights.filter(
    (highlight) =>
      highlight.startOffset < segmentOffset + segment.text.length &&
      highlight.endOffset > segmentOffset,
  );
  if (overlapping.length === 0) return segment.text;

  const boundaries = new Set([0, segment.text.length]);
  for (const highlight of overlapping) {
    boundaries.add(Math.max(0, highlight.startOffset - segmentOffset));
    boundaries.add(
      Math.min(segment.text.length, highlight.endOffset - segmentOffset),
    );
  }
  const cuts = [...boundaries].sort((a, b) => a - b);
  return cuts.slice(0, -1).map((start, index) => {
    const end = cuts[index + 1];
    const highlight = overlapping.find(
      (item) =>
        item.startOffset <= segmentOffset + start &&
        item.endOffset >= segmentOffset + end,
    );
    const text = segment.text.slice(start, end);
    return highlight ? (
      <mark
        key={`${start}-${end}`}
        data-highlight-id={highlight.id}
        className={cn(
          "rounded-sm bg-transparent",
          HIGHLIGHT_COLOR_MAP.bg[highlight.color],
        )}
      >
        {text}
      </mark>
    ) : (
      <span key={`${start}-${end}`}>{text}</span>
    );
  });
}

function YouTubeRendererComponent({ bookmark }: { bookmark: ZBookmark }) {
  const api = useTRPC();
  const clientConfig = useClientConfig();
  const { data: session } = useSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<string>();
  const [activeIndex, setActiveIndex] = useState(-1);
  const [autoScroll, setAutoScroll] = useState(true);
  const [embedStart, setEmbedStart] = useState(0);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [pendingHighlight, setPendingHighlight] =
    useState<PendingHighlight | null>(null);

  const transcriptsEnabled = clientConfig.crawler.videoTranscripts;

  const { data: transcriptData, isPending } = useQuery(
    api.bookmarks.getVideoTranscripts.queryOptions(
      { bookmarkId: bookmark.id },
      {
        enabled: transcriptsEnabled,
        refetchInterval: (query) => {
          if (query.state.data?.transcripts.length) return false;
          const twoMinutes = 2 * 60 * 1000;
          return Date.now() - bookmark.createdAt.valueOf() < twoMinutes
            ? 2_000
            : false;
        },
      },
    ),
  );
  const { data: highlightData } = useQuery(
    api.highlights.getForBookmark.queryOptions({ bookmarkId: bookmark.id }),
  );
  const { mutate: createHighlight, isPending: isCreatingHighlight } =
    useCreateHighlight({
      onSuccess: () => {
        setPendingHighlight(null);
        window.getSelection()?.removeAllRanges();
        toast({ description: "Timestamped highlight created" });
      },
      onError: () =>
        toast({
          variant: "destructive",
          description: "Could not create highlight",
        }),
    });

  const videoId =
    bookmark.content.type === BookmarkTypes.LINK
      ? extractYouTubeVideoId(bookmark.content.url)
      : null;

  const transcripts = transcriptData?.transcripts ?? [];
  const transcript =
    transcripts.find((item) => item.language === language) ??
    transcripts.find((item) => item.isDefault) ??
    transcripts[0];
  const offsets = useMemo(() => {
    let offset = 0;
    return (transcript?.segments ?? []).map((segment) => {
      const current = offset;
      offset += segment.text.length + 1;
      return current;
    });
  }, [transcript]);
  const highlights = (highlightData?.highlights ?? []).filter(
    (highlight) =>
      highlight.startTime != null &&
      (!highlight.transcriptLanguage ||
        highlight.transcriptLanguage === transcript?.language),
  );
  const isOwner = session?.user?.id === bookmark.userId;
  const isTranscriptProcessing =
    !transcript && Date.now() - bookmark.createdAt.valueOf() < 2 * 60 * 1000;

  useEffect(() => {
    if (!isTranscriptOpen || !autoScroll || activeIndex < 0) return;
    transcriptRef.current
      ?.querySelector(`[data-segment-index="${activeIndex}"]`)
      ?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "center",
      });
  }, [activeIndex, autoScroll, isTranscriptOpen]);

  useEffect(() => {
    const onSeek = (event: Event) => {
      const detail = (
        event as CustomEvent<
          number | { milliseconds: number; highlightId?: string }
        >
      ).detail;
      const milliseconds =
        typeof detail === "number" ? detail : detail.milliseconds;
      if (!Number.isFinite(milliseconds)) return;
      setIsTranscriptOpen(true);
      if (videoRef.current) {
        videoRef.current.currentTime = milliseconds / 1000;
        void videoRef.current.play();
      } else {
        setEmbedStart(Math.floor(milliseconds / 1000));
      }
      if (typeof detail !== "number" && detail.highlightId) {
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            transcriptRef.current
              ?.querySelector(`[data-highlight-id="${detail.highlightId}"]`)
              ?.scrollIntoView({ block: "center" }),
          ),
        );
      }
    };
    window.addEventListener("karakeep:seek-video", onSeek);
    return () => window.removeEventListener("karakeep:seek-video", onSeek);
  }, []);

  const seekTo = (milliseconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = milliseconds / 1000;
      void videoRef.current.play();
    } else {
      setEmbedStart(Math.floor(milliseconds / 1000));
    }
  };

  const updateActiveSegment = () => {
    const currentMs = (videoRef.current?.currentTime ?? 0) * 1000;
    let index = -1;
    for (let i = 0; i < (transcript?.segments.length ?? 0); i++) {
      if (transcript!.segments[i].startMs > currentMs) break;
      index = i;
    }
    setActiveIndex(index);
  };

  const captureSelection = () => {
    const selection = window.getSelection();
    if (
      !selection ||
      selection.isCollapsed ||
      selection.rangeCount === 0 ||
      !transcript
    ) {
      setPendingHighlight(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const startElement = nodeElement(
      range.startContainer,
    )?.closest<HTMLElement>("[data-transcript-text]");
    const endElement = nodeElement(range.endContainer)?.closest<HTMLElement>(
      "[data-transcript-text]",
    );
    if (
      !startElement ||
      !endElement ||
      !transcriptRef.current?.contains(startElement) ||
      !transcriptRef.current.contains(endElement)
    ) {
      setPendingHighlight(null);
      return;
    }
    const startIndex = Number(startElement.dataset.segmentIndex);
    const endIndex = Number(endElement.dataset.segmentIndex);
    const text = selection.toString().replace(/\s+/g, " ").trim();
    if (!text) return;
    setPendingHighlight({
      startOffset:
        offsets[startIndex] +
        offsetWithin(startElement, range.startContainer, range.startOffset),
      endOffset:
        offsets[endIndex] +
        offsetWithin(endElement, range.endContainer, range.endOffset),
      startTime: transcript.segments[startIndex].startMs,
      endTime: transcript.segments[endIndex].endMs,
      text,
    });
  };

  if (bookmark.content.type !== BookmarkTypes.LINK || !videoId) return null;

  return (
    <div className="h-full min-h-0 w-full overflow-y-auto bg-muted/20 [scrollbar-gutter:stable]">
      <div className="mx-auto w-full max-w-5xl p-3 sm:p-5">
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-sm ring-1 ring-black/10 dark:ring-white/10">
          {bookmark.content.videoAssetId ? (
            /* eslint-disable-next-line jsx-a11y/media-has-caption -- captions are rendered as the synchronized transcript beside the player */
            <video
              ref={videoRef}
              className="h-full w-full"
              controls
              onTimeUpdate={updateActiveSegment}
            >
              <source src={`/api/assets/${bookmark.content.videoAssetId}`} />
              Your browser does not support video playback.
            </video>
          ) : (
            <iframe
              key={embedStart}
              src={`https://www.youtube.com/embed/${videoId}?start=${embedStart}&autoplay=${embedStart > 0 ? 1 : 0}`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
          )}
        </div>

        {transcriptsEnabled && (
          <section className="mt-3 overflow-hidden rounded-xl bg-background shadow-sm ring-1 ring-black/5 dark:ring-white/10">
            <button
              type="button"
              className="flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              aria-expanded={isTranscriptOpen}
              aria-controls={`youtube-transcript-${bookmark.id}`}
              onClick={() => setIsTranscriptOpen((open) => !open)}
            >
              <Captions className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">
                  {isTranscriptOpen ? "Hide transcript" : "Show transcript"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {transcript
                    ? `${transcript.segments.length} timestamped passages`
                    : isTranscriptProcessing
                      ? "Preparing timestamped transcript…"
                      : "Transcript availability"}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-150 ease-out motion-reduce:transition-none",
                  isTranscriptOpen && "rotate-180",
                )}
              />
            </button>

            {isTranscriptOpen && (
              <div
                id={`youtube-transcript-${bookmark.id}`}
                className="border-t"
              >
                <header className="flex min-h-14 flex-wrap items-center gap-2 border-b px-3 py-2 sm:px-4">
                  <div className="mr-auto">
                    <h2 className="text-sm font-semibold">Transcript</h2>
                    {transcript && (
                      <p className="text-xs text-muted-foreground">
                        {transcript.languageName ?? transcript.language}
                        {transcript.isAutoGenerated ? " · Auto-generated" : ""}
                      </p>
                    )}
                  </div>
                  {pendingHighlight && isOwner && (
                    <Button
                      size="sm"
                      onClick={() =>
                        createHighlight({
                          bookmarkId: bookmark.id,
                          ...pendingHighlight,
                          transcriptLanguage: transcript?.language,
                          color: "yellow",
                          note: null,
                        })
                      }
                      disabled={isCreatingHighlight}
                    >
                      <Highlighter className="mr-1.5 size-4" />
                      Highlight {formatTime(pendingHighlight.startTime)}
                    </Button>
                  )}
                  {transcripts.length > 1 && (
                    <Select
                      value={transcript?.language}
                      onValueChange={(value) => {
                        setLanguage(value);
                        setActiveIndex(-1);
                        setPendingHighlight(null);
                      }}
                    >
                      <SelectTrigger
                        className="h-9 w-auto min-w-28"
                        aria-label="Caption language"
                      >
                        <Languages className="mr-2 size-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {transcripts.map((item) => (
                          <SelectItem key={item.language} value={item.language}>
                            {item.languageName ?? item.language}
                            {item.isAutoGenerated ? " (auto)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {transcript && bookmark.content.videoAssetId && (
                    <Button
                      variant={autoScroll ? "secondary" : "ghost"}
                      size="icon"
                      className="size-9"
                      aria-label="Toggle transcript autoscroll"
                      aria-pressed={autoScroll}
                      onClick={() => setAutoScroll((value) => !value)}
                    >
                      <LocateFixed className="size-4" />
                    </Button>
                  )}
                </header>

                <div
                  ref={transcriptRef}
                  role="region"
                  aria-label="Transcript passages"
                  className="max-h-[60vh] overflow-y-auto px-3 py-4 sm:px-5"
                  onMouseUp={captureSelection}
                >
                  {isPending || isTranscriptProcessing ? (
                    <div className="space-y-4" aria-label="Loading transcript">
                      {isTranscriptProcessing && !isPending && (
                        <div className="mb-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <LoaderCircle className="size-4 motion-safe:animate-spin" />
                          Preparing transcript…
                        </div>
                      )}
                      {[72, 88, 64, 80].map((width) => (
                        <div key={width} className="flex gap-3">
                          <div className="h-4 w-10 animate-pulse rounded bg-muted" />
                          <div
                            className="h-4 animate-pulse rounded bg-muted"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      ))}
                    </div>
                  ) : transcript ? (
                    <div className="mx-auto max-w-2xl space-y-1">
                      {transcript.segments.map((segment, index) => (
                        <div
                          key={`${segment.startMs}-${index}`}
                          data-segment-index={index}
                          className={cn(
                            "group flex scroll-my-20 gap-3 rounded-md px-2 py-2 transition-colors",
                            index === activeIndex && "bg-primary/10",
                          )}
                          style={{
                            contentVisibility: "auto",
                            containIntrinsicSize: "0 52px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => seekTo(segment.startMs)}
                            className="h-11 min-w-12 rounded px-1 text-left font-mono text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={`Seek video to ${formatTime(segment.startMs)}`}
                          >
                            {formatTime(segment.startMs)}
                          </button>
                          <p
                            data-transcript-text
                            data-segment-index={index}
                            className="select-text text-base leading-7 text-foreground"
                          >
                            <SegmentText
                              segment={segment}
                              segmentOffset={offsets[index]}
                              highlights={highlights}
                            />
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 px-6 text-center">
                      <Languages className="size-8 text-muted-foreground" />
                      <p className="font-medium">No transcript available</p>
                      <p className="max-w-sm text-sm text-muted-foreground">
                        This video does not provide captions, or it was archived
                        before transcript support was enabled.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export const youTubeRenderer: ContentRenderer = {
  id: "youtube",
  name: "YouTube",
  icon: Play,
  canRender: canRenderYouTube,
  component: YouTubeRendererComponent,
  priority: 10,
};
