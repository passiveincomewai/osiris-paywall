/**
 * OSIRIS — Sunrise Around the World: which cameras are on the dawn (or dusk)
 * line right now.
 *
 * The solar model is deliberately the same approximation the globe itself
 * draws with (OsirisMap's computeSolarTerminator and live-clouds' sunTerms):
 * declination δ = −23.44° · cos(2π/365 · (dayOfYear + 10)), and the sun
 * directly overhead at longitude (12 − UTC hours) · 15°. Sharing the model
 * means this page's band edges land where the map's night shade says they
 * should — one sun for the whole site, not a second, disagreeing one.
 *
 * On top of that shared model this module does the per-camera geometry:
 * the hour angle at which the sun's upper limb crosses −0.833° of elevation
 * (the standard sunrise/sunset definition — the visible limb plus average
 * refraction), and from it the exact minute today's sunrise or sunset
 * happens at a camera's coordinates. A camera is "on the line" when that
 * minute is close to now. Polar day and polar night have no crossing —
 * the hour-angle cosine leaves [−1, 1] — and report null rather than a
 * fabricated time.
 *
 * Pure and clock-free: every function takes the instant it should reason
 * about, so the tests can pin known dates and the API route can pass the
 * request time.
 */

import { previewMedia } from './camera-preview';

export type SunMode = 'sunrise' | 'sunset';

/** Elevation of the sun's centre at the defined sunrise/sunset moment:
 *  the upper limb on the horizon with average refraction. */
export const SUN_EVENT_ELEVATION_DEG = -0.833;

/** Default half-window, in minutes on each side of the event, that counts
 *  as "on the line": the glow before, the low sun after. 45 + 45 minutes
 *  is a ~22.5°-wide band of longitude at the equator. */
export const DEFAULT_WINDOW_BEFORE_MIN = 45;
export const DEFAULT_WINDOW_AFTER_MIN = 45;

/** How many cameras a selection returns at most. */
export const DEFAULT_LIMIT = 24;

const DEG = Math.PI / 180;

/** Wrap a longitude into (−180, 180]. */
export function normalizeLng(lng: number): number {
  let out = lng % 360;
  if (out > 180) out -= 360;
  if (out <= -180) out += 360;
  return out;
}

/** Day of year in UTC, 1-based — the input the shared declination model uses. */
export function utcDayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86400000);
}

export interface SunTerms {
  /** Solar declination, degrees (negative in northern winter). */
  declinationDeg: number;
  /** Longitude the sun is directly overhead, degrees in (−180, 180]. */
  subsolarLng: number;
}

/** The shared solar model: declination + subsolar longitude at `date`. */
export function sunTermsAt(date: Date): SunTerms {
  const dayOfYear = utcDayOfYear(date);
  const declinationDeg = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const subsolarLng = normalizeLng((12 - utcHours) * 15);
  return { declinationDeg, subsolarLng };
}

/** The sun's elevation above the horizon at a place, in degrees. */
export function sunElevationDeg(lat: number, lng: number, date: Date): number {
  const { declinationDeg, subsolarLng } = sunTermsAt(date);
  const phi = lat * DEG;
  const dec = declinationDeg * DEG;
  const hourAngle = (lng - subsolarLng) * DEG;
  const cosZenith =
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle);
  const clamped = Math.min(1, Math.max(-1, cosZenith));
  return 90 - Math.acos(clamped) / DEG;
}

/**
 * Minutes from `date` until the sun crosses the event elevation at this
 * camera, on the rising side (mode 'sunrise') or the setting side
 * ('sunset'). Negative means the crossing already happened; the value is
 * the NEAREST such crossing, wrapped into (−720, 720]. Null when there is
 * no crossing at all — polar day or polar night at that latitude on that
 * date.
 */
export function sunEventOffsetMinutes(
  lat: number,
  lng: number,
  date: Date,
  mode: SunMode,
): number | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) >= 90) return null;
  const { declinationDeg, subsolarLng } = sunTermsAt(date);
  const phi = lat * DEG;
  const dec = declinationDeg * DEG;
  const cosPhi = Math.cos(phi);
  if (Math.abs(cosPhi) < 1e-9) return null;
  const cosH0 =
    (Math.sin(SUN_EVENT_ELEVATION_DEG * DEG) - Math.sin(phi) * Math.sin(dec)) /
    (cosPhi * Math.cos(dec));
  if (cosH0 < -1 || cosH0 > 1) return null; // the sun never crosses: polar day/night
  const h0Deg = Math.acos(cosH0) / DEG; // 0..180, half the daylight arc
  // Minutes until local apparent solar noon. The subsolar longitude
  // sweeps WEST at 15°/hour (4 minutes per degree), so solar noon reaches
  // this camera when the subsolar point — currently at subsolarLng —
  // has travelled down to the camera's longitude: (subsolarLng − lng).
  const noonOffsetMin = normalizeLng(subsolarLng - lng) * 4;
  let offset = mode === 'sunrise' ? noonOffsetMin - h0Deg * 4 : noonOffsetMin + h0Deg * 4;
  // Wrap to the nearest daily crossing, (−720, 720].
  if (offset > 720) offset -= 1440;
  if (offset <= -720) offset += 1440;
  return offset;
}

/** The instant of the crossing `offsetMinutes` from `date`, as an ISO string. */
export function sunEventIso(date: Date, offsetMinutes: number): string {
  return new Date(date.getTime() + offsetMinutes * 60000).toISOString();
}

/**
 * The longitude the event line is crossing at the equator: 90° east of the
 * subsolar point for sunset, 90° west for sunrise — the band centre the
 * strip's geography hangs off. (Per-camera selection above is exact at
 * every latitude; this is the headline number.)
 */
