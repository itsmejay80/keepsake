import "dotenv/config";

import { eq } from "drizzle-orm";

import { db } from "@karakeep/db";
import { bookmarkLinks } from "@karakeep/db/schema";
import {
  buildCrawlIdempotencyKey,
  LinkCrawlerQueue,
  loadAllPlugins,
  prepareQueue,
  QueuePriority,
  startQueue,
} from "@karakeep/shared-server";

import { CrawlerWorker } from "../workers/crawlerWorker";

/**
 * One-off maintenance CLI: re-runs the REAL crawler pipeline for a single
 * existing link bookmark (browser render -> parse subprocess -> DB + asset
 * writes), so a bookmark crawled by an older/buggy parser can be refreshed
 * without going through the queue or the API.
 *
 * Usage:
 *   pnpm exec tsx scripts/recrawlBookmark.ts --bookmark-id <id>
 */

const bookmarkId = (() => {
  const idx = process.argv.indexOf("--bookmark-id");
  const value = idx >= 0 ? process.argv[idx + 1] : undefined;
  if (!value) {
    console.error("Usage: tsx scripts/recrawlBookmark.ts --bookmark-id <id>");
    process.exit(2);
  }
  return value;
})();

const before = await db.query.bookmarkLinks.findFirst({
  where: eq(bookmarkLinks.id, bookmarkId),
});
if (!before) {
  console.error(`No link bookmark found with id ${bookmarkId}`);
  process.exit(2);
}

console.error(
  `[recrawl] ${bookmarkId}\n  before: title=${JSON.stringify(before.title)}\n` +
    `    status=${before.crawlStatus} contentAssetId=${before.contentAssetId} readerView=${before.readerViewStatus}`,
);

await loadAllPlugins();
await prepareQueue();
await LinkCrawlerQueue.ensureInit();

const payload = { bookmarkId, runInference: false };
await LinkCrawlerQueue.enqueue(payload, {
  priority: QueuePriority.Default,
  idempotencyKey: buildCrawlIdempotencyKey(payload),
});

const worker = await CrawlerWorker.build(LinkCrawlerQueue);
await startQueue();

// The runner never resolves until shutdown; we only need it alive while the
// recrawled bookmark is polled below.
void worker.run();
const deadline = Date.now() + 180_000;
let done = false;
while (Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 2_000));
  const row = await db.query.bookmarkLinks.findFirst({
    where: eq(bookmarkLinks.id, bookmarkId),
  });
  if (row && row.crawledAt?.getTime() !== before.crawledAt?.getTime()) {
    console.error(
      `[recrawl] ${bookmarkId}\n  after: title=${JSON.stringify(row.title)}\n` +
        `    description=${JSON.stringify(row.description?.slice(0, 160))}\n` +
        `    image=${row.imageUrl}\n    author=${row.author} publisher=${row.publisher}\n` +
        `    contentAssetId=${row.contentAssetId} readerView=${row.readerViewStatus} (${row.readerViewScore})`,
    );
    done = true;
    break;
  }
}

if (!done) {
  console.error(`[recrawl] ${bookmarkId} did not finish within 180s`);
  process.exit(1);
}

await worker.stop();
process.exit(0);
