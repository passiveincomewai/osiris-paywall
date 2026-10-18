/**
 * OSIRIS — Launch Library 2 payload normalizer (pure).
 *
 * Maps LL2 `mode=detailed` launch objects onto LaunchRecord. Defensive by
 * design: LL2 omits whole sub-objects for sparse records (no mission, no
 * pad coordinates, TBD dates), and every such gap must survive as null —
 * the layer and the panel render "—" for missing data instead of guessing.
 */
import type { LaunchRecord } from './types';

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function obj(v: unknown): Record<string, any> {
  return v && typeof v === 'object' ? (v as Record<string, any>) : {};
}

/** LL2 timestamps sometimes carry no time component for far-future TBDs. */
function iso(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

const DESC_MAX = 600;

export function normalizeLaunch(raw: unknown): LaunchRecord | null {
  const r = obj(raw);
  const id = str(r.id);
  const name = str(r.name);
  if (!id || !name) return null;

  const mission = obj(r.mission);
  const orbit = obj(mission.orbit);
  const config = obj(obj(r.rocket).configuration);
  const lsp = obj(r.launch_service_provider);
  const status = obj(r.status);
  const precision = obj(r.net_precision);
  const pad = obj(r.pad);
  const padLoc = obj(pad.location);

  const padLat = num(pad.latitude);
  const padLon = num(pad.longitude);
  const latOk = padLat !== null && padLat >= -90 && padLat <= 90;
  const lonOk = padLon !== null && padLon >= -180 && padLon <= 180;

  const programs = Array.isArray(r.program)
    ? (r.program as unknown[]).map((p) => str(obj(p).name)).filter((p): p is string => p !== null)
    : [];

  const vidUrls = Array.isArray(r.vidURLs) ? (r.vidURLs as unknown[]) : [];
  const firstVid = vidUrls.length ? str(obj(vidUrls[0]).url) : null;

  const desc = str(mission.description);

  return {
    id,
    name,
    missionName: str(mission.name),
    missionDescription: desc ? desc.slice(0, DESC_MAX) : null,
    rocketName: str(config.full_name) ?? str(config.name),
    rocketFamily: str(config.family),
    providerName: str(lsp.name),
    providerType: str(lsp.type),
    statusName: str(status.name),
    statusAbbrev: str(status.abbrev),
    net: iso(r.net),
    windowStart: iso(r.window_start),
    windowEnd: iso(r.window_end),
    netPrecision: str(precision.name),
    probability: num(r.probability),
    padId: num(pad.id),
    padName: str(pad.name),
    padLat: latOk ? padLat : null,
    padLon: lonOk ? padLon : null,
    padLocation: str(padLoc.name),
    orbitName: str(orbit.name),
    orbitAbbrev: str(orbit.abbrev),
    programs,
    imageUrl: str(r.image),
    webcastLive: r.webcast_live === true,
    videoUrl: firstVid,
    failReason: str(r.failreason),
    holdReason: str(r.holdreason),
    lastUpdated: iso(r.last_updated),
  };
}

/** Normalize an LL2 list response ({ results: [...] }); junk rows drop out. */
export function normalizeLaunchList(json: unknown): LaunchRecord[] {
  const results = obj(json).results;
  if (!Array.isArray(results)) return [];
  const out: LaunchRecord[] = [];
  for (const raw of results) {
    const l = normalizeLaunch(raw);
    if (l) out.push(l);
  }
  return out;
}

/** A pad key stable across the upcoming/previous lists. */
export function launchPadKey(l: Pick<LaunchRecord, 'padId' | 'padName' | 'padLat' | 'padLon'>): string | null {
  if (l.padLat === null || l.padLon === null) return null;
  if (l.padId !== null) return `pad-${l.padId}`;
  return `pad-${l.padName ?? 'unknown'}-${l.padLat.toFixed(4)},${l.padLon.toFixed(4)}`;
}
