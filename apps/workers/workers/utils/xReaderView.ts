export interface XThreadPostRef {
  statusId: string;
  handle: string | null;
}

export interface HarvestedXPost extends XThreadPostRef {
  html: string;
}

export interface XThreadPostContent {
  statusId: string;
  handle: string | null;
  displayName: string | null;
  datetime: string | null;
  timeLabel: string | null;
  text: string;
  imageUrls: string[];
  quote: {
    handle: string | null;
    displayName: string | null;
    text: string;
    statusId: string | null;
  } | null;
  cardUrl: string | null;
  article: XArticleContent | null;
}

export interface XArticleContent {
  title: string;
  blocks: XArticleBlock[];
}

export interface XArticleBlock {
  type: string;
  text: string;
  inlineStyleRanges: {
    offset: number;
    length: number;
    style: string;
  }[];
}

interface XTweetRecord {
  statusId: string;
  handle: string | null;
  displayName: string | null;
  datetime: string | null;
  timeLabel: string | null;
  textHtml: string;
  imageUrls: string[];
  quote: {
    handle: string | null;
    displayName: string | null;
    textHtml: string;
    statusId: string | null;
  } | null;
  cardUrl: string | null;
  article: XArticleContent | null;
}

function getXHostname(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (
      hostname === "x.com" ||
      hostname.endsWith(".x.com") ||
      hostname === "twitter.com" ||
      hostname.endsWith(".twitter.com")
    ) {
      return hostname;
    }
    return null;
  } catch {
    return null;
  }
}

