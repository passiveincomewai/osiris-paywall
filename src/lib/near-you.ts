/**
 * Near You — the strip that greets a visitor on the globe with the
 * cameras closest to where they actually are.
 *
 * Why this exists (DB-measured, 2026-10-19): ~74% of globe sessions
 * never open a camera, and the median session is seconds long. The
 * globe already flies to the visitor's area; this strip names the
 * cameras there, so the first tap is obvious instead of a hunt for a
 * glowing dot.
 *
 * Inputs are deliberately boring:
 *  - the current view centre (what is actually on screen) and the
 *    visitor's approximate location (lib/visitor-geo.ts — platform
 *    geo headers, CITY level at best), and
 *  - the camera catalogue the page has ALREADY loaded (no extra fetch,
 *    no new protocol), searched with the shared findNearestCameras.
 *
 * Honesty rules, enforced here rather than in the component:
 *  - "Centre"/"Near" require at least one still-capable camera inside
 *    the mode's radius of the searched point. Otherwise the prompt
 *    falls back to the curated featured set and labels it "Featured
 *    cameras" — distant cameras are never dressed up as near.
 *  - Near-mode distances are computed from a city-level point, so they
 *    are estimates: labels carry "≈", are rounded to whole kilometres
 *    with a 1 km floor (sub-kilometre precision from a city centroid
 *    would be fiction), and the strip prints an approximate-distances
 *    note for that mode. Centre-mode distances are measured from the
 *    rendered view centre and carry the same ≈ format.
 *  - The area label is the coarsest place name available (city, else
 *    region, else country) — never coordinates. Centre mode is labelled
 *    with the nearest camera's own city, which is where that camera is.
 *
 * Opening a strip camera goes through the shipped first-camera bridge
 * (we:open-camera → findCameraById → handleEntityClick), so the free
 * camera gate and counting apply exactly as for a map click.
 *
 * First-camera upgrade (2026-10-28): the strip's text chips converted at
 * ~21% of shown, and "shown" fired even while the group-B welcome panel
 * covered the strip. The prompt is now visual and view-first:
 *  - every item carries a REAL still, resolved by the same
 *    previewMedia() the map tiles and landing gallery use. A camera
 *    whose only media is HLS cannot show a still and is never offered
 *    as a card — the prompt would rather show fewer cameras than a
 *    broken or blank tile.
 *  - selection tries the current VIEW CENTRE first (what is on screen),
 *    then the visitor's area, then the curated featured set.
 * The component owns the session rules (once per session, only before
 * the first camera open, never stacked on another prompt); this module
 * owns only what is offered.
 */
import { previewMedia, type PreviewKind } from '@/lib/camera-preview';
import { findNearestCameras, type CameraCandidate } from '@/lib/nearby-cameras';
import type { FirstCamera } from '@/lib/onboarding/first-camera';
import type { VisitorLocation } from '@/lib/visitor-geo';

/** "Near" means the same metro area: a city point plus its suburbs. */
export const NEAR_YOU_RADIUS_M = 50_000;
/** The view-centre search reaches a little further: at the zoom-8
 *  arrival view the visible metro sprawl is wider than 50 km. */
export const CENTRE_RADIUS_M = 75_000;
/** Cards on the prompt. Thumbnails made the old 6-chip row into a
 *  visual shortlist; 4 is what fits a phone without covering the map. */
export const NEAR_YOU_MAX = 4;
/** Candidates scanned before the still-capable filter, so a cluster of
 *  HLS-only cameras cannot eat the whole shortlist. */
const SCAN_MAX = 12;
export const NEAR_YOU_DISMISS_KEY = 'we_near_you_dismissed';

/** A still the prompt can actually render: an image feed, or an MP4
 *  clip (native <video>). HLS needs a decoder the prompt does not load. */
export interface NearYouMedia {
  kind: Exclude<PreviewKind, 'hls'>;
  url: string;
}

export interface NearYouItem {
  id: string;
  name: string;
  /** Camera's own city, when the catalogue names one. */
  city: string | null;
  /** Formatted approximate distance ("≈12 km"); centre/near plans only. */
  distanceLabel: string | null;
  /** The camera's real still; every offered item carries one. */
  media: NearYouMedia;
}

export type NearYouPlan =
  | { kind: 'centre'; areaLabel: string; items: NearYouItem[] }
  | { kind: 'near'; areaLabel: string; items: NearYouItem[] }
  | { kind: 'featured'; items: NearYouItem[] }
  | { kind: 'pending' }
  | { kind: 'none' };

