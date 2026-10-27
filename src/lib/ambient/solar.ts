/**
 * Solar position for the Ambient "Night Views" mood.
 *
 * The night mood promises cameras where it is *actually dark right
 * now* — not cameras with "night" in the name. That needs the sun's
 * elevation at the camera's coordinates at request time, computed
 * from first principles (the standard NOAA solar approximation):
 * fractional year → equation of time + declination → hour angle →
 * zenith. Accuracy is ~0.2°, far more than a day/night decision needs,
 * and it costs nothing per camera — no weather join, no external call.
 *
 * Elevation < 0° means the sun is below the horizon. The mood uses a
 * slightly stricter threshold (NIGHT_ELEVATION_DEG) so twilight-edge
 * cameras don't sneak into a "night" collection.
 */

const DEG = Math.PI / 180;

/** Sun elevation (degrees above the horizon) at lat/lng at `date`. */
export function sunElevationDeg(
  lat: number,
  lng: number,
  date: Date = new Date(),
): number {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear =
    Math.floor((date.getTime() - startOfYear) / 86_400_000) || 1;
  const hourUtc =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;

  // Fractional year (radians) — NOAA approximation.
  const gamma =
    ((2 * Math.PI) / 365) *
    (dayOfYear - 1 + (hourUtc - 12) / 24);

  // Equation of time (minutes) and solar declination (radians).
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);

  // True solar time (minutes) → hour angle (degrees).
  let timeOffset = eqTime + 4 * lng; // lng in degrees, +east
  let trueSolarTime = (hourUtc * 60 + timeOffset) % 1440;
  if (trueSolarTime < 0) trueSolarTime += 1440;
  let hourAngle = trueSolarTime / 4 - 180;
  if (hourAngle < -180) hourAngle += 360;

  const latRad = lat * DEG;
  const cosZenith =
    Math.sin(latRad) * Math.sin(decl) +
    Math.cos(latRad) * Math.cos(decl) * Math.cos(hourAngle * DEG);
  const clamped = Math.min(1, Math.max(-1, cosZenith));
  const zenithDeg = Math.acos(clamped) / DEG;
  return 90 - zenithDeg;
}

/** Below this elevation the mood counts a place as night. Slightly
 *  past sunset so the collection is genuinely dark, not dusk-lit. */
export const NIGHT_ELEVATION_DEG = -2;

/** Is it night at lat/lng right now (or at `date`)? */
export function isNightAt(
  lat: number,
  lng: number,
  date: Date = new Date(),
): boolean {
  return sunElevationDeg(lat, lng, date) < NIGHT_ELEVATION_DEG;
}
