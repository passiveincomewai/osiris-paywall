/**
 * OSIRIS — "Today in the Sky" panel: pure data shaping.
 *
 * The panel answers one question — what's happening up there today — from
 * feeds the site already serves. Nothing here fetches, invents or smooths:
 * every row is a reshaping of an existing payload, and the copy for empty
 * and failed states lives here so the component and the tests read the
 * same words.
 *
 *   • Launches  — /api/launches (Launch Library 2 · The Space Devs), the
 *     same payload the Space Missions layer flies on. Selection reuses
 *     lib/launches' own nextLaunch/countdownTo, so the panel can never
 *     disagree with the mission board about what "next" is or how
 *     precise its NET is.
 *   • Stations  — the /api/satellites rows page.tsx already decoded for
 *     the satellites layer (real SGP4 positions, CelesTrak TLEs). Only
 *     the two crewed stations are pulled out, matched by NORAD id first
 *     so a renamed TLE can never swap one station for another.
 *   • Storms    — /api/hurricanes (NOAA NHC CurrentStorms + the NHC
 *     tropical MapServer). The storms array carries the facts; the
 *     matching `current` GeoJSON feature carries the position.
 *   • Earth     — the earthquakes array page.tsx already loads from the
 *     USGS M2.5+ day feed (the feed itself is the last 24 hours, so the
 *     "today" angle is the feed's own window, re-checked here).
 */

import { countdownTo, nextLaunch, type Countdown } from './launches/countdown';
import {
  launchStatusKind,
  type LaunchRecord,
  type LaunchStatusKind,
} from './launches/types';
import type { SatelliteRow } from './satellite-payload';

/** Panel copy — verbatim strings the component renders and tests pin. */
export const SKY_COPY = {
  title: 'TODAY IN THE SKY',
  railTooltip: 'SKY',
  chipLabel: 'TODAY IN THE SKY',
  sectionLaunches: 'LAUNCHES',
  sectionOrbit: 'IN ORBIT NOW',
  sectionStorms: 'ACTIVE STORMS',
  sectionEarth: 'EARTH — LAST 24H',
  nextLaunch: 'NEXT LAUNCH',
  launchedPrefix: 'LAUNCHED',
  webcastLive: 'WEBCAST LIVE',
  launchesEmpty: 'No launches scheduled today',
  launchesError: 'Launch data unavailable',
  launchesLoading: 'Loading launch data…',
  staleNote: 'Showing last-good data',
  stormsEmpty: 'No active tropical storms',
  stormsError: 'Storm data unavailable',
  stormsLoading: 'Loading storm data…',
  quakesEmpty: 'No earthquakes M2.5+ in the last 24 hours',
  watchCamera: 'WATCH A LIVE CAMERA',
  sources: 'Launch Library 2 · NOAA NHC · USGS',
} as const;

/** Where a panel row sends the globe: fly there, optionally lighting a layer. */
export interface SkyLocateTarget {
  lat: number;
  lng: number;
  zoom?: number;
  /** A page.tsx activeLayers key to switch on (e.g. 'space_missions'). */
  layer?: string;
}

/* ── Launches ──────────────────────────────────────────────────────── */

export interface SkyLaunchRow {
  id: string;
  name: string;
  /** "Falcon 9 Block 5 · SpaceX" — rocket · provider, either may be absent. */
  detail: string | null;
  /** Pad location as LL2 names it, falling back to the pad name. */
  place: string | null;
  net: string | null;
  /** LL2's NET precision verbatim ("Minute", "Day", …) — shown, never hidden. */
  netPrecision: string | null;
  statusName: string | null;
  statusKind: LaunchStatusKind;
  webcastLive: boolean;
  countdown: Countdown;
  lat: number | null;
  lng: number | null;
}

export type SkyLaunches =
  | { kind: 'error' }
  | {
      kind: 'ok';
      /** The next launch, whenever it is — the panel's headline row. */
      next: SkyLaunchRow | null;
      /** Further launches with a NET inside the next 24 hours (max 2). */
      more: SkyLaunchRow[];
      /** The most recent liftoff inside the last 12 hours, if any. */
      recent: SkyLaunchRow | null;
      /** The server served its last-good copy after an upstream error. */
      stale: boolean;
    };

const DAY_MS = 86_400_000;
const RECENT_WINDOW_MS = 12 * 3_600_000;

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function asRecord(v: unknown): LaunchRecord | null {
  if (!v || typeof v !== 'object') return null;
  const r = v as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  return r as unknown as LaunchRecord;
}

function toLaunchRow(l: LaunchRecord, nowMs: number): SkyLaunchRow {
  const detail = [str(l.rocketName), str(l.providerName)].filter(Boolean).join(' · ') || null;
  return {
    id: l.id,
    name: str(l.name) ?? 'Unnamed launch',
    detail,
    place: str(l.padLocation) ?? str(l.padName),
    net: str(l.net),
    netPrecision: str(l.netPrecision),
    statusName: str(l.statusName),
    statusKind: launchStatusKind(l),
    webcastLive: l.webcastLive === true,
    countdown: countdownTo(str(l.net), str(l.netPrecision), nowMs),
    lat: num(l.padLat),
    lng: num(l.padLon),
  };
}

