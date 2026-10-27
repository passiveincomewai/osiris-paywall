/**
 * Data-bound answer blocks for the country, city and US-state templates.
 *
 * Implements ROLLOUT-SPEC.md (voice-answers branch) against the templates
 * as they exist on master: instead of emitting entries into the canonical
 * dataset, each host page computes its "Questions people ask" entries at
 * render time from ITS OWN data file — the one source per surface rule
 * (§2.2). Country answers read the camera-countries.json record the
 * country template renders; city answers read the city-pages.json record;
 * state answers read the us-states record behind the state template.
 *
 * Rules enforced here and in place-answers.test.ts:
 *  - question phrased as people speak it; shortAnswer ≤ 30 words;
 *  - no superlatives, no invented figures, no facts outside the inputs;
 *  - category slots (coastal / ski) fire ONLY for the reviewed allow-lists
 *    below (§2.5: the lexicon-fired list was reviewed by hand on
 *    2026-10-22 against the served catalogue and the reviewed result is
 *    what ships — no silent heuristic);
 *  - merge rule §3: template FAQs first, generated entries appended in
 *    slot order, duplicates by normalized question dropped, cap 20, and
 *    the visible block renders exactly the surviving entries so visible
 *    text always equals FAQPage schema text.
 */

import {
  getVoiceQuestion,
  voiceAnswerText,
  type VoiceQuestion,
} from "./voice-questions";
import cityPages from "@/data/city-pages.json";

export interface CountryAnswerInput {
  slug: string;
  name: string;
  count: number;
  topCities: Array<{ name: string; count: number }>;
  cityCount: number;
  samples: Array<{ id: string; name: string; city: string }>;
}

export interface CityAnswerInput {
  slug: string;
  name: string;
  country: string;
  countrySlug: string;
  count: number;
  countryTotal: number;
  sources: Array<{ name: string; count: number }>;
  sourceCount: number;
  stills: number;
  streams: number;
  samples: Array<{ id: string; name: string }>;
}

export interface StateAnswerInput {
  slug: string;
  name: string;
  count: number;
  areas: Array<{ name: string; count: number }>;
  samples: Array<{ name: string }>;
}

const fmt = (n: number) => n.toLocaleString("en-US");

/** Keep a catalogue name short enough to sit inside a ≤30-word answer. */
function shortName(name: string, words = 5): string {
  const parts = name.trim().split(/\s+/);
  return parts.length <= words ? name.trim() : parts.slice(0, words).join(" ");
}

/* §2.5 reviewed allow-lists (2026-10-22). The coastal/ski lexicons were
   run over every country's topCities + sample names; each fired country
   was checked by hand. False positives rejected at review: canada and
   belize (coastal — murky/thin sample evidence), germany (coastal —
   "Bayreuth" substring), united-kingdom (coastal — one road name),
   panama (coastal — research island, not a coast watch), and for ski:
   spain, norway, australia, new-zealand, macau, bulgaria, maldives,
   czechia, united-kingdom (substring accidents like "Bridge"/"passagem"
   or beach resorts). Ski additions on region evidence per the spec:
   austria (Alps — its network is dominated by alpine resort feeds),
   japan (Hokkaido — Sapporo is its #2 cluster), united-states (Rockies). */
export const COASTAL_ALLOWLIST = new Set([
  "hong-kong", "australia", "new-zealand", "netherlands", "malta",
  "brazil", "bulgaria", "romania", "croatia", "greece", "mexico",
  "us-virgin-islands", "peru", "israel", "portugal", "china",
  "maldives", "south-africa", "costa-rica", "ecuador", "ukraine",
  "dominican-republic", "kenya", "tanzania", "sint-maarten", "bermuda",
  "grenada", "honduras", "oman", "sri-lanka", "christmas-island",
  "venezuela", "bonaire",
]);

export const SKI_ALLOWLIST = new Set([
  "austria", "japan", "kazakhstan", "kyrgyzstan", "slovenia", "sweden",
  "united-states",
]);

