/**
 * Opening a shared flight (/?flight=<icao24>) on the globe.
 *
 * OsirisMap's attemptOpenFlight resolves the aircraft two ways: from
 * the live map sources (querySourceFeatures — only sees features
 * inside the tiles the map currently renders), or from the in-memory
 * snapshot blend, which holds the full dataset regardless of
 * viewport. The pieces below are the dataset path and the camera
 * target, kept pure so the behaviour is pinned by tests rather than
 * by reading a 6k-line component.
 *
 * The share id itself is links.ts's contract: flightShareId accepts
 * an ICAO24 hex only (registrations like "N84BL" are not share ids —
 * buildEntityShareUrl can never mint one), so resolution here matches
 * on icao24 via featureMatchesFlightShareId and nothing else.
 */
import { flightToFeature, type FlightBuckets } from '../flights/render';
import { featureMatchesFlightShareId } from './links';

/** Zoom a flight share landing flies to (never zooms out past it). */
export const FLIGHT_SHARE_ZOOM = 8;

export interface FlightShareFlyToTarget {
  center: [number, number];
  zoom: number;
}

/**
 * The camera target for an opened flight feature, or null when the
 * feature carries no usable position — the caller still shows the
 * card, it simply has nowhere honest to fly.
 */
export function flightShareFlyToTarget(
  feature: { geometry?: { coordinates?: unknown } } | null | undefined,
  currentZoom: number,
): FlightShareFlyToTarget | null {
  const c = feature?.geometry?.coordinates;
  if (!Array.isArray(c) || c.length < 2) return null;
  const lng = Number(c[0]);
  const lat = Number(c[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { center: [lng, lat], zoom: Math.max(currentZoom, FLIGHT_SHARE_ZOOM) };
}

/**
 * Find a shared flight in the snapshot blend's buckets and convert it
 * to the GeoJSON feature the map's popup/flyTo consume. Buckets are
 * searched in the map's own order (commercial, private, jets,
 * military); the first icao24 match wins. Null when the aircraft is
 * not in the dataset (landed, or not yet arrived — the caller keeps
 * the share request pending and retries as sources load).
 */
export function findFlightFeatureInBuckets(
  buckets: Partial<FlightBuckets> | null | undefined,
  id: string,
): ReturnType<typeof flightToFeature> | null {
  if (!buckets) return null;
  for (const bucket of [
    buckets.commercial_flights,
    buckets.private_flights,
    buckets.private_jets,
    buckets.military_flights,
  ]) {
    const rec = (bucket || []).find((f: any) =>
      featureMatchesFlightShareId({ properties: f }, id),
    );
    if (rec) return flightToFeature(rec);
  }
  return null;
}

/** How far (degrees) the settled camera may sit from the target
 *  before a dataset-open flight counts as never having arrived —
 *  ~0.5° is tens of km: far enough that a completed flyTo (which ends
 *  on the target to the metre) never trips it, near enough that a
 *  camera left on the viewer's own city does. */
export const FLIGHT_SHARE_SETTLED_TOLERANCE_DEG = 0.5;

/**
 * True when the camera has settled on the flight's target. A dataset
 * open can resolve while the load sequence is still moving the
 * camera, and its flyTo can be superseded before the visitor sees the
 * aircraft; the caller re-flies once when this says the camera never
 * arrived.
 */
export function flightShareCameraSettledOn(
  centre: { lng: number; lat: number },
  target: readonly [number, number],
): boolean {
  return (
    Math.abs(centre.lng - target[0]) <= FLIGHT_SHARE_SETTLED_TOLERANCE_DEG &&
    Math.abs(centre.lat - target[1]) <= FLIGHT_SHARE_SETTLED_TOLERANCE_DEG
  );
}
