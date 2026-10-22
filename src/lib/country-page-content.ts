/**
 * OSIRIS — country page depth: everything a /cameras/countries/[country]
 * page can honestly say beyond its grid, derived from the generated
 * catalogue data itself (camera-countries.json + the per-country chunks
 * in src/data/countries). No hand-written colour, no guessed facts: the
 * source networks, feed kinds, camera mix, geographic spread and network
 * rank below are all computed from the records the page actually serves,
 * so a one-camera country gets a true page about its one camera instead
 * of a padded template, and the text cannot drift from the catalogue.
 */

import type { CountryCamera } from "@/lib/country-cameras";

export interface CountryEntryLite {
  slug: string;
  name: string;
  count: number;
  topCities: Array<{ name: string; count: number }>;
  cityCount: number;
  samples: Array<{ id: string; name: string; city: string }>;
}

/* ------------------------------------------------------------------ */
/* Loading (same lazy per-country pattern as /api/cctv/country)        */
/* ------------------------------------------------------------------ */

const chunkCache = new Map<string, Promise<CountryCamera[]>>();

export function loadCountryRecords(slug: string): Promise<CountryCamera[]> {
  let pending = chunkCache.get(slug);
  if (!pending) {
    pending = import(`@/data/countries/${slug}.json`).then(
      (mod) => ((mod as { default?: unknown }).default ?? mod) as CountryCamera[],
    );
    chunkCache.set(slug, pending);
  }
  return pending;
}

/* ------------------------------------------------------------------ */
/* Regions — for "more cameras nearby" linking. Continental grouping   */
/* only; the hub routes are the site's existing regional pages.        */
/* ------------------------------------------------------------------ */

export type RegionKey =
  | "europe"
  | "asia"
  | "north-america"
  | "south-america"
  | "africa"
  | "oceania";

export const REGION_LABEL: Record<RegionKey, string> = {
  europe: "Europe",
  asia: "Asia",
  "north-america": "North America",
  "south-america": "South America",
  africa: "Africa",
  oceania: "Oceania",
};

export const REGION_HUB: Record<RegionKey, { href: string; label: string } | null> = {
  europe: { href: "/europe-live-cameras", label: "Europe live cameras" },
  asia: { href: "/asia-webcams", label: "Asia webcams" },
  "north-america": { href: "/north-america-webcams", label: "North America webcams" },
  "south-america": { href: "/south-america-webcams", label: "South America webcams" },
  africa: null,
  oceania: { href: "/oceania-webcams", label: "Oceania webcams" },
};

export const COUNTRY_REGION: Record<string, RegionKey> = {
  // Europe
  spain: "europe", austria: "europe", sweden: "europe", "united-kingdom": "europe",
  italy: "europe", finland: "europe", norway: "europe", iceland: "europe",
  germany: "europe", lithuania: "europe", netherlands: "europe", ireland: "europe",
  russia: "europe", estonia: "europe", poland: "europe", france: "europe",
  luxembourg: "europe", switzerland: "europe", malta: "europe", bulgaria: "europe",
  latvia: "europe", romania: "europe", croatia: "europe", greece: "europe",
  portugal: "europe", slovenia: "europe", hungary: "europe", moldova: "europe",
  ukraine: "europe", czechia: "europe", albania: "europe",
  "bosnia-and-herzegovina": "europe", belgium: "europe", belarus: "europe",
  serbia: "europe", "north-macedonia": "europe", slovakia: "europe",
  denmark: "europe", "faroe-islands": "europe", "san-marino": "europe",
  "vatican-city": "europe", turkey: "europe", cyprus: "europe", georgia: "europe",
  azerbaijan: "europe", armenia: "europe",
  // Asia
  japan: "asia", taiwan: "asia", "south-korea": "asia", "hong-kong": "asia",
  vietnam: "asia", indonesia: "asia", thailand: "asia", malaysia: "asia",
  macau: "asia", philippines: "asia", kyrgyzstan: "asia", china: "asia",
  maldives: "asia", kazakhstan: "asia", singapore: "asia", nepal: "asia",
  india: "asia", israel: "asia", lebanon: "asia", jordan: "asia", oman: "asia",
  "sri-lanka": "asia", "saudi-arabia": "asia", yemen: "asia", iran: "asia",
  // North America (incl. Central America & the Caribbean)
  "united-states": "north-america", canada: "north-america", mexico: "north-america",
  "us-virgin-islands": "north-america", "puerto-rico": "north-america",
  "costa-rica": "north-america", "dominican-republic": "north-america",
  "sint-maarten": "north-america", belize: "north-america",
  "el-salvador": "north-america", panama: "north-america", bermuda: "north-america",
  grenada: "north-america", guadeloupe: "north-america", honduras: "north-america",
  barbados: "north-america", martinique: "north-america", bonaire: "north-america",
  curacao: "north-america",
  // South America
  brazil: "south-america", peru: "south-america", chile: "south-america",
  argentina: "south-america", ecuador: "south-america", bolivia: "south-america",
  uruguay: "south-america", venezuela: "south-america",
  // Africa
  "south-africa": "africa", kenya: "africa", tanzania: "africa",
  seychelles: "africa", egypt: "africa", morocco: "africa", senegal: "africa",
  madagascar: "africa",
  // Oceania
  australia: "oceania", "new-zealand": "oceania", "christmas-island": "oceania",
};