/** Country slugs with a dedicated traffic-cameras page (spec §4 slot 3). */
const TRAFFIC_PAGE_COUNTRIES = new Set([
  "japan", "canada", "germany", "norway", "spain", "sweden", "south-korea",
]);

/** Core dataset entries that already answer a country's count question. */
const COUNTRY_COUNT_REUSE: Record<string, string> = {
  japan: "how-many-cameras-in-japan",
  "united-states": "how-many-cameras-in-the-us",
  canada: "how-many-cameras-in-canada",
  "united-kingdom": "how-many-cameras-in-the-uk",
};

/* The universe of /city-webcams/<slug> pages the [city] route serves:
   the generated tier (city-pages.json — the same records cityAnswers
   reads) plus the curated tier, the hand-written CITIES configs in
   src/app/city-webcams/[city]/page.tsx. CITY_SLUGS used to be built
   from the generated JSON only (flagged by Top-50 Batch 3), so a
   country whose cluster is a curated city — London for the UK,
   Ottawa for Canada — could never be linked from the slot-2 answer
   below. The curated entries are pinned here with the name and
   country each config carries; place-answers.test.ts checks this
   derivation against the route's own generateStaticParams(), and
   src/data/city-pages.test.ts pins the invariant that generated
   slugs never shadow a curated one. (The /city-webcams/new-york-city
   flagship is a separate static route, not part of the [city] route's
   universe, and no country index names it as an area — excluded.) */
interface CityPageRef {
  slug: string;
  name: string;
  countrySlug: string;
}

const CURATED_CITY_PAGES: CityPageRef[] = [
  { slug: "london", name: "London", countrySlug: "united-kingdom" },
  { slug: "ottawa", name: "Ottawa", countrySlug: "canada" },
  { slug: "toronto", name: "Toronto", countrySlug: "canada" },
  { slug: "madrid", name: "Madrid", countrySlug: "spain" },
  { slug: "houston", name: "Houston", countrySlug: "united-states" },
  { slug: "dallas", name: "Dallas", countrySlug: "united-states" },
  { slug: "tokyo", name: "Tokyo", countrySlug: "japan" },
  { slug: "sydney", name: "Sydney", countrySlug: "australia" },
  { slug: "auckland", name: "Auckland", countrySlug: "new-zealand" },
  { slug: "fort-worth", name: "Fort Worth", countrySlug: "united-states" },
];

const GENERATED_CITY_PAGES: CityPageRef[] = (
  cityPages as {
    cities: Array<{ slug: string; name: string; countrySlug: string }>;
  }
).cities.map((c) => ({ slug: c.slug, name: c.name, countrySlug: c.countrySlug }));

export const CITY_PAGE_SLUGS: ReadonlySet<string> = new Set([
  ...GENERATED_CITY_PAGES.map((c) => c.slug),
  ...CURATED_CITY_PAGES.map((c) => c.slug),
]);

const CITY_PAGES_BY_COUNTRY = new Map<string, CityPageRef[]>();
for (const ref of [...GENERATED_CITY_PAGES, ...CURATED_CITY_PAGES]) {
  const list = CITY_PAGES_BY_COUNTRY.get(ref.countrySlug) ?? [];
  list.push(ref);
  CITY_PAGES_BY_COUNTRY.set(ref.countrySlug, list);
}

function citySlugFor(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * The slug of the city page serving one of a country's named areas, or
 * undefined when the area has no city page. Resolution is scoped to
 * the country — San Antonio, Chile must not land on the Texas page —
 * and tries the record's own name first (the generated data carries
 * the true slug for names naive slugification mangles, e.g. Montréal
 * → montreal, A Coruña → a-coruna), then the slugified name.
 */
