import { JSDOM } from "jsdom";
import { fetchWithProxy } from "network";

import logger from "@karakeep/shared/logger";

import type { XThreadPostContent } from "./xReaderView";
import {
  buildXThreadReaderDocumentFromPosts,
  getXStatusId,
} from "./xReaderView";
import type { FxConversation, FxTweet } from "./xThreadConversation";
import { fxTweetToPost, selectAuthorThreadTweets } from "./xThreadConversation";

const MAX_THREAD_POSTS = 50;
const MAX_CONVERSATION_PAGES = 4;
const FETCH_TIMEOUT_MS = 8_000;
const FX_CONVERSATION_URL = "https://api.fxtwitter.com/2/conversation";
const FX_STATUS_URL = "https://api.fxtwitter.com/status";

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetchWithProxy(url, {
    headers: {
      accept: "application/json",
      "user-agent":
        "Mozilla/5.0 (compatible; Karakeep/1.0; +https://karakeep.app)",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchConversationPage(
  statusId: string,
  cursor?: string,
): Promise<FxConversation> {
  const url = new URL(`${FX_CONVERSATION_URL}/${statusId}`);
  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }
  return (await fetchJson(url.toString())) as FxConversation;
}

async function fetchSingleStatus(statusId: string): Promise<FxTweet | null> {
  const payload = (await fetchJson(`${FX_STATUS_URL}/${statusId}`)) as {
    tweet?: FxTweet;
    status?: FxTweet;
  };
  return payload.tweet ?? payload.status ?? null;
}

export async function fetchXThreadPosts(
  url: string,
): Promise<XThreadPostContent[] | null> {
  const statusId = getXStatusId(url);
  if (!statusId) {
    return null;
  }

  const merged: FxConversation = {
    status: undefined,
    thread: [],
    replies: [],
  };

  try {
    let cursor: string | undefined;
    for (let page = 0; page < MAX_CONVERSATION_PAGES; page++) {
      const conversation = await fetchConversationPage(statusId, cursor);
      merged.status = merged.status ?? conversation.status;
      merged.thread = [
        ...(merged.thread ?? []),
        ...(conversation.thread ?? []),
      ];
      merged.replies = [
        ...(merged.replies ?? []),
        ...(conversation.replies ?? []),
      ];
      const threadSoFar = selectAuthorThreadTweets(merged, statusId);
      if (threadSoFar.length >= MAX_THREAD_POSTS) {
        break;
      }
      const nextCursor = conversation.cursor?.bottom ?? undefined;
      if (!nextCursor || nextCursor === cursor) {
        break;
      }
      cursor = nextCursor;
    }
  } catch (error) {
    logger.warn(
      `[Crawler] Failed to fetch the X conversation for ${statusId}: ${error}`,
    );
  }

  let tweets = selectAuthorThreadTweets(merged, statusId);
  if (tweets.length === 0) {
    try {
      const single = await fetchSingleStatus(statusId);
      if (single) {
        tweets = [single];
      }
    } catch (error) {
      logger.warn(
        `[Crawler] Failed to fetch the X status ${statusId}: ${error}`,
      );
      return null;
    }
  }

  const posts = tweets
    .slice(0, MAX_THREAD_POSTS)
    .map((tweet) => fxTweetToPost(tweet))
    .filter((post): post is XThreadPostContent => post !== null);

  return posts.length > 0 ? posts : null;
}

export async function fetchXThreadReaderHtml(
  url: string,
): Promise<string | null> {
  const posts = await fetchXThreadPosts(url);
  if (!posts || posts.length === 0) {
    return null;
  }

  const dom = new JSDOM("<!doctype html><title>Thread</title>");
  try {
    const document = buildXThreadReaderDocumentFromPosts(
      dom.window.document,
      posts,
    );
    return document?.body.innerHTML ?? null;
  } finally {
    dom.window.close();
  }
}
