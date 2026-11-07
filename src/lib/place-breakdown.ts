/**
 * Per-place breakdowns + "Current Status" lines for the generated
 * directory pages (city / state / country templates).
 *
 * Every number here is computed from the same catalogue records the
 * pages' own camera grids load (`recordsForDef` over the country
 * chunks), never from editorial copy — so a breakdown can never quote a
 * count its own page disagrees with. Where a chunk count differs from
 * a page's headline count (the city index in src/data/city-pages.json
 * is built from a wider union than the served chunks), the copy always
 * says which set it is counting: "cameras listed under {place} in the
 * live index".
 *
 * Honesty rules for the status lines (the owner's Current Status
 * structure): conditions come only from a real weather snapshot when
 * one was fetched; traffic is never scored or asserted — the block
 * points at the live cameras instead. With no feed wired, the block
 * says so and links the cameras.
 */
import type { CountryCamera } from "@/lib/country-cameras";
import { THEME_DEFS } from "@/lib/country-page-content";
import { recordsForDef, resolveExploreDef } from "@/lib/explore-data";
import { normalizeQuestion } from "@/lib/place-answers";
import {
  getUsStatesIndex,
  stateForPoint,
  type UsStateMeta,
} from "@/lib/us-states";
import type { PlaceWeather } from "@/lib/place-weather";

export interface BreakdownRow {
  name: string;
  count: number;
}

export interface PlaceBreakdown {
  /** Records in the place's own chunk set — the set its grid searches. */
  total: number;
  /** Records carrying coordinates (the quadrant split's base). */
  placed: number;
  /** Cameras whose name carries no parseable road designation. */
  unnamed: number;
  /** Cameras on Interstate / US-highway designations. */
  freewayCount: number;
  /** Top road designations by camera count (at most 6). */
  corridors: BreakdownRow[];
  /** Designated-road cameras beyond the shown corridors. */
  moreCorridors: number;
  /** Placed records split by the grid's median lat/lng; null when the
   *  placed set is too small for a meaningful split. */
  quadrants: {
    northEast: number;
    northWest: number;
    southEast: number;
    southWest: number;
  } | null;
  /** Top publishing sources (at most 4). */
  sources: BreakdownRow[];
  /** Camera-kind mix (C6): every record counted once, under the
   *  first kind its own name matches — a partition, so the rows are
   *  the kinds the place actually has, in size order. */
  mix: BreakdownRow[];
}

interface CorridorPattern {
  re: RegExp;
  format: (m: RegExpMatchArray) => string;
}

/* Road designations as the feeds actually write them. The host road is
 * the one named FIRST in a camera name ("SH 121 @ IH 635" sits on
 * SH 121), so parseCorridor takes the earliest match across patterns,
 * not the first pattern that hits. Compact TxDOT forms (IH35W, SH183,
 * LP20EB) are as common as spaced ones (I-35W, SH 183). UK A/M roads
 * require a capitalised word after the number so postcodes and unit
 * numbers ("Unit A3", "Bay M4") don't parse as roads.
 *
 * LANGUAGE-AWARE AMENDMENT (C10 gate fix, owner-approved 2026-11-06,
 * site audit A3): the original pattern set only recognised US/UK
 * written forms, so the C10 element band systematically scored
 * non-English feeds' corridors as zero — Spanish DGT names are bare
 * hyphenated designations ("AP-66 km 100.2", "A-6 km 290.9",
 * "N-634 km 598.3"), Japanese MLIT names carry the designation as a
 * word ("Route 175", "National Route 153" — the bare "Route N" match
 * covers both), and Canadian feeds write "Highway 9". The three
 * patterns appended AFTER the originals below recognise exactly
 * those written forms; the originals stay first so a name they
 * already parse keeps its established formatting (the earliest-match
 * rule only replaces a match at a strictly earlier position). The
 * hyphenated-prefix pattern requires an all-caps 1–2 letter prefix
 * at a word boundary directly hyphenated to the number, so camera
 * codes embedded in longer letter runs ("CCTV-913") and bare numeric
 * ranges ("913-0494") never parse as roads. Thresholds are unchanged
 * — this is fairer measurement of the same substance, and matches
 * are monotonic: a name that parsed before parses identically now. */
const CORRIDOR_PATTERNS: CorridorPattern[] = [
  { re: /\bIH[ -]?(\d{1,3})([A-Z])?(?![0-9])/, format: (m) => `I-${m[1]}${m[2] ?? ""}` },
  { re: /\bI-(\d{1,3})([A-Z])?(?![0-9])/, format: (m) => `I-${m[1]}${m[2] ?? ""}` },
  { re: /\bUS[ -]?(\d{1,3})(?![0-9])/, format: (m) => `US ${m[1]}` },
  { re: /\b(SR|SH|FM|RM)[ -]?(\d{1,4})(?![0-9])/, format: (m) => `${m[1]} ${m[2]}` },
  { re: /\bLP[ -]?(\d{1,4})(?![0-9])/, format: (m) => `Loop ${m[1]}` },
  { re: /\bA(\d{1,4})(?=\s+[A-Z])/, format: (m) => `A${m[1]}` },
  { re: /\bM(\d{1,2})(?=\s+[A-Z])/, format: (m) => `M${m[1]}` },
  /* Language-aware additions (2026-11-06, see the note above). */
  { re: /\bHighway (\d{1,3})(?![0-9])/, format: (m) => `Highway ${m[1]}` },
  { re: /\bRoute (\d{1,4})(?![0-9])/, format: (m) => `Route ${m[1]}` },
  { re: /\b([A-Z]{1,2})-(\d{1,4})(?![0-9])/, format: (m) => `${m[1]}-${m[2]}` },
];

