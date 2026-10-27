/**
 * Seasonal event calendar — the date source for the evergreen annual
 * event pages (/new-years-eve-times-square, /mardi-gras-new-orleans,
 * /cherry-blossoms-washington-dc, /oktoberfest-munich and
 * /fall-foliage-cameras).
 *
 * The dated event hubs (/macys-thanksgiving-parade-2026, …) hard-code
 * one edition in their copy and retire with it. These five events
 * recur every year, so their pages hold no dates in prose at all:
 * every date they print comes from the tables here, each edition an
 * explicit row (year + ISO start/end). A page renders the next
 * edition whose end date has not passed; keeping a page correct for
 * a new year means adding a row to its table — never editing copy.
 *
 * Dates were checked against the organisers' published schedules on
 * 2026-10-27 (sources noted per event). Rows beyond the next edition
 * are the organisers' scheduled dates where published, or dates fixed
 * by rule (New Year's Eve; Mardi Gras, computed from Easter by the
 * computus and cross-checked against published calendars) — the
 * per-event note says which.
 */

export interface SeasonalEdition {
  year: number;
  /** ISO date (yyyy-mm-dd) the edition starts. */
  start: string;
  /** ISO date (yyyy-mm-dd) the edition ends, inclusive. */
  end: string;
}

export interface SeasonalEvent {
  id: string;
  /** Editions, ascending by start date. */
  editions: SeasonalEdition[];
  /** How the dates in the table are fixed — printed nowhere, kept
   *  here so the next editor knows what a row rests on. */
  basis: string;
}

/* ------------------------------------------------------------------ */
/* Date helpers (pure; all arithmetic on ISO date strings, UTC)        */
/* ------------------------------------------------------------------ */

const DAY_MS = 86_400_000;

function parseIso(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
}

/** yyyy-mm-dd for a Date, in UTC. */
export function isoDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** "Thursday, December 31, 2026" — the weekday is computed from the
 *  date, never written by hand, so it cannot go stale or wrong. */
export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(parseIso(iso)));
}

/** "Dec 31, 2026" */
export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(parseIso(iso)));
}

/** "Mar 20 – Apr 11, 2027" (year stated once, on the end date);
 *  a single-day edition formats as "Feb 9, 2027". */
export function formatRange(e: SeasonalEdition): string {
  if (e.start === e.end) return formatDateShort(e.start);
  const start = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(parseIso(e.start)));
  return `${start} – ${formatDateShort(e.end)}`;
}

/** Whole days from `now` until an ISO date (negative once it passes). */
export function daysUntil(iso: string, now: Date): number {
  const today = parseIso(isoDay(now));
  return Math.round((parseIso(iso) - today) / DAY_MS);
}

/**
 * The edition a page should talk about: the first whose end date has
 * not passed (so an event in progress still counts). Null when the
 * table is exhausted — pages must then fall back to undated season
 * framing rather than print a past edition as upcoming.
 */
export function nextEdition(
  event: SeasonalEvent,
  now: Date = new Date(),
): SeasonalEdition | null {
  const today = isoDay(now);
  return event.editions.find((e) => e.end >= today) ?? null;
}

/** True while the edition is actually running (start ≤ today ≤ end). */
export function editionIsLive(e: SeasonalEdition, now: Date = new Date()): boolean {
  const today = isoDay(now);
  return e.start <= today && today <= e.end;
}

/* ------------------------------------------------------------------ */
/* The calendar                                                        */
/* ------------------------------------------------------------------ */

/** Times Square, New York — the ball drop is a fixed date: midnight
 *  at the turn of December 31, every year. */
export const NEW_YEARS_EVE: SeasonalEvent = {
  id: "new-years-eve-times-square",
  basis:
    "Fixed by rule: New Year's Eve is December 31. The Times Square ball drop runs the evening of Dec 31 to midnight (Times Square Alliance).",
  editions: [
    { year: 2026, start: "2026-12-31", end: "2026-12-31" },
    { year: 2027, start: "2027-12-31", end: "2027-12-31" },
    { year: 2028, start: "2028-12-31", end: "2028-12-31" },
  ],
};

/**
 * New Orleans Carnival. Carnival season opens on Twelfth Night
 * (January 6) every year; the table dates are Fat Tuesday itself —
 * the day before Ash Wednesday, 47 days before Easter Sunday —
 * computed by the computus and cross-checked against published
 * calendars (2027: neworleans.com and the posted parade schedules;
 * Easter 2027 falls on March 28, making this one of the shortest
 * Carnival seasons possible).
 */
export const MARDI_GRAS: SeasonalEvent & { seasonStart: string } = {
  id: "mardi-gras-new-orleans",
  basis:
    "Fat Tuesday = the day before Ash Wednesday (Easter − 47 days). 2026-02-17, 2027-02-09 and 2028-02-29 all check against published calendars; the season start, Twelfth Night, is fixed at January 6.",
  seasonStart: "01-06",
  editions: [
    { year: 2026, start: "2026-02-17", end: "2026-02-17" },
    { year: 2027, start: "2027-02-09", end: "2027-02-09" },
    { year: 2028, start: "2028-02-29", end: "2028-02-29" },
  ],
};

/**
 * Washington DC's National Cherry Blossom Festival. The festival's
 * own site publishes the dates (“Save the date: March 20–April 11,
 * 2027” — checked 2026-10-27); editions beyond the announced one are
 * deliberately absent — the page falls back to the season framing in
 * FESTIVAL_TYPICAL until a new row is announced and added.
 */
export const CHERRY_BLOSSOM_FESTIVAL: SeasonalEvent = {
  id: "cherry-blossoms-washington-dc",
  basis:
    "Announced dates only: the National Cherry Blossom Festival published March 20 – April 11, 2027 on nationalcherryblossomfestival.org.",
  editions: [{ year: 2027, start: "2027-03-20", end: "2027-04-11" }],
};

