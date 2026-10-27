/**
 * OSIRIS — rider-facing status math for the Transit Explorer
 * (rider upgrade, 2026-10-26): delay chips for arrivals and the
 * per-route SERVICE STATUS the owner asked UTA's alerts to drive
 * ("route on detour, service etc.").
 *
 * Everything here is a pure function over the shapes the feeds
 * already produce. Two honesty rules:
 *  - a delay chip exists only when a fresh TripUpdates prediction
 *    produced a delay; a timetable time is labelled "Scheduled —
 *    no live data", never dressed up with a status it didn't earn;
 *  - a route's service status derives ONLY from the GTFS-RT alert
 *    fields the feed itself states — the `effect` enum and, for
 *    detour, the DETOUR effect or a header that says "detour".
 *    Nothing is inferred from prose beyond that one word, and a
 *    route with no active alerts is "Normal service" because the
 *    feed is silent, which is exactly what the chip says.
 */

import type { ServiceAlert } from './alerts';

/* ── Delay chips (arrivals) ─────────────────────────────────────── */

export type DelayTone = 'green' | 'amber' | 'red' | 'cyan' | 'muted';

export interface DelayStatus {
  label: string;
  tone: DelayTone;
  /** Whole minutes of lateness (negative = early), null when the
   *  feed gave no delay to quantify. */
  minutes: number | null;
}

/** |delay| below this reads as on time — GTFS-RT delays jitter by
 *  seconds around the schedule even on a healthy run. */
export const ON_TIME_BAND_S = 60;

/**
 * The status chip for one arrival.
 *  - basis 'scheduled': the time is the timetable's; there is no
 *    live prediction, so the chip says so instead of guessing.
 *  - realtime with no delay value: the feed predicted a time but
 *    stated no delay — "Realtime", nothing stronger claimed.
 *  - realtime with a delay: On time inside the band, else whole
 *    minutes late (amber, red at 10+) or early.
 */
export function delayStatus(
  delayS: number | null | undefined,
  basis: 'realtime' | 'scheduled',
): DelayStatus {
  if (basis === 'scheduled') {
    return { label: 'Scheduled — no live data', tone: 'muted', minutes: null };
  }
  if (delayS == null || !Number.isFinite(delayS)) {
    return { label: 'Realtime', tone: 'cyan', minutes: null };
  }
  if (delayS >= ON_TIME_BAND_S) {
    const minutes = Math.round(delayS / 60);
    return { label: `${minutes} min late`, tone: minutes >= 10 ? 'red' : 'amber', minutes };
  }
  if (delayS <= -ON_TIME_BAND_S) {
    const minutes = Math.round(-delayS / 60);
    return { label: `${minutes} min early`, tone: 'cyan', minutes: -minutes };
  }
  return { label: 'On time', tone: 'green', minutes: 0 };
}

/* ── Service status (routes) ────────────────────────────────────── */

/** Structural minimum of an alert for status work — satisfied by
 *  lib/transit/alerts' ServiceAlert and by the Explorer's AlertLike. */
export interface StatusAlertLike {
  header: string;
  effect?: string;
  routes: string[];
  routeIds?: string[];
  stopIds?: string[];
  periods: Array<{ startMs: number | null; endMs: number | null }>;
}

export type RouteServiceStatus = 'normal' | 'detour' | 'reduced' | 'suspended' | 'alert';

export interface RouteStatus {
  status: RouteServiceStatus;
  label: string;
  tone: DelayTone;
  /** The active alerts that produced this status. */
  alerts: StatusAlertLike[];
}

const STATUS_META: Record<RouteServiceStatus, { label: string; tone: DelayTone }> = {
  normal: { label: 'Normal service', tone: 'green' },
  detour: { label: 'On detour', tone: 'amber' },
  reduced: { label: 'Reduced service', tone: 'amber' },
  suspended: { label: 'Suspended', tone: 'red' },
  alert: { label: 'Service alert', tone: 'cyan' },
};

/**
 * Is an alert in force at `nowMs`? An alert whose feed states no
 * active period is in force (GTFS-RT alert feeds carry current
 * alerts; the period is the refinement, not the gate). A period
 * entirely in the past retires the alert; a future period has not
 * started it.
 */
export function isAlertActive(alert: StatusAlertLike, nowMs: number): boolean {
  const periods = alert.periods ?? [];
  if (periods.length === 0) return true;
  return periods.some(
    (p) => (p.startMs == null || p.startMs <= nowMs) && (p.endMs == null || p.endMs >= nowMs),
  );
}

