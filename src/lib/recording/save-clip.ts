/**
 * Register a finished recording: its metadata goes to
 * POST /api/recording/clips (Pro-enforced server-side) and the blob
 * goes to this device's IndexedDB clip store under the server's clip
 * id, so the library's playback lines up — the same registration the
 * Live wall's RecordableTile performs, shared here for every recorder.
 *
 * Order matters, and it is metadata FIRST. The old order wrote the
 * blob twice — once under a temporary id, then again under the real
 * id, with both copies alive at once. A live camera's clip is by far
 * the largest blob the studio makes (a full stream encode, where a
 * snapshot clip is a handful of stills), so the second write is
 * exactly the one that hit the device's storage quota and threw —
 * surfacing on the tiles as a bare "Failed to save clip", because a
 * QuotaExceededError is a DOMException, not an Error, and carried no
 * message the UI could show. One write, under the final id, halves
 * the peak storage a save needs.
 *
 * On a metadata failure the blob is still kept on this device under a
 * temporary id rather than dropped — the recording is not lost, only
 * unregistered — and the error propagates so the caller can say so.
 */
import { idbPutClip } from "@/lib/recording/idb";
import type { ClipMetaBody } from "@/lib/recording/multi";

export async function saveRecordedClip(blob: Blob, meta: ClipMetaBody): Promise<string> {
  const r = await fetch("/api/recording/clips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(meta),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const tempId = crypto.randomUUID();
    try {
      await idbPutClip(tempId, blob);
    } catch {
      /* keeping the blob is best-effort; the metadata error is the story */
    }
    throw new Error(j.error || "metadata save failed");
  }
  const realId: string = j.clip?.id ?? crypto.randomUUID();
  await idbPutClip(realId, blob);
  return realId;
}

/**
 * Plain words for a save failure, shared by every surface that saves a
 * clip. The case that matters most: storage-quota rejections arrive as
 * DOMExceptions with no useful message (and are not `instanceof
 * Error` in several browsers), which is how a full device used to read
 * as an unexplained "Failed to save clip".
 */
export function clipSaveErrorMessage(e: unknown): string {
  if (
    typeof DOMException !== "undefined" &&
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_STORAGE_QUOTA_REACHED")
  ) {
    return "This device's clip storage is full — download or delete some clips, then try again";
  }
  if (e instanceof Error && e.message) return e.message;
  return "Failed to save clip";
}

/**
 * The WebM flavour this browser's MediaRecorder prefers, or "" for its
 * default. VP8 before VP9: VP9 software encoding at stream resolutions
 * was a major share of the CPU that froze the recording wall, and at
 * the pump's capped 720p/10fps shape VP8 carries the picture without
 * it. Safari supports neither and falls through to its default (MP4).
 */
export function pickRecorderMime(): string {
  const cands = ["video/webm;codecs=vp8", "video/webm;codecs=vp9", "video/webm"];
  for (const c of cands) {
    try {
      if (window.MediaRecorder?.isTypeSupported(c)) return c;
    } catch {}
  }
  return "";
}
