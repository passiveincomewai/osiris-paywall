/**
 * Breaking-events — Hurricanes (pure helpers).
 *
 * The data itself comes from /api/hurricanes (NOAA NHC CurrentStorms +
 * the NHC tropical MapServer), whose payload is one GeoJSON feature
 * array tagged by `kind` (current | point | track | cone | past). These
 * helpers group that array per storm and label it, identically for the
 * live list, the per-storm pages and the news sitemap. Source: NOAA /
 * National Hurricane Center — https://www.nhc.noaa.gov/
 */

export interface StormCurrent {
  stormId: string;
  name: string;
  /** NHC classification code: HU, TS, TD, PTC, SD, SS, … */
  classification: string;
  intensityKt: number | null;
  pressureMb: number | null;
  movementDir: number | null;
  movementSpeedKt: number | null;
  lastUpdate: string | null;
  lat: number;
  lng: number;
}

export interface StormForecastPoint {
  name: string;
  validLabel: string;
  fcstHrs: number | null;
  maxWindKt: number | null;
  gustKt: number | null;
  pressureMb: number | null;
  /** Saffir–Simpson number as published by NHC for this point, when set. */
  category: number | null;
  stormType: string;
}

export interface StormGroup {
  current: StormCurrent;
  points: StormForecastPoint[];
  hasCone: boolean;
  hasTrack: boolean;
  hasPastTrack: boolean;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function normName(name: unknown): string {
  return typeof name === "string" ? name.trim().toLowerCase() : "";
}

/**
 * Group the flat /api/hurricanes feature array by storm. GIS features
 * (points/cone/track/past) carry a storm name but no id, so they attach
 * to the 'current' feature with the same name (case-insensitive).
 */
export function groupStormFeatures(features: any[]): StormGroup[] {
  const groups = new Map<string, StormGroup>();
  const order: string[] = [];

  for (const f of features ?? []) {
    const p = f?.properties ?? {};
    if (p.kind !== "current") continue;
    const stormId = typeof p.stormId === "string" ? p.stormId.trim() : "";
    const coords = f?.geometry?.coordinates;
    if (!stormId || !Array.isArray(coords)) continue;
    const lng = numOrNull(coords[0]);
    const lat = numOrNull(coords[1]);
    if (lat === null || lng === null) continue;
    const group: StormGroup = {
      current: {
        stormId,
        name: typeof p.name === "string" && p.name ? p.name : stormId.toUpperCase(),
        classification: typeof p.classification === "string" ? p.classification : "",
        intensityKt: numOrNull(p.intensityKt),
        pressureMb: numOrNull(p.pressureMb),
        movementDir: numOrNull(p.movementDir),
        movementSpeedKt: numOrNull(p.movementSpeedKt),
        lastUpdate: typeof p.lastUpdate === "string" ? p.lastUpdate : null,
        lat,
        lng,
      },
      points: [],
      hasCone: false,
      hasTrack: false,
      hasPastTrack: false,
    };
    groups.set(normName(group.current.name), group);
    order.push(normName(group.current.name));
  }

  for (const f of features ?? []) {
    const p = f?.properties ?? {};
    const group = groups.get(normName(p.name));
    if (!group) continue;
    if (p.kind === "point") {
      group.points.push({
        name: typeof p.name === "string" ? p.name : "",
        validLabel: typeof p.validLabel === "string" ? p.validLabel : "",
        fcstHrs: numOrNull(p.fcstHrs),
        maxWindKt: numOrNull(p.maxWindKt),
        gustKt: numOrNull(p.gustKt),
        pressureMb: numOrNull(p.pressureMb),
        category: numOrNull(p.category),
        stormType: typeof p.stormType === "string" ? p.stormType : "",
      });
    } else if (p.kind === "cone") group.hasCone = true;
    else if (p.kind === "track") group.hasTrack = true;
    else if (p.kind === "past") group.hasPastTrack = true;
  }

  for (const g of groups.values()) {
    g.points.sort((a, b) => (a.fcstHrs ?? 0) - (b.fcstHrs ?? 0));
  }
  return order.map((k) => groups.get(k)!).filter(Boolean);
}

export function findStormGroup(
  groups: StormGroup[],
  stormId: string,
): StormGroup | null {
  const want = stormId.trim().toLowerCase();
  return groups.find((g) => g.current.stormId.toLowerCase() === want) ?? null;
}

/**
 * Saffir–Simpson category from sustained winds (knots) — the standard
 * NHC thresholds. Returns 0 below hurricane strength, null for no data.
 */
export function saffirSimpsonCategory(intensityKt: number | null): number | null {
  if (intensityKt === null) return null;
  if (intensityKt < 64) return 0;
  if (intensityKt <= 82) return 1;
  if (intensityKt <= 95) return 2;
  if (intensityKt <= 112) return 3;
  if (intensityKt <= 136) return 4;
  return 5;
}

/**
 * The category to show for a storm now: NHC's own number for the
 * analysis point when the GIS feed carries one, else derived from the
 * current sustained winds (labeled as derived at the call site).
 */
export function stormDisplayCategory(g: StormGroup): number | null {
  const analysis = g.points.find((p) => p.fcstHrs === 0 && p.category !== null);
  if (analysis) return analysis.category;
  if (g.current.classification.trim().toUpperCase() === "HU") {
    return saffirSimpsonCategory(g.current.intensityKt);
  }
  return null;
}

const CLASSIFICATION_LABELS: Record<string, string> = {
  HU: "Hurricane",
  TY: "Typhoon",
  TS: "Tropical Storm",
  TD: "Tropical Depression",
  PTC: "Post-Tropical Cyclone",
  PDS: "Post-Tropical Depression",
  SD: "Subtropical Depression",
  SS: "Subtropical Storm",
  EX: "Extratropical Cyclone",
  LO: "Low",
  WV: "Tropical Wave",
  DB: "Tropical Disturbance",
};

/** Human label for an NHC classification code; unknown codes pass through. */
export function classificationLabel(code: string): string {
  const c = (code ?? "").trim().toUpperCase();
  if (!c) return "Tropical Cyclone";
  return CLASSIFICATION_LABELS[c] ?? c;
}

const COMPASS_16 = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

/** 16-point compass label for a direction in degrees. */
export function compassDirection(deg: number | null): string | null {
  if (deg === null || !Number.isFinite(deg)) return null;
  const idx = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS_16[idx];
}

/** Knots → mph, rounded (1 kt = 1.15078 mph). */
export function ktToMph(kt: number | null): number | null {
  return kt === null ? null : Math.round(kt * 1.15078);
}
