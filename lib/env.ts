const parseInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseTokens = (): string[] => {
  const single = process.env.MCP_BEARER_TOKEN?.trim();
  const many = (process.env.MCP_BEARER_TOKENS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return Array.from(new Set([...(single ? [single] : []), ...many]));
};

export const env = {
  appUrl: process.env.APP_URL?.trim() ?? "",
  supadataApiKey: process.env.SUPADATA_API_KEY?.trim() ?? "",
  mcpBearerTokens: parseTokens(),
  rateLimitMaxRequests: parseInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 50),
  rateLimitWindow: process.env.RATE_LIMIT_WINDOW?.trim() || "1 d",
  upstashUrl: process.env.UPSTASH_REDIS_REST_URL?.trim() ?? "",
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "",
  resendApiKey: process.env.RESEND_API_KEY?.trim() ?? "",
  digestEmailTo: process.env.DIGEST_EMAIL_TO?.trim() ?? "",
  digestEmailFrom: process.env.DIGEST_EMAIL_FROM?.trim() || "YouTube MCP <onboarding@resend.dev>",
  digestTimezone: process.env.DIGEST_TIMEZONE?.trim() || "UTC"
};

export const ensureRequiredEnv = (keys: Array<keyof typeof env>): void => {
  const missing = keys.filter((key) => {
    const value = env[key];
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    return !value;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};
