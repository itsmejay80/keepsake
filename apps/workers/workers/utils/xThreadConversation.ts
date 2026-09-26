import type { XArticleContent, XThreadPostContent } from "./xReaderView";

interface FxAuthor {
  screen_name?: string;
  name?: string;
}

interface FxMediaItem {
  type?: string;
  url?: string;
}

interface FxReplyTo {
  screen_name?: string;
  status?: string;
}

export interface FxTweet {
  id?: string;
  text?: string;
  created_at?: string;
  created_timestamp?: number;
  author?: FxAuthor;
  media?: {
    all?: FxMediaItem[];
    photos?: FxMediaItem[];
  };
  quote?: FxTweet | null;
  replying_to?: FxReplyTo | string | null;
  replying_to_status?: string | null;
  article?: {
    title?: string;
    content?: {
      blocks?: {
        type?: string;
        text?: string;
        inlineStyleRanges?: {
          offset?: number;
          length?: number;
          style?: string;
        }[];
      }[];
    };
  } | null;
}

export interface FxConversation {
  status?: FxTweet | null;
  thread?: FxTweet[] | null;
  replies?: FxTweet[] | null;
  cursor?: { bottom?: string | null } | null;
}

function sameHandle(
  a: string | null | undefined,
  b: string | null | undefined,
) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

function replyParentId(tweet: FxTweet): string | null {
  if (tweet.replying_to && typeof tweet.replying_to === "object") {
    return tweet.replying_to.status ?? null;
  }
  return tweet.replying_to_status ?? null;
}

function compareStatusIds(a: string, b: string): number {
  const left = BigInt(a);
  const right = BigInt(b);
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function collectTweets(conversation: FxConversation): FxTweet[] {
  return [
    conversation.status,
    ...(conversation.thread ?? []),
    ...(conversation.replies ?? []),
  ].filter((tweet): tweet is FxTweet => !!tweet?.id);
}

export function selectAuthorThreadTweets(
  conversation: FxConversation,
  statusId: string,
): FxTweet[] {
  const byId = new Map<string, FxTweet>();
  for (const tweet of collectTweets(conversation)) {
    if (!byId.has(tweet.id!)) {
      byId.set(tweet.id!, tweet);
    }
  }

  const target = byId.get(statusId) ?? conversation.status ?? undefined;
  if (!target?.id) {
    return [];
  }

  const handle = target.author?.screen_name ?? null;
  const sameAuthor = [...byId.values()].filter((tweet) =>
    sameHandle(tweet.author?.screen_name, handle),
  );
  if (!handle) {
    return [target];
  }

  const sameIds = new Set(sameAuthor.map((tweet) => tweet.id!));
  const adjacency = new Map<string, Set<string>>();
  const link = (from: string, to: string) => {
    const neighbors = adjacency.get(from) ?? new Set<string>();
    neighbors.add(to);
    adjacency.set(from, neighbors);
  };
  for (const tweet of sameAuthor) {
    const parent = replyParentId(tweet);
    if (parent && sameIds.has(parent)) {
      link(tweet.id!, parent);
      link(parent, tweet.id!);
    }
  }

  const seen = new Set<string>();
  const stack = [target.id];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    for (const neighbor of adjacency.get(id) ?? []) {
      stack.push(neighbor);
    }
  }

  return [...seen]
    .map((id) => byId.get(id))
    .filter((tweet): tweet is FxTweet => !!tweet)
    .sort((left, right) => compareStatusIds(left.id!, right.id!));
}

function mediaUrls(tweet: FxTweet): string[] {
  const photos = [
    ...(tweet.media?.photos ?? []),
    ...(tweet.media?.all ?? []).filter((item) => item.type === "photo"),
  ];
  return [
    ...new Set(photos.map((item) => item.url).filter(Boolean)),
  ] as string[];
}

function toIsoDate(tweet: FxTweet): string | null {
  if (typeof tweet.created_timestamp === "number") {
    return new Date(tweet.created_timestamp * 1000).toISOString();
  }
  if (tweet.created_at) {
    const parsed = new Date(tweet.created_at);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
}

function articleContent(tweet: FxTweet): XArticleContent | null {
  const title = tweet.article?.title?.trim();
  const blocks = tweet.article?.content?.blocks;
  if (!title || !blocks) {
    return null;
  }

  return {
    title,
    blocks: blocks
      .filter((block) => typeof block.text === "string" && block.text.trim())
      .map((block) => ({
        type: block.type ?? "unstyled",
        text: block.text!,
        inlineStyleRanges: (block.inlineStyleRanges ?? []).flatMap((range) =>
          typeof range.offset === "number" &&
          typeof range.length === "number" &&
          typeof range.style === "string"
            ? [
                {
                  offset: range.offset,
                  length: range.length,
                  style: range.style,
                },
              ]
            : [],
        ),
      })),
  };
}

export function fxTweetToPost(tweet: FxTweet): XThreadPostContent | null {
  if (!tweet.id) {
    return null;
  }
  const text = tweet.text?.trim() ?? "";
  const imageUrls = mediaUrls(tweet);
  const article = articleContent(tweet);
  if (!text && imageUrls.length === 0 && !tweet.quote && !article) {
    return null;
  }

  return {
    statusId: tweet.id,
    handle: tweet.author?.screen_name ?? null,
    displayName: tweet.author?.name ?? null,
    datetime: toIsoDate(tweet),
    timeLabel: null,
    text,
    imageUrls,
    quote: tweet.quote?.id
      ? {
          handle: tweet.quote.author?.screen_name ?? null,
          displayName: tweet.quote.author?.name ?? null,
          text: tweet.quote.text ?? "",
          statusId: tweet.quote.id,
        }
      : null,
    cardUrl: null,
    article,
  };
}
