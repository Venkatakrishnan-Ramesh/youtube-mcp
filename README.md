# YouTube Transcript MCP

Remote MCP server for fetching YouTube transcripts and metadata on Vercel, designed for Claude, ChatGPT developer mode, and direct MCP/API clients.

## What it does

- Exposes one MCP tool: `get_youtube_transcript(video_url, language?)`
- Accepts common YouTube URL formats:
  - `https://www.youtube.com/watch?v=...`
  - `https://youtu.be/...`
  - `https://www.youtube.com/shorts/...`
  - embed/live URLs
  - timestamped URLs
- Returns plain transcript text by default
- Returns video metadata:
  - title
  - channel
  - upload date
  - duration
  - description
- Supports any caption language Supadata exposes, including English (`en`), Tamil (`ta`), and Hindi (`hi`)
- Fails gracefully when captions are unavailable or the video is restricted
- Logs successful lookups and sends a daily digest email

## Architecture

- `Next.js` route handlers on Vercel
- `@vercel/mcp-adapter` for the remote MCP server
- `@modelcontextprotocol/sdk` for MCP compatibility
- `Supadata` for transcript and metadata lookups
- `Upstash Redis` for persistent rate limiting and digest logging when configured
- `Resend` for the end-of-day email digest

## Free-first tradeoffs

This repo is optimized to stay at or near zero monthly cost:

- Supadata free tier: 100 credits/month
- Vercel Hobby: free
- Upstash Redis free tier: optional but recommended
- Resend free tier: enough for one digest email per day

To avoid surprise Supadata charges:

- transcript lookups use `mode=native`
- no AI transcript generation is attempted
- videos without public captions return a clean fallback instead of forcing transcription

## Tool contract

### `get_youtube_transcript(video_url, language?)`

Input:

- `video_url`: full YouTube URL
- `language`: optional preferred caption language code, e.g. `en`, `ta`, `hi`

Output:

- human-readable text containing:
  - canonical URL
  - title
  - channel
  - upload date
  - duration
  - transcript language
  - available transcript languages
  - description
  - transcript text or a graceful fallback message

## Project structure

```text
app/
  api/
    [transport]/route.ts      MCP endpoint, e.g. /api/mcp
    cron/digest/route.ts      Daily email digest endpoint
lib/
  auth.ts
  digest-log.ts
  email.ts
  env.ts
  format.ts
  rate-limit.ts
  redis.ts
  supadata.ts
  transcript-cache.ts
  youtube.ts
types/
  index.ts
```

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values.

Required:

- `SUPADATA_API_KEY`
- `MCP_AUTH_MODE`

Recommended:

- `MCP_BEARER_TOKEN` when `MCP_AUTH_MODE=bearer`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`
- `DIGEST_EMAIL_TO`
- `TRANSCRIPT_CACHE_TTL_SECONDS`
- `TRANSCRIPT_FAILURE_CACHE_TTL_SECONDS`

## Local development

```bash
npm install
npm run dev
```

Your local MCP endpoint will be:

```text
http://localhost:3000/api/mcp
```

If `MCP_AUTH_MODE=bearer`, all MCP requests must include:

```text
Authorization: Bearer <your token>
```

If `MCP_AUTH_MODE=none`, the MCP endpoint is unauthenticated.

## GitHub repo creation

1. Create a new empty GitHub repo, for example `youtube-transcript-mcp`.
2. Clone it locally:

```bash
git clone git@github.com:YOUR_USER/youtube-transcript-mcp.git
cd youtube-transcript-mcp
```

3. Copy this project into that directory or create the repo directly from this folder.
4. Commit and push:

```bash
git init
git add .
git commit -m "feat: initial youtube transcript mcp server"
git branch -M main
git remote add origin git@github.com:YOUR_USER/youtube-transcript-mcp.git
git push -u origin main
```

## Vercel project creation and deploy

1. In Vercel, click `Add New` → `Project`.
2. Import your GitHub repo.
3. Framework preset: `Next.js`.
4. Add env vars in Vercel Project Settings:
   - `APP_URL`
   - `SUPADATA_API_KEY`
   - `MCP_AUTH_MODE`
   - `MCP_BEARER_TOKEN` if using bearer mode
   - optionally Upstash and Resend vars
5. Deploy.
6. After first deploy, set:
   - `APP_URL=https://your-project.vercel.app`
7. Redeploy once so generated links and docs point to the correct URL.

## Supadata setup

1. Sign up at `https://supadata.ai/pricing`
2. Create an API key in their dashboard
3. Add it to `SUPADATA_API_KEY`

At about 50 videos/month with transcript + metadata per video:

- transcript: 50 credits
- metadata: 50 credits
- total: about 100 credits/month

That fits the free tier exactly, with no headroom.

## Upstash setup

Optional but recommended.

1. Create an Upstash Redis database
2. Add:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

Without Upstash:

- rate limiting falls back to in-memory best effort
- digest event storage is also in-memory and not durable across cold starts
- transcript caching also falls back to in-memory and resets on cold starts

## Transcript retries and caching

The server reduces wasted Supadata usage in three ways:

- successful transcript lookups are cached
- failures like quota and rate-limit responses are cached briefly
- transcript lookups retry once with backoff on Supadata `429` by default

Relevant env vars:

- `TRANSCRIPT_CACHE_TTL_SECONDS` default `43200`
- `TRANSCRIPT_FAILURE_CACHE_TTL_SECONDS` default `600`
- `SUPADATA_RETRY_COUNT` default `1`
- `SUPADATA_RETRY_BASE_DELAY_MS` default `800`

## Resend setup

Optional but required for the daily email digest.

1. Create a Resend account
2. Create an API key
3. Verify a sending domain if you want to send beyond test mode
4. Add:
   - `RESEND_API_KEY`
   - `DIGEST_EMAIL_TO`
   - `DIGEST_EMAIL_FROM`

By default, `vercel.json` schedules a daily cron at midnight UTC:

```json
{
  "path": "/api/cron/digest",
  "schedule": "0 0 * * *"
}
```

Change that schedule if you want a different send time.

## Connecting to Claude as a custom connector

Claude remote MCP custom connectors are configured from Claude settings.

1. Open Claude web
2. Go to `Customize` → `Connectors`
3. Click `+` → `Add custom connector`
4. Use:
   - Name: `YouTube Transcript MCP`
   - URL: `https://your-project.vercel.app/api/mcp`

Important:

- For easy ChatGPT app setup, set `MCP_AUTH_MODE=none`.
- If you keep `MCP_AUTH_MODE=bearer`, Claude’s connector UI may need a way to attach the bearer token for your account.
- For direct Anthropic API usage, remote MCP supports bearer authorization tokens.

Anthropic references:

- https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- https://docs.anthropic.com/en/docs/agents-and-tools/mcp-connector

## Connecting to ChatGPT

For ChatGPT, use Developer Mode and create an app from your MCP server.

OpenAI references:

- https://platform.openai.com/docs/guides/developer-mode
- https://platform.openai.com/docs/mcp/overview

Important:

- ChatGPT supports OAuth, no authentication, and mixed authentication in developer mode.
- For ChatGPT app creation, use `MCP_AUTH_MODE=none`.
- If you need private auth later, move to OAuth rather than static bearer auth.
- If the tool reports `Transcript status: unavailable`, treat the response as metadata-only and do not infer spoken content from title or description.

## Direct OpenAI / Anthropic API usage

Anthropic and OpenAI both support remote MCP servers over HTTP.

You can call this server directly from API requests and attach the bearer token in each request.

## Prompt templates

Strict transcript-only:

```text
Use the yt app only. If transcript extraction fails or captions are unavailable, stop and explicitly say "No transcript available". Do not infer the spoken content from metadata, title, description, or browsing.
```

Hybrid fallback:

```text
Use the yt app first. If transcript is available, summarize the spoken content. If transcript is unavailable, say that clearly and then provide a separate metadata-based context note.
```

Metadata plus transcript check:

```text
Use the yt app only. Return:
1. transcript status
2. transcript source
3. whether this was a cache hit
4. full metadata
5. transcript text if available
```

## Manual digest trigger

You can manually trigger the daily digest route:

```bash
curl -H "Authorization: Bearer $MCP_BEARER_TOKEN" \
  https://your-project.vercel.app/api/cron/digest
```

## Test prompts

English:

```text
Use the YouTube Transcript MCP tool to fetch the transcript for https://www.youtube.com/watch?v=dQw4w9WgXcQ in English. Return the transcript and metadata.
```

Tamil:

```text
Use the YouTube Transcript MCP tool to fetch the transcript for a public Tamil YouTube video URL in Tamil using language "ta". Return transcript language, fallback note if any, and metadata.
```

No captions:

```text
Use the YouTube Transcript MCP tool to fetch a transcript for a public YouTube video that has captions disabled. Confirm that the tool fails gracefully and still returns video metadata.
```

## Notes

- The MCP endpoint is intended for public, internet-reachable use from remote MCP clients.
- The current implementation is optimized for free-tier reliability, not for heavy multi-user traffic.
- For stricter production auth across Claude web/mobile and ChatGPT apps, the next step is adding OAuth.
