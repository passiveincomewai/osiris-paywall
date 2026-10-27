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
import { recordsForDef, resolveExploreDef } from "@/lib/explore-data";
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
 * numbers ("Unit A3", "Bay M4") don't parse as roads. */
const CORRIDOR_PATTERNS: CorridorPattern[] = [
  { re: /\bIH[ -]?(\d{1,3})([A-Z])?(?![0-9])/, format: (m) => `I-${m[1]}${m[2] ?? ""}` },
  { re: /\bI-(\d{1,3})([A-Z])?(?![0-9])/, format: (m) => `I-${m[1]}${m[2] ?? ""}` },
  { re: /\bUS[ -]?(\d{1,3})(?![0-9])/, format: (m) => `US ${m[1]}` },
  { re: /\b(SR|SH|FM|RM)[ -]?(\d{1,4})(?![0-9])/, format: (m) => `${m[1]} ${m[2]}` },
  { re: /\bLP[ -]?(\d{1,4})(?![0-9])/, format: (m) => `Loop ${m[1]}` },
  { re: /\bA(\d{1,4})(?=\s+[A-Z])/, format: (m) => `A${m[1]}` },
  { re: /\bM(\d{1,2})(?=\s+[A-Z])/, format: (m) => `M${m[1]}` },
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