/* Designations some feeds carry only in the camera id (Laredo's TxDOT
 * ids embed "US83 @ SL517" while the display name stays generic). */
const ID_CORRIDOR_PATTERNS: CorridorPattern[] = [
  { re: /\bUS(\d{1,3})(?![0-9])/, format: (m) => `US ${m[1]}` },
  { re: /\bBI(\d{1,3})(?![0-9])/, format: (m) => `Business I-${m[1]}` },
  { re: /\bBU(\d{1,3})(?![0-9])/, format: (m) => `Business US ${m[1]}` },
  { re: /\bSL(\d{1,4})(?![0-9])/, format: (m) => `Loop ${m[1]}` },
];

function earliestMatch(
  text: string,
  patterns: CorridorPattern[],
): string | null {
  let best: { index: number; value: string } | null = null;
  for (const p of patterns) {
    const m = text.match(p.re);
    if (m && typeof m.index === "number") {
      if (!best || m.index < best.index) {
        best = { index: m.index, value: p.format(m) };
      }
    }
  }
  return best?.value ?? null;
}

/** The road designation a camera sits on, from its display name,
 *  falling back to its id; null when neither names one. */
export function parseCorridor(
  name: string,
  id?: string | null,
): string | null {
  const fromName = earliestMatch(name.replace(/_/g, " "), CORRIDOR_PATTERNS);
  if (fromName) return fromName;
  if (id) return earliestMatch(id, ID_CORRIDOR_PATTERNS);
  return null;
}

export function isFreewayDesignation(designation: string): boolean {
  return designation.startsWith("I-") || designation.startsWith("US ");
}

