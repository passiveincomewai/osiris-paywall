/**
 * Breaking-events — Tornadoes.
 *
 * Two authoritative, keyless NOAA sources:
 *
 *   • LIVE ALERTS — the National Weather Service active-alerts API
 *     (api.weather.gov), the same endpoint the globe's weather layer
 *     already consumes in /api/weather. That route normalizes alerts
 *     into map pins (dropping update messages, instructions and storm
 *     parameters), so the tornado page reads the endpoint here with
 *     alert-list semantics: alert + update messages, superseded
 *     versions removed, full text fields kept.
 *
 *   • REPORTED TORNADOES — the Storm Prediction Center's daily filtered
 *     storm reports (spc.noaa.gov/climo/reports/<YYMMDD>_rpts_torn.csv).
 *     These are PRELIMINARY local storm reports — spotter, media, law
 *     enforcement and survey accounts collected by SPC. They are not
 *     confirmed tornadoes and carry no official rating unless a later
 *     NWS survey assigns one; every surface labels them "reported".
 *     SPC lists report times in UTC.
 */
import { cachedSource } from "@/lib/sourceCache";

const NWS_ALERTS_URL = "https://api.weather.gov/alerts/active";
const SPC_REPORTS_BASE = "https://www.spc.noaa.gov/climo/reports";
const FETCH_UA = "OSIRIS-Intelligence-Platform/3.5";

/* ── NWS live alerts ─────────────────────────────────────────────── */

export const TORNADO_ALERT_EVENTS = ["Tornado Warning", "Tornado Watch", "Tornado Emergency"];

export interface TornadoAlert {
  id: string;
  /** "Tornado Warning" | "Tornado Watch" | "Tornado Emergency" */
  event: string;
  headline: string | null;
  areaDesc: string | null;
  description: string | null;
  instruction: string | null;
  severity: string | null;
  certainty: string | null;
  urgency: string | null;
  senderName: string | null;
  effective: string | null;
  onset: string | null;
  expires: string | null;
  ends: string | null;
  /** NWS parameter: "OBSERVED" or "RADAR INDICATED", when present. */
  tornadoDetection: string | null;
  /** NWS parameter: e.g. "CONSIDERABLE" / "CATASTROPHIC", when present. */
  damageThreat: string | null;
  maxHailSizeIn: number | null;
  maxWindGustMph: number | null;
  /** Canonical api.weather.gov URL for this alert. */
  sourceUrl: string;
}

function firstParam(params: any, key: string): string | null {
  const v = params?.[key];
  if (Array.isArray(v) && v.length > 0) return String(v[0]);
  return typeof v === "string" ? v : null;
}