/** Resolve a catalogue record to a renderable still, or null. */
function stillFor(cam: CameraCandidate): NearYouMedia | null {
  const media = previewMedia(cam);
  if (!media || media.kind === 'hls') return null;
  return { kind: media.kind, url: media.url };
}

/**
 * Nearest still-capable cameras to a point, nearest first. The scan
 * over-fetches (SCAN_MAX) and filters, so the cap applies to cameras
 * the prompt can actually show.
 */
function nearestWithStills(
  cameras: CameraCandidate[],
  at: [number, number],
  radiusM: number,
): NearYouItem[] {
  const found = findNearestCameras(cameras, at, { radiusM, max: SCAN_MAX });
  const out: NearYouItem[] = [];
  for (const { camera, distanceM } of found) {
    const media = stillFor(camera);
    if (!media) continue;
    out.push({
      id: String(camera.id),
      name: itemName(camera),
      city: typeof camera.city === 'string' && camera.city.trim() ? camera.city.trim() : null,
      distanceLabel: formatApproxDistance(distanceM),
      media,
    });
    if (out.length >= NEAR_YOU_MAX) break;
  }
  return out;
}

/** Coarsest honest name for the visitor's area. */
export function areaLabelFor(loc: VisitorLocation | null): string {
  return loc?.city ?? loc?.region ?? loc?.country ?? 'Your Area';
}

/**
 * Format a distance from a city-level origin. Whole kilometres, "≈"
 * prefix, 1 km floor — anything finer would claim precision the input
 * does not have.
 */
export function formatApproxDistance(distanceM: number): string {
  const km = Math.max(1, Math.round(distanceM / 1000));
  return `≈${km} km`;
}

function itemName(cam: { name?: string | null; city?: string | null }): string {
  return (typeof cam.name === 'string' && cam.name.trim()) || cam.city || 'Live camera';
}

/**
 * Decide what the prompt shows, in honesty order:
 *
 *  - view centre known + a still-capable camera inside the radius
 *      → 'centre', labelled with the nearest camera's own city
 *  - location known + a still-capable camera inside the radius → 'near'
 *  - a point to search from + catalogue still loading → 'pending'
 *    (wait — the nearest cameras may simply not have landed yet;
 *    flashing the featured set first would be wrong twice over)
 *  - otherwise → the curated featured set, under its own name — but
 *    only its still-capable entries (the prompt is visual now)
 *  - featured needed but no still-capable showcase entry → 'none'
 */
export function planNearYou(input: {
  location: VisitorLocation | null;
  /** Current map view centre, when the parent knows it. */
  centre: { lat: number; lng: number } | null;
  cameras: CameraCandidate[] | undefined;
  catalogueSettled: boolean;
  showcase: FirstCamera[];
}): NearYouPlan {
  const { location, centre, cameras, catalogueSettled, showcase } = input;
  const catalogue = cameras ?? [];

  if (centre) {
    const items = nearestWithStills(catalogue, [centre.lng, centre.lat], CENTRE_RADIUS_M);
    if (items.length > 0) {
      return { kind: 'centre', areaLabel: items[0].city ?? 'Here', items };
    }
  }

  if (location) {
    const items = nearestWithStills(catalogue, [location.lng, location.lat], NEAR_YOU_RADIUS_M);
    if (items.length > 0) {
      return { kind: 'near', areaLabel: areaLabelFor(location), items };
    }
  }

  if ((centre || location) && !catalogueSettled) return { kind: 'pending' };

  const featured: NearYouItem[] = [];
  for (const cam of showcase ?? []) {
    const media = cam.media;
    if (!media || media.kind === 'hls') continue;
    featured.push({
      id: cam.id,
      name: itemName(cam),
      city: cam.city ?? cam.country,
      distanceLabel: null,
      media: { kind: media.kind, url: media.url },
    });
    if (featured.length >= NEAR_YOU_MAX) break;
  }
  if (featured.length > 0) return { kind: 'featured', items: featured };
  return { kind: 'none' };
}

/* ── Dismissal: once per device, permanent, never re-nagged. ── */

export interface NearYouStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

const defaultStore: NearYouStore = {
  get(key) {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    } catch {
      /* private mode — the strip simply won't remember */
    }
  },
};

export function isNearYouDismissed(store: NearYouStore = defaultStore): boolean {
  try {
    return store.get(NEAR_YOU_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissNearYou(store: NearYouStore = defaultStore): void {
  try {
    store.set(NEAR_YOU_DISMISS_KEY, '1');
  } catch {
    /* ignore — dismissal is best-effort, like all onboarding storage */
  }
}