function topRows(counts: Map<string, number>, limit: number): BreakdownRow[] {
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Camera-kind mix (C6, §4.1.2)                                        */
/* ------------------------------------------------------------------ */

/* The kinds a place's cameras fall into, read from each camera's own
 * name with the SAME theme patterns the country template derives its
 * mix from (country-page-content THEME_DEFS) — one method everywhere.
 * Unlike the country page's prose themes, a strip needs a partition:
 * each record counts once, under the first kind its name matches, in
 * the priority order below (specific kinds before the broad traffic
 * and city buckets, whose patterns would otherwise swallow them).
 * Short labels are the strip's own; the patterns are shared. */
const MIX_KIND_ORDER: Array<{ key: string; label: string }> = [
  { key: "transport", label: "Airports & stations" },
  { key: "coast", label: "Coast & harbour" },
  { key: "mountains", label: "Mountains & ski" },
  { key: "nature", label: "Rivers & nature" },
  { key: "traffic", label: "Roads & traffic" },
  { key: "city", label: "City views & landmarks" },
];

const MIX_DEFS = MIX_KIND_ORDER.map((d) => ({
  label: d.label,
  pattern: THEME_DEFS.find((t) => t.key === d.key)?.pattern ?? /$^/,
}));

/** The kind mix of one record set: rows in size order, only kinds
 *  at least one camera's name actually matches. Pure — unit-tested. */
export function computeCameraKindMix(
  records: readonly CountryCamera[],
): BreakdownRow[] {
  const counts = new Map<string, number>();
  for (const r of records) {
    const name = r.name ?? "";
    const hit = MIX_DEFS.find((d) => d.pattern.test(name));
    if (hit) counts.set(hit.label, (counts.get(hit.label) ?? 0) + 1);
  }
  return topRows(counts, MIX_DEFS.length);
}

/* ------------------------------------------------------------------ */
/* Operators (C6, §4.1.1 / §4.2.1 / §4.3)                              */
/* ------------------------------------------------------------------ */

export interface OperatorRow extends BreakdownRow {
  /** The operator family the source name itself identifies. */
  kind: string;
  /** One factual line about that family — what it publishes. */
  note: string;
}

const OPERATOR_KINDS: Array<{
  kind: string;
  note: string;
  test: (name: string, tokens: string[]) => boolean;
}> = [
  {
    kind: "511 traveller information",
    note: "The region's 511 service — road conditions and cameras published for drivers.",
    test: (name) => /(^|[^0-9])511([^0-9]|$)/.test(name),
  },
  {
    kind: "Road agency",
    note: "A road agency's traffic cameras, published so drivers can check conditions before travelling.",
    test: (name, tokens) =>
      /department of transportation|highway bureau/i.test(name) ||
      tokens.some(
        (t) =>
          t === "caltrans" ||
          t === "trafikverket" ||
          t === "dgt" ||
          t === "mdchart" ||
          t === "transtar" ||
          (t.endsWith("dot") && t.length <= 6),
      ),
  },
  {
    kind: "Open data",
    note: "Feeds the city or region publishes as open data, for anyone to reuse.",
    test: (name) => /socrata|arcgis/i.test(name),
  },
  {
    kind: "Webcam network",
    note: "A webcam publisher — cameras kept for the view itself, not for traffic.",
    test: (name) => /skylinewebcams|earthcam/i.test(name),
  },
];

/** What kind of operator a catalogue source name identifies, and the
 *  one factual line the operator tables may say about it. Deliberately
 *  conservative: a name that identifies no known family gets the
 *  generic line rather than a guessed identity. The display name is
 *  never altered — only classified. Pure — unit-tested. */
export function operatorKind(sourceName: string): { kind: string; note: string } {
  const tokens = sourceName.toLowerCase().split(/[^a-z]+/).filter(Boolean);
  for (const k of OPERATOR_KINDS) {
    if (k.test(sourceName, tokens)) return { kind: k.kind, note: k.note };
  }
  return {
    kind: "Public network",
    note: "Public feeds published under this operator's own name.",
  };
}

/** Aggregated source counts → operator-table rows (order preserved,
 *  so callers pass their counts already sorted). Pure. */
export function operatorRows(
  counts: readonly BreakdownRow[],
  limit?: number,
): OperatorRow[] {
  const rows = limit ? counts.slice(0, limit) : [...counts];
  return rows.map((r) => ({ ...r, ...operatorKind(r.name) }));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** The full breakdown for one record set. Pure — unit-tested. */
export function computePlaceBreakdown(
  records: readonly CountryCamera[],
): PlaceBreakdown {
  const corridorCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  let unnamed = 0;
  let freewayCount = 0;
  const lats: number[] = [];
  const lngs: number[] = [];
  const placedPoints: Array<{ lat: number; lng: number }> = [];
  for (const r of records) {
    const corridor = parseCorridor(r.name ?? "", r.id);
    if (corridor) {
      corridorCounts.set(corridor, (corridorCounts.get(corridor) ?? 0) + 1);
      if (isFreewayDesignation(corridor)) freewayCount += 1;
    } else {
      unnamed += 1;
    }
    const source = (r.source ?? "").trim();
    if (source) sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
    if (typeof r.lat === "number" && typeof r.lng === "number") {
      lats.push(r.lat);
      lngs.push(r.lng);
      placedPoints.push({ lat: r.lat, lng: r.lng });
    }
  }
  const corridors = topRows(corridorCounts, 6);
  const designated = [...corridorCounts.values()].reduce((s, n) => s + n, 0);
  const shown = corridors.reduce((s, r) => s + r.count, 0);
  let quadrants: PlaceBreakdown["quadrants"] = null;
  if (placedPoints.length >= 20) {
    const midLat = median(lats);
    const midLng = median(lngs);
    const q = { northEast: 0, northWest: 0, southEast: 0, southWest: 0 };
    for (const p of placedPoints) {
      if (p.lat >= midLat) {
        if (p.lng >= midLng) q.northEast += 1;
        else q.northWest += 1;
      } else if (p.lng >= midLng) q.southEast += 1;
      else q.southWest += 1;
    }
    quadrants = q;
  }
  return {
    total: records.length,
    placed: placedPoints.length,
    unnamed,
    freewayCount,
    corridors,
    moreCorridors: designated - shown,
    quadrants,
    sources: topRows(sourceCounts, 4),
    mix: computeCameraKindMix(records),
  };
}

/** A city's breakdown from the very records its page explorer serves.
 *  Null when the country/city isn't in the served index or the chunk
 *  fails to load — the page then degrades to its index-only content. */
export async function loadCityBreakdown(
  countrySlug: string,
  cityName: string,
): Promise<PlaceBreakdown | null> {
  try {
    const def = resolveExploreDef({ country: countrySlug, city: cityName });
    if (!def) return null;
    const records = await recordsForDef(def);
    if (!records || records.length === 0) return null;
    return computePlaceBreakdown(records);
  } catch {
    return null;
  }
}

/* Per-state membership of the US records, assigned by the same
 * point-in-state test the state index itself uses (us-states
 * stateForPoint, true polygon containment) so every number the state
 * template derives describes the same set its headline counts.
 * Grouped once per process; the US chunk is ~54k records. */
let usStateRecordsPromise: Promise<Map<string, CountryCamera[]>> | null = null;

function usStateRecords(): Promise<Map<string, CountryCamera[]>> {
  if (usStateRecordsPromise) return usStateRecordsPromise;
  usStateRecordsPromise = (async () => {
    const out = new Map<string, CountryCamera[]>();
    try {
      const def = resolveExploreDef({ country: "united-states" });
      if (!def) return out;
      const records = await recordsForDef(def);
      for (const r of records) {
        if (typeof r.lat !== "number" || typeof r.lng !== "number") continue;
        const meta = stateForPoint(r.lat, r.lng);
        if (!meta) continue;
        const rows = out.get(meta.slug);
        if (rows) rows.push(r);
        else out.set(meta.slug, [r]);
      }
    } catch {
      /* an empty map degrades every state to a null breakdown */
    }
    return out;
  })();
  return usStateRecordsPromise;
}

/** One US state's own camera records — the same coordinate-assigned
 *  set loadStateBreakdown measures (usStateRecords above), exposed for
 *  the state template's Phase 2 roster so the roster's count is the
 *  set's own size, never a figure from another data generation. Empty
 *  when the state has no assigned records or the chunk fails to load. */
export async function loadStateRecords(
  stateSlug: string,
): Promise<CountryCamera[]> {
  return (await usStateRecords()).get(stateSlug) ?? [];
}

/** The full §4 measured breakdown for one US state's own camera set
 *  (corridors, operators, mix) — the state template's numbers all come
 *  from the records the state polygons assign to that state, so they
 *  reconcile with the counts the page already prints. Null when the
 *  state has no assigned records or the chunk fails to load. */
export async function loadStateBreakdown(
  stateSlug: string,
): Promise<PlaceBreakdown | null> {
  const records = (await usStateRecords()).get(stateSlug);
  if (!records || records.length === 0) return null;
  return computePlaceBreakdown(records);
}

/** The state hub a US city page should link to, derived two honest
 *  ways: the state containing the city's own camera centroid, else the
 *  unique state whose measured area table names the city. Null when
 *  neither resolves — the page then links no state rather than a
 *  guessed one. */
export function stateHubForCity(
  countrySlug: string,
  cityName: string,
  centroid: { lat: number; lng: number } | null,
): UsStateMeta | null {
  if (countrySlug !== "united-states") return null;
  if (centroid) {
    const byPoint = stateForPoint(centroid.lat, centroid.lng);
    if (byPoint) return byPoint;
  }
  const matches = getUsStatesIndex().states.filter((s) =>
    s.areas.some((a) => a.name === cityName),
  );
  if (matches.length !== 1) return null;
  const { name, slug, usps } = matches[0];
  return { name, slug, usps };
}

/* ------------------------------------------------------------------ */
/* Current Status lines                                                */
/* ------------------------------------------------------------------ */

export interface StatusRow {
  q: string;
  a: string;
  href?: string;
  linkLabel?: string;
}

const fmt = (n: number) => n.toLocaleString("en-US");

function tempText(tempF: number | null, tempC: number | null): string {
  if (tempF !== null && tempC !== null) return ` at ${tempF}°F (${tempC}°C)`;
  if (tempF !== null) return ` at ${tempF}°F`;
  if (tempC !== null) return ` at ${tempC}°C`;
  return "";
}

/** The "is it snowing" row, shared by all three templates. Answers
 *  only from a real snapshot's condition text; otherwise says plainly
 *  that no feed is wired and points at the cameras. `scopeNote` lets
 *  state/country pages say whose weather the snapshot actually is. */
function snowRow(
  place: string,
  weather: PlaceWeather | null,
  scopeNote: string | null,
  cameraHref?: string,
): StatusRow {
  const snap = weather?.weather ?? null;
  const scope = scopeNote ? ` ${scopeNote}` : "";
  if (snap?.current?.condition) {
    const condition = snap.current.condition.text;
    const where = snap.location?.name ? ` for ${snap.location.name}` : "";
    const temp = tempText(snap.current.tempF, snap.current.tempC);
    const stale = snap.stale
      ? " (The provider flags this reading as the last good one after a failed refresh.)"
      : "";
    if (/snow/i.test(condition)) {
      return {
        q: `Is it snowing in ${place} right now?`,
        a: `Yes — the live weather feed${where} is reporting ${condition.toLowerCase().startsWith("snow") || /snow/.test(condition.toLowerCase()) ? `"${condition}"` : `"${condition}"`}${temp}.${scope} For the roads themselves, the live cameras below show what is actually settling.${stale}`,
      };
    }
    return {
      q: `Is it snowing in ${place} right now?`,
      a: `No snow in the latest report — the live weather feed${where} currently shows "${condition}"${temp}.${scope} Conditions change faster than any summary, so for a drive, check the live cameras below before you go.${stale}`,
    };
  }
  return {
    q: `Is it snowing in ${place} right now?`,
    a: `WorldEye has no live weather feed wired for ${place}, so this page won't guess.${scope} The cameras are the ground truth — open a live feed and look at the roads, roofs and trees directly.`,
    ...(cameraHref ? { href: cameraHref, linkLabel: "Open the live cameras" } : {}),
  };
}

function alertsRow(place: string, weather: PlaceWeather | null): StatusRow | null {
  const alerts = weather?.weather?.alerts ?? [];
  if (alerts.length === 0) return null;
  const heads = alerts.slice(0, 2).map((a) => a.headline).filter(Boolean);
  const more = alerts.length > heads.length ? ` — and ${alerts.length - heads.length} more in effect` : "";
  return {
    q: `Are there weather alerts in effect for ${place}?`,
    a: `Yes — ${fmt(alerts.length)} ${alerts.length === 1 ? "alert is" : "alerts are"} in effect: ${heads.join("; ")}${more}.`,
  };
}

export interface CityStatusInput {
  name: string;
  isUS: boolean;
  /** The page's headline count for the city. */
  pageCount: number;
  stills?: number | null;
  streams?: number | null;
  breakdown: PlaceBreakdown | null;
  weather: PlaceWeather | null;
}

export function cityStatusRows(input: CityStatusInput): StatusRow[] {
  const { name, isUS, breakdown, weather } = input;
  const rows: StatusRow[] = [snowRow(name, weather, null)];
  const alert = alertsRow(name, weather);
  if (alert) rows.push(alert);

  /* Traffic — never scored. The honest offer is the cameras
   * themselves, with the busiest corridor as the place to start. */
  if (breakdown && breakdown.total > 0) {
    const top = breakdown.corridors[0];
    rows.push({
      q: `How bad is traffic in ${name} right now?`,
      a: `A camera index can't honestly score congestion — nothing here measures traffic speed. What it can do is show you: ${fmt(breakdown.total)} live cameras are listed under ${name} in the index${top ? `, and ${fmt(top.count)} of them watch ${top.name} alone` : ""}. Open the feed on your route and judge the lanes yourself.`,
      ...(isUS
        ? { href: "/live-traffic-cameras", linkLabel: "All US live traffic cameras" }
        : {}),
    });
  } else {
    rows.push({
      q: `How bad is traffic in ${name} right now?`,
      a: `A camera index can't honestly score congestion — nothing here measures traffic speed. What it can do is show you: ${fmt(input.pageCount)} live cameras watch ${name}. Open the feed on your route and judge the lanes yourself.`,
      ...(isUS
        ? { href: "/live-traffic-cameras", linkLabel: "All US live traffic cameras" }
        : {}),
    });
  }

  /* Liveness / feed kinds, only from numbers the page actually has. */
  if (
    typeof input.streams === "number" &&
    typeof input.stills === "number" &&
    (input.streams > 0 || input.stills > 0)
  ) {
    const parts: string[] = [];
    if (input.streams > 0) parts.push(`${fmt(input.streams)} stream live video`);
    if (input.stills > 0)
      parts.push(`${fmt(input.stills)} refresh as still images on their agencies' cycles`);
    rows.push({
      q: `Are ${name}'s cameras live right now?`,
      a: `Yes — the index lists ${fmt(input.pageCount)} feeds for ${name}: ${parts.join(" and ")}. A feed whose stream has gone off air shows as unavailable rather than playing a recording.`,
    });
  } else if (breakdown && breakdown.sources.length > 0) {
    rows.push({
      q: `Are ${name}'s cameras live right now?`,
      a: `Yes — ${fmt(breakdown.total)} feeds listed under ${name} in the live index, published by ${breakdown.sources
        .slice(0, 2)
        .map((s) => s.name)
        .join(" and ")}. A feed whose stream has gone off air shows as unavailable rather than playing a recording.`,
    });
  }
  return rows;
}

export interface StateStatusInput {
  stateName: string;
  count: number;
  areas: BreakdownRow[];
  weather: PlaceWeather | null;
}

export function stateStatusRows(input: StateStatusInput): StatusRow[] {
  const { stateName, count, areas, weather } = input;
  const top = areas[0];
  const rows: StatusRow[] = [
    snowRow(stateName, weather, `A state is bigger than one forecast — this reading is the feed this page loads for ${stateName}; for a specific pass or city, check that city's own page and cameras.`, "/live-traffic-cameras"),
  ];
  const alert = alertsRow(stateName, weather);
  if (alert) rows.push(alert);
  rows.push({
    q: `How bad is traffic in ${stateName} right now?`,
    a: `A camera index can't honestly score congestion — nothing here measures traffic speed. What it can do is show you: ${fmt(count)} live cameras are indexed across ${stateName}, most of them DOT freeway and interstate feeds${top ? ` — the largest cluster is ${top.name} with ${fmt(top.count)}` : ""}. Pick your stretch in the area table below and judge the lanes yourself.`,
    href: "/live-traffic-cameras",
    linkLabel: "Watch US freeway cameras live",
  });
  if (areas.length >= 2) {
    rows.push({
      q: `Where are ${stateName}'s cameras concentrated?`,
      a: `${areas
        .slice(0, 3)
        .map((a) => `${a.name} (${fmt(a.count)})`)
        .join(", ")} lead the state${areas.length > 3 ? `, with cameras spread across ${fmt(areas.length)} named areas in the table below` : ""}. Every count is measured from the same catalogue the camera grid serves.`,
    });
  }
  return rows;
}

export interface CountryStatusInput {
  countryName: string;
  count: number;
  weatherCity: string;
  weatherCityCount?: number | null;
  isUS: boolean;
  weather: PlaceWeather | null;
}

export function countryStatusRows(input: CountryStatusInput): StatusRow[] {
  const { countryName, count, weatherCity, isUS, weather } = input;
  const rows: StatusRow[] = [
    snowRow(
      countryName,
      weather,
      `${countryName} is too big for one forecast — this reading is for ${weatherCity}, its largest camera city; conditions elsewhere in the country will differ.`,
      `/cameras/countries`,
    ),
  ];
  const alert = alertsRow(weatherCity, weather);
  if (alert) rows.push(alert);
  rows.push({
    q: `Can I check traffic in ${countryName} right now?`,
    a: isUS
      ? `Yes — ${fmt(count)} live cameras are indexed across the United States, most of them DOT freeway and interstate feeds, and the largest cluster is ${weatherCity}${input.weatherCityCount ? ` with ${fmt(input.weatherCityCount)}` : ""}. Pick a state page or open the live traffic cameras and judge the lanes yourself — this page never scores congestion it cannot measure.`
      : `Yes — ${fmt(count)} live cameras are indexed across ${countryName}, and the largest cluster is ${weatherCity}${input.weatherCityCount ? ` with ${fmt(input.weatherCityCount)}` : ""}. Open the feeds on your route in the grid below and judge conditions directly — this page never scores traffic it cannot measure.`,
    ...(isUS
      ? { href: "/live-traffic-cameras", linkLabel: "US freeway cameras — live" }
      : {}),
  });
  return rows;
}

/* ------------------------------------------------------------------ */
/* Current Status rows in the FAQPage schema                           */
/* ------------------------------------------------------------------ */

/**
 * Merge a page's Current Status rows into its FAQ-schema set.
 *
 * The status rows render visibly on the page (the CurrentStatus
 * block) but were the one Q&A set the FAQPage JSON-LD didn't carry —
 * and they are the highest-value questions on the page for the
 * "right now" intent ("Is it snowing in {place} right now?", "How bad
 * is traffic in {place} right now?"), the surface featured snippets
 * and AI/voice answers read. The place-answers §3 invariant — schema
 * text is always visible text — holds: the rows are appended only
 * from the same render's visible set, so the schema can never claim
 * an answer the page doesn't show, nor a fresher one (the templates
 * revalidate on the same cycle as the visible block).
 *
 * Rules mirror mergePlaceFaqs (§3): the page's own FAQs keep their
 * order and win collisions; rows append in row order; duplicates by
 * normalized question (the §3 normalization) are dropped, both
 * against the FAQ set and within the rows themselves. href /
 * linkLabel are presentation, not answer text, and never enter the
 * schema. Inputs are not mutated. No cap beyond the FAQ set's own:
 * the status block is at most 4 rows, and a cap that dropped one
 * would put a visible Q&A outside the schema — the asymmetry this
 * helper exists to remove.
 */
export function statusFaqs(
  faqs: Array<{ q: string; a: string }>,
  rows: readonly StatusRow[],
): Array<{ q: string; a: string }> {
  const seen = new Set(faqs.map((f) => normalizeQuestion(f.q)));
  const out = [...faqs];
  for (const r of rows) {
    const key = normalizeQuestion(r.q);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ q: r.q, a: r.a });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Data-bound FAQs (merged into each template's FAQ set + JSON-LD)     */
/* ------------------------------------------------------------------ */

export function breakdownFaqs(input: {
  name: string;
  isUS: boolean;
  breakdown: PlaceBreakdown;
}): { q: string; a: string }[] {
  const { name, isUS, breakdown } = input;
  const faqs: { q: string; a: string }[] = [];
  if (breakdown.corridors.length >= 2) {
    const [c1, c2, c3] = breakdown.corridors;
    const designated = breakdown.total - breakdown.unnamed;
    faqs.push({
      q: `Which roads in ${name} have the most cameras?`,
      a: `${c1.name} carries the most, with ${fmt(c1.count)} cameras listed under ${name} in the live index, followed by ${c2.name} (${fmt(c2.count)})${c3 ? ` and ${c3.name} (${fmt(c3.count)})` : ""}. ${fmt(designated)} of the ${fmt(breakdown.total)} listed cameras sit on a named road designation; the rest cover city streets, junctions and viewpoints whose names carry no route number.`,
    });
  }
  if (isUS && breakdown.freewayCount >= 10 && breakdown.corridors.length > 0) {
    const topFreeway = breakdown.corridors.find((c) => isFreewayDesignation(c.name));
    faqs.push({
      q: `Does ${name} have freeway cameras?`,
      a: `Yes — ${fmt(breakdown.freewayCount)} of the ${fmt(breakdown.total)} cameras listed under ${name} in the live index sit on interstate or US-highway designations${topFreeway ? `, led by ${topFreeway.name} with ${fmt(topFreeway.count)}` : ""}. They are the same public DOT feeds gathered on the live traffic cameras page.`,
    });
  }
  if (breakdown.quadrants && breakdown.total >= 40) {
    const q = breakdown.quadrants;
    faqs.push({
      q: `How are ${name}'s cameras spread across the city?`,
      a: `Of the ${fmt(breakdown.placed)} cameras listed under ${name} with published coordinates, ${fmt(q.northWest)} sit north-west of the grid's centre, ${fmt(q.northEast)} north-east, ${fmt(q.southWest)} south-west and ${fmt(q.southEast)} south-east — a split computed from the camera coordinates themselves, so it follows the real network rather than a marketing map.`,
    });
  }
  return faqs;
}

/** The "freeway cameras" FAQ every state page gains (US searchers use
 *  the word "freeway" where the templates said "highway"). The answer
 *  spends only the state's measured count and its largest areas. */
export function stateFreewayFaq(input: {
  stateName: string;
  count: number;
  areas: BreakdownRow[];
}): { q: string; a: string } {
  const top = input.areas[0];
  return {
    q: `Does ${input.stateName} have freeway cameras?`,
    a: `Yes — freeway and interstate feeds make up much of ${input.stateName}'s index of ${fmt(input.count)} live cameras, published by the state DOT and public networks${top ? `; the largest cluster is ${top.name} with ${fmt(top.count)} cameras` : ""}. Watch them on the live traffic cameras page, or browse by area in the table on this page.`,
  };
}

/** The corridor FAQ for a state page (C6, §4.2.2): the counterpart of
 *  the roads table, stated over the state's own coordinate-assigned
 *  set — the same framing the table note uses, so the two never
 *  disagree about what "in {State}" means. Null when fewer than two
 *  corridors parse from the state's camera names. Pure. */
export function stateCorridorFaq(s: {
  stateName: string;
  breakdown: PlaceBreakdown;
}): { q: string; a: string } | null {
  const [top, next] = s.breakdown.corridors;
  if (!top || !next) return null;
  const a =
    `${top.name} carries the most, with ${fmt(top.count)} cameras whose ` +
    `own coordinates place them in ${s.stateName}; ${next.name} follows ` +
    `with ${fmt(next.count)}. Counts are read from the cameras assigned ` +
    `to ${s.stateName} on this page, each counted once under the road its ` +
    `own name carries.`;
  return { q: `Which roads in ${s.stateName} have the most cameras?`, a };
}

/* ------------------------------------------------------------------ */
/* C5/C6 deferred follow-ups (§4.1.3–4.1.5 city, §4.2.3 state)         */
/* ------------------------------------------------------------------ */

/* Local haversine (km) — country-page-content keeps its own copy for
 * the same reason: these leaf computations shouldn't couple the place
 * modules to the ski/share modules that export theirs. */
function haversineKmLocal(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

/** §4.1.3 place facts for a city: the centre of its camera grid and
 *  how far the grid spans, computed from the same records the page's
 *  explorer serves. The centroid is the mean of the placed records,
 *  rounded to 4dp exactly as cityChunkStats rounds its centroid, so
 *  the two never disagree. The span is the wider of the bounding
 *  box's two diagonals — the same measure countryFacts calls spread.
 *
 *  Gates (null below them): fewer than 10 placed records says nothing
 *  stable about a grid, and a span under 2 km is a single cluster, not
 *  a spread. The third §4.1.3 element — a live local clock — is NOT
 *  computed here: the repo carries no static lat/lng→timezone lookup
 *  (the audit's stated derivation), and the weather snapshot's
 *  localtime is a fetch-time string for the query place, not a clock
 *  source. See the C5/C6 deferred REPORT. Pure — unit-tested. */
export interface CityPlaceFacts {
  centroid: { lat: number; lng: number };
  /** Widest span of the placed grid, km (rounded). */
  spanKm: number;
  /** Records carrying coordinates — the set the facts describe. */
  placed: number;
}

export function computePlaceFacts(
  records: readonly CountryCamera[],
): CityPlaceFacts | null {
  const placed = records.filter(
    (r): r is CountryCamera & { lat: number; lng: number } =>
      typeof r.lat === "number" && typeof r.lng === "number",
  );
  if (placed.length < 10) return null;
  let lat = 0;
  let lng = 0;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const r of placed) {
    lat += r.lat;
    lng += r.lng;
    if (r.lat < minLat) minLat = r.lat;
    if (r.lat > maxLat) maxLat = r.lat;
    if (r.lng < minLng) minLng = r.lng;
    if (r.lng > maxLng) maxLng = r.lng;
  }
  const spanKm = Math.round(
    Math.max(
      haversineKmLocal({ lat: minLat, lng: minLng }, { lat: maxLat, lng: maxLng }),
      haversineKmLocal({ lat: minLat, lng: maxLng }, { lat: maxLat, lng: minLng }),
    ),
  );
  if (spanKm < 2) return null;
  return {
    centroid: {
      lat: Math.round((lat / placed.length) * 10000) / 10000,
      lng: Math.round((lng / placed.length) * 10000) / 10000,
    },
    spanKm,
    placed: placed.length,
  };
}

/** §4.1.4 named viewpoints: notable cameras picked by the landmark
 *  words in their own names (airport / harbour / landmark signals),
 *  each with the operator the catalogue names for it. Selection is a
 *  partition by signal priority — a camera is claimed by the first
 *  signal its name matches — then name order inside a signal, so the
 *  result is deterministic and follows the record set, never a
 *  hand list. Cameras already in the page's featured list are
 *  excluded by name (the callout exists to surface names the featured
 *  grid didn't). Fewer than 3 matches → empty (the block doesn't
 *  render). Pure — unit-tested. */
export interface NamedViewpoint {
  name: string;
  source: string;
}

const VIEWPOINT_SIGNALS: RegExp[] = [
  /\bairport\b/i,
  /\bharbou?r\b|\bmarina\b|\bpier\b|\blighthouse\b/i,
  /\bcastle\b|\bcathedral\b|\bstadium\b|\barena\b/i,
  /\bbeach\b|\bskyline\b|\bold town\b|\bsquare\b|\bplaza\b/i,
  /\btower\b|\bbridge\b/i,
  /\bsummit\b|\bpeak\b|\bfalls\b|\bwaterfall\b|\bglacier\b|\bvolcano\b/i,
  /\bport\b|\bdowntown\b/i,
];

export function computeNamedViewpoints(
  records: readonly CountryCamera[],
  featuredNames: readonly string[],
  limit = 5,
): NamedViewpoint[] {
  const featured = new Set(featuredNames.map((n) => n.trim().toLowerCase()));
  const seen = new Set<string>();
  const picked: Array<{ name: string; source: string; signal: number }> = [];
  for (const r of records) {
    const name = (r.name ?? "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (featured.has(key) || seen.has(key)) continue;
    const signal = VIEWPOINT_SIGNALS.findIndex((re) => re.test(name));
    if (signal === -1) continue;
    seen.add(key);
    picked.push({ name, source: (r.source ?? "").trim(), signal });
  }
  picked.sort(
    (a, b) => a.signal - b.signal || a.name.localeCompare(b.name),
  );
  const out = picked.slice(0, Math.max(0, limit));
  return out.length >= 3 ? out.map(({ name, source }) => ({ name, source })) : [];
}

/** §4.1.5 neighbourhood/area split for a city, from district signals
 *  in the camera names themselves. Two signal families, tried in
 *  order:
 *
 *  - Wards: an explicit "X Ward" district name (the MLIT river feeds
 *    name Tokyo's wards in English). The word "Ward" is itself the
 *    district marker, so the spec gate alone applies.
 *  - Quadrants: a trailing NE/NW/SE/SW address component (Calgary's
 *    quadrant system, where the token closes the address). The same
 *    two letters also close ordinary street suffixes elsewhere
 *    (Seattle's "243rd St SE" is a cross street, not an area), so a
 *    quadrant split must ALSO be systematic: at least 40% of the
 *    city's records carry a trailing quadrant. Below that the token
 *    is street furniture, not an area system, and no split renders.
 *
 *  Spec gate (both families): at least 3 areas with at least 5
 *  cameras each. Rows are the qualifying areas in size order; `tail`
 *  counts every other record, mirroring the roads table's tail row.
 *  Pure — unit-tested. */
export interface CityAreaSplit {
  kind: "ward" | "quadrant";
  rows: BreakdownRow[];
  /** Records not in any shown row. */
  tail: number;
}

const AREA_MIN_AREAS = 3;
const AREA_MIN_PER_AREA = 5;
const QUADRANT_MIN_SHARE = 0.4;

const WARD_RE = /([A-Za-zÀ-Þ][\wÀ-ÿ'’.-]+) Ward\b/;
const QUADRANT_RE = /(?:^|[\s,(])(NE|NW|SE|SW)\)?\s*$/;

export const QUADRANT_LABELS: Record<string, string> = {
  NE: "North-east (NE)",
  NW: "North-west (NW)",
  SE: "South-east (SE)",
  SW: "South-west (SW)",
};

function areaRows(
  counts: Map<string, number>,
): { rows: BreakdownRow[]; shown: number } {
  const rows = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .filter((r) => r.count >= AREA_MIN_PER_AREA)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { rows, shown: rows.reduce((s, r) => s + r.count, 0) };
}

export function computeCityAreaSplit(
  records: readonly CountryCamera[],
): CityAreaSplit | null {
  const total = records.length;
  if (total === 0) return null;

  const wardCounts = new Map<string, number>();
  for (const r of records) {
    const m = (r.name ?? "").match(WARD_RE);
    if (m) {
      const label = `${m[1]} Ward`;
      wardCounts.set(label, (wardCounts.get(label) ?? 0) + 1);
    }
  }
  const wards = areaRows(wardCounts);
  if (wards.rows.length >= AREA_MIN_AREAS) {
    return { kind: "ward", rows: wards.rows, tail: total - wards.shown };
  }

  const quadCounts = new Map<string, number>();
  let tagged = 0;
  for (const r of records) {
    const m = (r.name ?? "").match(QUADRANT_RE);
    if (m) {
      tagged += 1;
      quadCounts.set(m[1], (quadCounts.get(m[1]) ?? 0) + 1);
    }
  }
  if (tagged / total >= QUADRANT_MIN_SHARE) {
    const quads = areaRows(
      new Map(
        [...quadCounts.entries()].map(([k, v]) => [QUADRANT_LABELS[k] ?? k, v]),
      ),
    );
    if (quads.rows.length >= AREA_MIN_AREAS) {
      return { kind: "quadrant", rows: quads.rows, tail: total - quads.shown };
    }
  }
  return null;
}

/** The §4.1.3–4.1.5 details for one city, from the very records its
 *  page explorer serves (recordsForDef caches per def, so this costs
 *  no second chunk read beside the breakdown's). Null when the
 *  country/city isn't in the served index. */
export interface CityPlaceDetails {
  facts: CityPlaceFacts | null;
  viewpoints: NamedViewpoint[];
  areaSplit: CityAreaSplit | null;
}

export async function loadCityPlaceDetails(
  countrySlug: string,
  cityName: string,
  featuredNames: readonly string[],
): Promise<CityPlaceDetails | null> {
  try {
    const def = resolveExploreDef({ country: countrySlug, city: cityName });
    if (!def) return null;
    const records = await recordsForDef(def);
    if (!records || records.length === 0) return null;
    return {
      facts: computePlaceFacts(records),
      viewpoints: computeNamedViewpoints(records, featuredNames),
      areaSplit: computeCityAreaSplit(records),
    };
  } catch {
    return null;
  }
}

/** §4.2.3 pass / border / ferry note for a state: cameras whose own
 *  names name the feature they watch, grouped by kind. A record is
 *  counted once, under the first group its name matches (the mix
 *  partition's rule). Name-evidence only:
 *
 *  - passes: the word "Pass" (word-bounded, so "overpass"/"bypass"
 *    and "Passaic" never match);
 *  - border: "Border" or "Customs" — state-line and international
 *    crossings alike, exactly as the feeds name them;
 *  - ferries: a ferry FACILITY in the name — a terminal / landing /
 *    holding / dock / queue / sign / approach, a WSF (Washington
 *    State Ferries) prefix, or "Ferry" as the head of a crossing
 *    ("Bolivar Ferry at 15th", "Canby Ferry North"). Bare "Ferry"
 *    is not enough: Atlanta's Johnson Ferry Rd and Paces Ferry Rd
 *    are roads named for long-gone landings, and a rule that listed
 *    them as ferry cameras would be inventing ferries.
 *
 *  Names are quoted verbatim (first 4 per group, record order);
 *  `total` is the group's full count. Pure — unit-tested. */
export interface PassBorderGroup {
  key: "passes" | "border" | "ferries";
  label: string;
  total: number;
  names: string[];
}

const PASS_BORDER_RULES: Array<{
  key: PassBorderGroup["key"];
  label: string;
  re: RegExp;
}> = [
  { key: "passes", label: "Mountain passes", re: /\bpass\b/i },
  { key: "border", label: "Border crossings", re: /\bborder\b|\bcustoms\b/i },
  {
    key: "ferries",
    label: "Ferries",
    re: /\bferry (terminal|landing|holding|dock|queue|sign|approach|slip)\b|^WSF\b|\bferry (at|@|north|south|east|west)\b/i,
  },
];

export function computePassBorderCameras(
  records: readonly CountryCamera[],
): PassBorderGroup[] {
  const groups = new Map<
    PassBorderGroup["key"],
    { label: string; total: number; names: string[]; seen: Set<string> }
  >();
  for (const r of records) {
    const name = (r.name ?? "").trim();
    if (!name) continue;
    const rule = PASS_BORDER_RULES.find((g) => g.re.test(name));
    if (!rule) continue;
    let g = groups.get(rule.key);
    if (!g) {
      g = { label: rule.label, total: 0, names: [], seen: new Set() };
      groups.set(rule.key, g);
    }
    g.total += 1;
    const key = name.toLowerCase();
    if (!g.seen.has(key) && g.names.length < 4) {
      g.seen.add(key);
      g.names.push(name);
    }
  }
  return PASS_BORDER_RULES.flatMap((rule) => {
    const g = groups.get(rule.key);
    return g ? [{ key: rule.key, label: g.label, total: g.total, names: g.names }] : [];
  });
}

/** One state's pass/border/ferry groups, over the same
 *  coordinate-assigned record set the state template's C6 tables use
 *  (usStateRecords). Empty when the state has no assigned records or
 *  no name evidence. */
export async function loadStatePassBorder(
  stateSlug: string,
): Promise<PassBorderGroup[]> {
  const records = (await usStateRecords()).get(stateSlug);
  if (!records || records.length === 0) return [];
  return computePassBorderCameras(records);
}
