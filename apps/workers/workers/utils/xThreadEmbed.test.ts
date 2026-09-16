import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";

import { buildXThreadReaderDocumentFromPosts } from "./xReaderView";
import type { FxConversation } from "./xThreadConversation";
import { fxTweetToPost, selectAuthorThreadTweets } from "./xThreadConversation";

function tweet({
  id,
  handle,
  name = handle,
  text,
  parent,
  photo,
}: {
  id: string;
  handle: string;
  name?: string;
  text: string;
  parent?: string;
  photo?: string;
}) {
  return {
    id,
    text,
    author: { screen_name: handle, name },
    created_timestamp: Number(id.slice(0, 10)),
    media: photo ? { photos: [{ type: "photo", url: photo }] } : { photos: [] },
    replying_to: parent ? { screen_name: handle, status: parent } : null,
  };
}

const conversation: FxConversation = {
  status: tweet({
    id: "10",
    handle: "alice",
    name: "Alice",
    text: "I have conducted an audit.\n\nCongress must investigate.",
    photo: "https://pbs.twimg.com/media/root.jpg?name=orig",
  }),
  thread: [
    tweet({
      id: "10",
      handle: "alice",
      name: "Alice",
      text: "I have conducted an audit.\n\nCongress must investigate.",
    }),
  ],
  replies: [
    tweet({
      id: "11",
      handle: "alice",
      text: "Evidence and Github in next post.",
      parent: "10",
    }),
    tweet({
      id: "12",
      handle: "alice",
      text: "Github https://github.com/example/repo",
      parent: "11",
      photo: "https://pbs.twimg.com/media/chart.jpg?name=orig",
    }),
    tweet({
      id: "13",
      handle: "bob",
      text: "Nice thread!",
      parent: "10",
    }),
    tweet({
      id: "14",
      handle: "alice",
      text: "Finale",
      parent: "12",
    }),
  ],
};

describe("selectAuthorThreadTweets", () => {
  test("keeps the author's self-reply chain and drops other users", () => {
    const thread = selectAuthorThreadTweets(conversation, "10");
    expect(thread.map((post) => post.id)).toEqual(["10", "11", "12", "14"]);
    expect(thread.some((post) => post.author?.screen_name === "bob")).toBe(
      false,
    );
  });

  test("still reconstructs the thread when a later status is saved", () => {
    expect(
      selectAuthorThreadTweets(conversation, "12").map((post) => post.id),
    ).toEqual(["10", "11", "12", "14"]);
  });
});

describe("fxTweetToPost + reader formatting", () => {
  test("formats the author's thread with paragraphs, images, and permalinks", () => {
    const posts = selectAuthorThreadTweets(conversation, "10")
      .map((item) => fxTweetToPost(item))
      .filter((post) => post !== null);

    const dom = new JSDOM("<!doctype html><title>Thread</title>");
    const document = buildXThreadReaderDocumentFromPosts(
      dom.window.document,
      posts,
    );
    const html = document?.body.innerHTML ?? "";

    expect(html).toContain("Thread by Alice (@alice)");
    expect(html).toContain("I have conducted an audit.");
    expect(html).toContain("Congress must investigate.");
    expect(html).toContain("Evidence and Github in next post.");
    expect(html).toContain("Finale");
    expect(html).not.toContain("Nice thread!");
    expect(html).toContain('data-x-status-id="10"');
    expect(html).toContain('data-x-status-id="14"');
    expect(html).toContain("https://pbs.twimg.com/media/root.jpg?name=orig");
    expect(html).toContain("https://pbs.twimg.com/media/chart.jpg?name=orig");
    expect(html).toContain("https://x.com/alice/status/12");
    expect(
      [...(document?.querySelectorAll("p") ?? [])].some(
        (paragraph) => paragraph.textContent === "I have conducted an audit.",
      ),
    ).toBe(true);
  });

  test("preserves the full body of an X Article attached to a post", () => {
    const post = fxTweetToPost({
      id: "2100262432413528336",
      text: "Here's how we built Hermes. https://x.com/i/article/2100051738812452864",
      author: { screen_name: "JacquelineSYC19", name: "Jacqueline Cheong" },
      article: {
        title: "How we built Hermes to support our entire team",
        content: {
          blocks: [
            {
              type: "unstyled",
              text: "At the time of writing, every one of us works alongside Hermes.",
              inlineStyleRanges: [],
            },
            {
              type: "header-two",
              text: "A brain with blinders",
              inlineStyleRanges: [],
            },
            {
              type: "unstyled",
              text: "Everyone gets a sidekick.",
              inlineStyleRanges: [{ offset: 0, length: 9, style: "Bold" }],
            },
          ],
        },
      },
    });

    expect(post).not.toBeNull();
    const dom = new JSDOM("<!doctype html><title>Post</title>");
    const document = buildXThreadReaderDocumentFromPosts(
      dom.window.document,
      post ? [post] : [],
    );

    expect(document?.body.textContent).toContain(
      "How we built Hermes to support our entire team",
    );
    expect(document?.body.textContent).toContain(
      "At the time of writing, every one of us works alongside Hermes.",
    );
    expect(document?.querySelector("h3")?.textContent).toBe(
      "A brain with blinders",
    );
    expect(
      [...(document?.querySelectorAll("strong") ?? [])].some(
        (element) => element.textContent?.trim() === "Everyone",
      ),
    ).toBe(true);
  });
});
