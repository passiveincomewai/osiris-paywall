// Builds src/data/city-pages.json — the data behind the generated tier of
// /city-webcams/[city] pages (the ten editorial cities — London, Houston,
// Dallas, Ottawa, Toronto, Madrid, Fort Worth, Tokyo, Sydney, Auckland — are
// hand-written in the page file and are NOT regenerated here).
//
// Run: node tools/build-city-pages.mjs
// Re-run when the catalogue has grown, then rebuild the site.
//
// DERIVATION (every number on a generated city page reproduces from this):
//   1. Take the camera catalogue assembled by the /api/cctv route's own
//      loaders, from two builds of it: the production API
//      (https://worldeye.app/api/cctv?region=all — the same endpoint
//      scripts/build-camera-directory.mjs reads) and the route's local
//      assembly snapshot (.cache/cctv-catalog.json, written by the route
//      itself when it assembles locally), unioned and deduplicated by
//      camera id. A single build can miss a region whose upstream feeds
//      timed out during that build; the union is the fullest picture of
//      what the loaders index. `assembledTotal` in the output is the
//      union's size on the day of the run.
//   2. Country names are canonicalised with the SAME NORMALIZE map the
//      camera directory uses (scripts/build-camera-directory.mjs), plus
//      one addition it missed: GB -> United Kingdom. City names are the
//      records' own `city` field, whitespace-cleaned exactly as the
//      directory cleans them — no taxonomy is invented here.
//   3. A (city, country) group becomes a page only at >= THRESHOLD
//      cameras and only if the `city` value actually names a city.
//      Excluded as not-a-city (the field is also used for wider areas):
//      the country itself, US states, Canadian provinces, anything
//      ending in " County", motorway corridors (A1 …, I-5), malformed
//      values ("in Kansas City", "… Area", "CNTY", "City"), and the
//      region/district names in MANUAL_EXCLUDES below (Swedish län,
//      a Taiwanese county, Québec's region label, Hong Kong districts —
//      Hong Kong's clusters are districts, not cities).
//   4. Display alias: "Wash. DC" -> "Washington, DC" (the only rename;
//      the data's abbreviation, expanded). Japanese "… City" names are
//      the source's own styling and are kept as-is.
//   Per-city extras are computed from the same records: country total
//   (for the share), the top feeding sources by count, the still/stream
//   split (by the records' stream_type: jpg = still-image feed;
//   hls/mjpeg/mp4/iframe = video or embed stream), and up to 12 sample
//   cameras (longest descriptive names first, deduplicated by name —
//   the directory's sample rule) carrying their catalogue ids so the
//   page can deep-link each one into the globe (/?camera=<id>).
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://worldeye.app/api/cctv?region=all";
const THRESHOLD = 100;

// Slugs owned by the hand-written editorial pages in
// src/app/city-webcams/[city]/page.tsx — never generated here.
const CURATED_SLUGS = new Set([
  "london", "ottawa", "toronto", "madrid", "houston",
  "dallas", "tokyo", "sydney", "auckland", "fort-worth",
]);

