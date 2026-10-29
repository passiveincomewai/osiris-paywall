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
  ssid: string;
  rssi: number;
  energy: number;
  reliable: boolean;
}

export interface RavenSnapshot {
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
  backendDesc: string;
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
          ssid: str(l.ssid, "(hidden)"),
          rssi: num(l.rssi),
          energy: num(l.energy),
          reliable: l.reliable === true,
        }))
    : [];

  return {
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
    backendDesc: str(o.backend_desc),
    links,
  };
}

export interface RavenEvent {
  kind: string;
  detail: string;
}

/** Parse one SSE `event` payload ({_event, detail, ts}). */
export function parseRavenEvent(raw: unknown): RavenEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const kind = str(o._event);
  if (!kind) return null;
  return { kind, detail: str(o.detail) };
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
