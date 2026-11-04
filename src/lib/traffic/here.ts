/**
 * WorldEye — Traffic: HERE Traffic API v7 as a second probe source.
 *
 * HERE sells the same class of data as TomTom (probe-vehicle speeds per
 * road segment) through a JSON API whose shapes can legally render on
 * our MapLibre globe. This module turns HERE flow responses into the
 * RawFlowFeature shape the existing matcher (./flow) already eats —
 * geometry from `location.shape.links`, ratio from
 * currentFlow.speed / currentFlow.freeFlow — tagged
 * properties.source = 'here' so provenance survives the merge
 * (./flow-samples).
 *
 * The API key is server-side only (HERE_API_KEY), attached by the
 * /api/traffic/flow-segments route. When no key is configured the
 * source simply does not exist — nothing here fabricates data.
 * Incidents are parsed into typed records for the same route to serve
 * alongside flow; they carry their own geometry and are NOT folded
 * into segment speeds.
 */

import type { RawFlowFeature } from './flow';

export function hereConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return typeof env.HERE_API_KEY === 'string' && env.HERE_API_KEY.length > 0;
}

export interface BBox { west: number; south: number; east: number; north: number }

export function hereFlowUrl(bbox: BBox, key: string): string {
  const inBbox = `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
  return `https://data.traffic.hereapi.com/v7/flow?in=bbox:${inBbox}&locationReferencing=shape&apiKey=${encodeURIComponent(key)}`;
}

export function hereIncidentsUrl(bbox: BBox, key: string): string {
  const inBbox = `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
  return `https://data.traffic.hereapi.com/v7/incidents?in=bbox:${inBbox}&locationReferencing=shape&apiKey=${encodeURIComponent(key)}`;
}

interface HereFlowResult {
  location?: {
    shape?: { links?: { points?: { lat?: unknown; lng?: unknown }[] }[] };
  };
  currentFlow?: { speed?: unknown; freeFlow?: unknown; jamFactor?: unknown };
}

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse a HERE v7 flow response into line features with
 * properties.relative_speed (0..1) and properties.source = 'here'.
 * A result is skipped when it lacks a usable speed pair or shape —
 * a segment we cannot place or quantify must not influence the model.
 */
export function parseHereFlow(json: unknown): RawFlowFeature[] {
  const results = (json as { results?: unknown })?.results;
  if (!Array.isArray(results)) return [];
  const out: RawFlowFeature[] = [];
  for (const r of results as HereFlowResult[]) {
    const speed = num(r?.currentFlow?.speed);
    const freeFlow = num(r?.currentFlow?.freeFlow);
    if (speed === null || freeFlow === null || freeFlow <= 0) continue;
    const ratio = Math.max(0, Math.min(1, speed / freeFlow));
    const links = r?.location?.shape?.links;
    if (!Array.isArray(links)) continue;
    for (const link of links) {
      const pts = link?.points;
      if (!Array.isArray(pts) || pts.length < 2) continue;
      const coords: [number, number][] = [];
      let ok = true;
      for (const p of pts) {
        const lat = num(p?.lat);
        const lng = num(p?.lng);
        if (lat === null || lng === null) { ok = false; break; }
        coords.push([lng, lat]);
      }
      if (ok && coords.length >= 2) {
        out.push({
          geometry: { type: 'LineString', coordinates: coords },
          properties: { relative_speed: ratio, source: 'here' },
        });
      }
    }
  }
  return out;
}

export interface HereIncident {
  id: string | null;
  type: string | null;
  summary: string | null;
  lines: [number, number][][];
}

interface HereIncidentResult {
  id?: unknown;
  details?: { type?: unknown; description?: { value?: unknown } };
  location?: { shape?: { links?: { points?: { lat?: unknown; lng?: unknown }[] }[] } };
}

/** Parse a HERE v7 incidents response into typed, geolocated records. */
export function parseHereIncidents(json: unknown): HereIncident[] {
  const results = (json as { results?: unknown })?.results;
  if (!Array.isArray(results)) return [];
  const out: HereIncident[] = [];
  for (const r of results as HereIncidentResult[]) {
    const lines: [number, number][][] = [];
    const links = r?.location?.shape?.links;
    if (Array.isArray(links)) {
      for (const link of links) {
        const pts = link?.points;
        if (!Array.isArray(pts) || pts.length < 2) continue;
        const coords: [number, number][] = [];
        let ok = true;
        for (const p of pts) {
          const lat = num(p?.lat);
          const lng = num(p?.lng);
          if (lat === null || lng === null) { ok = false; break; }
          coords.push([lng, lat]);
        }
        if (ok && coords.length >= 2) lines.push(coords);
      }
    }
    out.push({
      id: typeof r?.id === 'string' ? r.id : null,
      type: typeof r?.details?.type === 'string' ? r.details.type : null,
      summary: typeof r?.details?.description?.value === 'string' ? r.details.description.value : null,
      lines,
    });
  }
  return out;
}
