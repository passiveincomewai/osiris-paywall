/**
 * OSIRIS — launch replay ascent profile: a parametric RECONSTRUCTION.
 *
 * ⚠️ This module does not contain, approximate from, or imply real
 * telemetry. Launch Library 2 publishes schedule, vehicle and target-orbit
 * class — never a trajectory. What is built here is the textbook nominal
 * ascent for that orbit class: vertical rise, gravity turn onto the
 * standard launch azimuth for the target inclination, and a smooth climb
 * to the class's nominal altitude over a vehicle-typical duration. Every
 * surface that plays it carries REPLAY_BANNER for the whole playback, and
 * the replay is never offered as the position of a launch in progress.
 */
import type { LaunchRecord } from './types';

export const REPLAY_BANNER = 'RECONSTRUCTED ESTIMATE — NOT LIVE TELEMETRY';
export const REPLAY_NOTE =
  'This ascent is a parametric reconstruction from the launch pad and target-orbit class — no trajectory telemetry exists for this mission. It is not the vehicle’s real position.';

/** Seconds of countdown shown before T-0 in a replay. */
export const REPLAY_LEAD_IN_S = 10;

export interface OrbitClass {
  key: string;
  label: string;
  /** Nominal inclination the azimuth maths aims for. */
  inclinationDeg: number;
  /** Nominal altitude (km) the profile tops out at. */
  altitudeKm: number;
  /** Seconds from T-0 to the top of the profile. */
  durationS: number;
  /** Total ground-track distance (km) over the profile. */
  downrangeKm: number;
}

/**
 * Nominal classes, matched on LL2's orbit name/abbrev. Altitudes and
 * durations are textbook-typical for the class (documented as nominal in
 * the UI), not the mission's flight plan.
 */
export function orbitClassFor(l: Pick<LaunchRecord, 'orbitName' | 'orbitAbbrev'>): OrbitClass | null {
  const name = (l.orbitName ?? '').toLowerCase();
  const ab = (l.orbitAbbrev ?? '').toUpperCase();
  const is = (...words: string[]) => words.some((w) => name.includes(w) || ab === w);
  if (is('SSO') || name.includes('sun-synchronous')) {
    return { key: 'sso', label: 'Sun-Synchronous Orbit', inclinationDeg: 97.4, altitudeKm: 550, durationS: 500, downrangeKm: 2600 };
  }
  if (name.includes('polar')) {
    return { key: 'polar', label: 'Polar Orbit', inclinationDeg: 90, altitudeKm: 600, durationS: 500, downrangeKm: 2700 };
  }
  if (is('GTO') || name.includes('geostationary transfer') || name.includes('geosynchronous transfer')) {
    return { key: 'gto', label: 'Geostationary Transfer Orbit', inclinationDeg: 27, altitudeKm: 1200, durationS: 600, downrangeKm: 4200 };
  }
  if (is('GEO') || name.includes('geostationary') || name.includes('geosynchronous')) {
    return { key: 'geo', label: 'Geostationary Orbit (via transfer)', inclinationDeg: 27, altitudeKm: 1200, durationS: 600, downrangeKm: 4200 };
  }
  if (name.includes('medium earth') || is('MEO')) {
    return { key: 'meo', label: 'Medium Earth Orbit', inclinationDeg: 55, altitudeKm: 2000, durationS: 540, downrangeKm: 4600 };
  }
  if (name.includes('helio') || name.includes('escape') || name.includes('lunar') || name.includes('interplanetary') || name.includes('mars')) {
    return { key: 'escape', label: 'Escape / Interplanetary', inclinationDeg: 28, altitudeKm: 3000, durationS: 600, downrangeKm: 5200 };
  }
  if (name.includes('suborbital') || is('SO')) {
    return { key: 'suborbital', label: 'Suborbital', inclinationDeg: 60, altitudeKm: 100, durationS: 300, downrangeKm: 350 };
  }
  if (is('LEO') || name.includes('low earth')) {
    return { key: 'leo', label: 'Low Earth Orbit', inclinationDeg: 51.6, altitudeKm: 420, durationS: 480, downrangeKm: 2400 };
  }
  return null;
}

/**
 * Standard launch azimuth for a target inclination from a pad latitude:
 * sin(az) = cos(inc) / cos(lat). Prograde targets leave toward the
 * north-east quadrant; retrograde (inc > 90°) toward the south.
 */
