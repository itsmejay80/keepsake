export interface VideoCaptionMetadata {
  language?: string;
  subtitles?: Record<string, { name?: string }[]>;
  automatic_captions?: Record<string, { name?: string }[]>;
}

export function isYouTubeUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname === "youtube.com" || hostname === "youtu.be";
  } catch {
    return false;
  }
}

export function shouldProcessVideoUrl(url: string, downloadVideo: boolean) {
  return downloadVideo || isYouTubeUrl(url);
}

export function selectTranscriptLanguages(
  info: VideoCaptionMetadata,
): string[] {
  const manualLanguages = Object.keys(info.subtitles ?? {}).filter(
    (language) => language !== "live_chat",
  );
  if (manualLanguages.length > 0) return manualLanguages;

  const automaticLanguages = Object.keys(info.automatic_captions ?? {}).filter(
    (language) => language !== "live_chat",
  );
  const originals = automaticLanguages.filter((language) =>
    language.endsWith("-orig"),
  );
  if (originals.length > 0) return originals;
  if (info.language) {
    const exact = automaticLanguages.find(
      (language) => language === info.language,
    );
    if (exact) return [exact];
    const baseLanguage = info.language.split("-")[0];
    const base = automaticLanguages.find(
      (language) => language === baseLanguage,
    );
    if (base) return [base];
  }
  return automaticLanguages.slice(0, 1);
}
