/**
 * Wire types + parser for a locally running RavenScope instance
 * (https://github.com/tmanish/raven-scope, MIT). The /sensing page's
 * RavenScope mode connects — from the visitor's own browser — to
 * http://127.0.0.1:8731, RavenScope's local dashboard port:
 *
 *   GET /api/state   -> one snapshot (used as the connect probe)
 *   GET /api/stream  -> SSE: `event: state` snapshots + `event: event`
 *                       discrete events ({_event, detail, ts})
 *   GET /api/history -> recent samples + transition/anomaly events
 *
 * Snapshot shape (engine.py Snapshot.to_dict, verified against commit
 * 9919537350ea86f921b7e0e9dd398a54c5590d51): ts, energy, z, state
 * (EMPTY|STILL|MOTION|ACTIVE), dwell, n_links, n_reliable, calibrating,
 * calib_remaining, backend, backend_desc, unit, sector, sector_conf,
 * sectors[3], links[{bssid, ssid, rssi, energy, coherence, reliable}],
 * ruview_note, ruview_installed.
 *
 * CORS reality (verified empirically 2026-10-29): stock RavenScope sends
 * no Access-Control-Allow-Origin header, so browsers refuse to let any web
 * page read these endpoints. The page therefore ships a one-file connector
 * (public/sensing/ravenscope-web.py) that runs the identical RavenScope
 * program with that single header added; the mode's setup instructions
 * say so plainly. Data never leaves the visitor's machine either way —
 * the browser reads the local program directly.
 */

export const RAVENSCOPE_BASE = "http://127.0.0.1:8731";

export interface RavenLink {
  bssid: string;
  ssid: string;
  rssi: number;
  energy: number;
  coherence: number;
  reliable: boolean;
}

export interface RavenSnapshot {
  ts: number;
  state: string;
  energy: number;
  z: number;
  dwell: number;
  sector: string;
  sectorConf: number;
  sectors: number[];
  nLinks: number;
  nReliable: number;
  calibrating: boolean;
  calibRemaining: number;
  backend: string;
  backendDesc: string;
  unit: string;
  ruviewNote: string;
  ruviewInstalled: boolean;
  links: RavenLink[];
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/** Parse one /api/state or SSE `state` payload. Returns null if the shape
 *  is not recognisably RavenScope's (e.g. some other program owns the port). */
export function parseRavenSnapshot(raw: unknown): RavenSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const state = str(o.state);
  if (!["EMPTY", "STILL", "MOTION", "ACTIVE"].includes(state)) return null;
  if (typeof o.energy !== "number") return null;

  const links: RavenLink[] = Array.isArray(o.links)
    ? o.links
        .filter((l): l is Record<string, unknown> => !!l && typeof l === "object")
        .map((l) => ({
          bssid: str(l.bssid),
          ssid: str(l.ssid, "(hidden)"),
          rssi: num(l.rssi),
          energy: num(l.energy),
          coherence: num(l.coherence),
          reliable: l.reliable === true,
        }))
    : [];

  return {
    ts: num(o.ts),
    state,
    energy: num(o.energy),
    z: num(o.z),
    dwell: num(o.dwell),
    sector: str(o.sector),
    sectorConf: num(o.sector_conf),
    sectors: Array.isArray(o.sectors) ? o.sectors.map((x) => num(x)) : [],
    nLinks: num(o.n_links, links.length),
    nReliable: num(o.n_reliable),
    calibrating: o.calibrating === true,
    calibRemaining: num(o.calib_remaining),
    backend: str(o.backend),
    backendDesc: str(o.backend_desc),
    unit: str(o.unit, "dBm"),
    ruviewNote: str(o.ruview_note),
    ruviewInstalled: o.ruview_installed === true,
    links,
  };
}

export interface RavenEvent {
  kind: string;
  detail: string;
  ts: number;
}

/** Parse one SSE `event` payload ({_event, detail, ts}). */
export function parseRavenEvent(raw: unknown): RavenEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const kind = str(o._event);
  if (!kind) return null;
  return { kind, detail: str(o.detail), ts: num(o.ts) };
}

// ---------------------------------------------------------------------------
// /api/history — RavenScope's local log: recent samples (last 900 s),
// recent events (newest last 40, served newest-first by the store query),
// and a 24-slot occupancy profile (average motion energy by hour of day
// over the last 7 days). The dashboard uses it to prime the live trace,
// the event timeline and the occupancy strip the moment it connects, so
// the view is alive immediately instead of starting from an empty chart.
// ---------------------------------------------------------------------------

export interface RavenHistorySample {
  ts: number;
  energy: number;
  state: string;
  z: number;
}

export interface RavenHistoryEvent {
  ts: number;
  kind: string;
  detail: string;
}

export interface RavenHistory {
  samples: RavenHistorySample[];
  events: RavenHistoryEvent[];
  occupancy: number[];
}

export function parseRavenHistory(raw: unknown): RavenHistory | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const samples: RavenHistorySample[] = Array.isArray(o.samples)
    ? o.samples
        .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
        .map((s) => ({ ts: num(s.ts), energy: num(s.energy), state: str(s.state), z: num(s.z) }))
        .filter((s) => s.ts > 0)
    : [];
  const events: RavenHistoryEvent[] = Array.isArray(o.events)
    ? o.events
        .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
        .map((e) => ({ ts: num(e.ts), kind: str(e.kind), detail: str(e.detail) }))
        .filter((e) => e.ts > 0 && e.kind !== "")
    : [];
  const occupancy: number[] = Array.isArray(o.occupancy)
    ? o.occupancy.map((x) => num(x)).slice(0, 24)
    : [];
  return { samples, events, occupancy };
}

/** Fetch /api/history from the local RavenScope. Null on any failure —
 *  the dashboard simply starts unprimed in that case. */
export async function fetchRavenHistory(timeoutMs = 2500): Promise<RavenHistory | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${RAVENSCOPE_BASE}/api/history`, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    if (!res.ok) return null;
    return parseRavenHistory(await res.json());
  } catch {
    return null;
  }
}

/** Probe the local RavenScope: resolves with the parsed snapshot, or null
 *  when nothing readable answers (not running, port owned by something
 *  else, or the stock program's missing CORS header — indistinguishable
 *  from the browser, and the setup copy treats them the same way). */
export async function probeRavenScope(timeoutMs = 1800): Promise<RavenSnapshot | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${RAVENSCOPE_BASE}/api/state`, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    if (!res.ok) return null;
    return parseRavenSnapshot(await res.json());
  } catch {
    return null;
  }
}