export interface RegionLinks {
  region: RegionKey;
  label: string;
  hub: { href: string; label: string } | null;
  siblings: CountryEntryLite[];
  siblingTotal: number;
}

export function regionLinks(
  slug: string,
  countries: CountryEntryLite[],
): RegionLinks | null {
  const region = COUNTRY_REGION[slug];
  if (!region) return null;
  const siblings = countries
    .filter((c) => c.slug !== slug && COUNTRY_REGION[c.slug] === region)
    .sort((a, b) => b.count - a.count);
  return {
    region,
    label: REGION_LABEL[region],
    hub: REGION_HUB[region],
    siblings: siblings.slice(0, 6),
    siblingTotal: siblings.reduce((n, c) => n + c.count, 0),
  };
}

/* ------------------------------------------------------------------ */
/* Facts derived from one country's records                            */
/* ------------------------------------------------------------------ */

export interface ThemeHit {
  key: string;
  label: string;
  count: number;
  examples: string[];
}

export interface CountryFacts {
  sources: Array<{ name: string; count: number }>;
  stills: number;
  streams: number;
  themes: ThemeHit[];
  /** Bbox diagonal of the camera positions, km — null when it says nothing. */
  spreadKm: number | null;
  northPlace: string | null;
  southPlace: string | null;
  /** 1 + number of countries with a strictly larger count. */
  rank: number;
  countryTotal: number;
}

