export type TranscriptLookupResult = {
  videoId: string;
  canonicalUrl: string;
  title: string | null;
  channel: string | null;
  uploadDate: string | null;
  durationSeconds: number | null;
  description: string | null;
  transcript: string | null;
  transcriptLanguage: string | null;
  availableTranscriptLanguages: string[];
  hasCaptions: boolean;
  fallbackReason: string | null;
};

export type DigestEvent = {
  requestedAt: string;
  videoId: string;
  canonicalUrl: string;
  title: string | null;
  channel: string | null;
  requestedLanguage: string | null;
  transcriptLanguage: string | null;
  hasCaptions: boolean;
  fallbackReason: string | null;
};
