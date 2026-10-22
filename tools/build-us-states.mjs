#!/usr/bin/env node
// Build src/data/us-states.json: per-state camera counts, top areas and
// sample cameras for the /us-traffic-cameras/[state] pages and the
// /live-traffic-cameras state table.
//
// Why this exists: camera records have NO state field. The only location
// keys below country are `city` (which mixes state names for some DOT
// feeds — "Georgia", "Utah" — with real cities for the rest — "Houston",
// "Dallas") and lat/lng. Filtering by state name therefore returned 0
// for every state whose cameras are filed under city names (Texas,
// Florida, California, …). The fix derives each camera's state from its
// coordinates: point-in-polygon against the Census state boundaries in
// src/data/us-state-boundaries.json, with a nearest-state fallback for
// shoreline records that simplified boundaries clip (Key West, the
// Outer Banks). stateForPoint in src/lib/us-states.ts implements the
// same algorithm for runtime use — keep the two in sync.
//
// Run from the repo root after regenerating src/data/countries/
// united-states.json (tools/build-country-pages.mjs):
//   node tools/build-us-states.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Records within this distance (degrees) of a state border but inside
// no polygon are assigned to the nearest state. Only used for cameras
// the simplified boundaries miss. The threshold sits in a natural gap
// in the served data: shoreline and island records (Key West, Middleton
// Island) land ≤ 0.92° from their state, while the offshore NOAA buoy
// records — not state cameras — start at 1.0° and stay unassigned.
const FALLBACK_DEG = 0.95;

const boundaries = JSON.parse(
  readFileSync(join(root, "src/data/us-state-boundaries.json"), "utf8")
);
const records = JSON.parse(
  readFileSync(join(root, "src/data/countries/united-states.json"), "utf8")
);

// --- geometry (mirrors src/lib/us-states.ts) ---
const states = boundaries.states.map((s) => ({
  ...s,
  rings: s.polygons.map((ring) => {
    const xs = ring.map((p) => p[0]);
    const ys = ring.map((p) => p[1]);
    return {
      ring,
      bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
    };
  }),
}));

function inRing(x, y, ring) {
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

function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t =
    dx === 0 && dy === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function stateForPoint(lat, lng) {
  for (const s of states) {
    for (const { ring, bbox } of s.rings) {
      if (lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3] && inRing(lng, lat, ring)) {
        return s;
      }
    }
  }
  let best = null;
  let bestDist = Infinity;
  for (const s of states) {
    for (const { ring, bbox } of s.rings) {
      if (
        lng < bbox[0] - FALLBACK_DEG || lng > bbox[2] + FALLBACK_DEG ||
        lat < bbox[1] - FALLBACK_DEG || lat > bbox[3] + FALLBACK_DEG
      ) {
        continue;
      }
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        const d = segDist(lng, lat, a[0], a[1], b[0], b[1]);
        if (d < bestDist) {
          bestDist = d;
          best = s;
        }
      }
    }
  }
  return bestDist <= FALLBACK_DEG ? best : null;
}

// --- aggregate ---
const byState = new Map();
let unassigned = 0;
for (const rec of records) {
  const s =
    typeof rec.lat === "number" && typeof rec.lng === "number"
      ? stateForPoint(rec.lat, rec.lng)
      : null;
  if (!s) {
    unassigned++;
    continue;
  }
  let entry = byState.get(s.slug);
  if (!entry) {
    entry = {
      name: s.name,
      slug: s.slug,
      usps: s.usps,
      count: 0,
      cityCounts: new Map(),
      playable: [],
      others: [],
    };
    byState.set(s.slug, entry);
  }
  entry.count++;
  const city = (rec.city || "").trim();
  if (city) entry.cityCounts.set(city, (entry.cityCounts.get(city) || 0) + 1);
  const sample = { id: rec.id, name: rec.name, city: rec.city || "" };
  if (rec.feedUrl || rec.streamUrl) entry.playable.push(sample);
  else entry.others.push(sample);
}

const stateList = [...byState.values()]
  .map((e) => ({
    name: e.name,
    slug: e.slug,
    usps: e.usps,
    count: e.count,
    areas: [...e.cityCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 8),
    samples: [...e.playable, ...e.others].slice(0, 6),
  }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

const assignedTotal = stateList.reduce((n, s) => n + s.count, 0);
const out = {
  generatedAt: new Date().toISOString(),
  source: "src/data/countries/united-states.json",
  sourceTotal: records.length,
  assignedTotal,
  unassigned,
  states: stateList,
};
writeFileSync(join(root, "src/data/us-states.json"), JSON.stringify(out, null, 1) + "\n");
console.log(
  `us-states.json: ${stateList.length} states, ${assignedTotal} assigned, ${unassigned} unassigned of ${records.length} records`
);
for (const s of stateList.slice(0, 10)) console.log(`  ${s.name}: ${s.count}`);
