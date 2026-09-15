export function getReaderViewWhiteSpace(
  sourceUrl: string | undefined,
): "pre-line" | undefined {
  if (!sourceUrl) {
    return undefined;
  }

  try {
    const url = new URL(sourceUrl);
    const hostname = url.hostname.replace(/^www\./, "");
    const isX =
      hostname === "x.com" ||
      hostname.endsWith(".x.com") ||
      hostname === "twitter.com" ||
      hostname.endsWith(".twitter.com");
    const isStatus = /\/status\/\d+/.test(url.pathname);
    return isX && isStatus ? "pre-line" : undefined;
  } catch {
    return undefined;
  }
}
