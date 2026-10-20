/**
 * The one enterprise payload shape, shared by all three doors — the token
 * feed, the API, and the embed — so a customer sees identical camera data
 * whichever they integrate. Rights filtering happens here and only here:
 * a camera whose source is not cleared for redistribution (lib/enterprise/
 * rights) never reaches a payload; it is reported in `excluded` with the
 * reason instead of being dropped silently.
 */
import { feedAttribution, feedEligibility } from "./rights";

/** A catalogue record in the cctv route's shape (full record). */
export interface CatalogueRecord {
  id: string;
  name?: string;
  city?: string;
  country?: string;
  source?: string;
  lat?: number;
  lng?: number;
  feed_url?: string;
  stream_url?: string;
  stream_type?: string;
  external_url?: string;
}

export interface FeedCamera {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  /** Live stream URL (HLS/embed/MP4/MJPEG), or null when the camera is snapshot-only. */
  streamUrl: string | null;
  /** The stream's kind: jpg | hls | iframe | mjpeg | mp4 (null with streamUrl). */
  streamType: string | null;
  /** Current-still URL served by WorldEye's frame route, or null for stream-only cameras. */
  snapshotUrl: string | null;
  /** The operating agency to credit, e.g. "Alberta 511 via WorldEye". */
  attribution: string;
  /** The catalogue source label the rights verdict was taken from. */
  source: string;
}

export interface ExcludedCamera {
  id: string;
  name: string;
  reason: string;
}

export interface CollectionPayload {
  cameras: FeedCamera[];
  excluded: ExcludedCamera[];
}

/** Infer the stream kind the way the catalogue does when it omits it. */
function streamTypeOf(raw: CatalogueRecord): string {
  if (raw.stream_type) return raw.stream_type;
  if (raw.stream_url) {
    if (raw.stream_url.includes(".m3u8")) return "hls";
    if (raw.stream_url.includes(".mp4")) return "mp4";
    return "iframe";
  }
  return "jpg";
}

export function toFeedCamera(raw: CatalogueRecord, origin: string): FeedCamera {
  const type = streamTypeOf(raw);
  const streamUrl =
    raw.stream_url ??
    (raw.feed_url && (type === "mjpeg" || type === "mp4") ? raw.feed_url : null);
  // A still exists when the record carries a snapshot feed (the vision
  // layer's rule: stream_type jpg over feed_url). The frame route serves
  // it by id, so the URL is stable for integrators.
  const hasStill = !!raw.feed_url && (type === "jpg" || (!raw.stream_type && !raw.stream_url));
  return {
    id: raw.id,
    name: raw.name ?? raw.id,
    city: raw.city ?? "",
    country: raw.country ?? "",
    lat: raw.lat ?? 0,
    lng: raw.lng ?? 0,
    streamUrl,
    streamType: streamUrl ? type : null,
    snapshotUrl: hasStill ? `${origin}/api/cctv/frame?id=${encodeURIComponent(raw.id)}` : null,
    attribution: feedAttribution(raw),
    source: raw.source ?? "",
  };
}

/**
 * Split a collection's catalogue records into the payload: rights-cleared
 * cameras with a playable URL in, everything else out — with its reason.
 * `records` maps camera id → catalogue record (undefined = no longer in
 * the catalogue).
 */
export function buildCollectionPayload(
  items: { cameraId: string }[],
  records: Map<string, CatalogueRecord | undefined>,
  origin: string,
): CollectionPayload {
  const cameras: FeedCamera[] = [];
  const excluded: ExcludedCamera[] = [];
  for (const item of items) {
    const raw = records.get(item.cameraId);
    if (!raw) {
      excluded.push({
        id: item.cameraId,
        name: item.cameraId,
        reason: "This camera is no longer in the WorldEye catalogue.",
      });
      continue;
    }
    const verdict = feedEligibility(raw);
    if (!verdict.eligible) {
      excluded.push({ id: raw.id, name: raw.name ?? raw.id, reason: verdict.basis });
      continue;
    }
    const cam = toFeedCamera(raw, origin);
    if (!cam.streamUrl && !cam.snapshotUrl) {
      excluded.push({
        id: raw.id,
        name: cam.name,
        reason: "This camera has no playable stream or snapshot URL in the catalogue (link-only record).",
      });
      continue;
    }
    cameras.push(cam);
  }
  return { cameras, excluded };
}
