/**
 * OSIRIS — Transit Explorer data mapping (pure).
 *
 * Everything the Explorer displays is computed here from the real API
 * payloads (vehicles / network / stops / alerts), so the mapping unit
 * tests on fixtures — including the owner's acceptance case, UTA
 * routes 17 and 417, which are ordinary rows of UTA's published
 * network (86 routes in the 2026-10-20 feed), not special cases.
 *
 * Honesty rules baked into the shapes:
 *  - a "live route" (aggregated from vehicle positions) is labelled
 *    by the caller as REPORTING NOW — it is not a network route and
 *    carries no stops, geometry or schedule;
 *  - alert "severity" is the GTFS-RT effect field the feed itself
 *    states (NO_SERVICE, DETOUR…), never an invented score;
 *  - an alert's end time appears only when the feed published an
 *    active-period end.
 */

import { modeFamily } from './subdivisions';

export interface LiveVehicleRow {
  id: string;
  lat: number;
  lng: number;
  route: string;
  mode: string;
  label?: string;
  headsign?: string;
  routeName?: string;
  stopName?: string;
  status?: number | null;
  delay?: number | null;
  speedKmh?: number | null;
  bearing?: number | null;
  ts?: number | null;
}

export interface LiveRouteAgg {
  /** Public route label as the feed states it ("17", "417", "701"). */
  route: string;
  /** Dominant mode among the route's live vehicles. */
  mode: string;
  count: number;
}

/** Natural route order: numeric labels by value first ("17" < "200"
 *  < "417"), then alphabetic ("A Line" after numbers, like the feeds). */
export function naturalRouteCompare(a: string, b: string): number {
  const na = /^\d+$/.test(a) ? parseInt(a, 10) : null;
  const nb = /^\d+$/.test(b) ? parseInt(b, 10) : null;
  if (na != null && nb != null) return na - nb;
  if (na != null) return -1;
  if (nb != null) return 1;
  return a.localeCompare(b);
}

/** Group live vehicles into per-route counts (routes with no label —
 *  out-of-service vehicles — are not routes and are skipped). */
export function aggregateLiveRoutes(vehicles: LiveVehicleRow[]): LiveRouteAgg[] {
  const byRoute = new Map<string, { count: number; modes: Map<string, number> }>();
  for (const v of vehicles ?? []) {
    const route = (v.route ?? '').trim();
    if (!route) continue;
    let entry = byRoute.get(route);
    if (!entry) {
      entry = { count: 0, modes: new Map() };
      byRoute.set(route, entry);
    }
    entry.count += 1;
    entry.modes.set(v.mode, (entry.modes.get(v.mode) ?? 0) + 1);
  }
  const out: LiveRouteAgg[] = [];
  for (const [route, entry] of byRoute) {
    let mode = 'transit';
    let best = -1;
    for (const [m, n] of entry.modes) {
      if (n > best) {
        best = n;
        mode = m;
      }
    }
    out.push({ route, mode, count: entry.count });
  }
  return out.sort((a, b) => naturalRouteCompare(a.route, b.route));
}

/** Live vehicle count for one route label (0 when nothing reports). */
export function liveCountForRoute(vehicles: LiveVehicleRow[], routeShort: string): number {
  let n = 0;
  for (const v of vehicles ?? []) if (v.route === routeShort) n += 1;
  return n;
}

export type ModeFilter = 'all' | 'bus' | 'rail';

/** Filter route-shaped rows by the bus/rail family split. 'other'
 *  (ferry, neutral transit) rows show under 'all' only. */
export function filterByModeFamily<T extends { mode: string }>(rows: T[], filter: ModeFilter): T[] {
  if (filter === 'all') return rows;
  return rows.filter((r) => modeFamily(r.mode) === filter);
}

/** Case-insensitive route search over public label + long name. */
export function searchRoutes<T extends { short: string; long: string }>(routes: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return routes;
  return routes.filter(
    (r) => r.short.toLowerCase().includes(q) || r.long.toLowerCase().includes(q),
  );
}

/** Case-insensitive stop search over name + serving route labels. */
export function searchStops<T extends { name: string; routes: string[] }>(
  stops: T[],
  query: string,
  limit = 12,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: T[] = [];
  for (const s of stops ?? []) {
    if (s.name.toLowerCase().includes(q) || s.routes.some((r) => r.toLowerCase() === q)) {
      out.push(s);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export interface AlertLike {
  id: string;
  header: string;
  description?: string;
  cause?: string;
  effect?: string;
  routes: string[];
  periods: Array<{ startMs: number | null; endMs: number | null }>;
}

export interface AlertTone {
  /** Humanized GTFS-RT effect, e.g. "NO SERVICE", or the generic label. */
  label: string;
  tone: 'red' | 'amber' | 'cyan';
}

/**
 * The feed's own effect field is the severity signal GTFS-RT offers:
 * NO_SERVICE / STOP_MOVED are the hard end, detours and reduced or
 * modified service are disruptions, everything else (including
 * ADDITIONAL_SERVICE and an unstated effect) is informational.
 */
export function alertTone(effect: string | undefined | null): AlertTone {
  const e = (effect ?? '').toUpperCase();
  if (e === 'NO_SERVICE' || e === 'STOP_MOVED') {
    return { label: e.replace(/_/g, ' '), tone: 'red' };
  }
  if (e === 'REDUCED_SERVICE' || e === 'MODIFIED_SERVICE' || e === 'DETOUR' || e === 'SIGNIFICANT_DELAYS') {
    return { label: e.replace(/_/g, ' '), tone: 'amber' };
  }
  if (e) return { label: e.replace(/_/g, ' '), tone: 'cyan' };
  return { label: 'SERVICE ALERT', tone: 'amber' };
}

/** The latest published active-period end (epoch ms), or null when
 *  the feed states no end — the UI shows "until …" only for a number. */
export function alertUntilMs(alert: AlertLike): number | null {
  let end: number | null = null;
  for (const p of alert.periods ?? []) {
    if (p.endMs != null && (end == null || p.endMs > end)) end = p.endMs;
  }
  return end;
}

/** Great-circle distance in kilometres. */
export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Nearest point to a centre, or null for an empty list. Powers
 *  "Show Nearby Transit" — it searches what is actually loaded
 *  (live vehicles, network stops), never a synthetic place. */
export function nearestOf<T extends { lat: number; lng: number }>(
  center: { lat: number; lng: number },
  points: T[],
): { point: T; distKm: number } | null {
  let best: { point: T; distKm: number } | null = null;
  for (const p of points ?? []) {
    const d = haversineKm(center.lat, center.lng, p.lat, p.lng);
    if (!best || d < best.distKm) best = { point: p, distKm: d };
  }
  return best;
}
