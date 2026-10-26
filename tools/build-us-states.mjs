#!/usr/bin/env node
// Build src/data/us-states.json: per-state camera counts, top areas and
// sample cameras for the /us-traffic-cameras/[state] pages and the
// /live-traffic-cameras state table. Also builds the derived-place
// data described under "Places" below (src/data/us-places.json and
// src/data/us-camera-places.json).
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
// Places: the state-name labels are the mirror-image bug — a camera
// physically in Ogden is filed under city "Utah", so city search and
// state-page "areas" showed the state itself ("Utah", 2,078 cameras)
// instead of the real places. For every record whose city label is a
// state name, this build also assigns the nearest real populated place
// from the GeoNames US gazetteer (feature class P) within
// PLACE_RADIUS_KM, in the same state the coordinates derive. The rule
// (assignPlace below): the nearest place with population >=
// GAZETTEER_MIN_POPULATION — GeoNames class P also carries
// neighbourhoods and subdivisions (mostly population 0), and letting
// them compete fragments a metro into subdivision names instead of the
// cities people search for. One correction on top of nearest: the
// Wasatch Front and metro Atlanta are continuous urban strips with a
// municipal centroid every few kilometres, so pure nearest-centroid
// scatters one city's cameras across a dozen suburbs (61 cameras sit
// within 8 km of Ogden's centre; nearest-centroid gave Ogden 22). A
// place at least DOMINANCE_RATIO times the nearest place's population
// within DOMINANCE_RADIUS_KM is the area's dominant city and wins —
// Ogden absorbs South Ogden, Provo does NOT absorb near-peer Orem.
// A camera with no >= threshold place in range falls back to the
// nearest smaller place. Records with no place that close keep their
// feed label — nothing is invented.
// The assignments land in src/data/us-camera-places.json (consumed at
// runtime by src/lib/us-places.ts) and in this file's own per-state
// area counts, so a state-labelled Ogden camera counts as Ogden
// everywhere.
//
// Gazetteer: GeoNames (https://www.geonames.org), US populated places
// from https://download.geonames.org/export/dump/US.zip, licensed
// CC BY 4.0 — attribution: GeoNames contributors. The dump is NOT
// vendored (300 MB); point GEONAMES_US_TXT at an extracted US.txt to
// rebuild the gazetteer from source:
//   curl -O https://download.geonames.org/export/dump/US.zip
//   unzip US.zip US.txt && GEONAMES_US_TXT=/path/to/US.txt node tools/build-us-states.mjs
// Without the dump, the build reuses the committed src/data/us-places.json
// as its pool, so the derived data can still be regenerated. The saved
// gazetteer keeps places with population >= GAZETTEER_MIN_POPULATION
// plus every smaller place that is the nearest place for at least one
// camera (it carries real cameras even if it is tiny).
//
// Run from the repo root after regenerating src/data/countries/
// united-states.json (tools/build-country-pages.mjs):
//   node tools/build-us-states.mjs
import { readFileSync, writeFileSync, existsSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

// ---------------------------------------------------------------------
// Place assignment — pure helpers. Exported so the vitest suite
// (src/lib/us-places.test.ts) can pin the rules directly: nearest place
// wins, nothing beyond PLACE_RADIUS_KM, overrides only for state-name
// labels, and a place is only ever assigned inside its own state.
// ---------------------------------------------------------------------

/** Cameras adopt the nearest gazetteer place at most this far away. */
export const PLACE_RADIUS_KM = 30;
/** Gazetteer places at or above this population are always kept. */
export const GAZETTEER_MIN_POPULATION = 500;
/** A place this many times the nearest place's population, within
 *  DOMINANCE_RADIUS_KM, is the dominant city of the camera's area. */
export const DOMINANCE_RATIO = 3;
export const DOMINANCE_RADIUS_KM = 10;

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * A lat/lng grid over the gazetteer so nearest-place lookup never scans
 * the whole pool: 41k cameras × ~190k places naive is far too slow.
 * Cells are 0.5° — bigger than the 30 km search span at US latitudes,
 * so a query only ever touches a small ring of neighbouring cells.
 */
export function buildPlaceGrid(places, cellDeg = 0.5) {
  const cells = new Map();
  places.forEach((p, i) => {
    const key = `${Math.floor(p.lng / cellDeg)},${Math.floor(p.lat / cellDeg)}`;
    const arr = cells.get(key);
    if (arr) arr.push(i);
    else cells.set(key, [i]);
  });
  return { places, cells, cellDeg };
}

/**
 * The nearest place to a point, or null when none is within radiusKm.
 * `state` (USPS) restricts the match to one state — a camera just over
 * a state line must not adopt a place from the next state, because the
 * state pages count it in its own state.
 */
/** @param {{ radiusKm?: number, state?: string | null }} [opts] */
export function nearestPlace(grid, lat, lng, opts = {}) {
  const { radiusKm = PLACE_RADIUS_KM, state = null } = opts;
  // Degree spans that provably cover radiusKm (min km-per-degree, so
  // the scanned cell range is a superset; haversine decides).
  const dLat = radiusKm / 110.574;
  const dLng = radiusKm / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));
  const c = grid.cellDeg;
  const x0 = Math.floor((lng - dLng) / c);
  const x1 = Math.floor((lng + dLng) / c);
  const y0 = Math.floor((lat - dLat) / c);
  const y1 = Math.floor((lat + dLat) / c);
  let best = null;
  let bestKm = radiusKm;
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const arr = grid.cells.get(`${x},${y}`);
      if (!arr) continue;
      for (const i of arr) {
        const p = grid.places[i];
        if (state && p.state !== state) continue;
        const d = haversineKm(lat, lng, p.lat, p.lng);
        if (d <= bestKm) {
          best = p;
          bestKm = d;
        }
      }
    }
  }
  return best ? { place: best, km: bestKm } : null;
}

