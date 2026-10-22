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

const CURRENT_STORMS = "https://www.nhc.noaa.gov/CurrentStorms.json";
const MAPSERVER =
  "https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/" +
  "NHC_tropical_weather_summary/MapServer";

/** MapServer layer id → feature kind drawn on the globe. */
const GIS_LAYERS: Array<{ id: number; kind: string }> = [
  { id: 7, kind: "cone" },
  { id: 6, kind: "track" },
  { id: 11, kind: "past" },
  { id: 5, kind: "point" },
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
      const params = new URLSearchParams({
        where: "1=1",
        outFields: "*",
        outSR: "4326",
        f: "geojson",
      });
      const fc = await fetchJson(`${MAPSERVER}/${id}/query?${params}`, 20000);
      const out: StormFeature[] = [];
      for (const f of fc.features ?? []) {
        if (!f.geometry) continue;
        const p = f.properties ?? {};
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