export function sunBandCenterLng(date: Date, mode: SunMode): number {
  const { subsolarLng } = sunTermsAt(date);
  return normalizeLng(mode === 'sunrise' ? subsolarLng - 90 : subsolarLng + 90);
}

/* ------------------------------------------------------------------ */
/* Selection                                                           */
/* ------------------------------------------------------------------ */

/** The catalogue fields the selection reads (the /api/cctv record shape). */
export interface SunCameraInput {
  id?: string | number | null;
  name?: string | null;
  city?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  feed_url?: string | null;
  stream_url?: string | null;
  stream_type?: string | null;
  external_url?: string | null;
  source?: string | null;
}

/** A camera on the line: the record, slimmed, plus its sun geometry. */
export interface SunPick {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  lat: number;
  lng: number;
  feed_url?: string;
  stream_url?: string;
  stream_type?: string;
  external_url?: string;
  source?: string;
  /** Minutes until the event; negative = it happened that long ago. */
  offsetMinutes: number;
  /** ISO instant of the event at this camera. */
  eventTime: string;
  /** The sun's elevation at the camera right now, degrees. */
  elevationDeg: number;
}

export interface SelectSunOptions {
  mode: SunMode;
  /** Keep cameras whose event is at most this many minutes ahead. */
  beforeMinutes?: number;
  /** Keep cameras whose event is at most this many minutes behind. */
  afterMinutes?: number;
  /** Cap on returned picks. */
  limit?: number;
}

/** A full selection for one mode at one instant (the /api/sunrise payload). */
export interface SunriseSelection {
  /** ISO instant this selection was computed for. */
  generatedAt: string;
  mode: SunMode;
  /** Longitude the event line is crossing at the equator, degrees. */
  bandCenterLng: number;
  /** How the catalogue was obtained: the saved snapshot or the sparse sample. */
  source: 'snapshot' | 'sparse';
  /** Catalogue records considered (with coordinates), before windowing. */
  considered: number;
  picks: SunPick[];
}

/** previewMedia's input shape wants undefined, not null — normalise once. */
function previewOf(cam: SunCameraInput) {
  return previewMedia({
    stream_type: cam.stream_type ?? undefined,
    feed_url: cam.feed_url ?? undefined,
    stream_url: cam.stream_url ?? undefined,
  });
}

/** Still-image kinds rank ahead of video kinds for the featured rotation:
 *  a snapshot always renders; an HLS embed may not. */
function mediaRank(cam: SunCameraInput): number {
  const media = previewOf(cam);
  if (!media) return 99;
  return media.kind === 'jpg' || media.kind === 'mjpeg' ? 0 : 1;
}

/**
 * Choose the cameras on the line at `date`. Keeps records with an id, a
 * name, real coordinates and something a browser can actually show
 * (previewMedia's rule — embeds and URL-less records stay out), inside the
 * time window, nearest-to-the-moment first. Within a 5-minute bucket a
 * still-image camera outranks a video one, so the featured rotation leads
 * with frames that always paint.
 */
export function selectSunCameras(
  cameras: readonly SunCameraInput[],
  date: Date,
  options: SelectSunOptions,
): SunPick[] {
  const before = options.beforeMinutes ?? DEFAULT_WINDOW_BEFORE_MIN;
  const after = options.afterMinutes ?? DEFAULT_WINDOW_AFTER_MIN;
  const limit = options.limit ?? DEFAULT_LIMIT;

  const seen = new Set<string>();
  const scored: { pick: SunPick; rank: number }[] = [];

  for (const cam of cameras) {
    if (cam.id === null || cam.id === undefined) continue;
    const id = String(cam.id).trim();
    if (!id || seen.has(id)) continue;
    const name = typeof cam.name === 'string' ? cam.name.trim() : '';
    if (!name) continue;
    const lat = typeof cam.lat === 'number' ? cam.lat : NaN;
    const lng = typeof cam.lng === 'number' ? cam.lng : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (Math.abs(lat) > 82) continue; // polar geometry: no honest crossing to feature
    if (!previewOf(cam)) continue;

    const offset = sunEventOffsetMinutes(lat, lng, date, options.mode);
    if (offset === null) continue;
    if (offset < -after || offset > before) continue;

    seen.add(id);
    scored.push({
      rank: mediaRank(cam),
      pick: {
        id,
        name,
        city: typeof cam.city === 'string' && cam.city.trim() ? cam.city.trim() : null,
        country: typeof cam.country === 'string' && cam.country.trim() ? cam.country.trim() : null,
        lat,
        lng,
        ...(cam.feed_url ? { feed_url: cam.feed_url } : {}),
        ...(cam.stream_url ? { stream_url: cam.stream_url } : {}),
        ...(cam.stream_type ? { stream_type: cam.stream_type } : {}),
        ...(cam.external_url ? { external_url: cam.external_url } : {}),
        ...(cam.source ? { source: cam.source } : {}),
        offsetMinutes: Math.round(offset * 10) / 10,
        eventTime: sunEventIso(date, offset),
        elevationDeg: Math.round(sunElevationDeg(lat, lng, date) * 10) / 10,
      },
    });
  }

  scored.sort((a, b) => {
    const bucketA = Math.round(Math.abs(a.pick.offsetMinutes) / 5);
    const bucketB = Math.round(Math.abs(b.pick.offsetMinutes) / 5);
    if (bucketA !== bucketB) return bucketA - bucketB;
    if (a.rank !== b.rank) return a.rank - b.rank;
    const byOffset = Math.abs(a.pick.offsetMinutes) - Math.abs(b.pick.offsetMinutes);
    if (byOffset !== 0) return byOffset;
    return a.pick.name.localeCompare(b.pick.name);
  });

  return scored.slice(0, limit).map(s => s.pick);
}
