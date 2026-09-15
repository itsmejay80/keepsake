export function extractTweetId(url: string): string | null {
  const patterns = [
    /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
    /(?:twitter\.com|x\.com)\/i\/web\/status\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

export function extractXThreadStatusIds(
  html: string | null | undefined,
  fallbackId?: string | null,
): string[] {
  const fromAttributes = [
    ...(html ?? "").matchAll(/data-x-status-id="(\d+)"/g),
  ].map((match) => match[1]);
  const ids = [...new Set(fromAttributes.filter(Boolean))];

  if (ids.length === 0 && fallbackId) {
    return [fallbackId];
  }

  if (fallbackId && !ids.includes(fallbackId)) {
    return [fallbackId, ...ids];
  }

  return ids;
}
