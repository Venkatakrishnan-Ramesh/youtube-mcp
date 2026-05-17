import { Ratelimit } from "@upstash/ratelimit";

import { env } from "@/lib/env";
import { getRedis } from "@/lib/redis";

type MemoryEntry = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, MemoryEntry>();

let redisLimiter: Ratelimit | null | undefined;

type UpstashDuration = Parameters<typeof Ratelimit.slidingWindow>[1];

const windowToMs = (windowValue: string): number => {
  const match = windowValue.trim().match(/^(\d+)\s*([smhd])$/i);
  if (!match) {
    return 24 * 60 * 60 * 1000;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
};

const getRedisLimiter = (): Ratelimit | null => {
  if (redisLimiter !== undefined) {
    return redisLimiter;
  }

  const redis = getRedis();
  if (!redis) {
    redisLimiter = null;
    return redisLimiter;
  }

  redisLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(env.rateLimitMaxRequests, env.rateLimitWindow as UpstashDuration),
    analytics: false,
    prefix: "youtube-transcript-mcp"
  });

  return redisLimiter;
};

export const enforceRateLimit = async (
  identifier: string
): Promise<{ success: true } | { success: false; retryAfterSeconds?: number }> => {
  const limiter = getRedisLimiter();
  if (limiter) {
    const result = await limiter.limit(identifier);
    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      retryAfterSeconds: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
    };
  }

  const now = Date.now();
  const ttl = windowToMs(env.rateLimitWindow);
  const current = memoryStore.get(identifier);

  if (!current || current.resetAt <= now) {
    memoryStore.set(identifier, {
      count: 1,
      resetAt: now + ttl
    });
    return { success: true };
  }

  if (current.count >= env.rateLimitMaxRequests) {
    return {
      success: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    };
  }

  current.count += 1;
  memoryStore.set(identifier, current);
  return { success: true };
};
