/**
 * Register a finished recording: the blob goes to this device's
 * IndexedDB clip store and its metadata to POST /api/recording/clips
 * (Pro-enforced server-side) — the same two-step the Live wall's
 * RecordableTile performs, shared here for the multi-camera recorder.
 * On a metadata failure the blob stays in IndexedDB under its temporary
 * id rather than being dropped.
 */
import { idbPutClip, idbDeleteClip } from "@/lib/recording/idb";
import type { ClipMetaBody } from "@/lib/recording/multi";

export async function saveRecordedClip(blob: Blob, meta: ClipMetaBody): Promise<string> {
  const tempId = crypto.randomUUID();
  await idbPutClip(tempId, blob);
  const r = await fetch("/api/recording/clips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(meta),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "metadata save failed");
  const realId: string | undefined = j.clip?.id;
  if (realId && realId !== tempId) {
    // Re-key the blob under the server clip id so library playback lines up.
    await idbPutClip(realId, blob);
    await idbDeleteClip(tempId);
    return realId;
  }
  return tempId;
}

/** The WebM flavour this browser's MediaRecorder prefers, or "" for its default. */
export function pickRecorderMime(): string {
  const cands = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const c of cands) {
    try {
      if (window.MediaRecorder?.isTypeSupported(c)) return c;
    } catch {}
  }
  return "";
}
