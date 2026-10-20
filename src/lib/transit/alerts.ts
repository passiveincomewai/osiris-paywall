/**
 * OSIRIS — GTFS-RT Service Alerts parsing (pure over a decoded
 * FeedMessage). UTA publishes keyless alerts at
 * apps.rideuta.com/tms/gtfs/Alert (verified live 2026-10-20: 101
 * active alerts, every informed entity carrying an internal routeId —
 * the static feed's route_id, resolved here to the public number).
 */

export interface ServiceAlert {
  id: string;
  header: string;
  description?: string;
  cause?: string;
  effect?: string;
  /** Public route labels affected (agency-internal ids resolved away). */
  routes: string[];
  /** Internal route ids affected (for filtering before resolution). */
  routeIds: string[];
  /** Active windows (epoch ms); empty = the feed states none. */
  periods: Array<{ startMs: number | null; endMs: number | null }>;
}

function pickText(tt: any): string | undefined {
  const tr = tt?.translation;
  if (!Array.isArray(tr) || tr.length === 0) return undefined;
  const en = tr.find((t: any) => (t?.language ?? '').toLowerCase().startsWith('en'));
  const text = (en ?? tr[0])?.text;
  return typeof text === 'string' && text.trim() ? text.trim() : undefined;
}

function toMs(v: any): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v * 1000;
  if (typeof v?.toNumber === 'function') return v.toNumber() * 1000;
  const n = Number(v);
  return Number.isFinite(n) ? n * 1000 : null;
}

/**
 * Decode alerts. `shortByRouteId` resolves agency-internal route ids
 * to public labels; unresolved ids stay visible in `routeIds` but are
 * never shown to riders as if they were route numbers.
 */
export function parseAlerts(
  msg: any,
  shortByRouteId: Map<string, string>,
): ServiceAlert[] {
  const out: ServiceAlert[] = [];
  for (const e of msg?.entity ?? []) {
    const a = e?.alert;
    if (!a) continue;
    const header = pickText(a.headerText);
    if (!header) continue;
    const routeIds: string[] = [];
    for (const ie of a.informedEntity ?? []) {
      if (ie?.routeId && !routeIds.includes(ie.routeId)) routeIds.push(ie.routeId);
    }
    const routes = routeIds
      .map(id => shortByRouteId.get(id))
      .filter((s): s is string => !!s);
    const periods = (a.activePeriod ?? []).map((p: any) => ({
      startMs: toMs(p?.start),
      endMs: toMs(p?.end),
    }));
    out.push({
      id: String(e.id ?? header),
      header,
      ...(pickText(a.descriptionText) ? { description: pickText(a.descriptionText) } : {}),
      ...(a.cause ? { cause: String(a.cause) } : {}),
      ...(a.effect ? { effect: String(a.effect) } : {}),
      routes,
      routeIds,
      periods,
    });
  }
  return out;
}

/** Alerts touching one route, by public label or internal id. */
export function alertsForRoute(alerts: ServiceAlert[], route: { id: string; short: string }): ServiceAlert[] {
  return alerts.filter(a => a.routeIds.includes(route.id) || a.routes.includes(route.short));
}
