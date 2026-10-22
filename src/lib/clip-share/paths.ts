// ── Public clip shares: pathname + format helpers ────────────────────
// Pure string helpers, client-safe — the share dialog computes the
// upload pathname in the browser; the API routes verify it server-side.

import { SHARE_PATH_PREFIX } from "./constants";

/** Upload pathname for a clip's video (poster sits beside it). */
export function shareVideoPathname(clipId: string, ext: string): string {
  const safeExt = /^[a-z0-9]{2,5}$/i.test(ext) ? ext.toLowerCase() : "webm";
  return `${SHARE_PATH_PREFIX}${clipId}/video.${safeExt}`;
}

export function sharePosterPathname(clipId: string): string {
  return `${SHARE_PATH_PREFIX}${clipId}/poster.jpg`;
}

/** File extension for the upload, from the clip's mime type. */
export function extForMime(mimeType: string | null | undefined): string {
  const m = (mimeType ?? "").split(";")[0].trim().toLowerCase();
  if (m === "video/mp4") return "mp4";
  if (m === "video/quicktime") return "mov";
  return "webm";
}
