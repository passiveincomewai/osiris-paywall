/**
 * WorldEye — Traffic: WSDOT Travel Times (Washington) as ground truth.
 *
 * The Washington State DOT Traveler API (same AccessCode the ski
 * road-conditions feeds already use) publishes measured travel times
 * for instrumented corridors: AverageTime is the corridor's typical
 * time, CurrentTime is what it takes right now, both from WSDOT's own
 * detectors. The corridor's live speed ratio is AverageTime /
 * CurrentTime — a measurement, not a probe estimate.
 *
 * Geometry honesty: the API gives corridor endpoints, not the driven
 * path, so the feature is the straight chord between them. The
 * proximity matcher (./flow) only lets it influence roads within
 * FLOW_MATCH_RADIUS_M of the chord, which on Washington's mostly
 * straight interstate corridors is the corridor road itself; where a
 * corridor curves away from its chord it simply matches less. These
 * are corridor-level ratios and are labelled source 'wsdot' end to end.
 */

import type { RawFlowFeature } from './flow';

export function wsdotConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return typeof env.WSDOT_ACCESS_CODE === 'string' && env.WSDOT_ACCESS_CODE.trim().length > 0;
}

export function wsdotTravelTimesUrl(code: string): string {
  return `https://wsdot.wa.gov/Traffic/api/TravelTimes/TravelTimesREST.svc/GetTravelTimesAsJson?AccessCode=${encodeURIComponent(code)}`;
}

/** Washington extent — the route only spends WSDOT calls on WA views. */
export const WA_BBOX = { west: -124.9, south: 45.5, east: -116.9, north: 49.1 };

interface WsdotPoint { Latitude?: unknown; Longitude?: unknown; RoadName?: unknown }
interface WsdotTravelTime {
  AverageTime?: unknown;
  CurrentTime?: unknown;
  Name?: unknown;
  StartPoint?: WsdotPoint;
  EndPoint?: WsdotPoint;
  TimeUpdated?: unknown;
}

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

/** WSDOT's "/Date(1793780400000-0800)/" → epoch ms, or null. */
export function parseWsdotDate(v: unknown): number | null {
  if (typeof v !== 'string') return null;
  const m = /\/Date\((-?\d+)(?:[+-]\d{4})?\)\//.exec(v);
  if (!m) return null;
  const ms = Number(m[1]);
  return Number.isFinite(ms) ? ms : null;
}

export interface ParsedWsdot {
  features: RawFlowFeature[];
  /** Newest TimeUpdated across parsed corridors, epoch ms (or null). */
  at: number | null;
}

/**
 * Parse the TravelTimes array into corridor line features with
 * properties.relative_speed = AverageTime / CurrentTime (clamped
 * 0.05..1 — a live corridor never quite reaches zero, and current
 * faster than typical caps at free flow) and properties.source =
 * 'wsdot'. Corridors with missing endpoints or non-positive times
 * are skipped.
 */
export function parseWsdotTravelTimes(json: unknown): ParsedWsdot {
  const features: RawFlowFeature[] = [];
  let at: number | null = null;
  if (!Array.isArray(json)) return { features, at };
  for (const item of json as WsdotTravelTime[]) {
    const avg = num(item?.AverageTime);
    const cur = num(item?.CurrentTime);
    const sLat = num(item?.StartPoint?.Latitude);
    const sLng = num(item?.StartPoint?.Longitude);
    const eLat = num(item?.EndPoint?.Latitude);
    const eLng = num(item?.EndPoint?.Longitude);
    if (avg === null || cur === null || avg <= 0 || cur <= 0) continue;
    if (sLat === null || sLng === null || eLat === null || eLng === null) continue;
    const ratio = Math.max(0.05, Math.min(1, avg / cur));
    features.push({
      geometry: { type: 'LineString', coordinates: [[sLng, sLat], [eLng, eLat]] },
      properties: {
        relative_speed: ratio,
        source: 'wsdot',
        name: typeof item?.Name === 'string' ? item.Name : null,
      },
    });
    const t = parseWsdotDate(item?.TimeUpdated);
    if (t !== null && (at === null || t > at)) at = t;
  }
  return { features, at };
}
