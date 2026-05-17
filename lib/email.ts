import { Resend } from "resend";

import { env } from "@/lib/env";
import type { DigestEvent } from "@/types";

const escapeHtml = (value: string): string => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

const buildDigestHtml = (dayKey: string, events: DigestEvent[]): string => {
  const items = events.map((event) => {
    const status = event.hasCaptions ? "captions found" : `no captions (${event.fallbackReason ?? "unknown reason"})`;
    const language = event.transcriptLanguage ?? event.requestedLanguage ?? "unknown";

    return `
      <li>
        <p><strong>${escapeHtml(event.title ?? "Untitled video")}</strong></p>
        <p>Channel: ${escapeHtml(event.channel ?? "Unknown")}</p>
        <p>Language: ${escapeHtml(language)}</p>
        <p>Status: ${escapeHtml(status)}</p>
        <p><a href="${escapeHtml(event.canonicalUrl)}">${escapeHtml(event.canonicalUrl)}</a></p>
      </li>
    `;
  }).join("");

  return `
    <div style="font-family: sans-serif; line-height: 1.5;">
      <h1>YouTube transcript digest for ${escapeHtml(dayKey)}</h1>
      <p>Total lookups: ${events.length}</p>
      <ul>${items}</ul>
    </div>
  `;
};

export const sendDigestEmail = async (dayKey: string, events: DigestEvent[]): Promise<void> => {
  if (!env.resendApiKey || !env.digestEmailTo || events.length === 0) {
    return;
  }

  const resend = new Resend(env.resendApiKey);
  const result = await resend.emails.send({
    from: env.digestEmailFrom,
    to: [env.digestEmailTo],
    subject: `YouTube transcript digest: ${dayKey} (${events.length} lookups)`,
    html: buildDigestHtml(dayKey, events)
  });

  if (result.error) {
    throw new Error(`Failed to send digest email: ${result.error.message}`);
  }
};