// ISO-ish code / variant -> canonical country name. Copied from
// scripts/build-camera-directory.mjs (the directory's normalization),
// with GB -> United Kingdom added.
const NORMALIZE = {
  US: "United States", "United States": "United States",
  JP: "Japan", Japan: "Japan",
  TW: "Taiwan", Taiwan: "Taiwan",
  UK: "United Kingdom", GB: "United Kingdom", "United Kingdom": "United Kingdom",
  TR: "Turkey", Turkey: "Turkey",
  HK: "Hong Kong", "Hong Kong": "Hong Kong",
  ID: "Indonesia", Indonesia: "Indonesia",
  VN: "Vietnam", Vietnam: "Vietnam",
  RU: "Russia", Russia: "Russia",
  KR: "South Korea", "South Korea": "South Korea",
  TH: "Thailand", Thailand: "Thailand",
  RO: "Romania", Romania: "Romania",
  BG: "Bulgaria", Bulgaria: "Bulgaria",
  GR: "Greece", Greece: "Greece",
  MY: "Malaysia", Philippines: "Philippines", PH: "Philippines",
  MO: "Macau",
  IL: "Israel", Israel: "Israel",
  KZ: "Kazakhstan",
  CN: "China", China: "China",
  LT: "Lithuania", Lithuania: "Lithuania",
  GE: "Georgia",
  UA: "Ukraine",
  MD: "Moldova",
  IN: "India", India: "India",
  MV: "Maldives", Maldives: "Maldives",
  CY: "Cyprus", Cyprus: "Cyprus",
  EG: "Egypt",
  SG: "Singapore", Singapore: "Singapore",
  NP: "Nepal",
  BY: "Belarus",
  AZ: "Azerbaijan",
  KG: "Kyrgyzstan",
  SA: "Saudi Arabia",
  LV: "Latvia",
  YE: "Yemen",
  IR: "Iran",
  OM: "Oman", Oman: "Oman",
  CX: "Christmas Island",
  NO: "Norway", Norway: "Norway",
  SE: "Sweden", Sweden: "Sweden",
  FI: "Finland", Finland: "Finland",
  ES: "Spain", Spain: "Spain",
  AT: "Austria", Austria: "Austria",
  CA: "Canada", Canada: "Canada",
  IT: "Italy", Italy: "Italy",
  IS: "Iceland", Iceland: "Iceland",
  NL: "Netherlands", Netherlands: "Netherlands",
  AU: "Australia", Australia: "Australia",
  NZ: "New Zealand", "New Zealand": "New Zealand",
  PL: "Poland", Poland: "Poland",
  MT: "Malta", Malta: "Malta",
  FR: "France", France: "France",
  BR: "Brazil", Brazil: "Brazil",
  HR: "Croatia", Croatia: "Croatia",
  MX: "Mexico", Mexico: "Mexico",
  PE: "Peru", Peru: "Peru",
  CL: "Chile", Chile: "Chile",
  ZA: "South Africa", "South Africa": "South Africa",
  AR: "Argentina", Argentina: "Argentina",
  CH: "Switzerland", Switzerland: "Switzerland",
  PT: "Portugal", Portugal: "Portugal",
  CR: "Costa Rica", "Costa Rica": "Costa Rica",
  IE: "Ireland", Ireland: "Ireland",
  HU: "Hungary", Hungary: "Hungary",
  SI: "Slovenia", Slovenia: "Slovenia",
  DE: "Germany", Germany: "Germany",
  DO: "Dominican Republic", "Dominican Republic": "Dominican Republic",
  KE: "Kenya", Kenya: "Kenya",
  SC: "Seychelles", Seychelles: "Seychelles",
  CZ: "Czechia", Czechia: "Czechia",
  AL: "Albania", Albania: "Albania",
  BA: "Bosnia and Herzegovina", "Bosnia and Herzegovina": "Bosnia and Herzegovina",
  BE: "Belgium", Belgium: "Belgium",
  RS: "Serbia", Serbia: "Serbia",
  MK: "North Macedonia", "North Macedonia": "North Macedonia",
  SK: "Slovakia", Slovakia: "Slovakia",
  EC: "Ecuador", Ecuador: "Ecuador",
  SV: "El Salvador", "El Salvador": "El Salvador",
  BZ: "Belize", Belize: "Belize",
  BM: "Bermuda", Bermuda: "Bermuda",
  BO: "Bolivia", Bolivia: "Bolivia",
  GD: "Grenada", Grenada: "Grenada",
  GP: "Guadeloupe", Guadeloupe: "Guadeloupe",
  HN: "Honduras", Honduras: "Honduras",
  PA: "Panama", Panama: "Panama",
  LB: "Lebanon", Lebanon: "Lebanon",
  JO: "Jordan", Jordan: "Jordan",
  LK: "Sri Lanka", "Sri Lanka": "Sri Lanka",
  BB: "Barbados", Barbados: "Barbados",
  MQ: "Martinique", Martinique: "Martinique",
  UY: "Uruguay", Uruguay: "Uruguay",
  VE: "Venezuela", Venezuela: "Venezuela",
  MA: "Morocco", Morocco: "Morocco",
  SN: "Senegal", Senegal: "Senegal",
  FO: "Faroe Islands", "Faroe Islands": "Faroe Islands",
  LU: "Luxembourg", Luxembourg: "Luxembourg",
  SM: "San Marino", "San Marino": "San Marino",
  EE: "Estonia", Estonia: "Estonia",
  VA: "Vatican City", "Vatican City": "Vatican City",
  BQ: "Bonaire", Bonaire: "Bonaire",
  CW: "Curaçao", "Curaçao": "Curaçao",
  PR: "Puerto Rico", "Puerto Rico": "Puerto Rico",
  SX: "Sint Maarten", "Sint Maarten": "Sint Maarten",
  "US Virgin Islands": "US Virgin Islands",
};

