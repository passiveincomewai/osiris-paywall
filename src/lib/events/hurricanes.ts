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

/** One best-track (past) position of a storm — NHC MapServer layer 10. */
export interface StormPastPoint {
  lat: number;
  lng: number;
  /** ISO time of the position when the feed's date fields parse. */
  timeIso: string | null;
  intensityKt: number | null;
  pressureMb: number | null;
  /** Saffir–Simpson number as published for this point, when set. */
  category: number | null;
  stormType: string;
}

/**
 * One wind-radii observation (NHC MapServer layer 13, attributes only):
 * how far winds of `radiiKt` extend in each quadrant, nautical miles.
 */
export interface StormWindRadii {
  radiiKt: number;
  neNm: number | null;
  seNm: number | null;
  swNm: number | null;
  nwNm: number | null;
  advNum: number | null;
  synopTime: string | null;
  /** Monotonic ordering key from synopTime (YYYYMMDDHH) when it
   *  parses. NOTE: on the live feed `advNum` is the CURRENT advisory
   *  number stamped on every row — it does not order observations;
   *  synopTime does. advNum is only a fallback when synoptime is absent. */
  synopKey: number | null;
  /** Largest quadrant extent — the storm's effective reach at radiiKt. */
  maxNm: number | null;
}

/** YYYYMMDDHH as a number from a synoptime string, else null. */
function synopOrderKey(synopTime: string | null): number | null {
  if (!synopTime) return null;
  const digits = synopTime.replace(/\D/g, "");
  if (digits.length >= 10) return Number(digits.slice(0, 10));
  if (digits.length === 8) return Number(digits) * 100;
  return null;
}