/** Every place in a grid within radiusKm of a point, nearest first.
 * @param {string | null} [state] USPS code restricting the matches. */
export function placesWithin(grid, lat, lng, radiusKm, state = null) {
  const dLat = radiusKm / 110.574;
  const dLng = radiusKm / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.2));
  const c = grid.cellDeg;
  const out = [];
  for (let x = Math.floor((lng - dLng) / c); x <= Math.floor((lng + dLng) / c); x++) {
    for (let y = Math.floor((lat - dLat) / c); y <= Math.floor((lat + dLat) / c); y++) {
      const arr = grid.cells.get(`${x},${y}`);
      if (!arr) continue;
      for (const i of arr) {
        const p = grid.places[i];
        if (state && p.state !== state) continue;
        const km = haversineKm(lat, lng, p.lat, p.lng);
        if (km <= radiusKm) out.push({ place: p, km });
      }
    }
  }
  return out.sort((a, b) => a.km - b.km);
}

/**
 * The place a state-labelled camera belongs to.
 *
 * gridMain holds the gazetteer's real towns and cities (population >=
 * GAZETTEER_MIN_POPULATION); gridAll holds every populated place.
 * Among main-grid places within PLACE_RADIUS_KM in the camera's own
 * state, the nearest wins — UNLESS a place at least DOMINANCE_RATIO
 * times the nearest place's population sits within
 * DOMINANCE_RADIUS_KM: that is the dominant city of a continuous urban
 * strip, and the strip's cameras belong to it (Ogden, not South Ogden;
 * Atlanta, not Vinings). Near-peers never absorb each other (Provo
 * keeps its own cameras, and so does Orem). With no main-grid place in
 * range, the nearest smaller place wins instead (a desert-highway
 * camera still gets its tiny nearest town). Null when nothing is
 * within PLACE_RADIUS_KM at all.
 */
/** @param {{ state?: string | null, radiusKm?: number }} [opts] */
export function assignPlace(gridMain, gridAll, lat, lng, opts = {}) {
  const { state = null, radiusKm = PLACE_RADIUS_KM } = opts;
  const candidates = placesWithin(gridMain, lat, lng, radiusKm, state);
  if (candidates.length > 0) {
    const nearest = candidates[0];
    let dominant = null;
    for (const cand of candidates) {
      if (cand.km > DOMINANCE_RADIUS_KM) break;
      if (cand.place === nearest.place) continue;
      if (cand.place.population < DOMINANCE_RATIO * nearest.place.population) continue;
      if (
        !dominant ||
        cand.place.population > dominant.place.population ||
        (cand.place.population === dominant.place.population && cand.km < dominant.km)
      ) {
        dominant = cand;
      }
    }
    const chosen = dominant || nearest;
    return { place: chosen.place, km: chosen.km, via: dominant ? "dominant" : "nearest" };
  }
  const any = placesWithin(gridAll, lat, lng, radiusKm, state);
  if (any.length > 0) return { place: any[0].place, km: any[0].km, via: "fallback" };
  return null;
}

