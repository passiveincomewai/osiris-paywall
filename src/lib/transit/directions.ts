/**
 * OSIRIS — "Directions to this stop" hand-off (rider upgrade,
 * 2026-10-26). The transit surfaces (map stop card, Explorer stop
 * rows) do not route anything themselves: they dispatch ONE window
 * event carrying the stop as the destination, and the page — which
 * owns the existing SEARCH & ROUTE DirectionsBar stack — opens
 * Directions with the stop set as the destination and walking as
 * the mode. Same bridge pattern as 'we:open-transit-explorer'.
 *
 * Origin precedence (resolved on the page, which owns the map):
 * an already-granted geolocation fix first, then the map centre.
 * Nothing here prompts for location permission — asking stays the
 * Directions bar's own locate button, an explicit tap.
 *
 * The URL builder mirrors DirectionsBar's fetch construction
 * exactly, so the request the router receives is pinned by test
 * rather than by two implementations drifting apart.
 */

/** Window event the page listens for. Detail: StopDirectionsDetail. */
export const STOP_DIRECTIONS_EVENT = 'we:directions-to';

export interface StopDirectionsDetail {
  label: string;
  lat: number;
  lng: number;
  kind: 'stop';
  /** Getting to a stop is a walk (the transit leg is the bus you
   *  are walking TO); the bar still offers drive/bike switches. */
  mode: 'pedestrian';
}

export interface StopPoint {
  name: string;
  lat: number;
  lng: number;
}

/** The event detail for one stop. The label names the stop so the
 *  destination field reads like a place, not coordinates. */
export function stopDirectionsDetail(stop: StopPoint): StopDirectionsDetail {
  return { label: stop.name, lat: stop.lat, lng: stop.lng, kind: 'stop', mode: 'pedestrian' };
}

/**
 * Dispatch the hand-off. Returns false outside a browser (SSR /
 * tests) instead of throwing — the button simply has nowhere to
 * hand off to there.
 */
export function dispatchStopDirections(stop: StopPoint): boolean {
  if (typeof window === 'undefined') return false;
  window.dispatchEvent(
    new CustomEvent(STOP_DIRECTIONS_EVENT, { detail: stopDirectionsDetail(stop) }),
  );
  return true;
}

export interface OriginPoint {
  label: string;
  lat: number;
  lng: number;
  kind: string;
}

/**
 * Origin precedence: a granted geolocation fix beats the map
 * centre; neither ⇒ null and the Directions bar opens with the
 * origin for the rider to pick (its search + locate cover it).
 */
export function pickOrigin(
  geoFix: OriginPoint | null,
  mapCenter: { lat: number; lng: number } | null,
): OriginPoint | null {
  if (geoFix) return geoFix;
  if (mapCenter) {
    return { label: 'Map centre', lat: mapCenter.lat, lng: mapCenter.lng, kind: 'coordinate' };
  }
  return null;
}

/**
 * The /api/directions request for an origin → destination pair —
 * byte-identical construction to DirectionsBar.runRoute's fetch
 * (from,to as "lat,lng", mode, optional via/avoid only when set).
 */
export function directionsApiUrl(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: string,
): string {
  return `/api/directions?from=${from.lat},${from.lng}&to=${to.lat},${to.lng}&mode=${mode}`;
}
