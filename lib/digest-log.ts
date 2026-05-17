import { env } from "@/lib/env";
import { getRedis } from "@/lib/redis";
import type { DigestEvent } from "@/types";

const memoryEvents = new Map<string, DigestEvent[]>();

const dayFormatterCache = new Map<string, Intl.DateTimeFormat>();

const getFormatter = (timeZone: string): Intl.DateTimeFormat => {
  const cached = dayFormatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  dayFormatterCache.set(timeZone, formatter);
  return formatter;
};

export const getDayKey = (date: Date, timeZone = env.digestTimezone): string => {
  return getFormatter(timeZone).format(date);
};

export const getPreviousDayKey = (timeZone = env.digestTimezone): string => {
  const now = new Date();
  const nowKey = getDayKey(now, timeZone);
  const yesterday = new Date(`${nowKey}T00:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return getDayKey(yesterday, "UTC");
};

const redisKey = (dayKey: string): string => `youtube-transcript-mcp:digest:${dayKey}`;

export const logDigestEvent = async (event: DigestEvent): Promise<void> => {
  const dayKey = getDayKey(new Date(event.requestedAt));
  const redis = getRedis();

  if (!redis) {
    const existing = memoryEvents.get(dayKey) ?? [];
    existing.push(event);
    memoryEvents.set(dayKey, existing);
    return;
  }

  await redis.rpush(redisKey(dayKey), JSON.stringify(event));
  await redis.expire(redisKey(dayKey), 60 * 60 * 24 * 8);
};

export const getDigestEventsForDay = async (dayKey: string): Promise<DigestEvent[]> => {
  const redis = getRedis();

  if (!redis) {
    return memoryEvents.get(dayKey) ?? [];
  }

  const values = await redis.lrange<string>(redisKey(dayKey), 0, -1);
  return values
    .map((value) => {
      try {
        return JSON.parse(value) as DigestEvent;
      } catch {
        return null;
      }
    })
    .filter((value): value is DigestEvent => value !== null);
};
