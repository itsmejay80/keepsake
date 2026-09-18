import fs from "fs";
import * as os from "os";
import path from "path";
import { eq } from "drizzle-orm";
import { execa } from "execa";
import { workerStatsCounter } from "metrics";
import {
  getProxyAgent,
  resolveValidatedRedirectUrl,
  selectRunProxies,
} from "network";
import { withWorkerEventLog, withWorkerTracing } from "workerTracing";

import { db } from "@karakeep/db";
import { AssetTypes, videoTranscripts } from "@karakeep/db/schema";
import {
  addLogFields,
  EmbeddingsQueue,
  OpenAIQueue,
  QuotaService,
  StorageQuotaError,
  triggerSearchReindex,
  VideoWorkerQueue,
  ZVideoRequest,
  zvideoRequestSchema,
} from "@karakeep/shared-server";
import {
  ASSET_TYPES,
  newAssetId,
  saveAssetFromFile,
  silentDeleteAsset,
} from "@karakeep/shared/assetdb";
import serverConfig from "@karakeep/shared/config";
import logger from "@karakeep/shared/logger";
import { DequeuedJob, getQueueClient } from "@karakeep/shared/queueing";
import type { ZVideoTranscriptSegment } from "@karakeep/shared/types/videoTranscripts";
import {
  selectTranscriptLanguages,
  VideoCaptionMetadata,
} from "@karakeep/shared/utils/video";

import { getBookmarkDetails, updateAsset } from "../workerUtils";

const TMP_FOLDER = path.join(os.tmpdir(), "video_downloads");

export class VideoWorker {
  static async build() {
    logger.info("Starting video worker ...");

    return (await getQueueClient())!.createRunner<ZVideoRequest>(
      VideoWorkerQueue,
      {
        run: withWorkerTracing(
          "videoWorker.run",
          withWorkerEventLog("videoWorker.run", runWorker),
        ),
        onComplete: async (job) => {
          workerStatsCounter.labels("video", "completed").inc();
          const jobId = job.id;
          logger.info(
            `[VideoCrawler][${jobId}] Video Download Completed successfully`,
          );
          return Promise.resolve();
        },
        onError: async (job) => {
          workerStatsCounter.labels("video", "failed").inc();
          if (job.numRetriesLeft == 0) {
            workerStatsCounter.labels("video", "failed_permanent").inc();
          }
          const jobId = job.id;
          logger.error(
            `[VideoCrawler][${jobId}] Video Download job failed: ${job.error}`,
          );
          return Promise.resolve();
        },
      },
      {
        pollIntervalMs: 1000,
        timeoutSecs: serverConfig.crawler.downloadVideoTimeout,
        concurrency: 1,
        validator: zvideoRequestSchema,
      },
    );
  }
}

function prepareYtDlpArguments(
  url: string,
  proxy: string | undefined,
  assetPath: string,
  transcriptLanguages: string[],
) {
  // yt-dlp performs its own HTTP requests and can follow redirects that this
  // process cannot validate. Full SSRF protection depends on an egress proxy or
  // network policy that blocks internal/private targets.
  const ytDlpArguments = [url];
  if (
    serverConfig.crawler.downloadVideo &&
    serverConfig.crawler.maxVideoDownloadSize > 0
  ) {
    ytDlpArguments.push(
      "-f",
      `best[filesize<${serverConfig.crawler.maxVideoDownloadSize}M]`,
    );
  }

  ytDlpArguments.push(...serverConfig.crawler.ytDlpArguments);
  if (transcriptLanguages.length > 0) {
    ytDlpArguments.push(
      "--write-subs",
      "--write-auto-subs",
      "--sub-langs",
      transcriptLanguages.join(","),
      "--sub-format",
      "json3",
    );
  }
  if (!serverConfig.crawler.downloadVideo) {
    ytDlpArguments.push("--skip-download");
  }
  ytDlpArguments.push("-o", assetPath);
  ytDlpArguments.push("--no-playlist");
  if (proxy) {
    ytDlpArguments.push("--proxy", proxy);
  }
  return ytDlpArguments;
}