export interface StormGroup {
  current: StormCurrent;
  points: StormForecastPoint[];
  /** Best-track positions, oldest first (empty when the feed has none). */
  history: StormPastPoint[];
  /** Earliest + latest 34 kt (tropical-storm-force) wind radii, when the
   *  feed carries them — the storm SIZE then vs now. */
  size34: { first: StormWindRadii; latest: StormWindRadii } | null;
  /** First coordinate of the past-track line when no past points exist. */
  pastTrackFirst: { lat: number; lng: number } | null;
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
      history: [],
      size34: null,
      pastTrackFirst: null,
      hasCone: false,
      hasTrack: false,
      hasPastTrack: false,
    };
    groups.set(normName(group.current.name), group);
    order.push(normName(group.current.name));
  }

  // Wind radii carry a stormId (not a name), so they attach by id,
  // case-insensitively (CurrentStorms ids are lowercase, GIS uppercase).
  const radiiByStormId = new Map<string, StormWindRadii[]>();
  for (const f of features ?? []) {
    const p = f?.properties ?? {};
    if (p.kind !== "windradii") continue;
    const radiiKt = numOrNull(p.radiiKt);
    if (radiiKt === null) continue;
    const quads = [numOrNull(p.neNm), numOrNull(p.seNm), numOrNull(p.swNm), numOrNull(p.nwNm)];
    const known = quads.filter((q): q is number => q !== null);
    const entry: StormWindRadii = {
      radiiKt,
      neNm: quads[0],
      seNm: quads[1],
      swNm: quads[2],
      nwNm: quads[3],
      advNum: numOrNull(p.advNum),
      synopTime: typeof p.synopTime === "string" ? p.synopTime : null,
      synopKey: synopOrderKey(typeof p.synopTime === "string" ? p.synopTime : null),
      maxNm: known.length ? Math.max(...known) : null,
    };
    const key = typeof p.stormId === "string" ? p.stormId.trim().toLowerCase() : "";
    if (!key) continue;
    const arr = radiiByStormId.get(key) ?? [];
    arr.push(entry);
    radiiByStormId.set(key, arr);
  }
  for (const g of groups.values()) {
    const all = radiiByStormId.get(g.current.stormId.toLowerCase()) ?? [];
    const ts = all
      .filter((r) => r.radiiKt === 34)
      .sort((a, b) => {
        if (a.synopKey !== null && b.synopKey !== null) return a.synopKey - b.synopKey;
        if (a.synopKey !== null) return -1;
        if (b.synopKey !== null) return 1;
        return (a.advNum ?? Number.MAX_SAFE_INTEGER) - (b.advNum ?? Number.MAX_SAFE_INTEGER);
      });
    if (ts.length) g.size34 = { first: ts[0], latest: ts[ts.length - 1] };
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
    else if (p.kind === "past") {
      group.hasPastTrack = true;
      if (!group.pastTrackFirst) {
        const line = f?.geometry?.coordinates;
        const first = Array.isArray(line) ? line[0] : null;
        if (Array.isArray(first)) {
          const lng = numOrNull(first[0]);
          const lat = numOrNull(first[1]);
          if (lat !== null && lng !== null) group.pastTrackFirst = { lat, lng };
        }
      }
    } else if (p.kind === "pastpoint") {
      const coords = f?.geometry?.coordinates;
      if (!Array.isArray(coords)) continue;
      const lng = numOrNull(coords[0]);
      const lat = numOrNull(coords[1]);
      if (lat === null || lng === null) continue;
      group.history.push({
        lat,
        lng,
        timeIso: typeof p.timeIso === "string" ? p.timeIso : null,
        intensityKt: numOrNull(p.intensityKt),
        pressureMb: numOrNull(p.pressureMb),
        category: numOrNull(p.category),
        stormType: typeof p.stormType === "string" ? p.stormType : "",
      });
    }
  }

  for (const g of groups.values()) {
    g.points.sort((a, b) => (a.fcstHrs ?? 0) - (b.fcstHrs ?? 0));
    // Oldest first; points without a parsed time keep feed order at the end.
    g.history.sort((a, b) => {
      if (a.timeIso && b.timeIso) return a.timeIso < b.timeIso ? -1 : a.timeIso > b.timeIso ? 1 : 0;
      if (a.timeIso) return -1;
      if (b.timeIso) return 1;
      return 0;
    });
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

/* ── Origin & change (share card) ─────────────────────────────────────
 * Everything below is computed from fields the NHC feeds actually
 * publish: best-track past points (layer 10) for genesis + wind
 * history, and past wind radii (layer 13) for size. A field the feed
 * doesn't carry stays null and the card omits it — never estimated. */

/** Plain-language line shown when the 34 kt wind field has grown. */
export const STORM_SIZE_MEANING =
  "A wider tropical-storm-force wind field means damaging winds, surge and " +
  "rain reach farther from the center — impacts grow even when the category " +
  "doesn't change.";

export interface StormChangeSummary {
  /** Where the storm was first observed (earliest best-track point,
   *  else the first vertex of the past-track line, else null). */
  genesis: { lat: number; lng: number; timeIso: string | null } | null;
  historyPoints: number;
  windThenKt: number | null;
  windNowKt: number | null;
  windDeltaKt: number | null;
  catThen: number | null;
  catNow: number | null;
  /** Tropical-storm-force (34 kt) reach, largest quadrant, nautical miles. */
  sizeThenNm: number | null;
  sizeNowNm: number | null;
  sizeDeltaNm: number | null;
}

export function stormChangeSummary(g: StormGroup): StormChangeSummary {
  const first = g.history[0] ?? null;
  const genesis = first
    ? { lat: first.lat, lng: first.lng, timeIso: first.timeIso }
    : g.pastTrackFirst
      ? { lat: g.pastTrackFirst.lat, lng: g.pastTrackFirst.lng, timeIso: null }
      : null;
  const windThenKt = first?.intensityKt ?? null;
  const windNowKt = g.current.intensityKt;
  const catThen = first
    ? (first.category ?? saffirSimpsonCategory(first.intensityKt))
    : null;
  const catNow = stormDisplayCategory(g);
  const sizeThenNm = g.size34?.first.maxNm ?? null;
  const sizeNowNm = g.size34?.latest.maxNm ?? null;
  const delta = (now: number | null, then: number | null): number | null =>
    now !== null && then !== null ? now - then : null;
  return {
    genesis,
    historyPoints: g.history.length,
    windThenKt,
    windNowKt,
    windDeltaKt: delta(windNowKt, windThenKt),
    catThen,
    catNow,
    sizeThenNm,
    sizeNowNm,
    sizeDeltaNm: delta(sizeNowNm, sizeThenNm),
  };
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function isoFromParts(y: number, mo: number, d: number, hh: number, mm: number): string | null {
  if (!(y > 1900 && y < 2200 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && hh <= 23 && mm <= 59)) return null;
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${y}-${p(mo)}-${p(d)}T${p(hh)}:${p(mm)}:00Z`;
}

/**
 * Parse the time of an NHC past point from its raw GIS properties:
 * the `dtg` date-time-group (YYYYMMDDHHMM, number or string) when
 * present, else the year/month/day/hhmm field set (month may be a
 * number or an English month name). Returns an ISO string or null —
 * an unparseable time is omitted, never guessed.
 */
export function pastPointTimeIso(p: Record<string, unknown>): string | null {
  const dtgRaw = p?.dtg;
  const digits = typeof dtgRaw === "number"
    ? String(Math.trunc(dtgRaw))
    : typeof dtgRaw === "string"
      ? dtgRaw.replace(/\D/g, "")
      : "";
  if (digits.length === 12 || digits.length === 14) {
    return isoFromParts(
      Number(digits.slice(0, 4)), Number(digits.slice(4, 6)), Number(digits.slice(6, 8)),
      Number(digits.slice(8, 10)), Number(digits.slice(10, 12)),
    );
  }
  // Live feed shape: dtg is a double like 2026101818.0 → YYYYMMDDHH.
  if (digits.length === 10) {
    return isoFromParts(
      Number(digits.slice(0, 4)), Number(digits.slice(4, 6)), Number(digits.slice(6, 8)),
      Number(digits.slice(8, 10)), 0,
    );
  }
  const year = typeof p?.year === "number" ? p.year : Number(p?.year);
  const day = typeof p?.day === "number" ? p.day : Number(p?.day);
  const monthRaw = p?.month;
  const month = typeof monthRaw === "string" && Number.isNaN(Number(monthRaw))
    ? (MONTHS[monthRaw.trim().slice(0, 3).toLowerCase()] ?? NaN)
    : Number(monthRaw);
  const hhmm = typeof p?.hhmm === "string" ? p.hhmm.replace(/\D/g, "").padStart(4, "0") : "";
  if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day) && hhmm.length === 4) {
    return isoFromParts(year, month, day, Number(hhmm.slice(0, 2)), Number(hhmm.slice(2, 4)));
  }
  return null;
}