const THEME_DEFS: Array<{ key: string; label: string; pattern: RegExp }> = [
  {
    key: "traffic",
    label: "roads and traffic",
    pattern:
      /\b(traffic|motorway|highway|freeway|autobahn|expressway|interchange|junction|toll|roundabout|border)\b|(^|[\s\-–—/])(A|M|E|N|I)-?\d{1,3}\b/i,
  },
  {
    key: "coast",
    label: "coast, beaches and harbours",
    pattern:
      /\b(beach|beaches|coast|coastal|shore|seafront|bay|pier|marina|harbour|harbor|port|lighthouse|island|islands|reef|underwater|promenade|boardwalk)\b/i,
  },
  {
    key: "mountains",
    label: "mountains and ski country",
    pattern:
      /\b(ski|lifts?|gondola|cable car|alpine|mountain|mountains|peak|summit|snow|glacier)\b/i,
  },
  {
    key: "city",
    label: "city views and landmarks",
    pattern:
      /\b(skyline|downtown|old town|city view|city centre|city center|square|castle|cathedral|bridge|tower|plaza|visitor cent(er|re)|live cam)\b/i,
  },
  {
    key: "nature",
    label: "nature and research sites",
    pattern:
      /\b(river|lake|waterfall|forest|volcano|reserve|national park|valley|dam|peatland|desert|measuring tower|research station|wetland|savanna)\b/i,
  },
  {
    key: "transport",
    label: "airports and transport hubs",
    pattern: /\b(airport|station|railway|ferry terminal)\b/i,
  },
];

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function countryFacts(
  entry: CountryEntryLite,
  records: CountryCamera[],
  all: CountryEntryLite[],
): CountryFacts {
  const sourceCounts = new Map<string, number>();
  for (const r of records) {
    const s = (r.source ?? "").trim();
    if (s) sourceCounts.set(s, (sourceCounts.get(s) ?? 0) + 1);
  }
  const sources = [...sourceCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  let stills = 0;
  let streams = 0;
  for (const r of records) {
    if (r.stream_url || r.stream_type) streams += 1;
    else if (r.feed_url && /\.(jpe?g|png|webp)(\?|#|$)/i.test(r.feed_url)) stills += 1;
  }

  const themes: ThemeHit[] = [];
  for (const def of THEME_DEFS) {
    const hits = records.filter((r) => def.pattern.test(r.name));
    if (hits.length > 0) {
      themes.push({
        key: def.key,
        label: def.label,
        count: hits.length,
        examples: hits.slice(0, 2).map((r) => r.name),
      });
    }
  }
  themes.sort((a, b) => b.count - a.count);

  let spreadKm: number | null = null;
  let northPlace: string | null = null;
  let southPlace: string | null = null;
  const placed = records.filter(
    (r): r is CountryCamera & { lat: number; lng: number } =>
      typeof r.lat === "number" && typeof r.lng === "number",
  );
  if (placed.length >= 2) {
    const lats = placed.map((r) => r.lat);
    const lngs = placed.map((r) => r.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const diag = Math.max(
      haversineKm({ lat: minLat, lng: minLng }, { lat: maxLat, lng: maxLng }),
      haversineKm({ lat: minLat, lng: maxLng }, { lat: maxLat, lng: minLng }),
    );
    if (diag >= 15) {
      spreadKm = Math.round(diag);
      const north = placed.reduce((a, b) => (b.lat > a.lat ? b : a));
      const south = placed.reduce((a, b) => (b.lat < a.lat ? b : a));
      northPlace = north.city ?? north.name;
      southPlace = south.city ?? south.name;
    }
  }

  return {
    sources,
    stills,
    streams,
    themes,
    spreadKm,
    northPlace,
    southPlace,
    rank: 1 + all.filter((c) => c.count > entry.count).length,
    countryTotal: all.length,
  };
}

/* ------------------------------------------------------------------ */
/* Copy built from the facts                                           */
/* ------------------------------------------------------------------ */

const fmt = (n: number) => n.toLocaleString("en-US");
export const plural = (n: number, word: string) => `${fmt(n)} ${word}${n === 1 ? "" : "s"}`;

function sourceList(facts: CountryFacts, limit = 4): string {
  const shown = facts.sources.slice(0, limit);
  const parts = shown.map((s) => `${s.name} (${plural(s.count, "feed")})`);
  const rest = facts.sources.length - shown.length;
  if (rest > 0) parts.push(`${rest} other public ${rest === 1 ? "source" : "sources"}`);
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** "The {Country} camera network in detail" — two or three paragraphs. */
export function detailParagraphs(
  entry: CountryEntryLite,
  facts: CountryFacts,
): string[] {
  const name = entry.name;
  const out: string[] = [];

  // Where the feeds come from, and what kind of feeds they are.
  let p1 = "";
  if (facts.sources.length > 0) {
    p1 += `The ${plural(entry.count, "camera")} in the ${name} index come from ${facts.sources.length === 1 ? "one public source" : `${facts.sources.length} public sources`} — ${sourceList(facts)}. `;
  }
  if (facts.streams > 0 && facts.stills > 0) {
    p1 += `${plural(facts.streams, "feed")} ${facts.streams === 1 ? "is a live video stream" : "are live video streams"}; the other ${plural(facts.stills, "feed")} ${facts.stills === 1 ? "is a still-image feed" : "are still-image feeds"}, publishing a fresh frame on the operator's own schedule so the view steps forward rather than playing continuously. `;
  } else if (facts.stills > 0) {
    p1 += `${entry.count === 1 ? "It is a still-image feed" : "They are still-image feeds"} — each camera publishes a fresh frame on its own schedule, so the picture steps forward in intervals rather than playing as continuous video. `;
  } else if (facts.streams > 0) {
    p1 += `${entry.count === 1 ? "It is a live video stream" : "They are live video streams"}, playing continuously while the operator's feed is on air. `;
  }
  p1 += "WorldEye does not operate or re-broadcast these cameras: every card in the grid plays the operator's own published feed, and a camera that goes off air shows as unavailable instead of looping old footage.";
  out.push(p1.trim());

  // What the mix looks like, and how far it reaches.
  let p2 = "";
  const [t1, t2] = facts.themes;
  if (t1 && t2) {
    p2 += `The mix leans on ${t1.label} (${plural(t1.count, "camera")}) and ${t2.label} (${plural(t2.count, "camera")}) — ${t1.examples[0]} and ${t2.examples[0]} are typical of each. `;
  } else if (t1) {
    p2 += `The mix is mostly ${t1.label} (${plural(t1.count, "camera")}) — ${t1.examples.join(" and ")} ${t1.count === 1 ? "is the example" : "are typical"}. `;
  } else if (entry.samples.length > 0) {
    const names = entry.samples.slice(0, 2).map((s) => s.name);
    p2 += `No single network dominates the mix — the cameras are individual place views, among them ${names.join(" and ")}. `;
  }
  if (facts.spreadKm && facts.northPlace && facts.southPlace) {
    p2 += `On the ground they span roughly ${fmt(facts.spreadKm)} km corner to corner, from around ${facts.northPlace} in the north to ${facts.southPlace} in the south. `;
  }
  const tier =
    facts.rank <= 10
      ? "one of the largest national networks on WorldEye"
      : facts.rank <= 40
        ? "a substantial national network"
        : facts.rank <= 75
          ? "a mid-sized national network"
          : "one of the smaller national networks";
  p2 += `By camera count, ${name} ranks ${facts.rank} of ${facts.countryTotal} countries in the index — ${tier}.`;
  if (entry.count <= 3) {
    p2 += ` Coverage is genuinely thin today: this page lists everything the catalogue currently holds for ${name}, no more, and the index is rebuilt as new public feeds are verified.`;
  }
  out.push(p2.trim());

  return out;
}

export interface GuideItem {
  title: string;
  body: string;
}

const THEME_GUIDE: Record<string, (ex: string, n: number, country: string) => GuideItem> = {
  traffic: (ex, n, country) => ({
    title: "Check the roads before you set off",
    body: `${ex}${n > 1 ? ` and ${plural(n - 1, "other road camera")}` : ""} show${n > 1 ? "" : "s"} ${country}'s road conditions as they are right now. Congestion, bad weather on a route and slow border lanes are visible on camera long before they reach a traffic report, which is why these are the feeds drivers open first.`,
  }),
  coast: (ex, n, country) => ({
    title: "See the coast and the weather on it",
    body: `${ex}${n > 1 ? ` and ${plural(n - 1, "other coastal camera")}` : ""} face${n > 1 ? "" : "s"} the water in ${country}. People open them to check the surf, the light and how busy a beach or harbour is before heading down — a live look beats a forecast for all three.`,
  }),
  mountains: (ex, n, country) => ({
    title: "Check conditions up high",
    body: `${ex}${n > 1 ? ` and ${plural(n - 1, "other mountain camera")}` : ""} look${n > 1 ? "" : "s"} over ${country}'s high ground. Snow cover, cloud base and visibility are obvious at a glance, which is why walkers and skiers check these feeds before trusting a forecast.`,
  }),
  city: (ex, n, country) => ({
    title: "Watch the city go by",
    body: `${ex}${n > 1 ? ` and ${plural(n - 1, "other city camera")}` : ""} hold${n > 1 ? "" : "s"} still over ${country}'s streets and landmarks. These are the feeds people leave open — for a sense of a place before a trip, or just to look in on it in real time.`,
  }),
  nature: (ex, n, country) => ({
    title: "Look in on wild places",
    body: `${ex}${n > 1 ? ` and ${plural(n - 1, "other nature camera")}` : ""} watch${n > 1 ? "" : "es"} a landscape that changes slowly — water levels, seasons, weather moving through. These feeds reward patience and a return visit rather than a quick glance.`,
  }),
  transport: (ex, n, country) => ({
    title: "Check the terminals",
    body: `${ex}${n > 1 ? ` and ${plural(n - 1, "other transport camera")}` : ""} cover${n > 1 ? "" : "s"} a transport hub in ${country} — handy for seeing the weather and the level of activity around arrivals and departures before you travel.`,
  }),
};

/** "What people watch in {Country}" — grounded in the themes the data has. */
export function watchGuide(
  entry: CountryEntryLite,
  facts: CountryFacts,
  region: RegionLinks | null,
): GuideItem[] {
  const name = entry.name;
  const items: GuideItem[] = [];

  for (const theme of facts.themes.slice(0, 2)) {
    const build = THEME_GUIDE[theme.key];
    if (build) items.push(build(theme.examples[0], theme.count, name));
  }

  if (items.length === 0 && entry.samples.length > 0) {
    const s = entry.samples[0];
    items.push({
      title: entry.count === 1 ? `One window on ${name}` : `The views on offer in ${name}`,
      body:
        entry.count === 1
          ? `The index currently holds a single ${name} feed — ${s.name}${s.city ? `, listed under ${s.city}` : ""}. It is a small window, but a live one: the same check of light, weather and street life as any camera on the network.`
          : `The current line-up runs to ${plural(entry.count, "camera")} — ${entry.samples.slice(0, 3).map((x) => x.name).join(", ")} among them. Each is a fixed public view: open one and you see that place as it is right now.`,
    });
  }

  const topArea = entry.topCities[0];
  items.push({
    title: "See today's weather for yourself",
    body: `A forecast tells you what should happen; ${name}'s cameras show what is happening — light, cloud and conditions${topArea ? ` in ${topArea.name} and the other areas above` : ""} right now. It is the fastest sanity check before travelling, photographing or planning anything outdoors.`,
  });

  if (entry.cityCount >= 2) {
    const areas = entry.topCities.slice(0, 3).map((a) => a.name).join(", ");
    items.push({
      title: "Compare areas side by side",
      body: `With cameras across ${plural(entry.cityCount, "named area")} — ${areas} — the grid lets you put two parts of ${name} on screen at once and compare conditions directly, instead of trusting a single national forecast.`,
    });
  }

  if (region && region.siblingTotal > 0) {
    items.push({
      title: "Keep exploring on the globe",
      body: `From any camera you can jump to the same spot on the live map and keep moving. The rest of ${region.label} holds another ${plural(region.siblingTotal, "camera")} in the index, so a thin national network is a doorway, not a dead end.`,
    });
  }

  return items;
}

/** Two extra FAQs for pages without hand-written content. */
export function extraFaqs(
  entry: CountryEntryLite,
  facts: CountryFacts,
): Array<{ q: string; a: string }> {
  const name = entry.name;
  const out: Array<{ q: string; a: string }> = [];

  if (facts.sources.length > 0) {
    out.push({
      q: `Where do ${name}'s camera feeds come from?`,
      a: `From ${facts.sources.length === 1 ? "one public source" : `${facts.sources.length} public sources`}: ${sourceList(facts)}. These are feeds the operators publish openly — transport agencies, weather and research networks, resorts and webcam platforms. WorldEye indexes and maps them; it does not operate the cameras.`,
    });
  }

  const [t1, t2] = facts.themes;
  if (t1) {
    out.push({
      q: `What can I watch in ${name}?`,
      a: `Mostly ${t1.label}${t2 ? ` and ${t2.label}` : ""} — start with ${t1.examples[0]}${t2 ? ` or ${t2.examples[0]}` : ""}. The areas table above ranks every named area in ${name} by camera count, and every card in the grid opens the camera's actual live feed.`,
    });
  } else if (entry.samples.length > 0) {
    out.push({
      q: `What can I watch in ${name}?`,
      a: `The current line-up is ${entry.samples.map((s) => s.name).join(", ")}. Open any card in the grid to watch, or jump from a camera to the same spot on the live globe to keep exploring from there.`,
    });
  }

  return out;
}

/** Full roster for small countries the featured samples don't exhaust.
 *  Carries each record's catalogue id so a roster row can deep-link to
 *  that exact camera on the globe (/?camera=<id>), like every other
 *  camera listing on the page. */
export function roster(
  entry: CountryEntryLite,
  records: CountryCamera[],
): Array<{ id: string; name: string; city: string }> | null {
  if (records.length <= entry.samples.length || records.length > 16) return null;
  return records.map((r) => ({ id: r.id, name: r.name, city: r.city ?? "" }));
}