export function getXStatusId(url: string): string | null {
  if (!getXHostname(url)) {
    return null;
  }

  try {
    return new URL(url).pathname.match(/\/status\/(\d+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function ownQueryAll(article: Element, selector: string): Element[] {
  return [...article.querySelectorAll(selector)].filter(
    (element) => element.closest("article") === article,
  );
}

function ownQuery(article: Element, selector: string): Element | null {
  return ownQueryAll(article, selector)[0] ?? null;
}

function getTopLevelArticles(root: ParentNode): Element[] {
  return [...root.querySelectorAll("article")].filter(
    (article) => !article.parentElement?.closest("article"),
  );
}

function getArticleStatusId(article: Element): string | null {
  const time = ownQuery(article, "time");
  const href = time?.closest("a")?.getAttribute("href") ?? "";
  return href.match(/\/status\/(\d+)/)?.[1] ?? null;
}

function hrefPath(href: string): string {
  try {
    if (href.startsWith("http://") || href.startsWith("https://")) {
      return new URL(href).pathname;
    }
  } catch {
    // Fall through to the raw href.
  }
  return href;
}

function getArticleHandle(article: Element): string | null {
  const userName = ownQuery(article, '[data-testid="User-Name"]') ?? article;
  for (const link of userName.querySelectorAll("a[href]")) {
    if (link.closest("article") !== article) {
      continue;
    }
    const path = hrefPath(link.getAttribute("href") ?? "");
    const match = path.match(/^\/([A-Za-z0-9_]+)(?:\/|$)/);
    if (
      match &&
      match[1] !== "i" &&
      match[1] !== "intent" &&
      match[1] !== "search"
    ) {
      return match[1];
    }
  }
  return null;
}

function getArticleDisplayName(article: Element): string | null {
  const userName = ownQuery(article, '[data-testid="User-Name"]');
  if (!userName) {
    return null;
  }
  for (const link of userName.querySelectorAll("a")) {
    if (link.closest("article") !== article) {
      continue;
    }
    const text = (link.textContent ?? "").replace(/\s+/g, " ").trim();
    if (text && !text.startsWith("@")) {
      return text;
    }
  }
  return getArticleHandle(article);
}

function upgradeXImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.includes("twimg.com") &&
      !parsed.pathname.includes("/profile_images/")
    ) {
      parsed.searchParams.set("name", "large");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

function getArticleImageUrls(article: Element): string[] {
  const urls: string[] = [];
  for (const img of ownQueryAll(article, '[data-testid="tweetPhoto"] img')) {
    const src =
      img.getAttribute("src") ??
      img.getAttribute("data-src") ??
      img.getAttribute("srcset")?.split(/\s/)[0];
    if (
      !src ||
      src.startsWith("data:") ||
      src.includes("/profile_images/") ||
      src.includes("/emoji/")
    ) {
      continue;
    }
    urls.push(upgradeXImageUrl(src));
  }
  return [...new Set(urls)];
}

function getArticleCardUrl(article: Element): string | null {
  const card = ownQuery(article, '[data-testid="card.wrapper"] a[href]');
  return card?.getAttribute("href") ?? null;
}

function nestedArticle(article: Element): Element | null {
  return article.querySelector("article");
}

function extractTweetRecord(article: Element): XTweetRecord | null {
  const statusId = getArticleStatusId(article);
  if (!statusId) {
    return null;
  }

  const quoteArticle = nestedArticle(article);
  const textEl = ownQuery(article, '[data-testid="tweetText"]');
  const time = ownQuery(article, "time");
  const imageUrls = getArticleImageUrls(article);
  const textHtml = textEl?.innerHTML ?? "";

  if (!textHtml.trim() && imageUrls.length === 0 && !quoteArticle) {
    return null;
  }

  const quote = quoteArticle
    ? {
        handle: getArticleHandle(quoteArticle),
        displayName: getArticleDisplayName(quoteArticle),
        textHtml:
          ownQuery(quoteArticle, '[data-testid="tweetText"]')?.innerHTML ?? "",
        statusId: getArticleStatusId(quoteArticle),
      }
    : null;

  return {
    statusId,
    handle: getArticleHandle(article),
    displayName: getArticleDisplayName(article),
    datetime: time?.getAttribute("datetime") ?? null,
    timeLabel: (time?.textContent ?? "").trim() || null,
    textHtml,
    imageUrls,
    quote,
    cardUrl: getArticleCardUrl(article),
    article: null,
  };
}

function compareStatusIds(a: string, b: string): number {
  const aValue = BigInt(a);
  const bValue = BigInt(b);
  if (aValue === bValue) {
    return 0;
  }
  return aValue < bValue ? -1 : 1;
}

function sameHandle(a: string | null, b: string | null): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

function selectThreadRecords(
  records: XTweetRecord[],
  statusId: string,
  harvested: boolean,
): XTweetRecord[] {
  const targetIndex = records.findIndex(
    (record) => record.statusId === statusId,
  );
  const target = targetIndex >= 0 ? records[targetIndex] : records[0];
  if (!target) {
    return [];
  }

  if (harvested) {
    return records
      .filter((record) => sameHandle(record.handle, target.handle))
      .sort((left, right) => compareStatusIds(left.statusId, right.statusId));
  }

  if (targetIndex < 0) {
    return [target];
  }

  let start = targetIndex;
  while (
    start > 0 &&
    sameHandle(records[start - 1]?.handle ?? null, target.handle)
  ) {
    start--;
  }
  let end = targetIndex;
  while (
    end < records.length - 1 &&
    sameHandle(records[end + 1]?.handle ?? null, target.handle)
  ) {
    end++;
  }

  return records
    .slice(start, end + 1)
    .sort((left, right) => compareStatusIds(left.statusId, right.statusId));
}

export function selectHarvestedXThread<T extends XThreadPostRef>(
  posts: T[],
  statusId: string,
): T[] {
  const target = posts.find((post) => post.statusId === statusId) ?? posts[0];
  if (!target?.handle) {
    return target ? [target] : [];
  }

  return posts
    .filter((post) => sameHandle(post.handle, target.handle))
    .sort((left, right) => compareStatusIds(left.statusId, right.statusId));
}

function replaceTextNewlinesWithParagraphs(
  document: Document,
  html: string,
): Element[] {
  const template = document.createElement("template");
  template.innerHTML = html;
  const root = document.createElement("div");
  root.append(template.content);

  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, 4); // NodeFilter.SHOW_TEXT
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (/\r?\n/.test(node.data)) {
      textNodes.push(node);
    }
  }
  for (const textNode of textNodes) {
    const fragment = document.createDocumentFragment();
    const lines = textNode.data.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (index > 0) {
        fragment.append(document.createElement("br"));
      }
      fragment.append(document.createTextNode(line));
    });
    textNode.replaceWith(fragment);
  }

  root
    .querySelectorAll('[data-testid="tweet-text-show-more-link"]')
    .forEach((node) => node.remove());

  const htmlWithBreaks = root.innerHTML;
  const blocks = htmlWithBreaks
    .split(/<br\s*\/?>\s*<br\s*\/?>/i)
    .map((block) => block.replace(/(?:<br\s*\/?>)+/gi, "<br>").trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return [];
  }

  return blocks.map((block) => {
    const paragraph = document.createElement("p");
    paragraph.innerHTML = block;
    return paragraph;
  });
}

