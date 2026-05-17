import { createHash, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

const encode = (value: string): Buffer => Buffer.from(value, "utf8");

export const hashToken = (token: string): string => {
  return createHash("sha256").update(token).digest("hex");
};

export const extractBearerToken = (request: Request): string | null => {
  const header = request.headers.get("authorization");
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
};

export const isAuthorizedRequest = (request: Request): { ok: true; token: string } | { ok: false } => {
  const bearerToken = extractBearerToken(request);

  if (!bearerToken || env.mcpBearerTokens.length === 0) {
    return { ok: false };
  }

  for (const allowedToken of env.mcpBearerTokens) {
    const a = encode(bearerToken);
    const b = encode(allowedToken);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      return { ok: true, token: bearerToken };
    }
  }

  return { ok: false };
}