async function runWorker(job: DequeuedJob<ZVideoRequest>) {
  const jobId = job.id;
  const { bookmarkId } = job.data;
  addLogFields<"videoWorker.run">({ "bookmark.id": bookmarkId });

  const {
    url,
    userId,
    videoAssetId: oldVideoAssetId,
  } = await getBookmarkDetails(bookmarkId);

  const runProxy = selectRunProxies();
  let normalizedUrl: string;
  try {
    const resolvedUrl = await resolveValidatedRedirectUrl(
      url,
      { signal: job.abortSignal },
      runProxy,
    );
    normalizedUrl = resolvedUrl.toString();
  } catch (error) {
    logger.warn(
      `[VideoCrawler][${jobId}] Skipping video download for "${url}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return;
  }

  const videoAssetId = newAssetId();
  let assetPath = `${TMP_FOLDER}/${videoAssetId}`;
  await fs.promises.mkdir(TMP_FOLDER, { recursive: true });

  const proxy = getProxyAgent(normalizedUrl, runProxy);
  let info: YtDlpInfo;
  try {
    info = await fetchYtDlpInfo(
      normalizedUrl,
      proxy?.proxy.toString(),
      job.abortSignal,
    );
  } catch (error) {
    logger.warn(
      `[VideoCrawler][${jobId}] Failed to inspect media at "${normalizedUrl}": ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }
  const transcriptLanguages = serverConfig.crawler.videoTranscripts
    ? selectTranscriptLanguages(info)
    : [];
  const ytDlpArguments = prepareYtDlpArguments(
    normalizedUrl,
    proxy?.proxy.toString(),
    assetPath,
    transcriptLanguages,
  );

  let transcripts: Awaited<ReturnType<typeof readDownloadedTranscripts>> = [];
  try {
    logger.info(
      `[VideoCrawler][${jobId}] Attempting to download a file from "${normalizedUrl}" to "${assetPath}" using the following arguments: "${ytDlpArguments}"`,
    );

    await execa("yt-dlp", ytDlpArguments, {
      cancelSignal: job.abortSignal,
    });
    transcripts = await readDownloadedTranscripts(videoAssetId, info);
    await deleteTranscriptSidecars(videoAssetId);
    const downloadPath = await findVideoAssetFile(videoAssetId);
    if (!downloadPath && transcripts.length === 0) {
      logger.info(
        `[VideoCrawler][${jobId}] yt-dlp found neither downloadable media nor captions. Skipping ...`,
      );
      return;
    }
    if (downloadPath) assetPath = downloadPath;
  } catch (e) {
    const err = e as Error;
    if (
      err.message.includes("ERROR: Unsupported URL:") ||
      err.message.includes("No media found")
    ) {
      logger.info(
        `[VideoCrawler][${jobId}] Skipping video download from "${normalizedUrl}", because it's not one of the supported yt-dlp URLs`,
      );
      return;
    }
    const genericError = `[VideoCrawler][${jobId}] Failed to download media or captions from "${normalizedUrl}"`;
    if ("stderr" in err) {
      logger.error(`${genericError}: ${err.stderr}`);
    } else {
      logger.error(genericError);
    }
    await deleteLeftOverAssetFile(jobId, videoAssetId);
    return;
  }

  if (transcripts.length > 0) {
    if (!serverConfig.crawler.videoTranscripts) {
      logger.info(
        `[VideoCrawler][${jobId}] Skipping transcript storage because it is disabled in the config.`,
      );
    } else {
      replaceTranscripts(bookmarkId, transcripts);
      const enqueueOpts = { priority: job.priority, groupId: userId };
      await Promise.all([
        triggerSearchReindex(bookmarkId, enqueueOpts),
        EmbeddingsQueue.enqueue(
          { bookmarkId, type: "embed", runTaggingOnComplete: false },
          enqueueOpts,
        ),
        OpenAIQueue.enqueue({ bookmarkId, type: "summarize" }, enqueueOpts),
      ]);
      logger.info(
        `[VideoCrawler][${jobId}] Stored ${transcripts.length} transcript language(s) for "${normalizedUrl}"`,
      );
    }
  }

  if (!serverConfig.crawler.downloadVideo) {
    logger.info(
      `[VideoCrawler][${jobId}] Skipping video storage because it is disabled in the config.`,
    );
    return;
  }

  const downloadPath = await findVideoAssetFile(videoAssetId);
  if (!downloadPath) return;
  assetPath = downloadPath;

  logger.info(
    `[VideoCrawler][${jobId}] Finished downloading a file from "${normalizedUrl}" to "${assetPath}"`,
  );

  // Get file size and check quota before saving
  const stats = await fs.promises.stat(assetPath);
  const fileSize = stats.size;

  try {
    const quotaApproved = await QuotaService.checkStorageQuota(
      db,
      userId,
      fileSize,
    );

    await saveAssetFromFile({
      userId,
      assetId: videoAssetId,
      assetPath,
      metadata: { contentType: ASSET_TYPES.VIDEO_MP4 },
      quotaApproved,
    });

    db.transaction((txn) => {
      updateAsset(
        oldVideoAssetId,
        {
          id: videoAssetId,
          bookmarkId,
          userId,
          assetType: AssetTypes.LINK_VIDEO,
          contentType: ASSET_TYPES.VIDEO_MP4,
          size: fileSize,
        },
        txn,
      );
    });
    await silentDeleteAsset(userId, oldVideoAssetId);

    logger.info(
      `[VideoCrawler][${jobId}] Finished downloading video from "${normalizedUrl}" and adding it to the database`,
    );
  } catch (error) {
    if (error instanceof StorageQuotaError) {
      logger.warn(
        `[VideoCrawler][${jobId}] Skipping video storage due to quota exceeded: ${error.message}`,
      );
      await deleteLeftOverAssetFile(jobId, videoAssetId);
      return;
    }
    throw error;
  }
}

/**
 * Deletes leftover assets in case the download fails
 *
 * @param jobId the id of the job
 * @param assetId the id of the asset to delete
 */
async function deleteLeftOverAssetFile(
  jobId: string,
  assetId: string,
): Promise<void> {
  let assetFile;
  try {
    assetFile = await findVideoAssetFile(assetId);
  } catch {
    // ignore exception, no asset file was found
    await deleteTranscriptSidecars(assetId);
    return;
  }
  if (!assetFile) {
    await deleteTranscriptSidecars(assetId);
    return;
  }
  logger.info(
    `[VideoCrawler][${jobId}] Deleting leftover video asset "${assetFile}".`,
  );
  try {
    await fs.promises.rm(assetFile);
  } catch {
    logger.error(
      `[VideoCrawler][${jobId}] Failed deleting leftover video asset "${assetFile}".`,
    );
  }
  await deleteTranscriptSidecars(assetId);
}

/**
 * yt-dlp automatically adds a file ending to the passed in filename --> we have to search it again in the folder
 *
 * @param assetId the id of the asset to search
 * @returns the path to the downloaded asset
 */
async function findVideoAssetFile(assetId: string): Promise<string | null> {
  const files = await fs.promises.readdir(TMP_FOLDER);
  for (const file of files) {
    if (
      file.startsWith(assetId) &&
      !file.endsWith(".json3") &&
      !file.endsWith(".info.json")
    ) {
      return path.join(TMP_FOLDER, file);
    }
  }
  return null;
}

type YtDlpInfo = VideoCaptionMetadata;

interface Json3Subtitle {
  events?: {
    tStartMs?: number;
    dDurationMs?: number;
    segs?: { utf8?: string }[];
  }[];
}

async function fetchYtDlpInfo(
  url: string,
  proxy: string | undefined,
  abortSignal: AbortSignal,
): Promise<YtDlpInfo> {
  const args = [
    url,
    ...serverConfig.crawler.ytDlpArguments,
    "--skip-download",
    "--dump-single-json",
    "--no-playlist",
  ];
  if (proxy) args.push("--proxy", proxy);
  const result = await execa("yt-dlp", args, { cancelSignal: abortSignal });
  return JSON.parse(result.stdout) as YtDlpInfo;
}

function replaceTranscripts(
  bookmarkId: string,
  transcripts: Awaited<ReturnType<typeof readDownloadedTranscripts>>,
) {
  db.transaction((txn) => {
    txn
      .delete(videoTranscripts)
      .where(eq(videoTranscripts.bookmarkId, bookmarkId))
      .run();
    txn
      .insert(videoTranscripts)
      .values(
        transcripts.map((transcript, index) => ({
          bookmarkId,
          ...transcript,
          isDefault: index === 0,
        })),
      )
      .run();
  });
}

async function readDownloadedTranscripts(assetId: string, info: YtDlpInfo) {
  const files = await fs.promises.readdir(TMP_FOLDER);

  const subtitleFiles = files.filter(
    (file) => file.startsWith(`${assetId}.`) && file.endsWith(".json3"),
  );
  const parsed: {
    language: string;
    languageName: string;
    isAutoGenerated: boolean;
    segments: ZVideoTranscriptSegment[];
  }[] = [];
  for (const file of subtitleFiles) {
    try {
      const language = file.slice(assetId.length + 1, -".json3".length);
      const subtitle: Json3Subtitle = JSON.parse(
        await fs.promises.readFile(path.join(TMP_FOLDER, file), "utf8"),
      );
      const segments: ZVideoTranscriptSegment[] = [];
      for (const event of subtitle.events ?? []) {
        const text = (event.segs ?? [])
          .map((segment) => segment.utf8 ?? "")
          .join("")
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (!text || event.tStartMs === undefined) {
          continue;
        }
        const previous = segments.at(-1);
        if (previous?.text === text) {
          previous.endMs = Math.max(
            previous.endMs,
            event.tStartMs + (event.dDurationMs ?? 0),
          );
          continue;
        }
        segments.push({
          startMs: event.tStartMs,
          endMs: event.tStartMs + (event.dDurationMs ?? 0),
          text,
        });
      }
      const captionMetadata =
        info.subtitles?.[language] ?? info.automatic_captions?.[language];
      parsed.push({
        language,
        languageName: captionMetadata?.[0]?.name ?? language,
        isAutoGenerated:
          !(language in (info.subtitles ?? {})) &&
          language in (info.automatic_captions ?? {}),
        segments,
      });
    } catch (error) {
      logger.warn(
        `[VideoCrawler] Failed to parse downloaded subtitle "${file}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return parsed
    .filter((transcript) => transcript.segments.length > 0)
    .sort((a, b) => {
      if (a.language === info.language) return -1;
      if (b.language === info.language) return 1;
      if (a.isAutoGenerated !== b.isAutoGenerated) {
        return a.isAutoGenerated ? 1 : -1;
      }
      return a.language.localeCompare(b.language);
    });
}

async function deleteTranscriptSidecars(assetId: string) {
  const files = await fs.promises.readdir(TMP_FOLDER);
  await Promise.all(
    files
      .filter(
        (file) =>
          file.startsWith(`${assetId}.`) &&
          (file.endsWith(".json3") || file.endsWith(".info.json")),
      )
      .map((file) => fs.promises.rm(path.join(TMP_FOLDER, file))),
  );
}
