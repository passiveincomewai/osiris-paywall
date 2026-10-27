/**
 * Breaking-events — Hurricanes (server data).
 *
 * The NHC fetch pipeline behind /api/hurricanes, moved here unchanged so
 * server-rendered storm pages read through the SAME in-process cache
 * ('nhc-hurricanes', 10 min) instead of a second, divergent fetch of the
 * NHC products. Two keyless, public-domain NHC sources are merged:
 *
 *   • CurrentStorms.json — the authoritative active-storm list (position,
 *     classification, sustained winds, pressure, motion).
 *   • The NHC tropical MapServer — forecast points, forecast track line,
 *     forecast cone and past track for every active storm.
 *
 * Everything is one GeoJSON feature array tagged by `kind`
 * (current | point | track | cone | past). When no storms are active
 * the answer is an empty array. Source: NOAA / NHC —
 * https://www.nhc.noaa.gov/
 */
import { cachedSource } from "@/lib/sourceCache";
import { pastPointTimeIso } from "@/lib/events/hurricanes";

const CURRENT_STORMS = "https://www.nhc.noaa.gov/CurrentStorms.json";
const MAPSERVER =
  "https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/" +
  "NHC_tropical_weather_summary/MapServer";

/** MapServer layer id → feature kind drawn on the globe. Layer 10
 *  (past points) and 13 (past wind radii) feed the storm card's
 *  origin/change sections; radii are attributes-only (no geometry). */
const GIS_LAYERS: Array<{ id: number; kind: string }> = [
  { id: 7, kind: "cone" },
  { id: 6, kind: "track" },
  { id: 11, kind: "past" },
  { id: 5, kind: "point" },
  { id: 10, kind: "pastpoint" },
  { id: 13, kind: "windradii" },
];

export interface StormFeature {
  type: "Feature";
  geometry: unknown;
  properties: Record<string, unknown>;
}

async function fetchJson(url: string, timeoutMs: number): Promise<any> {
  const res = await fetch(url, {
    headers: { "User-Agent": "OSIRIS-Intelligence-Platform/3.5" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

async function fetchStormFeatures(): Promise<StormFeature[]> {
  const current = await fetchJson(CURRENT_STORMS, 15000);
  const storms: any[] = current?.activeStorms ?? [];
  const features: StormFeature[] = [];

  for (const s of storms) {
    const lat = s.latitudeNumeric;
    const lng = s.longitudeNumeric;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        kind: "current",
        stormId: s.id ?? "",
        name: s.name ?? "",
        classification: s.classification ?? "",
        intensityKt: s.intensity != null ? Number(s.intensity) : null,
        pressureMb: s.pressure != null ? Number(s.pressure) : null,
        movementDir: s.movementDir != null ? Number(s.movementDir) : null,
        movementSpeedKt: s.movementSpeed != null ? Number(s.movementSpeed) : null,
        lastUpdate: s.lastUpdate ?? null,
      },
    });
  }

  // No active storms → clean empty state; don't touch the GIS service.
  if (storms.length === 0) return features;

  const gis = await Promise.allSettled(
    GIS_LAYERS.map(async ({ id, kind }) => {
      // outFields stays '*': the four layers carry different schemas, and
      // asking any layer for a field it lacks fails its whole query.
      // Properties are trimmed below before anything reaches the client.
      // Past points + wind radii are SEASON-wide layers: an unfiltered
      // query truncates at the service's 2000-record cap in objectid
      // order, which can cut the ACTIVE storms (they sort last). Scope
      // those two queries to the active storms by name / id.
      let where = "1=1";
      if (kind === "pastpoint" || kind === "windradii") {
        const field = kind === "pastpoint" ? "stormname" : "stormid";
        const rawVals = storms.map((s) => (kind === "pastpoint" ? s.name : s.id));
        const vals = [...new Set(rawVals.flatMap((v) => {
          const t = typeof v === "string" ? v.trim() : "";
          return t ? [t, t.toUpperCase()] : [];
        }))];
        if (vals.length) {
          where = `${field} IN (${vals.map((v) => `'${v.replace(/'/g, "''")}'`).join(",")})`;
        }
      }
      const params = new URLSearchParams({
        where,
        outFields: "*",
        outSR: "4326",
        f: "geojson",
      });
      // Wind radii are consumed as numbers only — skip the polygons.
      if (kind === "windradii") params.set("returnGeometry", "false");
      const fc = await fetchJson(`${MAPSERVER}/${id}/query?${params}`, 20000);
      const out: StormFeature[] = [];
      for (const f of fc.features ?? []) {
        const p = f.properties ?? {};
        if (kind === "windradii") {
          out.push({
            type: "Feature",
            geometry: null,
            properties: {
              kind,
              stormId: p.stormid ?? "",
              radiiKt: p.radii != null ? Number(p.radii) : null,
              neNm: p.ne != null ? Number(p.ne) : null,
              seNm: p.se != null ? Number(p.se) : null,
              swNm: p.sw != null ? Number(p.sw) : null,
              nwNm: p.nw != null ? Number(p.nw) : null,
              advNum: p.advnum != null ? Number(p.advnum) : null,
              synopTime: typeof p.synoptime === "string" ? p.synoptime : null,
            },
          });
          continue;
        }
        if (!f.geometry) continue;
        if (kind === "pastpoint") {
          out.push({
            type: "Feature",
            geometry: f.geometry,
            properties: {
              kind,
              name: p.stormname ?? "",
              stormType: p.stormtype ?? "",
              basin: p.basin ?? "",
              intensityKt: p.intensity != null ? Number(p.intensity) : null,
              pressureMb: p.mslp != null ? Number(p.mslp) : null,
              category: p.ss != null ? Number(p.ss) : null,
              timeIso: pastPointTimeIso(p),
            },
          });
          continue;
        }
        out.push({
          type: "Feature",
          geometry: f.geometry,
          properties: {
            kind,
            name: p.stormname ?? "",
            stormType: p.stormtype ?? "",
            basin: p.basin ?? "",
            advisory: p.advisnum ?? "",
            fcstHrs: p.fcstprd != null ? Number(p.fcstprd) : null,
            maxWindKt: p.maxwind != null ? Number(p.maxwind) : null,
            gustKt: p.gust != null ? Number(p.gust) : null,
            pressureMb: p.mslp != null ? Number(p.mslp) : null,
            category: p.ssnum != null ? Number(p.ssnum) : null,
            validLabel: p.datelbl ?? "",
          },
        });
      }
      return out;
    }),
  );
  for (const r of gis) {
    if (r.status === "fulfilled") features.push(...r.value);
  }
  return features;
}

export const getStormFeatures = cachedSource<StormFeature>(
  "nhc-hurricanes",
  fetchStormFeatures,
  10 * 60_000,
);
