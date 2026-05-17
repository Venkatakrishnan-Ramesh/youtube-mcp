import { env } from "@/lib/env";
import { getRedis } from "@/lib/redis";
import type { TranscriptLookupResult } from "@/types";

const memoryCache = new Map<string, { expiresAt: number; value: TranscriptLookupResult }>();

const cacheKey = (videoId: string, language?: string): string => {
  return `youtube-transcript-mcp:transcript:${videoId}:${language?.trim().toLowerCase() || "default"}`;
};

const isExpired = (expiresAt: number): boolean => expiresAt <= Date.now();

export const getTranscriptCache = async (
  videoId: string,
  language?: string
): Promise<TranscriptLookupResult | null> => {
  const key = cacheKey(videoId, language);
  const redis = getRedis();

  if (!redis) {
    const cached = memoryCache.get(key);
    if (!cached || isExpired(cached.expiresAt)) {
      memoryCache.delete(key);
      return null;
    }

    return {
      ...cached.value,
      fromCache: true
    };
  }

  const cached = await redis.get<TranscriptLookupResult>(key);
  if (!cached) {
    return null;
  }

  return {
    ...cached,
    fromCache: true
  };
};

export const setTranscriptCache = async (result: TranscriptLookupResult, language?: string): Promise<void> => {
  const key = cacheKey(result.videoId, language);
  const redis = getRedis();
  const ttlSeconds = result.hasCaptions
    ? env.transcriptCacheTtlSeconds
    : env.transcriptFailureCacheTtlSeconds;

  const value: TranscriptLookupResult = {
    ...result,
    fromCache: false
  };

  if (!redis) {
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
    return;
  }

  await redis.set(key, value, { ex: ttlSeconds });
};