/** The festival's typical season, for the years the table has no
 *  announced row yet. Peak bloom is the trees' decision, not the
 *  festival's: the National Park Service has recorded it since 1921 —
 *  April 3 on average across the full record, March 30 on average
 *  since 2000 — and publishes its forecast for the year each March. */
export const CHERRY_BLOSSOM_TYPICAL = {
  seasonWindow: "late March to mid-April",
  peakBloomNote:
    "Peak bloom has averaged April 3 since 1921 and March 30 since 2000 (National Park Service records); the Park Service announces its forecast for the year in early March.",
};

/**
 * Munich's Oktoberfest, on the Theresienwiese. By rule it opens on
 * the Saturday after September 15 and ends on the first Sunday of
 * October, extended to October 3 (German Unity Day) when that Sunday
 * falls on the 1st or 2nd. The 2027 and 2028 rows match the dates
 * published by the City of Munich / oktoberfest.de (checked
 * 2026-10-27): Sep 18 – Oct 3, 2027 and Sep 16 – Oct 3, 2028.
 */
export const OKTOBERFEST: SeasonalEvent = {
  id: "oktoberfest-munich",
  basis:
    "Published dates (City of Munich / oktoberfest.de), consistent with the festival's Saturday-after-Sep-15 → first-Sunday-of-October rule and the Oct 3 extension.",
  editions: [
    { year: 2026, start: "2026-09-19", end: "2026-10-04" },
    { year: 2027, start: "2027-09-18", end: "2027-10-03" },
    { year: 2028, start: "2028-09-16", end: "2028-10-03" },
  ],
};

/* ------------------------------------------------------------------ */
/* Fall foliage — a rolling season, not a date                         */
/* ------------------------------------------------------------------ */

export interface FoliageRegion {
  key: string;
  /** Section heading. */
  name: string;
  /** The anchor the camera wall is selected around. */
  anchor: { lat: number; lng: number };
  radiusKm: number;
  /** Typical peak window — a range in most years, labelled as such
   *  on the page; the real peak moves with weather and elevation. */
  peakWindow: string;
  blurb: string;
}

/**
 * The foliage circuit, north-and-high country first. Radii are the
 * honest shape of the catalogue (resort- and valley-town cameras are
 * sparse), and each wall states its own radius on the page.
 */
export const FOLIAGE_REGIONS: FoliageRegion[] = [
  {
    key: "aspen",
    name: "Aspen & the Colorado high country",
    anchor: { lat: 39.1911, lng: -106.8175 },
    radiusKm: 40,
    peakWindow: "mid-September to early October",
    blurb:
      "Colorado goes first: the aspen stands above Aspen and along the high passes turn gold while most of the country is still green, and the resort and highway cameras of the Elk Range catch the whole short season.",
  },
  {
    key: "stowe",
    name: "Stowe & northern Vermont",
    anchor: { lat: 44.4654, lng: -72.6874 },
    radiusKm: 40,
    peakWindow: "late September to mid-October",
    blurb:
      "Northern Vermont is where New England's colour starts — the maples around Stowe and Smugglers' Notch turn first, and the Green Mountain valleys follow over the following fortnight.",
  },
  {
    key: "white-mountains",
    name: "The White Mountains, New Hampshire",
    anchor: { lat: 44.0533, lng: -71.1284 },
    radiusKm: 40,
    peakWindow: "late September to mid-October",
    blurb:
      "The Kancamagus country: colour rolls down from the Presidential Range into the North Conway valley. The directory's wall here is small — the White Mountains keep their cameras sparse — and it is stated as it is.",
  },
  {
    key: "woodstock",
    name: "Woodstock & central Vermont",
    anchor: { lat: 43.6246, lng: -72.5185 },
    radiusKm: 30,
    peakWindow: "early to mid-October",
    blurb:
      "Central Vermont's farm valleys and covered-bridge country, a few days behind the north — the classic second act of the Vermont season.",
  },
  {
    key: "acadia",
    name: "Acadia & the Maine coast",
    anchor: { lat: 44.3876, lng: -68.2039 },
    radiusKm: 40,
    peakWindow: "early to mid-October",
    blurb:
      "Colour against granite and salt water: Acadia's maples and birches over Frenchman Bay, with the harbour town of Bar Harbor in the foreground.",
  },
  {
    key: "shenandoah",
    name: "Shenandoah & Skyline Drive, Virginia",
    anchor: { lat: 38.9186, lng: -78.1944 },
    radiusKm: 40,
    peakWindow: "mid-to-late October",
    blurb:
      "The Blue Ridge's northern end: Skyline Drive runs the crest above Front Royal, and the valley and gap cameras watch the colour climb down from the ridgeline through October.",
  },
  {
    key: "asheville",
    name: "Asheville & the Blue Ridge, North Carolina",
    anchor: { lat: 35.5946, lng: -82.5545 },
    radiusKm: 30,
    peakWindow: "mid-October to early November, highest ground first",
    blurb:
      "The deepest wall on this page. The Blue Ridge around Asheville stacks a mile of elevation into one view, so the season here is a slow wave — the high balds turn in mid-October and the valley floor is still colouring into November.",
  },
  {
    key: "gatlinburg",
    name: "Gatlinburg & the Smokies, Tennessee",
    anchor: { lat: 35.7143, lng: -83.5102 },
    radiusKm: 40,
    peakWindow: "mid-October at the summits to early November in the valleys",
    blurb:
      "The Great Smoky Mountains run the longest foliage season in the East — a month of colour descending from the spruce-fir summits to the Gatlinburg valley floor.",
  },
];