const JUNK_COUNTRIES = new Set(["XX", "Middle East", "Unknown", ""]);
const JUNK_CITIES = new Set(["CNTY", "City", "Other", "Unknown", ""]);
const US_STATES = new Set([
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
  "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
  "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York",
  "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
  "West Virginia", "Wisconsin", "Wyoming",
]);
const CA_PROVINCES = new Set([
  "British Columbia", "Alberta", "Saskatchewan", "Manitoba", "Ontario",
  "Quebec", "New Brunswick", "Nova Scotia", "Prince Edward Island",
  "Newfoundland and Labrador", "Yukon", "Northwest Territories", "Nunavut",
]);
// Region/district-level values that pass the mechanical rules but do not
// name a city. Keyed "city|country".
const MANUAL_EXCLUDES = new Set([
  "Västra Götaland|Sweden",        // a län (county), Gothenburg's region
  "Tyne and Wear|United Kingdom",  // a metropolitan county
  "Yunlin|Taiwan",                 // a county
  "Québec (Capitale-Nationale)|Canada", // the region label Québec 511 uses
  "Yuen Long|Hong Kong",           // Hong Kong districts, not cities
  "Sha Tin|Hong Kong",
  "Tsuen Wan|Hong Kong",
  "Tuen Mun|Hong Kong",
  "Kwun Tong|Hong Kong",
]);
const CITY_ALIASES = { "Wash. DC": "Washington, DC" };