function appendTextContent(document: Document, parent: Element, html: string) {
  const paragraphs = replaceTextNewlinesWithParagraphs(document, html);
  for (const paragraph of paragraphs) {
    if (paragraph.textContent?.trim() || paragraph.querySelector("img, a")) {
      parent.append(paragraph);
    }
  }
}

function appendArticleText(
  document: Document,
  parent: Element,
  text: string,
  ranges: XArticleBlock["inlineStyleRanges"],
) {
  const boundaries = new Set([0, text.length]);
  const validRanges = ranges.filter(
    (range) =>
      range.length > 0 && range.offset >= 0 && range.offset < text.length,
  );
  for (const range of validRanges) {
    boundaries.add(range.offset);
    boundaries.add(Math.min(range.offset + range.length, text.length));
  }

  const points = [...boundaries].sort((left, right) => left - right);
  for (let index = 0; index < points.length - 1; index++) {
    const start = points[index]!;
    const end = points[index + 1]!;
    let node: Element = parent;
    for (const range of validRanges) {
      if (range.offset <= start && range.offset + range.length >= end) {
        const tag =
          range.style.toLowerCase() === "bold"
            ? "strong"
            : range.style.toLowerCase() === "italic"
              ? "em"
              : range.style.toLowerCase() === "underline"
                ? "u"
                : range.style.toLowerCase() === "strikethrough"
                  ? "s"
                  : range.style.toLowerCase() === "code"
                    ? "code"
                    : null;
        if (tag) {
          const wrapper = document.createElement(tag);
          node.append(wrapper);
          node = wrapper;
        }
      }
    }
    node.append(document.createTextNode(text.slice(start, end)));
  }
}

function appendArticleContent(
  document: Document,
  parent: Element,
  article: XArticleContent,
) {
  const section = document.createElement("section");
  section.setAttribute("data-x-article", "true");
  const title = document.createElement("h2");
  title.textContent = article.title;
  section.append(title);

  for (const block of article.blocks) {
    if (!block.text.trim()) continue;
    const type = block.type.toLowerCase();
    const textElement = document.createElement(
      type === "header-one" ? "h2" : type === "header-two" ? "h3" : "p",
    );
    appendArticleText(
      document,
      textElement,
      block.text,
      block.inlineStyleRanges,
    );
    if (type === "blockquote") {
      const quote = document.createElement("blockquote");
      quote.append(textElement);
      section.append(quote);
    } else {
      section.append(textElement);
    }
  }
  parent.append(section);
}

