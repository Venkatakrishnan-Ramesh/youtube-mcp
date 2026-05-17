import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";

import { isAuthorizedRequest, hashToken } from "@/lib/auth";
import { logDigestEvent } from "@/lib/digest-log";
import { ensureRequiredEnv } from "@/lib/env";
import { renderTranscriptResult } from "@/lib/format";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getYouTubeTranscriptAndMetadata } from "@/lib/supadata";

export const maxDuration = 60;

const toolSchema = {
  video_url: z.string().url("Please provide a valid YouTube URL."),
  language: z.string().trim().min(2).max(12).optional()
};

const mcpHandler = createMcpHandler(
  (server) => {
    server.tool(
      "get_youtube_transcript",
      "Fetch a YouTube video's plain-text transcript and basic metadata. Use this for public YouTube videos when you need captions in English, Tamil, Hindi, or any other available language.",
      toolSchema,
      async ({ video_url, language }) => {
        const result = await getYouTubeTranscriptAndMetadata(video_url, language);

        await logDigestEvent({
          requestedAt: new Date().toISOString(),
          videoId: result.videoId,
          canonicalUrl: result.canonicalUrl,
          title: result.title,
          channel: result.channel,
          requestedLanguage: language ?? null,
          transcriptLanguage: result.transcriptLanguage,
          hasCaptions: result.hasCaptions,
          fallbackReason: result.fallbackReason
        });

        return {
          content: [
            {
              type: "text",
              text: renderTranscriptResult(result)
            }
          ]
        };
      }
    );
  },
  {},
  {
    basePath: "/api",
    maxDuration,
    verboseLogs: false
  }
);

const unauthorized = (): Response => {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Bearer realm="youtube-transcript-mcp"'
    }
  });
};

const tooManyRequests = (retryAfterSeconds?: number): Response => {
  const headers = new Headers();
  if (retryAfterSeconds) {
    headers.set("Retry-After", String(retryAfterSeconds));
  }

  return new Response("Rate limit exceeded", {
    status: 429,
    headers
  });
};

const handleAuthorizedMcpRequest = async (request: Request): Promise<Response> => {
  ensureRequiredEnv(["supadataApiKey", "mcpBearerTokens"]);

  const auth = isAuthorizedRequest(request);
  if (!auth.ok) {
    return unauthorized();
  }

  const rateLimit = await enforceRateLimit(hashToken(auth.token));
  if (!rateLimit.success) {
    return tooManyRequests(rateLimit.retryAfterSeconds);
  }

  return mcpHandler(request);
};

export async function GET(request: Request): Promise<Response> {
  return handleAuthorizedMcpRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleAuthorizedMcpRequest(request);
}

export async function DELETE(request: Request): Promise<Response> {
  return handleAuthorizedMcpRequest(request);
}
