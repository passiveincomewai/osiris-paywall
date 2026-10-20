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
 *  - the visitor's approximate location (lib/visitor-geo.ts — platform
 *    geo headers, CITY level at best) and
 *  - the camera catalogue the page has ALREADY loaded (no extra fetch,
 *    no new protocol), searched with the shared findNearestCameras.
 *
 * Honesty rules, enforced here rather than in the component:
 *  - "Near" requires at least one camera inside NEAR_YOU_RADIUS_M of
 *    the resolved point. Otherwise the strip falls back to the curated
 *    featured set and labels it "Featured cameras" — distant cameras
 *    are never dressed up as near.
 *  - Distances are computed from a city-level point, so they are
 *    estimates: labels carry "≈", are rounded to whole kilometres with
 *    a 1 km floor (sub-kilometre precision from a city centroid would
 *    be fiction), and the strip prints an approximate-distances note.
 *  - The area label is the coarsest place name available (city, else
 *    region, else country) — never coordinates.
 *
 * Opening a strip camera goes through the shipped first-camera bridge
 * (we:open-camera → findCameraById → handleEntityClick), so the free
 * camera gate and counting apply exactly as for a map click.
 */
import { findNearestCameras, type CameraCandidate } from '@/lib/nearby-cameras';
import type { FirstCamera } from '@/lib/onboarding/first-camera';
import type { VisitorLocation } from '@/lib/visitor-geo';

/** "Near" means the same metro area: a city point plus its suburbs. */
export const NEAR_YOU_RADIUS_M = 50_000;
export const NEAR_YOU_MAX = 6;
export const NEAR_YOU_DISMISS_KEY = 'we_near_you_dismissed';

export interface NearYouItem {
  id: string;
  name: string;
  /** Camera's own city, when the catalogue names one. */
  city: string | null;
  /** Formatted approximate distance ("≈12 km"); near plan only. */
  distanceLabel: string | null;
}

export type NearYouPlan =
  | { kind: 'near'; areaLabel: string; items: NearYouItem[] }
  | { kind: 'featured'; items: NearYouItem[] }
  | { kind: 'pending' }
  | { kind: 'none' };

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
 * Decide what the strip shows.
 *
 *  - location known + a camera inside the radius → 'near'
 *  - location known + catalogue still loading     → 'pending' (wait —
 *    the nearest cameras may simply not have landed yet; flashing the
 *    featured set first would be wrong twice over)
 *  - location known + catalogue settled, none near → 'featured'
 *  - no location at all                            → 'featured'
 *  - featured needed but the showcase set is empty → 'none'
 */
export function planNearYou(input: {
  location: VisitorLocation | null;
  cameras: CameraCandidate[] | undefined;
  catalogueSettled: boolean;
  showcase: FirstCamera[];
}): NearYouPlan {
  const { location, cameras, catalogueSettled, showcase } = input;

  if (location) {
    const near = findNearestCameras(cameras ?? [], [location.lng, location.lat], {
      radiusM: NEAR_YOU_RADIUS_M,
      max: NEAR_YOU_MAX,
    });
    if (near.length > 0) {
      return {
        kind: 'near',
        areaLabel: areaLabelFor(location),
        items: near.map(({ camera, distanceM }) => ({
          id: String(camera.id),
          name: itemName(camera),
          city: typeof camera.city === 'string' && camera.city.trim() ? camera.city.trim() : null,
          distanceLabel: formatApproxDistance(distanceM),
        })),
      };
    }
    if (!catalogueSettled) return { kind: 'pending' };
  }

  const featured = (showcase ?? []).slice(0, NEAR_YOU_MAX);
  if (featured.length > 0) {
    return {
      kind: 'featured',
      items: featured.map((cam) => ({
        id: cam.id,
        name: itemName(cam),
        city: cam.city ?? cam.country,
        distanceLabel: null,
      })),
    };
  }
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
