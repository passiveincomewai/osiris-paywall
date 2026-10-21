/**
 * Event alerts — the pure logic.
 *
 * Everything here is a function of its inputs (no db, no fetch, no
 * clock except what's passed in), so the matching rules are unit
 * tested directly: quake magnitude/radius matching, launch lead
 * windows, and ISS pass geometry over a watched place.
 *
 * Data honesty notes, mirrored in the UI copy:
 *  - Quakes come from the USGS M2.5+ day feed — the same feed the
 *    globe's earthquake layer reads. A rule's minimum magnitude is
 *    therefore floored at 2.5; smaller quakes are not in the feed.
 *  - Launches come from Launch Library 2 via lib/launches. NETs move;
 *    an alert names the NET as published at check time.
 *  - ISS passes are computed from the current CelesTrak TLE with the
 *    in-repo SGP4 propagator (lib/orbit). A "visible pass" here means
 *    the station rises above the rule's minimum elevation over the
 *    place — geometry only. Whether the sky is dark and clear enough
 *    to actually see it is the reader's local weather, and the alert
 *    copy says so.
 */
import { propagateTLE, type SatPosition } from "@/lib/orbit";

/* ───────────────────────────── shared geo ───────────────────────────── */

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/* ───────────────────────────── rule configs ─────────────────────────── */

export type EventKind = "quake" | "launch" | "iss";

/* Rule config shapes + lead choices live in ./config (a pure module the
   /vip/alerts client can import without pulling the orbit propagator
   into the client bundle); re-exported here for server importers. */
import { LAUNCH_LEAD_CHOICES } from "./config";
import type { IssConfig, LaunchConfig, QuakeConfig } from "./config";
export { LAUNCH_LEAD_CHOICES };
export type { IssConfig, LaunchConfig, QuakeConfig };

export const QUAKE_MIN_MAG = 2.5;
export const QUAKE_MAX_MAG = 10;
export const ISS_MIN_ELEVATION = 10;
export const ISS_MAX_ELEVATION = 90;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Validate + normalise a rule config for its kind. Pure. */
export function validateEventConfig(
  kind: unknown,
  config: unknown,
): { ok: true; kind: EventKind; config: QuakeConfig | LaunchConfig | IssConfig } | { ok: false; error: string } {
  if (kind !== "quake" && kind !== "launch" && kind !== "iss") {
    return { ok: false, error: "kind_invalid" };
  }
  const c = isRecord(config) ? config : {};
  if (kind === "quake") {
    const minMag = typeof c.minMag === "number" ? c.minMag : NaN;
    if (!Number.isFinite(minMag) || minMag < QUAKE_MIN_MAG || minMag > QUAKE_MAX_MAG) {
      return { ok: false, error: "min_mag_invalid" };
    }
    return { ok: true, kind, config: { minMag } };
  }
  if (kind === "launch") {
    const raw = Array.isArray(c.leadHours) ? c.leadHours : [];
    const leadHours = [...new Set(raw.filter((h): h is number => typeof h === "number" && LAUNCH_LEAD_CHOICES.includes(h)))].sort(
      (a, b) => b - a,
    );
    if (!leadHours.length) return { ok: false, error: "lead_hours_invalid" };
    return { ok: true, kind, config: { leadHours } };
  }
  const minElevationDeg = typeof c.minElevationDeg === "number" ? c.minElevationDeg : NaN;
  const leadHours = typeof c.leadHours === "number" ? c.leadHours : NaN;
  if (!Number.isFinite(minElevationDeg) || minElevationDeg < ISS_MIN_ELEVATION || minElevationDeg > ISS_MAX_ELEVATION) {
    return { ok: false, error: "min_elevation_invalid" };
  }
  if (!Number.isFinite(leadHours) || leadHours < 1 || leadHours > 48) {
    return { ok: false, error: "lead_hours_invalid" };
  }
  return { ok: true, kind, config: { minElevationDeg, leadHours } };
}

/* ─────────────────────────────── quakes ─────────────────────────────── */

export interface QuakeInput {
  id: string;
  mag: number;
  place: string;
  timeMs: number;
  lat: number;
  lng: number;
  depthKm: number | null;
  url: string | null;
}