function netMs(l: LaunchRecord): number | null {
  const iso = str(l.net);
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Shape an /api/launches body. The route's error body carries an `error`
 * field with empty arrays — that must read as "unavailable", never as
 * "no launches", so it is checked before anything else (the drones /
 * launches failure-honesty precedent).
 */
export function shapeLaunches(payload: unknown, nowMs: number): SkyLaunches {
  if (!payload || typeof payload !== 'object') return { kind: 'error' };
  const p = payload as Record<string, unknown>;
  if (typeof p.error === 'string' && p.error) return { kind: 'error' };

  const upcoming = (Array.isArray(p.upcoming) ? p.upcoming : [])
    .map(asRecord)
    .filter((l): l is LaunchRecord => l !== null);
  const previous = (Array.isArray(p.previous) ? p.previous : [])
    .map(asRecord)
    .filter((l): l is LaunchRecord => l !== null);

  const nextRec = nextLaunch(upcoming, nowMs);
  const next = nextRec ? toLaunchRow(nextRec, nowMs) : null;

  const more = upcoming
    .filter((l) => l !== nextRec)
    .map((l) => ({ l, ms: netMs(l) }))
    .filter((x): x is { l: LaunchRecord; ms: number } => x.ms !== null && x.ms >= nowMs && x.ms <= nowMs + DAY_MS)
    .sort((a, b) => a.ms - b.ms)
    .slice(0, 2)
    .map((x) => toLaunchRow(x.l, nowMs));

  let recent: SkyLaunchRow | null = null;
  let recentMs = -Infinity;
  for (const l of previous) {
    const ms = netMs(l);
    if (ms === null || ms > nowMs || ms < nowMs - RECENT_WINDOW_MS) continue;
    if (ms > recentMs) {
      recentMs = ms;
      recent = toLaunchRow(l, nowMs);
    }
  }

  return { kind: 'ok', next, more, recent, stale: p.stale === true };
}

/* ── Stations (from the satellites layer's own rows) ──────────────── */

export interface SkyStationRow {
  name: string;
  mission: string;
  lat: number;
  lng: number;
  altKm: number;
  noradId: string;
}

/**
 * The notable satellites the payload honestly supports: the two crewed
 * stations, identified by NORAD catalogue number (ISS 25544, CSS 48274)
 * with the TLE name as a fallback match. Positions are the layer's own
 * SGP4 output — this only selects, it never recomputes.
 */
export function shapeStations(rows: SatelliteRow[] | null | undefined): SkyStationRow[] {
  if (!Array.isArray(rows)) return [];
  const isIss = (s: SatelliteRow) =>
    s.noradId === '25544' || s.name.toUpperCase().startsWith('ISS');
  const isCss = (s: SatelliteRow) =>
    s.noradId === '48274' ||
    s.name.toUpperCase().includes('TIANHE') ||
    s.name.toUpperCase().includes('TIANGONG');
  const pick = (pred: (s: SatelliteRow) => boolean): SkyStationRow | null => {
    const s = rows.find(
      (r) => pred(r) && Number.isFinite(r.lat) && Number.isFinite(r.lng),
    );
    if (!s) return null;
    return {
      name: s.name,
      mission: s.mission,
      lat: s.lat,
      lng: s.lng,
      altKm: s.alt,
      noradId: s.noradId,
    };
  };
  return [pick(isIss), pick(isCss)].filter((s): s is SkyStationRow => s !== null);
}

/* ── Storms (NOAA NHC) ─────────────────────────────────────────────── */

export interface SkyStormRow {
  stormId: string;
  name: string;
  /** NHC classification code verbatim (HU, TS, TD, …). */
  classification: string;
  /** The same classification spelled out; the code itself when unmapped. */
  classificationLabel: string;
  intensityKt: number | null;
  intensityMph: number | null;
  pressureMb: number | null;
  /** "NE AT 12 KT" / "STATIONARY" — from NHC's own motion fields. */
  movementLabel: string | null;
  lat: number | null;
  lng: number | null;
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  HU: 'Hurricane',
  TY: 'Typhoon',
  STY: 'Super Typhoon',
  TC: 'Tropical Cyclone',
  TS: 'Tropical Storm',
  TD: 'Tropical Depression',
  PTC: 'Potential Tropical Cyclone',
  SS: 'Subtropical Storm',
  SD: 'Subtropical Depression',
  EX: 'Extratropical Cyclone',
  LO: 'Low Pressure Area',
  DB: 'Tropical Disturbance',
  WV: 'Tropical Wave',
};

const COMPASS16 = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

export function compass16(deg: number): string {
  const norm = ((deg % 360) + 360) % 360;
  return COMPASS16[Math.round(norm / 22.5) % 16];
}

/**
 * Shape an /api/hurricanes body: `{ features, storms, count, source }`.
 * Storm facts come from the `storms` summary array; positions are joined
 * from the GeoJSON features tagged kind:'current' by stormId. A storm
 * whose feature is missing keeps its row and simply can't be flown to.
 */
export function shapeStorms(payload: unknown): SkyStormRow[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  const storms = Array.isArray(p.storms) ? p.storms : [];
  const features = Array.isArray(p.features) ? p.features : [];

  const coords = new Map<string, { lat: number; lng: number }>();
  for (const f of features) {
    if (!f || typeof f !== 'object') continue;
    const feat = f as {
      geometry?: { type?: unknown; coordinates?: unknown };
      properties?: Record<string, unknown>;
    };
    if (feat.properties?.kind !== 'current') continue;
    const id = feat.properties?.stormId;
    const c = feat.geometry?.coordinates;
    if (typeof id !== 'string' || !Array.isArray(c)) continue;
    const [lng, lat] = c as unknown[];
    if (typeof lat === 'number' && typeof lng === 'number') coords.set(id, { lat, lng });
  }

  const out: SkyStormRow[] = [];
  for (const s of storms) {
    if (!s || typeof s !== 'object') continue;
    const rec = s as Record<string, unknown>;
    const name = str(rec.name);
    if (!name) continue;
    const stormId = str(rec.stormId) ?? '';
    const classification = str(rec.classification) ?? '';
    const kt = num(rec.intensityKt);
    const dir = num(rec.movementDir);
    const spd = num(rec.movementSpeedKt);
    let movementLabel: string | null = null;
    if (spd !== null && spd === 0) movementLabel = 'STATIONARY';
    else if (dir !== null && spd !== null) movementLabel = `${compass16(dir)} AT ${spd} KT`;
    const pos = coords.get(stormId);
    out.push({
      stormId,
      name,
      classification,
      classificationLabel: CLASSIFICATION_LABELS[classification] ?? classification,
      intensityKt: kt,
      intensityMph: kt !== null ? Math.round(kt * 1.15078) : null,
      pressureMb: num(rec.pressureMb),
      movementLabel,
      lat: pos?.lat ?? null,
      lng: pos?.lng ?? null,
    });
  }
  // Strongest first — the glance order is by what matters most.
  out.sort((a, b) => (b.intensityKt ?? -1) - (a.intensityKt ?? -1));
  return out;
}

/* ── Earth (USGS last-24h feed, already loaded by the page) ───────── */

/** The shape page.tsx's USGS transform already produces. */
export interface SkyQuakeInput {
  id?: unknown;
  magnitude?: unknown;
  place?: unknown;
  time?: unknown;
  lat?: unknown;
  lng?: unknown;
}

export interface SkyQuakeStrongest {
  id: string;
  magnitude: number;
  place: string;
  timeMs: number;
  lat: number | null;
  lng: number | null;
}

export interface SkyQuakeSummary {
  strongest: SkyQuakeStrongest | null;
  /** Events inside the window (the feed's own floor is M2.5+). */
  count: number;
  /** M4.5+ events inside the window. */
  strongCount: number;
}

export function shapeQuakes(
  list: SkyQuakeInput[] | null | undefined,
  nowMs: number,
  windowMs: number = DAY_MS,
): SkyQuakeSummary {
  if (!Array.isArray(list)) return { strongest: null, count: 0, strongCount: 0 };
  let strongest: SkyQuakeStrongest | null = null;
  let count = 0;
  let strongCount = 0;
  for (const q of list) {
    if (!q || typeof q !== 'object') continue;
    const mag = num(q.magnitude);
    const timeMs = num(q.time);
    if (mag === null || timeMs === null) continue;
    if (timeMs < nowMs - windowMs || timeMs > nowMs + 5 * 60_000) continue;
    count += 1;
    if (mag >= 4.5) strongCount += 1;
    if (!strongest || mag > strongest.magnitude) {
      strongest = {
        id: typeof q.id === 'string' ? q.id : '',
        magnitude: mag,
        place: str(q.place) ?? 'Unknown location',
        timeMs,
        lat: num(q.lat),
        lng: num(q.lng),
      };
    }
  }
  return { strongest, count, strongCount };
}

/* ── Formatting (pure; the locale-aware dates live in the component) ── */

/** "12.34° N · 45.68° W" — a sub-satellite point, hemisphere-labelled. */
export function fmtLatLng(lat: number, lng: number): string {
  const la = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lo = `${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`;
  return `${la} · ${lo}`;
}

/** Compact "… AGO" for a past timestamp; anything future reads JUST NOW. */
export function relativeAgo(timeMs: number, nowMs: number): string {
  const diff = nowMs - timeMs;
  if (diff < 60_000) return 'JUST NOW';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}M AGO`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}H AGO`;
  return `${Math.floor(hours / 24)}D AGO`;
}