export function cityPageSlugForArea(
  countrySlug: string,
  areaName: string,
): string | undefined {
  const refs = CITY_PAGES_BY_COUNTRY.get(countrySlug);
  if (!refs) return undefined;
  const wanted = areaName.trim().toLowerCase();
  const byName = refs.find((r) => r.name.toLowerCase() === wanted);
  if (byName) return byName.slug;
  const slug = citySlugFor(areaName);
  return refs.find((r) => r.slug === slug)?.slug;
}

/** The /city-webcams href for a country area, or undefined. */
export function cityPageHrefForArea(
  countrySlug: string,
  areaName: string,
): string | undefined {
  const slug = cityPageSlugForArea(countrySlug, areaName);
  return slug ? `/city-webcams/${slug}` : undefined;
}

export function countryAnswers(c: CountryAnswerInput): VoiceQuestion[] {
  const out: VoiceQuestion[] = [];
  const page = `/cameras/countries/${c.slug}`;
  const top = c.topCities ?? [];

  // Slot 1 — count (reuse the curated core entry where one exists, §2.3).
  const reuseId = COUNTRY_COUNT_REUSE[c.slug];
  if (reuseId) {
    out.push(getVoiceQuestion(reuseId));
  } else {
    out.push({
      id: `country-${c.slug}-count`,
      category: "watch-cameras-by-place",
      question: `How many live cameras are there in ${c.name}?`,
      shortAnswer:
        top.length > 0
          ? `WorldEye lists ${fmt(c.count)} live cameras in ${c.name}. ${top[0].name} is the largest cluster with ${fmt(top[0].count)}.`
          : `WorldEye lists ${fmt(c.count)} live cameras in ${c.name}, all plotted on the live globe.`,
      longAnswer:
        top.length >= 3
          ? `${top[1].name} (${fmt(top[1].count)}) and ${top[2].name} (${fmt(top[2].count)}) are the next-largest clusters. The grid below lists every area.`
          : `The cameras span ${fmt(c.cityCount)} named areas, all browsable in the grid below.`,
      href: page,
      relatedSlugs: [c.slug],
    });
  }

  // Slot 2 — top places. The deep link goes to the largest cluster
  // that actually has a city page: a country's first listed area is
  // not always a city (Canada's index leads with the province
  // "British Columbia"), and the largest cluster may be a curated
  // page (London). Areas are tried in the index's own order; when
  // none resolves, the entry links back to the country page itself.
  if (top.length >= 2) {
    const linkedCitySlug = top
      .map((t) => cityPageSlugForArea(c.slug, t.name))
      .find((s) => s !== undefined);
    out.push({
      id: `country-${c.slug}-top-places`,
      category: "watch-cameras-by-place",
      question: `Which cities in ${c.name} have the most live cameras?`,
      shortAnswer: `${top[0].name} leads ${c.name} with ${fmt(top[0].count)} cameras, followed by ${top[1].name} with ${fmt(top[1].count)}.`,
      longAnswer:
        top.length >= 3
          ? `${top[2].name} (${fmt(top[2].count)}) is next. City pages break down the biggest clusters feed by feed.`
          : `WorldEye lists cameras across ${fmt(c.cityCount)} named areas in ${c.name}.`,
      href: linkedCitySlug ? `/city-webcams/${linkedCitySlug}` : page,
      relatedSlugs: [c.slug],
    });
  }

  // Slot 3 — traffic page, else 3b what the cameras show (from samples).
  if (TRAFFIC_PAGE_COUNTRIES.has(c.slug) || c.slug === "united-states") {
    out.push({
      id: `country-${c.slug}-traffic`,
      category: "traffic-and-roads",
      question: `Can I check traffic cameras in ${c.name}?`,
      shortAnswer: `Yes. WorldEye gathers ${c.name}'s highway and road-agency cameras on one traffic page, and the same feeds appear in the grid below.`,
      longAnswer:
        "Check congestion, weather and road work on the route before you drive — the cameras show the road as it is now.",
      href: c.slug === "united-states" ? "/live-traffic-cameras" : `/${c.slug}-traffic-cameras`,
      relatedSlugs: [c.slug],
    });
  } else if (c.samples && c.samples.length >= 2) {
    const cities = [...new Set(c.samples.map((s) => s.city).filter(Boolean))];
    if (cities.length >= 2) {
      out.push({
        id: `country-${c.slug}-what-they-show`,
        category: "watch-cameras-by-place",
        question: `What do ${c.name}'s cameras show?`,
        shortAnswer: `Listed feeds include cameras in ${cities[0]} and ${cities[1]}, published openly by the agencies, resorts and cities that operate them.`,
        longAnswer:
          "The explorer below lists every area the catalogue holds for this country, biggest first.",
        href: page,
        relatedSlugs: [c.slug],
      });
    }
  }

  // Slot 4 — category questions, reviewed allow-lists only (§2.5).
  if (COASTAL_ALLOWLIST.has(c.slug)) {
    out.push({
      id: `country-${c.slug}-coast`,
      category: "watch-cameras-by-place",
      question: `Can I watch the coast in ${c.name} on camera?`,
      shortAnswer: `Yes — ${c.name}'s cameras include coastal feeds, and WorldEye's beach page gathers shoreline cameras from every covered country in one place.`,
      longAnswer:
        "Shoreline feeds are the quickest check of surf, weather and crowds before heading out.",
      href: "/beach-webcams",
      relatedSlugs: [c.slug],
    });
  }
  if (SKI_ALLOWLIST.has(c.slug)) {
    out.push({
      id: `country-${c.slug}-mountains`,
      category: "watch-cameras-by-place",
      question: `Can I check mountain conditions in ${c.name}?`,
      shortAnswer: `Yes. ${c.name}'s camera network reaches its mountain and ski areas, and WorldEye's ski webcams page gathers resort feeds in one place.`,
      longAnswer:
        "Check fresh snow, visibility and the drive up before you go.",
      href: "/ski-webcams",
      relatedSlugs: [c.slug],
    });
  }

  // Slot 5 — free (expected to dedupe against the template FAQ on most
  // pages; mergePlaceFaqs drops the collision, per spec §4).
  out.push({
    id: `country-${c.slug}-free`,
    category: "watch-cameras-by-place",
    question: `Are ${c.name}'s cameras free to watch?`,
    shortAnswer: `Yes. Every camera in ${c.name} is free to watch in your browser with no account; the free plan includes five camera opens on the globe.`,
    longAnswer:
      "Paid plans remove the open limit and add the Pro layers. The directory pages themselves are always free to browse.",
    href: page,
    relatedSlugs: [c.slug],
  });

  return out;
}