export function launchAzimuthDeg(inclinationDeg: number, padLatDeg: number): number {
  const cosInc = Math.cos((inclinationDeg * Math.PI) / 180);
  const cosLat = Math.cos((padLatDeg * Math.PI) / 180);
  const sinAz = Math.max(-1, Math.min(1, cosInc / Math.max(0.05, cosLat)));
  const base = (Math.asin(sinAz) * 180) / Math.PI;
  // Prograde (< 90°): north-east quadrant solution. Polar and retrograde
  // (≥ 90°): the same orbit plane flown the other way — southward, which
  // is how polar/SSO launches actually leave coastal pads (Vandenberg SSO
  // ≈ 189°, a due-polar departure ≈ 180°), not the asin mirror north.
  const az = inclinationDeg < 90 ? base : 180 - base;
  return ((az % 360) + 360) % 360;
}

export interface AscentProfile {
  padLat: number;
  padLon: number;
  azimuthDeg: number;
  orbit: OrbitClass;
  /** Epoch ms of T-0 (the launch's NET). Informational — replay time is relative. */
  t0Ms: number;
}

export function buildAscentProfile(l: LaunchRecord): AscentProfile | null {
  if (l.padLat === null || l.padLon === null || !l.net) return null;
  const orbit = orbitClassFor(l);
  if (!orbit) return null;
  const t0Ms = Date.parse(l.net);
  if (!Number.isFinite(t0Ms)) return null;
  return {
    padLat: l.padLat,
    padLon: l.padLon,
    azimuthDeg: launchAzimuthDeg(orbit.inclinationDeg, l.padLat),
    orbit,
    t0Ms,
  };
}

/** A launch can be replayed only when pad, NET and orbit class are all known. */
export function replayEligible(l: LaunchRecord): boolean {
  return buildAscentProfile(l) !== null;
}

const EARTH_R_KM = 6371;

function destination(latDeg: number, lonDeg: number, bearingDeg: number, distKm: number): [number, number] {
  const δ = distKm / EARTH_R_KM;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (latDeg * Math.PI) / 180;
  const λ1 = (lonDeg * Math.PI) / 180;
  const sinφ2 = Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ);
  const φ2 = Math.asin(Math.max(-1, Math.min(1, sinφ2)));
  const λ2 = λ1 + Math.atan2(
    Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
    Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2),
  );
  return [(λ2 * 180) / Math.PI, (φ2 * 180) / Math.PI];
}

export interface ProfilePosition {
  lat: number;
  lon: number;
  altitudeKm: number;
  downrangeKm: number;
  phase: 'countdown' | 'ascent' | 'insertion';
}

/**
 * Position `tS` seconds after T-0 (negative = countdown, vehicle on pad).
 * Altitude follows a gravity-turn ease — steep early, flattening into the
 * nominal ceiling; downrange lags altitude early (vertical rise first).
 */
export function positionAt(profile: AscentProfile, tS: number): ProfilePosition {
  const { orbit } = profile;
  if (tS <= 0) {
    return { lat: profile.padLat, lon: profile.padLon, altitudeKm: 0, downrangeKm: 0, phase: 'countdown' };
  }
  const x = Math.min(1, tS / orbit.durationS);
  const altFrac = 1 - Math.pow(1 - x, 2.4);
  const downFrac = Math.pow(x, 1.7);
  const altitudeKm = orbit.altitudeKm * altFrac;
  const downrangeKm = orbit.downrangeKm * downFrac;
  const [lon, lat] = destination(profile.padLat, profile.padLon, profile.azimuthDeg, downrangeKm);
  return {
    lat,
    lon,
    altitudeKm,
    downrangeKm,
    phase: x >= 1 ? 'insertion' : 'ascent',
  };
}

/** Ground-track polyline for the whole profile, sampled every `stepS`. */
export function profilePath(profile: AscentProfile, stepS = 5): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const total = profile.orbit.durationS;
  for (let t = 0; t <= total; t += stepS) {
    const p = positionAt(profile, t);
    pts.push([p.lon, p.lat]);
  }
  const end = positionAt(profile, total);
  pts.push([end.lon, end.lat]);
  return pts;
}

/** Format a replay clock: "T−00:07" counting down, "T+03:42" in ascent. */
export function replayClockLabel(tS: number): string {
  const sign = tS < 0 ? 'T−' : 'T+';
  const abs = Math.round(Math.abs(tS));
  const mm = String(Math.floor(abs / 60)).padStart(2, '0');
  const ss = String(abs % 60).padStart(2, '0');
  return `${sign}${mm}:${ss}`;
}
