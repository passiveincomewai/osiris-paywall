/**
 * OSIRIS — what a camera can show inside a map preview tile.
 *
 * The tiles started out as JPEG snapshots only. That left Quebec 511 — 675
 * cameras, every one of them an MP4 clip — and the 75 HLS webcams as bare dots
 * at every zoom, which reads as "no camera here" rather than "this one needs a
 * player". Both play in a `<video>`, so both can have a tile.
 *
 * Kept out of the component so the rules are testable without a map.
 */

export type PreviewKind = 'jpg' | 'mjpeg' | 'mp4' | 'hls';

/** Fields of a camera record this module reads. */
export interface PreviewSource {
  stream_type?: string;
  feed_url?: string;
  stream_url?: string;
}

/** Kinds that need a `<video>` rather than an `<img>`. */
export const VIDEO_KINDS: ReadonlySet<PreviewKind> = new Set<PreviewKind>(['mp4', 'hls']);

/**
 * The URL a tile should render, and how.
 *
 * `null` means the camera stays a dot: either it is an embed (a YouTube or
 * operator page — eight of those in iframes over the map is a different
 * feature with a far worse frame budget) or the record has no usable URL for
 * the kind it claims to be.
 */
export function previewMedia(cam: PreviewSource): { kind: PreviewKind; url: string } | null {
  /* Absent stream_type means a snapshot feed, the same default the full viewer
     uses. */
  const declared = (cam.stream_type ?? 'jpg').toLowerCase();

  if (declared === 'mp4' || declared === 'hls') {
    const url = cam.stream_url?.trim();
    return url ? { kind: declared, url } : null;
  }

  if (declared === 'mjpeg') {
    /* A single response that never ends, so it is an <img> like a snapshot —
       but it must not be cache-busted, or every refresh restarts the stream. */
    const url = cam.stream_url?.trim();
    return url ? { kind: 'mjpeg', url } : null;
  }

  if (declared === 'jpg') {
    const url = cam.feed_url?.trim() || cam.stream_url?.trim();
    return url ? { kind: 'jpg', url } : null;
  }

  // iframe, and anything unrecognised.
  return null;
}

/** Cache-buster: snapshot feeds are one URL that returns a new frame each time. */
export function freshen(url: string): string {
  return url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
}

/**
 * How often a tile should re-request, in ms — or 0 for the kinds that keep
 * themselves current.
 *
 * A snapshot is one still frame, so it has to be re-fetched to look live. MP4
 * clips are short and loop, so they go stale too, but re-pointing a `<video>`
 * restarts playback: doing that on the snapshot cadence would make every clip
 * stutter every 15 seconds, so they refresh far less often. HLS and MJPEG are
 * continuous streams and must never be re-pointed.
 */
/**
 * The signed-in user's camera-view preferences (settings item 12),
 * seeded into localStorage (`we_camera_view`) by PreferencesProvider.
 * Read synchronously so the shared preview machinery honours them
 * without prop-drilling through every grid.
 */
export function cameraViewSeed(): { refreshSeconds: number | null; autoplay: boolean } {
  const fallback = { refreshSeconds: null, autoplay: true };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem('we_camera_view');
    if (!raw) return fallback;
    const v = JSON.parse(raw) as { refreshSeconds?: unknown; autoplay?: unknown };
    return {
      refreshSeconds: typeof v.refreshSeconds === 'number' && v.refreshSeconds >= 5 ? v.refreshSeconds : null,
      autoplay: v.autoplay !== false,
    };
  } catch {
    return fallback;
  }
}

export function refreshInterval(kind: PreviewKind): number {
  if (kind === 'jpg') {
    // The user's preview-refresh preference (settings item 12)
    // replaces the default 15s snapshot cadence in camera grids.
    const seed = cameraViewSeed();
    return seed.refreshSeconds ? seed.refreshSeconds * 1000 : 15000;
  }
  if (kind === 'mp4') return 60000;
  return 0;
}