function formatTweetSection(
  document: Document,
  tweet: XTweetRecord,
): HTMLElement {
  const section = document.createElement("section");
  section.setAttribute("data-x-status-id", tweet.statusId);

  const header = document.createElement("header");
  const byline = document.createElement("p");
  if (tweet.displayName) {
    const name = document.createElement("strong");
    name.textContent = tweet.displayName;
    byline.append(name, document.createTextNode(" "));
  }
  if (tweet.handle) {
    const handleLink = document.createElement("a");
    handleLink.setAttribute("href", `https://x.com/${tweet.handle}`);
    handleLink.textContent = `@${tweet.handle}`;
    byline.append(handleLink);
  }
  if (tweet.datetime || tweet.timeLabel) {
    byline.append(document.createTextNode(" · "));
    const time = document.createElement("time");
    if (tweet.datetime) {
      time.setAttribute("datetime", tweet.datetime);
    }
    time.textContent = tweet.timeLabel ?? tweet.datetime ?? "";
    byline.append(time);
  }
  if (byline.textContent?.trim()) {
    header.append(byline);
    section.append(header);
  }

  appendTextContent(document, section, tweet.textHtml);

  for (const imageUrl of tweet.imageUrls) {
    const figure = document.createElement("figure");
    const image = document.createElement("img");
    image.setAttribute("src", imageUrl);
    image.setAttribute("alt", "");
    figure.append(image);
    section.append(figure);
  }

  if (tweet.quote && (tweet.quote.textHtml.trim() || tweet.quote.handle)) {
    const quote = document.createElement("blockquote");
    const quoteBy = [
      tweet.quote.displayName,
      tweet.quote.handle ? `@${tweet.quote.handle}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    if (quoteBy) {
      const quoteHeader = document.createElement("p");
      quoteHeader.textContent = quoteBy;
      quote.append(quoteHeader);
    }
    appendTextContent(document, quote, tweet.quote.textHtml);
    section.append(quote);
  }

  if (tweet.cardUrl) {
    const card = document.createElement("p");
    const cardLink = document.createElement("a");
    cardLink.setAttribute("href", tweet.cardUrl);
    cardLink.textContent = tweet.cardUrl;
    card.append(cardLink);
    section.append(card);
  }

  if (tweet.article) {
    appendArticleContent(document, section, tweet.article);
  }

  const permalink = document.createElement("p");
  const permalinkAnchor = document.createElement("a");
  const permalinkHref = `https://x.com/${tweet.handle ?? "i"}/status/${tweet.statusId}`;
  permalinkAnchor.setAttribute("href", permalinkHref);
  permalinkAnchor.textContent = permalinkHref;
  permalink.append(permalinkAnchor);
  section.append(permalink);

  return section;
}

function escapePlainText(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function readerDocumentFromRecords(
  document: Document,
  thread: XTweetRecord[],
): Document | null {
  if (thread.length === 0) {
    return null;
  }

  const readerDocument = document.implementation.createHTMLDocument(
    document.title,
  );
  const article = readerDocument.createElement("article");
  const heading = readerDocument.createElement("h1");
  const author =
    thread[0]?.displayName && thread[0]?.handle
      ? `${thread[0].displayName} (@${thread[0].handle})`
      : thread[0]?.handle
        ? `@${thread[0].handle}`
        : "X";
  heading.textContent =
    thread.length > 1 ? `Thread by ${author}` : `Post by ${author}`;
  article.append(heading);

  thread.forEach((tweet, index) => {
    if (index > 0) {
      article.append(readerDocument.createElement("hr"));
    }
    article.append(formatTweetSection(readerDocument, tweet));
  });
  readerDocument.body.append(article);

  return readerDocument;
}

export function buildXThreadReaderDocumentFromPosts(
  document: Document,
  posts: XThreadPostContent[],
): Document | null {
  const records: XTweetRecord[] = posts.map((post) => ({
    statusId: post.statusId,
    handle: post.handle,
    displayName: post.displayName,
    datetime: post.datetime,
    timeLabel: post.timeLabel,
    textHtml: escapePlainText(post.text),
    imageUrls: post.imageUrls,
    quote: post.quote
      ? {
          handle: post.quote.handle,
          displayName: post.quote.displayName,
          textHtml: escapePlainText(post.quote.text),
          statusId: post.quote.statusId,
        }
      : null,
    cardUrl: post.cardUrl,
    article: post.article,
  }));
  return readerDocumentFromRecords(document, records);
}

/**
 * X renders post text with CSS `white-space: pre-wrap`. Readability keeps the
 * newline characters but drops the page stylesheet, so Reader View collapses
 * all paragraphs into one. Rebuild the author's thread as semantic HTML
 * before Readability (or instead of it) so saved threads stay readable.
 */
export function buildXPostReaderDocument(
  document: Document,
  url: string,
): Document | null {
  const statusId = getXStatusId(url);
  if (!statusId) {
    return null;
  }

  const harvestedRoot = document.querySelector("[data-karakeep-x-thread]");
  const articles = getTopLevelArticles(harvestedRoot ?? document);
  const records = articles
    .map((article) => extractTweetRecord(article))
    .filter((record): record is XTweetRecord => record !== null);

  if (records.length === 0) {
    return null;
  }

  const thread = selectThreadRecords(records, statusId, harvestedRoot !== null);
  return readerDocumentFromRecords(document, thread);
}
