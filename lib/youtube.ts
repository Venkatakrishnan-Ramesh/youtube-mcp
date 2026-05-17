const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const cleanCandidate = (value: string | undefined): string | null => {
  if (!value) {
    return null;
  }

  const candidate = value.trim();
  return VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
};

export const extractYouTubeVideoId = (rawUrl: string): string => {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL. Please provide a full YouTube URL.");
  }

  const hostname = url.hostname.replace(/^www\./, "");

  const directParam = cleanCandidate(url.searchParams.get("v") ?? undefined);
  if (directParam) {
    return directParam;
  }

  if (hostname === "youtu.be") {
    const shortId = cleanCandidate(url.pathname.split("/").filter(Boolean)[0]);
    if (shortId) {
      return shortId;
    }
  }

  if (hostname.endsWith("youtube.com")) {
    const segments = url.pathname.split("/").filter(Boolean);
    const namedPatterns = new Set(["shorts", "embed", "live", "v"]);

    if (segments.length >= 2 && namedPatterns.has(segments[0])) {
      const segmentId = cleanCandidate(segments[1]);
      if (segmentId) {
        return segmentId;
      }
    }
  }

  throw new Error("Could not extract a YouTube video ID from the provided URL.");
};

export const buildCanonicalYouTubeUrl = (videoId: string): string => {
  return `https://www.youtube.com/watch?v=${videoId}`;
};

export const formatDuration = (durationSeconds: number | null): string => {
  if (!durationSeconds || durationSeconds < 0) {
    return "Unknown";
  }

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  const parts = [
    hours > 0 ? String(hours) : null,
    String(hours > 0 ? minutes : minutes).padStart(hours > 0 ? 2 : 1, "0"),
    String(seconds).padStart(2, "0")
  ].filter(Boolean);

  return parts.join(":");
};