/** True when a record's city label is a state name ("Utah", "Georgia") —
 *  the DOT-feed filing this build repairs. `stateNames` is a Set of
 *  lowercase state names. Real city labels are never overridden. */
export function isStateNameLabel(city, stateNames) {
  if (!city) return false;
  return stateNames.has(city.trim().toLowerCase());
}

// ---------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Records within this distance (degrees) of a state border but inside
// no polygon are assigned to the nearest state. Only used for cameras
// the simplified boundaries miss. The threshold sits in a natural gap
// in the served data: shoreline and island records (Key West, Middleton
// Island) land ≤ 0.92° from their state, while the offshore NOAA buoy
// records — not state cameras — start at 1.0° and stay unassigned.
const FALLBACK_DEG = 0.95;

// --- geometry (mirrors src/lib/us-states.ts) ---
function buildGeometry(boundaries) {
  return boundaries.states.map((s) => ({
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
}

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

function makeStateForPoint(states) {
  return function stateForPoint(lat, lng) {
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
  };
}

// --- gazetteer ---
// GeoNames dump columns (tab-separated): 0 geonameid, 1 name,
// 4 latitude, 5 longitude, 6 feature class, 7 feature code,
// 10 admin1 (state USPS), 14 population.
async function loadGazetteerPool(uspsCodes) {
  const dumpPath = process.env.GEONAMES_US_TXT || join(root, "tools/geonames/US.txt");
  if (existsSync(dumpPath)) {
    const places = [];
    const rl = createInterface({
      input: createReadStream(dumpPath, { encoding: "utf8" }),
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      const f = line.split("\t");
      if (f[6] !== "P") continue;
      const state = f[10];
      if (!uspsCodes.has(state)) continue;
      const lat = Number(f[4]);
      const lng = Number(f[5]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !f[1]) continue;
      places.push({
        name: f[1],
        state,
        lat,
        lng,
        population: Number.parseInt(f[14], 10) || 0,
      });
    }
    return { places, source: `GeoNames US.txt (${dumpPath})` };
  }
  const saved = join(root, "src/data/us-places.json");
  if (existsSync(saved)) {
    const parsed = JSON.parse(readFileSync(saved, "utf8"));
    return { places: parsed.places, source: "committed src/data/us-places.json (no GeoNames dump found)" };
  }
  return { places: [], source: "none — places phase skipped" };
}

async function main() {
  const boundaries = JSON.parse(
    readFileSync(join(root, "src/data/us-state-boundaries.json"), "utf8")
  );
  const records = JSON.parse(
    readFileSync(join(root, "src/data/countries/united-states.json"), "utf8")
  );
  const states = buildGeometry(boundaries);
  const stateForPoint = makeStateForPoint(states);
  const stateNames = new Set(boundaries.states.map((s) => s.name.toLowerCase()));
  const uspsCodes = new Set(boundaries.states.map((s) => s.usps));

  // Derive every record's state once; the places phase and the state
  // aggregation below share the answer.
  const recordState = records.map((rec) =>
    typeof rec.lat === "number" && typeof rec.lng === "number"
      ? stateForPoint(rec.lat, rec.lng)
      : null
  );

  // --- places phase ---
  const { places: pool, source: poolSource } = await loadGazetteerPool(uspsCodes);
  const overrides = new Map(); // cameraId -> { place, state }
  const usedPlaces = new Set(); // sub-threshold pool entries carrying a camera
  let placeAssigned = 0;
  let placeUnassigned = 0;
  if (pool.length > 0) {
    const gridMain = buildPlaceGrid(
      pool.filter((p) => p.population >= GAZETTEER_MIN_POPULATION)
    );
    const gridAll = buildPlaceGrid(pool);
    records.forEach((rec, i) => {
      const s = recordState[i];
      if (!s || !isStateNameLabel(rec.city, stateNames)) return;
      if (typeof rec.lat !== "number" || typeof rec.lng !== "number") {
        placeUnassigned++;
        return;
      }
      const hit = assignPlace(gridMain, gridAll, rec.lat, rec.lng, { state: s.usps });
      if (hit) {
        overrides.set(rec.id, { place: hit.place.name, state: hit.place.state });
        if (hit.place.population < GAZETTEER_MIN_POPULATION) usedPlaces.add(hit.place);
        placeAssigned++;
      } else {
        placeUnassigned++;
      }
    });
  } else {
    console.warn("us-states: no gazetteer pool — derived places skipped");
  }
  const effectiveCity = (rec) => {
    const o = overrides.get(rec.id);
    return o ? o.place : (rec.city || "").trim();
  };

  // --- gazetteer file (trimmed pool) ---
  if (pool.length > 0) {
    const round5 = (n) => Math.round(n * 1e5) / 1e5;
    const kept = pool
      .filter((p) => p.population >= GAZETTEER_MIN_POPULATION || usedPlaces.has(p))
      .map((p) => ({
        name: p.name,
        state: p.state,
        lat: round5(p.lat),
        lng: round5(p.lng),
        population: p.population,
      }))
      .sort(
        (a, b) =>
          a.state.localeCompare(b.state) ||
          a.name.localeCompare(b.name) ||
          b.population - a.population
      );
    const gazetteer = {
      meta: {
        source: "GeoNames — US populated places (feature class P)",
        datasetUrl: "https://download.geonames.org/export/dump/US.zip",
        license: "CC BY 4.0",
        attribution: "Geographical data © GeoNames contributors (geonames.org)",
        generatedAt: new Date().toISOString(),
        poolSource,
        rule: `Places with population >= ${GAZETTEER_MIN_POPULATION}, plus any smaller place that is the nearest place for at least one camera.`,
        count: kept.length,
      },
      places: kept,
    };
    writeFileSync(join(root, "src/data/us-places.json"), JSON.stringify(gazetteer) + "\n");
    console.log(`us-places.json: ${kept.length} places kept of ${pool.length} in pool (${poolSource})`);
  }

  // --- aggregate ---
  const byState = new Map();
  let unassigned = 0;
  records.forEach((rec, i) => {
    const s = recordState[i];
    if (!s) {
      unassigned++;
      return;
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
    const city = effectiveCity(rec);
    if (city) entry.cityCounts.set(city, (entry.cityCounts.get(city) || 0) + 1);
    const sample = { id: rec.id, name: rec.name, city };
    if (rec.feedUrl || rec.streamUrl) entry.playable.push(sample);
    else entry.others.push(sample);
  });

  const fullAreas = (e) =>
    [...e.cityCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const stateList = [...byState.values()]
    .map((e) => ({
      name: e.name,
      slug: e.slug,
      usps: e.usps,
      count: e.count,
      areas: fullAreas(e).slice(0, 8),
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

  // --- camera places sidecar ---
  const stateAreas = {};
  for (const e of byState.values()) stateAreas[e.slug] = fullAreas(e);
  const sidecar = {
    generatedAt: new Date().toISOString(),
    source: "src/data/countries/united-states.json + GeoNames US gazetteer (src/data/us-places.json)",
    radiusKm: PLACE_RADIUS_KM,
    rule:
      "An entry exists only for a camera whose feed city label is a state name. Its place is the " +
      "nearest same-state GeoNames populated place with population >= 500 within radiusKm — unless " +
      "a place at least 3x that place's population lies within 10 km, in which case that dominant " +
      "city wins (continuous urban strips file under their dominant city). If no >= 500 place is " +
      "in range, the nearest smaller same-state place within radiusKm. Every other camera — and " +
      "any with no place in range — keeps its feed label.",
    assigned: placeAssigned,
    stateLabelledUnassigned: placeUnassigned,
    overrides: Object.fromEntries(
      [...overrides.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    ),
    stateAreas,
  };
  writeFileSync(join(root, "src/data/us-camera-places.json"), JSON.stringify(sidecar) + "\n");
  console.log(
    `us-camera-places.json: ${placeAssigned} cameras assigned a derived place, ${placeUnassigned} state-labelled cameras with no place within ${PLACE_RADIUS_KM} km (feed label kept)`
  );
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  await main();
}