export function quakeMatches(
  config: QuakeConfig,
  quake: QuakeInput,
  place: { lat: number; lng: number; radiusKm: number } | null,
): boolean {
  if (quake.mag < config.minMag) return false;
  if (!place) return true;
  return haversineKm(place, quake) <= place.radiusKm;
}

/* ─────────────────────────────── launches ───────────────────────────── */

export interface LaunchInput {
  id: string;
  name: string;
  netMs: number | null;
  statusName: string | null;
  providerName: string | null;
  padLocation: string | null;
}

/**
 * Which lead windows a launch has ENTERED at `nowMs` — a window is
 * entered when now is past (net − lead) and the launch hasn't flown.
 * The checker alerts once per entered window (dedupeKey carries it).
 */
export function launchWindowsEntered(
  config: LaunchConfig,
  launch: LaunchInput,
  nowMs: number,
): number[] {
  if (launch.netMs === null) return [];
  if (launch.netMs <= nowMs) return [];
  return config.leadHours.filter((h) => nowMs >= launch.netMs! - h * 3_600_000);
}

/* ───────────────────────────── ISS passes ─────────────────────────────── */

export interface IssPass {
  startMs: number;
  endMs: number;
  peakMs: number;
  peakElevationDeg: number;
}

const DEG = Math.PI / 180;

/** Elevation (degrees) of a satellite over an observer, from geodetic coords. */
/** Geodetic (lat°, lng°, height km) → ECEF km, WGS84. */
function geodeticToEcef(latDeg: number, lngDeg: number, hKm: number) {
  const a = 6378.137;
  const f = 1 / 298.257223563;
  const e2 = f * (2 - f);
  const lat = latDeg * DEG;
  const lng = lngDeg * DEG;
  const sinLat = Math.sin(lat);
  const N = a / Math.sqrt(1 - e2 * sinLat * sinLat);
  return {
    x: (N + hKm) * Math.cos(lat) * Math.cos(lng),
    y: (N + hKm) * Math.cos(lat) * Math.sin(lng),
    z: (N * (1 - e2) + hKm) * sinLat,
  };
}

export function elevationDeg(
  sat: SatPosition,
  obs: { lat: number; lng: number },
): number {
  const obsLat = obs.lat * DEG;
  const obsLng = obs.lng * DEG;
  const sinLat = Math.sin(obsLat);
  // Both endpoints through the same geodetic→ECEF conversion: the
  // propagator's lat is geodetic, and mixing a spherical satellite
  // with an ellipsoidal observer skews the zenith by ~3°.
  const obsEcef = geodeticToEcef(obs.lat, obs.lng, 0);
  const satEcef = geodeticToEcef(sat.lat, sat.lng, sat.altKm);
  const dx = satEcef.x - obsEcef.x;
  const dy = satEcef.y - obsEcef.y;
  const dz = satEcef.z - obsEcef.z;
  const range = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (range === 0) return 90;
  // ENU "up" component at the observer.
  const up =
    dx * Math.cos(obsLat) * Math.cos(obsLng) +
    dy * Math.cos(obsLat) * Math.sin(obsLng) +
    dz * sinLat;
  return Math.asin(Math.max(-1, Math.min(1, up / range))) / DEG;
}

export interface Propagator {
  (when: Date): SatPosition | null;
}

export function tlePropagator(line1: string, line2: string): Propagator {
  return (when: Date) => propagateTLE(line1, line2, when);
}

/**
 * All passes of a satellite over a place in [fromMs, toMs] that reach
 * at least minElevationDeg. Coarse 30s scan + peak from the samples —
 * for an alert ("peaks ~42° at 21:34") that's the right precision,
 * and the copy rounds accordingly.
 */