/** Alerts matching one route, by internal id or public label. */
export function alertsMatchingRoute<T extends StatusAlertLike>(
  alerts: T[],
  route: { id: string; short: string },
): T[] {
  return alerts.filter(
    (a) => (a.routeIds ?? []).includes(route.id) || a.routes.includes(route.short),
  );
}

/** Alerts touching one stop: addressed to the stop itself, or to a
 *  route that serves it (a detour on your route is your problem
 *  wherever you board it). */
export function alertsMatchingStop<T extends StatusAlertLike>(
  alerts: T[],
  stopId: string,
  routeShorts: string[],
): T[] {
  return alerts.filter(
    (a) => (a.stopIds ?? []).includes(stopId) || a.routes.some((r) => routeShorts.includes(r)),
  );
}

/** A detour per the feed's own fields: the DETOUR effect, or a
 *  header that calls itself a detour. */
function isDetourAlert(alert: StatusAlertLike): boolean {
  return (alert.effect ?? '').toUpperCase() === 'DETOUR' || /detour/i.test(alert.header);
}

/**
 * One route's service status from its ACTIVE alerts. Precedence is
 * severity: a suspension hides a detour hides a reduction — the
 * chip answers "what is service like on this route right now",
 * and the alert list below it carries the rest.
 */
export function routeStatusFromAlerts(
  routeAlerts: StatusAlertLike[],
  nowMs: number,
): RouteStatus {
  const active = routeAlerts.filter((a) => isAlertActive(a, nowMs));
  if (active.length === 0) {
    return { status: 'normal', ...STATUS_META.normal, alerts: [] };
  }
  const effects = active.map((a) => (a.effect ?? '').toUpperCase());
  let status: RouteServiceStatus = 'alert';
  if (effects.includes('NO_SERVICE')) status = 'suspended';
  else if (active.some(isDetourAlert)) status = 'detour';
  else if (effects.includes('REDUCED_SERVICE')) status = 'reduced';
  else if (effects.includes('MODIFIED_SERVICE')) status = 'reduced';
  else if (effects.includes('SIGNIFICANT_DELAYS')) status = 'alert';
  const meta = STATUS_META[status];
  const label =
    status === 'reduced' && !effects.includes('REDUCED_SERVICE')
      ? 'Modified service'
      : status === 'alert' && effects.includes('SIGNIFICANT_DELAYS')
        ? 'Significant delays'
        : meta.label;
  return { status, label, tone: meta.tone, alerts: active };
}

/** System-wide alerts: addressed to no route and no stop — the
 *  agency is speaking to everyone at once. */
export function isSystemWide(alert: StatusAlertLike): boolean {
  return (alert.routeIds ?? []).length === 0 && (alert.stopIds ?? []).length === 0
    && (alert.routes ?? []).length === 0;
}

export interface BoardRoute {
  route: { id: string; short: string };
  status: RouteStatus;
}

export interface ServiceBoard {
  /** Routes whose current status is On detour. */
  detour: BoardRoute[];
  /** Routes suspended, reduced, or under significant delays. */
  disrupted: BoardRoute[];
  /** Active alerts addressed to no single route or stop. */
  systemWide: StatusAlertLike[];
}

/**
 * The UTA Service Status board, grouped: every route on detour,
 * every disrupted route, and the system-wide alerts — all from the
 * same alerts fetch the rest of the Explorer reads. Quiet feed ⇒
 * empty groups, and the UI says so in those words.
 */
export function buildServiceBoard(
  alerts: StatusAlertLike[],
  routes: Array<{ id: string; short: string }>,
  nowMs: number,
): ServiceBoard {
  const detour: BoardRoute[] = [];
  const disrupted: BoardRoute[] = [];
  for (const route of routes) {
    const st = routeStatusFromAlerts(alertsMatchingRoute(alerts, route), nowMs);
    if (st.status === 'detour') detour.push({ route, status: st });
    else if (st.status === 'suspended' || st.status === 'reduced' || st.status === 'alert') {
      disrupted.push({ route, status: st });
    }
  }
  const systemWide = alerts.filter((a) => isSystemWide(a) && isAlertActive(a, nowMs));
  return { detour, disrupted, systemWide };
}

/** True when the board has anything to report at all. */
export function boardHasNews(board: ServiceBoard): boolean {
  return board.detour.length > 0 || board.disrupted.length > 0 || board.systemWide.length > 0;
}

/** Re-export so component code imports status + alerts from one door. */
export type { ServiceAlert };
