// US state derivation for the traffic/state surfaces.
//
// Camera records have NO state field — the only location keys below
// country are `city` (a mix of state names for some DOT feeds and real
// cities for the rest) and lat/lng. State filtering keyed on the city
// value therefore returned 0 for states whose cameras are filed under
// city names (filtering "Texas" matched nothing; Texas cameras are
// filed under Houston, Dallas, Fort Worth, …). The functions here
// derive a camera's state from its coordinates instead:
// point-in-polygon against the Census state boundaries vendored in
// src/data/us-state-boundaries.json, with a nearest-state fallback for
// shoreline records that simplified boundaries clip (Key West, the
// Outer Banks). tools/build-us-states.mjs runs the same algorithm over
// the generated US catalogue to produce src/data/us-states.json — the
// per-state counts, areas and samples the state pages render — so the
// counts on the pages always match what this derivation returns.
import boundaries from "@/data/us-state-boundaries.json";
import statesIndex from "@/data/us-states.json";

export interface UsStateMeta {
  name: string;
  slug: string;
  usps: string;
}

export interface UsStateArea {
  name: string;
  count: number;
}

export interface UsStateSample {
  id: string;
  name: string;
  city: string;
}

export interface UsStateData extends UsStateMeta {
  count: number;
  areas: UsStateArea[];
  samples: UsStateSample[];
}

export interface UsStatesIndex {
  generatedAt: string;
  source: string;
  sourceTotal: number;
  assignedTotal: number;
  unassigned: number;
  states: UsStateData[];
}

interface StateGeometry extends UsStateMeta {
  rings: Array<{ ring: number[][]; bbox: [number, number, number, number] }>;
}

const GEOMETRY: StateGeometry[] = (
  boundaries as unknown as {
    states: Array<UsStateMeta & { polygons: number[][][] }>;
  }
).states.map((s) => ({
  name: s.name,
  slug: s.slug,
  usps: s.usps,
  rings: s.polygons.map((ring) => {
    const xs = ring.map((p) => p[0]);
    const ys = ring.map((p) => p[1]);
    return {
      ring,
      bbox: [
        Math.min(...xs),
        Math.min(...ys),
        Math.max(...xs),
        Math.max(...ys),
      ] as [number, number, number, number],
    };
  }),
}));

export const US_STATE_META: UsStateMeta[] = GEOMETRY.map(({ name, slug, usps }) => ({
  name,
  slug,
  usps,
}));

// Records within this distance (degrees) of a state border but inside
// no polygon are assigned to the nearest state. Only fires for cameras
// the simplified boundaries miss. The threshold sits in a natural gap
// in the served data: shoreline and island records (Key West, Middleton
// Island) land ≤ 0.92° from their state, while the offshore NOAA buoy
// records — not state cameras — start at 1.0°. Mirrors FALLBACK_DEG in
// tools/build-us-states.mjs.
export const STATE_FALLBACK_DEG = 0.95;

function inRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function segDist(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t =
    dx === 0 && dy === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * The US state (or District of Columbia) a coordinate falls in, or null
 * when it is inside no state and not within STATE_FALLBACK_DEG of one
 * (offshore or bad coordinates).
 */
export function stateForPoint(lat: number, lng: number): UsStateMeta | null {
  for (const s of GEOMETRY) {
    for (const { ring, bbox } of s.rings) {
      if (
        lng >= bbox[0] &&
        lng <= bbox[2] &&
        lat >= bbox[1] &&
        lat <= bbox[3] &&
        inRing(lng, lat, ring)
      ) {
        return { name: s.name, slug: s.slug, usps: s.usps };
      }
    }
  }
  let best: UsStateMeta | null = null;
  let bestDist = Infinity;
  for (const s of GEOMETRY) {
    for (const { ring, bbox } of s.rings) {
      if (
        lng < bbox[0] - STATE_FALLBACK_DEG ||
        lng > bbox[2] + STATE_FALLBACK_DEG ||
        lat < bbox[1] - STATE_FALLBACK_DEG ||
        lat > bbox[3] + STATE_FALLBACK_DEG
      ) {
        continue;
      }
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        const d = segDist(lng, lat, a[0], a[1], b[0], b[1]);
        if (d < bestDist) {
          bestDist = d;
          best = { name: s.name, slug: s.slug, usps: s.usps };
        }
      }
    }
  }
  return bestDist <= STATE_FALLBACK_DEG ? best : null;
}

/** The generated per-state index (counts, areas, samples) for the US. */
export function getUsStatesIndex(): UsStatesIndex {
  return statesIndex as unknown as UsStatesIndex;
}

/** One state's generated data by slug ("texas"), or undefined. */
export function getStateBySlug(slug: string): UsStateData | undefined {
  return getUsStatesIndex().states.find((s) => s.slug === slug);
}