export function computePasses(
  propagate: Propagator,
  place: { lat: number; lng: number },
  fromMs: number,
  toMs: number,
  minElevationDeg: number,
  stepMs = 30_000,
): IssPass[] {
  const passes: IssPass[] = [];
  let current: { startMs: number; peakMs: number; peak: number } | null = null;
  let lastAboveMs: number | null = null;
  for (let t = fromMs; t <= toMs; t += stepMs) {
    const pos = propagate(new Date(t));
    const elev = pos ? elevationDeg(pos, place) : -90;
    if (elev >= minElevationDeg) {
      if (!current) current = { startMs: t, peakMs: t, peak: elev };
      else if (elev > current.peak) {
        current.peak = elev;
        current.peakMs = t;
      }
      lastAboveMs = t;
    } else if (current && lastAboveMs !== null) {
      passes.push({
        startMs: current.startMs,
        endMs: lastAboveMs,
        peakMs: current.peakMs,
        peakElevationDeg: current.peak,
      });
      current = null;
      lastAboveMs = null;
    }
  }
  if (current && lastAboveMs !== null) {
    passes.push({
      startMs: current.startMs,
      endMs: lastAboveMs,
      peakMs: current.peakMs,
      peakElevationDeg: current.peak,
    });
  }
  return passes;
}

/** The next pass starting within the rule's lead window, if any. */
export function nextAlertablePass(
  passes: IssPass[],
  nowMs: number,
  leadHours: number,
): IssPass | null {
  const horizon = nowMs + leadHours * 3_600_000;
  for (const p of passes) {
    if (p.endMs < nowMs) continue;
    if (p.startMs <= horizon) return p;
    return null; // passes are chronological; the first future one decides
  }
  return null;
}

/* ─────────────────────────── event shaping ──────────────────────────── */

export interface EventDraft {
  dedupeKey: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export function quakeEvent(quake: QuakeInput, placeName: string | null): EventDraft {
  const where = placeName ? ` near ${placeName}` : "";
  return {
    dedupeKey: `quake:${quake.id}`,
    title: `M${quake.mag.toFixed(1)} earthquake — ${quake.place}`,
    body: `A magnitude ${quake.mag.toFixed(1)} earthquake struck ${quake.place}${where} at ${new Date(quake.timeMs).toUTCString()}. Reported by the USGS M2.5+ feed; magnitudes and locations can be revised by USGS after first publication.`,
    data: {
      mag: quake.mag,
      place: quake.place,
      timeMs: quake.timeMs,
      lat: quake.lat,
      lng: quake.lng,
      depthKm: quake.depthKm,
      url: quake.url,
      nearPlace: placeName,
    },
  };
}

export function launchEvent(launch: LaunchInput, leadHours: number): EventDraft {
  const when = launch.netMs ? new Date(launch.netMs).toUTCString() : "time to be confirmed";
  return {
    dedupeKey: `launch:${launch.id}:${leadHours}h`,
    title: `Launch in ~${leadHours}h — ${launch.name}`,
    body: `${launch.name}${launch.providerName ? ` (${launch.providerName})` : ""} is scheduled to lift off ${when}${launch.padLocation ? ` from ${launch.padLocation}` : ""}. Status at alert time: ${launch.statusName ?? "to be confirmed"}. Launch times move — check the globe's Space Missions layer for the latest NET.`,
    data: {
      launchId: launch.id,
      netMs: launch.netMs,
      leadHours,
      statusName: launch.statusName,
      padLocation: launch.padLocation,
    },
  };
}

export function issEvent(pass: IssPass, placeName: string): EventDraft {
  const start = new Date(pass.startMs);
  return {
    // Hour bucket, not the exact start: a fresher TLE shifts the
    // computed start by seconds between checks, and the alert must
    // stay one-per-pass (passes are ~93 min apart, so an hour bucket
    // can never merge two distinct passes).
    dedupeKey: `iss:${start.toISOString().slice(0, 13)}`,
    title: `ISS pass over ${placeName} — peaks ~${Math.round(pass.peakElevationDeg)}°`,
    body: `The International Space Station passes over ${placeName} starting ${start.toUTCString()}, peaking at about ${Math.round(pass.peakElevationDeg)}° above the horizon around ${new Date(pass.peakMs).toUTCString()}. Computed from the current orbital elements; whether it is visible also depends on darkness and your local sky being clear.`,
    data: {
      startMs: pass.startMs,
      endMs: pass.endMs,
      peakMs: pass.peakMs,
      peakElevationDeg: Math.round(pass.peakElevationDeg),
      placeName,
    },
  };
}
