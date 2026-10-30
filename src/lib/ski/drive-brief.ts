/**
 * Powder Pass — drive-up brief: pure composition helpers.
 *
 * The brief (/ski-webcams/my/brief) is assembled in the browser from a
 * saved route plus the same live signals the route tool uses. These
 * helpers own the testable decisions — which three points get weather,
 * which followed resorts count as "near the destination", and how many
 * of a route's cameras actually play in the browser. Everything here
 * is pure: no fetch, no storage, no invented data. A signal that is
 * missing stays missing (null / empty) and the UI labels it honestly.
 */
import { cameraFeedTier, type CountryCamera } from "@/lib/country-cameras";
import type { SavedSkiRoute } from "./saved-routes";

export interface BriefWeatherPoint {
  /** "Start" / "Midway" / the destination's short name. */
  label: string;
  lat: number;
  lng: number;
}

/**
 * The three points a brief reads weather at: the start, the geometric
 * midpoint of the stored route polyline, and the destination — the
 * same three-point shape the route tool's conditions panel uses.
 */
export function briefWeatherPoints(route: SavedSkiRoute): BriefWeatherPoint[] {
  const mid = route.route[Math.floor(route.route.length / 2)];
  return [
    { label: "Start", lat: route.start.lat, lng: route.start.lng },
    { label: "Midway", lat: mid[1], lng: mid[0] },
    {
      label: route.dest.label.split(",")[0] ?? "Destination",
      lat: route.dest.lat,
      lng: route.dest.lng,
    },
  ];
}

/** Great-circle distance in kilometres. */
export function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

/** A followed resort reduced to what the brief needs. */
export interface BriefResort {
  slug: string;
  name: string;
  lat: number;
  lng: number;
}

/** "Near the destination" for the followed-resorts section. */
export const NEAR_DESTINATION_KM = 60;

/**
 * The followed resorts within NEAR_DESTINATION_KM of this route's
 * destination, closest first. Empty when the member follows nothing
 * nearby — the brief then omits the section entirely.
 */
export function followedNearDestination<T extends BriefResort>(
  followed: readonly T[],
  route: SavedSkiRoute,
  radiusKm: number = NEAR_DESTINATION_KM,
): T[] {
  return followed
    .map((r) => ({ r, d: distanceKm(route.dest.lat, route.dest.lng, r.lat, r.lng) }))
    .filter((x) => x.d <= radiusKm)
    .sort((a, b) => a.d - b.d)
    .map((x) => x.r);
}

/**
 * How many of a route's cameras stream directly in the browser
 * (feed tier 0 — the same count the route tool's conditions panel
 * reports). The rest open as embedded or external feeds.
 */
export function playableCameraCount(
  cameras: readonly CountryCamera[],
): number {
  return cameras.filter((c) => cameraFeedTier(c) === 0).length;
}
