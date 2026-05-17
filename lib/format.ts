import { formatDuration } from "@/lib/youtube";
import type { TranscriptLookupResult } from "@/types";

export const renderTranscriptResult = (result: TranscriptLookupResult): string => {
  const lines = [
    `Video URL: ${result.canonicalUrl}`,
    `Title: ${result.title ?? "Unknown"}`,
    `Channel: ${result.channel ?? "Unknown"}`,
    `Upload date: ${result.uploadDate ?? "Unknown"}`,
    `Duration: ${formatDuration(result.durationSeconds)}`,
    `Transcript language: ${result.transcriptLanguage ?? "Unknown"}`,
    `Available transcript languages: ${result.availableTranscriptLanguages.length > 0 ? result.availableTranscriptLanguages.join(", ") : "None reported"}`,
    `Description: ${result.description?.trim() || "No description available."}`
  ];

  if (!result.hasCaptions || !result.transcript) {
    lines.push("");
    lines.push(`Transcript unavailable: ${result.fallbackReason ?? "No public captions were found for this video."}`);
    return lines.join("\n");
  }

  if (result.fallbackReason) {
    lines.push(`Caption note: ${result.fallbackReason}`);
  }

  lines.push("");
  lines.push("Transcript:");
  lines.push(result.transcript);

  return lines.join("\n");
};
