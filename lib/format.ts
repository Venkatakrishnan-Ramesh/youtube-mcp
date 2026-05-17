import { formatDuration } from "@/lib/youtube";
import type { TranscriptLookupResult } from "@/types";

export const renderTranscriptResult = (result: TranscriptLookupResult): string => {
  const lines = [
    "Result type: YouTube transcript lookup",
    `Video URL: ${result.canonicalUrl}`,
    `Title: ${result.title ?? "Unknown"}`,
    `Channel: ${result.channel ?? "Unknown"}`,
    `Upload date: ${result.uploadDate ?? "Unknown"}`,
    `Duration: ${formatDuration(result.durationSeconds)}`,
    `Transcript status: ${result.transcriptStatus}`,
    `Transcript source: ${result.transcriptSource}`,
    `Response cache: ${result.fromCache ? "hit" : "miss"}`,
    `Transcript language: ${result.transcriptLanguage ?? "Unknown"}`,
    `Available transcript languages: ${result.availableTranscriptLanguages.length > 0 ? result.availableTranscriptLanguages.join(", ") : "None reported"}`,
    `Description: ${result.description?.trim() || "No description available."}`
  ];

  if (!result.hasCaptions || !result.transcript) {
    lines.push("");
    lines.push("Transcript unavailable.");
    lines.push(`Transcript note: ${result.fallbackReason ?? "No public captions were found for this video."}`);
    lines.push("Instruction: Do not summarize spoken content from metadata alone.");
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