function numParam(params: any, key: string): number | null {
  const s = firstParam(params, key);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function isTornadoAlertEvent(event: unknown): boolean {
  return typeof event === "string" && TORNADO_ALERT_EVENTS.includes(event.trim());
}

/** Map raw api.weather.gov features to tornado alerts only. */
export function parseNwsTornadoAlerts(fc: any): TornadoAlert[] {
  const out: TornadoAlert[] = [];
  for (const f of fc?.features ?? []) {
    const p = f?.properties ?? {};
    if (!isTornadoAlertEvent(p.event)) continue;
    const id = typeof p.id === "string" && p.id ? p.id : null;
    if (!id) continue;
    const params = p.parameters ?? {};
    out.push({
      id,
      event: p.event.trim(),
      headline: typeof p.headline === "string" ? p.headline : null,
      areaDesc: typeof p.areaDesc === "string" ? p.areaDesc : null,
      description: typeof p.description === "string" ? p.description : null,
      instruction: typeof p.instruction === "string" ? p.instruction : null,
      severity: typeof p.severity === "string" ? p.severity : null,
      certainty: typeof p.certainty === "string" ? p.certainty : null,
      urgency: typeof p.urgency === "string" ? p.urgency : null,
      senderName: typeof p.senderName === "string" ? p.senderName : null,
      effective: typeof p.effective === "string" ? p.effective : null,
      onset: typeof p.onset === "string" ? p.onset : null,
      expires: typeof p.expires === "string" ? p.expires : null,
      ends: typeof p.ends === "string" ? p.ends : null,
      tornadoDetection: firstParam(params, "tornadoDetection"),
      damageThreat: firstParam(params, "tornadoDamageThreat"),
      maxHailSizeIn: numParam(params, "maxHailSize"),
      maxWindGustMph: numParam(params, "maxWindGust"),
      sourceUrl:
        typeof p["@id"] === "string" && p["@id"]
          ? p["@id"]
          : `https://api.weather.gov/alerts/${encodeURIComponent(id)}`,
    });
  }
  return out;
}

/**
 * NWS corrections/extensions arrive as NEW alert messages whose
 * `references` name the message they replace. Given the raw features,
 * drop every alert that another alert supersedes, so an extended
 * warning never appears twice (once stale, once current).
 */
export function dropSupersededAlerts(fc: any): any {
  const features: any[] = Array.isArray(fc?.features) ? fc.features : [];
  const superseded = new Set<string>();
  for (const f of features) {
    for (const ref of f?.properties?.references ?? []) {
      if (typeof ref?.identifier === "string") superseded.add(ref.identifier);
    }
  }
  return {
    ...fc,
    features: features.filter((f) => !superseded.has(f?.properties?.id)),
  };
}

/** Warnings before watches; within a class, soonest expiry first. */
export function sortTornadoAlerts(alerts: TornadoAlert[]): TornadoAlert[] {
  const rank = (a: TornadoAlert) => (a.event === "Tornado Watch" ? 1 : 0);
  return [...alerts].sort(
    (a, b) =>
      rank(a) - rank(b) ||
      String(a.expires ?? "9999").localeCompare(String(b.expires ?? "9999")),
  );
}

async function fetchNwsTornadoAlertsRaw(): Promise<TornadoAlert[]> {
  const collected: any[] = [];
  let url: string | null =
    `${NWS_ALERTS_URL}?status=actual&message_type=alert,update`;
  for (let page = 0; page < 5 && url; page++) {
    const res = await fetch(url, {
      headers: { Accept: "application/geo+json", "User-Agent": FETCH_UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`api.weather.gov → ${res.status}`);
    const data: any = await res.json();
    collected.push(...(data?.features ?? []));
    const next = data?.pagination?.next;
    url = typeof next === "string" && next.startsWith("https://api.weather.gov/") ? next : null;
  }
  const merged = dropSupersededAlerts({ features: collected });
  return sortTornadoAlerts(parseNwsTornadoAlerts(merged));
}

export const getNwsTornadoAlerts = cachedSource<TornadoAlert>(
  "nws-tornado-alerts",
  fetchNwsTornadoAlertsRaw,
  3 * 60_000,
);

/* ── SPC reported tornadoes ──────────────────────────────────────── */

export interface TornadoReport {
  /** Stable id derived from the source row (see tornadoReportId). */
  id: string;
  /** SPC file day, YYMMDD as in the source filename. */
  spcDay: string;
  /** ISO calendar date of the report day (UTC), YYYY-MM-DD. */
  date: string;
  /** Report time as listed by SPC, "1812" (UTC). */
  timeUtc: string;
  /** Scale exactly as reported by SPC ("UNK" when unrated), verbatim. */
  fScale: string | null;
  /** Location as reported, e.g. "4 NW Leefield". */
  location: string;
  county: string;
  state: string;
  lat: number;
  lng: number;
  /** The report narrative, verbatim from SPC. */
  comments: string;
}

/** YYMMDD (UTC) for a Date — the SPC daily-file naming scheme. */
export function spcDayString(d: Date): string {
  const yy = String(d.getUTCFullYear()).slice(2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export function spcDayToIsoDate(yymmdd: string): string {
  return `20${yymmdd.slice(0, 2)}-${yymmdd.slice(2, 4)}-${yymmdd.slice(4, 6)}`;
}

/** Epoch ms of a report (SPC times are UTC). */
export function tornadoReportEpochMs(r: TornadoReport): number {
  const hh = Number(r.timeUtc.slice(0, 2));
  const mi = Number(r.timeUtc.slice(2, 4));
  return Date.parse(`${r.date}T00:00:00Z`) + (hh * 60 + mi) * 60_000;
}

function hash6(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36).slice(0, 6);
}

/**
 * Deterministic id for one SPC row: day + time + position + a short hash
 * of the place fields. Stable across fetches as long as SPC's row is —
 * SPC occasionally edits a day's file, and a materially edited row is a
 * different report for linking purposes.
 */
export function tornadoReportId(parts: {
  spcDay: string;
  timeUtc: string;
  lat: number;
  lng: number;
  location: string;
  county: string;
  state: string;
}): string {
  const hash = hash6(
    `${parts.location}|${parts.county}|${parts.state}|${parts.lat}|${parts.lng}`,
  );
  return `${parts.spcDay}-${parts.timeUtc}-${parts.lat.toFixed(2)}-${parts.lng.toFixed(2)}-${hash}`;
}

/**
 * Parse one SPC daily tornado-reports CSV. Columns:
 * Time,F_Scale,Location,County,State,Lat,Lon,Comments — comments are
 * the remainder of the line (they may contain commas). Rows that lack
 * the numeric spine are skipped.
 */
export function parseSpcTornadoCsv(csvText: string, spcDay: string): TornadoReport[] {
  const lines = (csvText ?? "").split(/\r?\n/);
  const out: TornadoReport[] = [];
  for (const line of lines) {
    if (!line || line.startsWith("Time,")) continue;
    const parts = line.split(",");
    if (parts.length < 8) continue;
    const [timeRaw, fScale, location, county, state, latRaw, lonRaw] = parts;
    const comments = parts.slice(7).join(",").trim();
    const timeUtc = timeRaw.trim().padStart(4, "0");
    if (!/^\d{4}$/.test(timeUtc)) continue;
    const lat = Number(latRaw);
    const lng = Number(lonRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const row = {
      spcDay,
      timeUtc,
      lat,
      lng,
      location: location.trim(),
      county: county.trim(),
      state: state.trim(),
    };
    out.push({
      ...row,
      id: tornadoReportId(row),
      date: spcDayToIsoDate(spcDay),
      fScale: fScale.trim() ? fScale.trim() : null,
      comments,
    });
  }
  return out;
}

/** Newest first (day, then time); identical ids collapse. */
export function dedupeSortReports(reports: TornadoReport[]): TornadoReport[] {
  const byId = new Map<string, TornadoReport>();
  for (const r of reports) if (!byId.has(r.id)) byId.set(r.id, r);
  return [...byId.values()].sort(
    (a, b) =>
      b.spcDay.localeCompare(a.spcDay) || b.timeUtc.localeCompare(a.timeUtc),
  );
}

async function fetchSpcDayRaw(spcDay: string): Promise<TornadoReport[]> {
  const res = await fetch(`${SPC_REPORTS_BASE}/${spcDay}_rpts_torn.csv`, {
    headers: { "User-Agent": FETCH_UA },
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`SPC reports ${spcDay} → ${res.status}`);
  return parseSpcTornadoCsv(await res.text(), spcDay);
}

const spcDayGetters = new Map<string, () => Promise<TornadoReport[]>>();

/** One SPC day of reports, through the shared source cache (30 min). */
export function getSpcDayReports(spcDay: string): Promise<TornadoReport[]> {
  let getter = spcDayGetters.get(spcDay);
  if (!getter) {
    getter = cachedSource<TornadoReport>(
      `spc-torn-${spcDay}`,
      () => fetchSpcDayRaw(spcDay),
      30 * 60_000,
    );
    spcDayGetters.set(spcDay, getter);
  }
  return getter();
}

/** The last `days` SPC days of tornado reports (today first), merged. */
export async function fetchRecentSpcReports(
  now: Date = new Date(),
  days: number = 3,
): Promise<TornadoReport[]> {
  const dayStrings: string[] = [];
  for (let i = 0; i < days; i++) {
    dayStrings.push(spcDayString(new Date(now.getTime() - i * 86_400_000)));
  }
  const perDay = await Promise.allSettled(dayStrings.map((d) => getSpcDayReports(d)));
  const all: TornadoReport[] = [];
  for (const r of perDay) if (r.status === "fulfilled") all.push(...r.value);
  return dedupeSortReports(all);
}

/** One report by its stable id; the id's first segment names its SPC day. */
export async function fetchSpcReportById(id: string): Promise<TornadoReport | null> {
  const spcDay = (id ?? "").split("-")[0];
  if (!/^\d{6}$/.test(spcDay)) return null;
  const reports = await getSpcDayReports(spcDay);
  return reports.find((r) => r.id === id) ?? null;
}