export function cityAnswers(g: CityAnswerInput): VoiceQuestion[] {
  const out: VoiceQuestion[] = [];
  const page = `/city-webcams/${g.slug}`;
  const peers = (cityPages as { cities: CityAnswerInput[] }).cities.filter(
    (x) => x.countrySlug === g.countrySlug,
  );
  const isTopInCountry = peers.length > 0 && peers.every((x) => x.count <= g.count);

  // Slot 1 — count, with the page's feeding sources spent in the long
  // answer (spec §5: slot 2 merges here, as in its Seattle example).
  out.push({
    id: `city-${g.slug}-count`,
    category: "watch-cameras-by-place",
    question: `How many live cameras are there in ${g.name}?`,
    shortAnswer: isTopInCountry
      ? `WorldEye lists ${fmt(g.count)} live cameras in ${g.name} — the most of any listed city in ${g.country}.`
      : `WorldEye lists ${fmt(g.count)} live cameras in ${g.name}, from ${g.sourceCount} published ${g.sourceCount === 1 ? "source" : "sources"}.`,
    longAnswer:
      g.sources.length >= 2
        ? `The largest source is listed as "${g.sources[0].name}" (${fmt(g.sources[0].count)} cameras), then "${g.sources[1].name}" (${fmt(g.sources[1].count)}).`
        : g.sources.length === 1
          ? `The feeds are listed under the source "${g.sources[0].name}".`
          : `The full grid below lists every feed.`,
    href: page,
    relatedSlugs: [g.slug],
  });

  // Slot 3 — what the cameras show, from real sample names only.
  if (g.samples && g.samples.length >= 2) {
    out.push({
      id: `city-${g.slug}-what-they-show`,
      category: "watch-cameras-by-place",
      question: `What do ${g.name}'s cameras show?`,
      shortAnswer: `Listed feeds include ${shortName(g.samples[0].name, 6)} and ${shortName(g.samples[1].name, 6)}, published by their operators for road and area checks.`,
      longAnswer:
        "Every sample on this page is a real feed from the served catalogue, not a stock image.",
      href: page,
      relatedSlugs: [g.slug],
    });
  }

  // Slot 4 — video or stills, from the file's stills/streams split.
  if (g.stills > 0 && g.streams === 0) {
    out.push({
      id: `city-${g.slug}-kind`,
      category: "watch-cameras-by-place",
      question: `Are ${g.name}'s cameras video or still images?`,
      shortAnswer: `Still images that refresh: all ${fmt(g.stills)} listed feeds in ${g.name} are snapshot cameras, updated by their agencies on a cycle rather than streamed.`,
      longAnswer:
        "For a pre-drive check a fresh still answers the same question as video: whether the lanes are moving and what the weather is doing.",
      href: page,
      relatedSlugs: [g.slug],
    });
  } else if (g.streams > 0 && g.stills === 0) {
    out.push({
      id: `city-${g.slug}-kind`,
      category: "watch-cameras-by-place",
      question: `Are ${g.name}'s cameras video or still images?`,
      shortAnswer: `Live video: all ${fmt(g.streams)} listed feeds in ${g.name} stream as video rather than refreshing snapshots.`,
      longAnswer:
        "Open any feed and it plays in the browser — no app or plugin needed.",
      href: page,
      relatedSlugs: [g.slug],
    });
  } else if (g.stills > 0 && g.streams > 0) {
    out.push({
      id: `city-${g.slug}-kind`,
      category: "watch-cameras-by-place",
      question: `Are ${g.name}'s cameras video or still images?`,
      shortAnswer: `${g.name} mixes ${fmt(g.streams)} live video streams with ${fmt(g.stills)} snapshot cameras that refresh on a cycle.`,
      longAnswer:
        "Each feed is labelled by kind on its card, so you know before you open it.",
      href: page,
      relatedSlugs: [g.slug],
    });
  }

  // Slot 5 — use: traffic form when the sources/samples are road-based,
  // else the free/access form.
  const roadBased =
    g.sources.some((s) => /dot|transport|highway|traffic|511/i.test(s.name)) ||
    g.samples.some((s) => /\b(I-\d+|SR \d+|US \d+|highway|freeway|interchange)\b/i.test(s.name));
  if (roadBased) {
    out.push({
      id: `city-${g.slug}-traffic-use`,
      category: "traffic-and-roads",
      question: `Can I check traffic before driving in ${g.name}?`,
      shortAnswer: `Yes. Open ${g.name}'s cameras on the roads you are about to use and check the lanes, weather and work zones before leaving.`,
      longAnswer:
        "The same feeds appear on the live traffic page, grouped by state and country networks.",
      href: "/live-traffic-cameras",
      relatedSlugs: [g.slug],
    });
  } else {
    out.push({
      id: `city-${g.slug}-free`,
      category: "watch-cameras-by-place",
      question: `Are ${g.name}'s cameras free to watch?`,
      shortAnswer: `Yes. Every camera in ${g.name} is free to watch in your browser with no account; the free plan includes five camera opens on the globe.`,
      longAnswer:
        "Paid plans remove the open limit and add the Pro layers. The directory pages themselves are always free to browse.",
      href: page,
      relatedSlugs: [g.slug],
    });
  }

  return out;
}

