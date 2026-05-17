import { z } from "zod";

import { env, ensureRequiredEnv } from "@/lib/env";
import { getTranscriptCache, setTranscriptCache } from "@/lib/transcript-cache";
import { buildCanonicalYouTubeUrl, extractYouTubeVideoId } from "@/lib/youtube";
import type { TranscriptLookupResult } from "@/types";

const transcriptResponseSchema = z.object({
  content: z.string().optional(),
  lang: z.string().optional(),
  availableLangs: z.array(z.string()).optional(),
  jobId: z.string().optional(),
  error: z.string().optional()
});

const metadataResponseSchema = z.object({
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  author: z.object({
    displayName: z.string().nullable().optional()
  }).nullable().optional(),
  media: z.object({
    duration: z.number().nullable().optional()
  }).nullable().optional()
});

const SUPADATA_BASE_URL = "https://api.supadata.ai/v1";

const sleep = async (delayMs: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
};

const fetchJson = async <T>(url: string, schema: z.ZodSchema<T>): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      "x-api-key": env.supadataApiKey
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supadata request failed (${response.status}): ${body || response.statusText}`);
  }

  const json = await response.json();
  return schema.parse(json);
};

const fetchTranscriptWithRetry = async (url: string): Promise<z.infer<typeof transcriptResponseSchema>> => {
  let attempt = 0;
  let delayMs = env.supadataRetryBaseDelayMs;

  while (true) {
    try {
      return await fetchJson(url, transcriptResponseSchema);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transcript lookup failed.";
      const shouldRetry = message.includes("(429)") && attempt < env.supadataRetryCount;

      if (!shouldRetry) {
        throw error;
      }

      await sleep(delayMs);
      attempt += 1;
      delayMs *= 2;
    }
  }
};

export const getYouTubeTranscriptAndMetadata = async (
  rawUrl: string,
  language?: string
): Promise<TranscriptLookupResult> => {
  ensureRequiredEnv(["supadataApiKey"]);

  const videoId = extractYouTubeVideoId(rawUrl);
  const cached = await getTranscriptCache(videoId, language);
  if (cached) {
    return cached;
  }

  const canonicalUrl = buildCanonicalYouTubeUrl(videoId);

  const transcriptUrl = new URL(`${SUPADATA_BASE_URL}/transcript`);
  transcriptUrl.searchParams.set("url", canonicalUrl);
  transcriptUrl.searchParams.set("text", "true");
  transcriptUrl.searchParams.set("mode", "native");
  if (language) {
    transcriptUrl.searchParams.set("lang", language);
  }

  const metadataUrl = new URL(`${SUPADATA_BASE_URL}/metadata`);
  metadataUrl.searchParams.set("url", canonicalUrl);

  const [metadataResult, transcriptOutcome] = await Promise.allSettled([
    fetchJson(metadataUrl.toString(), metadataResponseSchema),
    fetchTranscriptWithRetry(transcriptUrl.toString())
  ]);

  if (metadataResult.status === "rejected") {
    throw metadataResult.reason instanceof Error
      ? metadataResult.reason
      : new Error("Failed to fetch video metadata.");
  }

  const metadata = metadataResult.value;
  const transcript = transcriptOutcome.status === "fulfilled" ? transcriptOutcome.value : null;

  const availableTranscriptLanguages = transcript?.availableLangs ?? [];
  const transcriptLanguage = transcript?.lang ?? null;
  const transcriptText = transcript?.content ?? null;

  let hasCaptions = Boolean(transcriptText);
  let fallbackReason: string | null = null;

  if (transcriptOutcome.status === "rejected") {
    const message = transcriptOutcome.reason instanceof Error
      ? transcriptOutcome.reason.message
      : "Transcript lookup failed.";

    if (message.includes("(403)") || message.includes("(404)")) {
      fallbackReason = "This video is unavailable for transcript access or has no public captions.";
    } else {
      fallbackReason = message;
    }

    hasCaptions = false;
  } else if (!transcriptText) {
    hasCaptions = false;
    if (transcript?.jobId) {
      fallbackReason = "Transcript generation was deferred by Supadata, but free-first mode only uses existing captions.";
    } else {
      fallbackReason = "No captions were returned for this video.";
    }
  } else if (language && transcriptLanguage && language !== transcriptLanguage) {
    fallbackReason = `Requested language "${language}" was unavailable. Returned "${transcriptLanguage}" instead.`;
  }

  const result: TranscriptLookupResult = {
    videoId,
    canonicalUrl,
    title: metadata.title ?? null,
    channel: metadata.author?.displayName ?? null,
    uploadDate: metadata.createdAt ?? null,
    durationSeconds: metadata.media?.duration ?? null,
    description: metadata.description ?? null,
    transcript: transcriptText,
    transcriptLanguage,
    availableTranscriptLanguages,
    hasCaptions,
    fallbackReason,
    transcriptStatus: hasCaptions ? "available" : "unavailable",
    transcriptSource: "supadata-native",
    fromCache: false
  };

  await setTranscriptCache(result, language);
  return result;
};