function cleanName(n) {
  return String(n || "").replace(/\s+/g, " ").trim();
}

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchCatalog() {
  let best = [];
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Fetching production catalogue (attempt ${attempt})...`);
      const res = await fetch(API, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.cameras)) throw new Error("no cameras array");
      console.log(`  got ${data.cameras.length} cameras`);
      if (data.cameras.length > best.length) best = data.cameras;
      if (best.length >= 70000) break;
    } catch (e) {
      console.log(`  failed: ${e.message}`);
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 8000));
  }
  return best;
}

function snapshotCatalog() {
  const p = join(ROOT, ".cache", "cctv-catalog.json");
  if (!existsSync(p)) return [];
  try {
    const d = JSON.parse(readFileSync(p, "utf8"));
    const out = [];
    for (const cams of Object.values(d.regions || {})) out.push(...cams);
    console.log(`Local assembly snapshot: ${out.length} records`);
    return out;
  } catch {
    return [];
  }
}

function excludedReason(city, country) {
  if (JUNK_CITIES.has(city)) return "junk value";
  if (city === country) return "country name, not a city";
  if (city.endsWith(" County")) return "a county";
  if (country === "United States" && US_STATES.has(city)) return "a US state";
  if (country === "Canada" && CA_PROVINCES.has(city)) return "a Canadian province";
  if (/^A\d+[\s-]/.test(city) || /^I-\d+/.test(city)) return "a motorway corridor";
  if (city.startsWith("in ") || city.endsWith(" Area")) return "malformed/area label";
  if (MANUAL_EXCLUDES.has(`${city}|${country}`)) return "region/district (manual)";
  return null;
}

async function main() {
  const byId = new Map();
  for (const c of await fetchCatalog()) if (c && c.id) byId.set(c.id, c);
  for (const c of snapshotCatalog()) if (c && c.id && !byId.has(c.id)) byId.set(c.id, c);
  const cameras = [...byId.values()];
  console.log(`Assembled catalogue (union, deduped by id): ${cameras.length}`);

  const countryTotals = new Map();
  const groups = new Map(); // "city|country" -> records[]
  for (const cam of cameras) {
    const rawCountry = cleanName(cam.country);
    const country = NORMALIZE[rawCountry];
    if (!country || JUNK_COUNTRIES.has(country)) continue;
    countryTotals.set(country, (countryTotals.get(country) || 0) + 1);
    const city = CITY_ALIASES[cleanName(cam.city)] || cleanName(cam.city);
    if (!city) continue;
    const key = `${city}|${country}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(cam);
  }

  const usedSlugs = new Set(CURATED_SLUGS);
  const cities = [];
  const dropped = [];
  for (const [key, recs] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const [city, country] = key.split("|");
    if (recs.length < THRESHOLD) continue;
    const reason = excludedReason(city, country);
    if (reason) {
      dropped.push(`${key} (${recs.length}) — ${reason}`);
      continue;
    }
    const countrySlug = slugify(country);
    let slug = slugify(city);
    if (CURATED_SLUGS.has(slug)) {
      dropped.push(`${key} (${recs.length}) — hand-written editorial page`);
      continue;
    }
    if (usedSlugs.has(slug)) slug = `${slug}-${countrySlug}`;
    if (usedSlugs.has(slug)) throw new Error(`slug collision: ${slug}`);
    usedSlugs.add(slug);

    const srcCounts = new Map();
    let stills = 0;
    let streams = 0;
    for (const c of recs) {
      const s = cleanName(c.source) || "Public feeds";
      srcCounts.set(s, (srcCounts.get(s) || 0) + 1);
      if (c.stream_type && c.stream_type !== "jpg") streams++;
      else stills++;
    }
    const sources = [...srcCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
    const sourceCount = srcCounts.size;

    const seenNames = new Set();
    const samples = [];
    const byNameLen = [...recs].sort((a, b) => cleanName(b.name).length - cleanName(a.name).length);
    for (const c of byNameLen) {
      const nm = cleanName(c.name);
      if (nm.length < 8 || /^https?:/i.test(nm) || seenNames.has(nm.toLowerCase())) continue;
      seenNames.add(nm.toLowerCase());
      samples.push({ id: c.id, name: nm.slice(0, 80) });
      if (samples.length >= 12) break;
    }

    cities.push({
      slug,
      name: city,
      country,
      countrySlug,
      count: recs.length,
      countryTotal: countryTotals.get(country),
      sources,
      sourceCount,
      stills,
      streams,
      samples,
    });
  }

  cities.sort((a, b) => b.count - a.count);
  const out = {
    generatedAt: new Date().toISOString(),
    assembledTotal: cameras.length,
    threshold: THRESHOLD,
    cities,
  };
  const dir = join(ROOT, "src", "data");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "city-pages.json"), JSON.stringify(out, null, 1));
  console.log(`Wrote ${cities.length} generated cities (>= ${THRESHOLD} cameras).`);
  console.log("Largest:", cities.slice(0, 5).map((c) => `${c.name} (${c.count})`).join(", "));
  console.log("Smallest:", cities.slice(-3).map((c) => `${c.name} (${c.count})`).join(", "));
  console.log("Excluded at/above threshold:", dropped.length ? dropped.join("; ") : "none");
}

main().catch((e) => { console.error(e); process.exit(1); });