export function stateAnswers(s: StateAnswerInput): VoiceQuestion[] {
  const out: VoiceQuestion[] = [];
  const page = `/us-traffic-cameras/${s.slug}`;
  const areas = s.areas ?? [];

  // Slot 1 — count (the state page's own count, per §2.2).
  out.push({
    id: `state-${s.slug}-count`,
    category: "traffic-and-roads",
    question: `How many traffic cameras are there in ${s.name}?`,
    shortAnswer: `WorldEye lists ${fmt(s.count)} live traffic cameras in ${s.name}, plotted on the state page and the live globe.`,
    longAnswer:
      "Every feed is free to watch, and the grid below lists the cameras area by area.",
    href: page,
    relatedSlugs: [s.slug],
  });

  // Slot 2 — coverage, from the page's own area table.
  if (areas.length >= 3) {
    out.push({
      id: `state-${s.slug}-coverage`,
      category: "traffic-and-roads",
      question: `Which parts of ${s.name} have traffic cameras?`,
      shortAnswer: `${areas[0].name} leads with ${fmt(areas[0].count)} cameras, then ${areas[1].name} with ${fmt(areas[1].count)} and ${areas[2].name} with ${fmt(areas[2].count)}.`,
      longAnswer:
        "Coverage follows the state's highway network; the area table on this page lists every cluster.",
      href: page,
      relatedSlugs: [s.slug],
    });
  }

  // Slot 3 — corridors, from real sample names only.
  if (s.samples && s.samples.length >= 2) {
    out.push({
      id: `state-${s.slug}-corridors`,
      category: "traffic-and-roads",
      question: `Can I check road conditions before driving in ${s.name}?`,
      shortAnswer: `Yes — samples on this page include ${shortName(s.samples[0].name, 6)} and ${shortName(s.samples[1].name, 6)}; open the corridor you are about to drive.`,
      longAnswer:
        "Live feeds show congestion, weather and road work as they are, before you leave.",
      href: page,
      relatedSlugs: [s.slug],
    });
  }

  // Slot 4 (weather use) is deliberately not generated: each state's
  // hazard claims live in its editorial page copy, not in the data file,
  // and §2.2 forbids asserting facts that are not in the inputs.

  // Slot 5 — free (dedupes against the template FAQ on most states).
  out.push({
    id: `state-${s.slug}-free`,
    category: "traffic-and-roads",
    question: `Are ${s.name} traffic cameras free to watch?`,
    shortAnswer: `Yes. Every ${s.name} feed opens free on the map — no account and no download needed to watch.`,
    longAnswer: "Check before you drive, never while driving.",
    href: page,
    relatedSlugs: [s.slug],
  });

  return out;
}

/** Spec §3 normalization for question dedupe. */
export function normalizeQuestion(q: string): string {
  return q.toLowerCase().replace(/\s+/g, " ").replace(/[?.!]+$/, "").trim();
}

/**
 * Spec §3 merge: template FAQs first (order preserved), generated entries
 * appended in slot order, collisions by normalized question dropped, cap
 * 20. Returns the merged FAQ list for the page's single FAQPage plus the
 * surviving entries — the visible block renders exactly the survivors,
 * so visible text always equals schema text.
 */
export function mergePlaceFaqs(
  templateFaqs: Array<{ q: string; a: string }>,
  entries: VoiceQuestion[],
  cap = 20,
): { merged: Array<{ q: string; a: string }>; surviving: VoiceQuestion[] } {
  const seen = new Set(templateFaqs.map((f) => normalizeQuestion(f.q)));
  const merged = [...templateFaqs];
  const surviving: VoiceQuestion[] = [];
  for (const e of entries) {
    if (merged.length >= cap) break;
    const key = normalizeQuestion(e.question);
    if (seen.has(key)) continue;
    seen.add(key);
    surviving.push(e);
    merged.push({ q: e.question, a: voiceAnswerText(e) });
  }
  return { merged, surviving };
}
