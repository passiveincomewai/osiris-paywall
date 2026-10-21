/**
 * User dashboard (/dashboard) — pure helpers shared by the page's
 * client islands. Kept logic-only so they can be unit-tested without
 * rendering: how a saved camera previews, where its "open on globe"
 * link goes, and how a camera joins the recording wall's selection.
 *
 * The tracked-camera store itself is NOT re-implemented here: it is
 * the recording studio's SavedCamera rows behind /api/recording/cameras
 * (saved from the globe's camera viewer and the multi-record picker).
 */

export type CameraPreviewKind = "snapshot" | "stream" | "none";

type CamData = Record<string, unknown>;

function dataOf(cameraData: unknown): CamData {
  return cameraData && typeof cameraData === "object" ? (cameraData as CamData) : {};
}

function str(d: CamData, key: string): string {
  const v = d[key];
  return typeof v === "string" ? v : "";
}

/**
 * How a saved camera can preview on the dashboard, mirroring the
 * classification the recording tiles use (RecordableTile):
 *  - "snapshot": a still-image feed (stream_type "jpg" — the viewer
 *    refreshes feed_url as an <img>), or an image feed with no stream.
 *  - "stream":   a playable HLS/video stream_url (RecordableTile).
 *  - "none":     embeds / info-only entries — no honest preview.
 */
export function previewKind(cameraData: unknown): CameraPreviewKind {
  const d = dataOf(cameraData);
  const streamUrl = str(d, "stream_url");
  const feedUrl = str(d, "feed_url");
  const streamType = str(d, "stream_type");
  const externalUrl = str(d, "external_url");
  const isYouTube = /youtube\.com|youtu\.be/.test(externalUrl) || /youtube\.com|youtu\.be/.test(streamUrl);

  if (streamType === "jpg" || streamType === "snapshot" || streamType === "image") {
    return feedUrl || streamUrl ? "snapshot" : "none";
  }
  const playable =
    !!streamUrl &&
    !isYouTube &&
    (streamType === "hls" || streamType === "video" || streamType === "mp4" || /\.m3u8($|\?)/.test(streamUrl));
  if (playable) return "stream";
  if (feedUrl && !streamUrl) return "snapshot";
  return "none";
}

/** The still-image URL for a snapshot camera (feed first, as the viewer does). */
export function snapshotUrl(cameraData: unknown): string | null {
  const d = dataOf(cameraData);
  return str(d, "feed_url") || str(d, "stream_url") || null;
}

/** The catalogue id snapshot saved with the camera, when it has one. */
export function catalogueIdOf(cameraData: unknown): string | null {
  const d = dataOf(cameraData);
  const id = d.id;
  if (typeof id === "string" && id.trim()) return id.trim();
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return null;
}

/**
 * "Open on globe" target. The globe resolves ?camera=<catalogue id>
 * (the same deep link the alert inbox uses). Cameras saved from the
 * globe viewer before ids were snapshotted carry no id — those open
 * the plain globe rather than a wrong camera.
 */
export function globeHref(cameraData: unknown): string {
  const id = catalogueIdOf(cameraData);
  return id ? `/?camera=${encodeURIComponent(id)}` : "/";
}

/**
 * The multi-record wall persists its selection in localStorage under
 * this key (src/app/recording/multi/page.tsx). Writing through the
 * same key is the studio's own preselection mechanism: the wall
 * restores whatever ids are stored, filtered to cameras the user
 * still has saved.
 */
export const MULTI_SELECTION_KEY = "we_rec_multi_sel";

/**
 * New wall selection when a camera is sent to the wall from the
 * dashboard: the chosen camera first (so it leads the wall), then the
 * previously stored ids in order, de-duplicated. Unknown/stale ids are
 * kept — the wall filters them against the saved roster itself.
 */
export function mergeWallSelection(existing: unknown, addId: string): string[] {
  const prev = Array.isArray(existing)
    ? existing.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  return [addId, ...prev.filter((id) => id !== addId)];
}
