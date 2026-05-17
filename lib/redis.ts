import { Redis } from "@upstash/redis";

import { env } from "@/lib/env";

let redisSingleton: Redis | null = null;

export const getRedis = (): Redis | null => {
  if (!env.upstashUrl || !env.upstashToken) {
    return null;
  }

  if (!redisSingleton) {
    redisSingleton = new Redis({
      url: env.upstashUrl,
      token: env.upstashToken
    });
  }

  return redisSingleton;
};
