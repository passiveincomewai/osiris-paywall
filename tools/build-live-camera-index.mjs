// Builds the data behind /live-camera-index — src/data/live-camera-index.json
// (the page's data module) and the public dataset it offers for download
// (public/data/live-camera-index-2026.json + .csv). The page renders ONLY
// from the generated JSON, so every number on the page is exactly the number
// in the dataset, and both reproduce from this script.
//
// Run: node tools/build-live-camera-index.mjs [--from-file payload.json]
// Re-run when a new monthly snapshot is wanted, then rebuild the site.
// --from-file reads a saved /api/cctv?region=all payload instead of fetching.
//
// DERIVATION (every published number reproduces from this):
//   SERVED ("active") figures come from ONE snapshot of the production
//   catalogue API (https://worldeye.app/api/cctv?region=all — the same
//   endpoint tools/build-country-pages.mjs reads), fetched with that
//   generator's discipline: up to 4 attempts, the most complete wins
//   (fewest pending regions, then most cameras). Records are deduplicated
//   by camera id — the same merge the globe client applies
//   (src/lib/camera-catalog.ts). A record's country is canonicalised with
//   the NORMALIZE map below — copied verbatim from
//   tools/build-country-pages.mjs, whose copy must agree with
//   lib/country-cameras.ts; values naming no country (JUNK) are counted
//   as unattributed and get no row.
//   INDEXED figures come from the committed catalogue files the country
//   pages are built from: src/data/camera-countries.json (which reconciles
//   per-country counts + unattributed + dropped near-duplicates ==
//   catalogueTotal, asserted by src/data/camera-countries.test.ts) and
//   src/data/city-pages.json (the generated city tier).
//   US STATE NETWORKS tally served records by publishing source against
//   the explicit STATE_NETWORKS map below — a record counts toward a
//   state only when its source IS that state's DOT/511 network feed.
//   Multi-state aggregations (e.g. "OpenCCTV / state511") are therefore
//   excluded from the state table by construction.
//   PLAYABLE counts served records the WorldEye player itself could
//   open, using the player's own rule — src/lib/camera-preview.ts
//   previewMedia, mirrored in playableKind() below (keep the two in
//   step): a missing stream_type is a JPEG still; jpg needs a feed_url
//   or stream_url; hls / mp4 / mjpeg need a stream_url; iframe and
//   anything unrecognised are never playable. It is a feed-present,
//   format-level count — records are NOT individually stream-tested,
//   and the page labels it exactly that way.
//   Reconciliation is a hard fail: served country buckets + unattributed
//   must equal the unique-id served total.
import { writeFileSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://worldeye.app/api/cctv?region=all";

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
  MY: "Malaysia", Malaysia: "Malaysia", Philippines: "Philippines", PH: "Philippines",
  MO: "Macau", Macau: "Macau",
  IL: "Israel", Israel: "Israel",
  KZ: "Kazakhstan", Kazakhstan: "Kazakhstan",
  CN: "China", China: "China",
  LT: "Lithuania", Lithuania: "Lithuania",
  GE: "Georgia", Georgia: "Georgia",
  UA: "Ukraine", Ukraine: "Ukraine",
  MD: "Moldova", Moldova: "Moldova",
  IN: "India", India: "India",
  MV: "Maldives", Maldives: "Maldives",
  CY: "Cyprus", Cyprus: "Cyprus",
  EG: "Egypt", Egypt: "Egypt",
  SG: "Singapore", Singapore: "Singapore",
  NP: "Nepal", Nepal: "Nepal",
  BY: "Belarus", Belarus: "Belarus",
  AZ: "Azerbaijan", Azerbaijan: "Azerbaijan",
  KG: "Kyrgyzstan", Kyrgyzstan: "Kyrgyzstan",
  SA: "Saudi Arabia", "Saudi Arabia": "Saudi Arabia",
  LV: "Latvia", Latvia: "Latvia",
  YE: "Yemen", Yemen: "Yemen",
  IR: "Iran", Iran: "Iran",
  OM: "Oman", Oman: "Oman",
  CX: "Christmas Island", "Christmas Island": "Christmas Island",
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
  TZ: "Tanzania", Tanzania: "Tanzania",
  AM: "Armenia", Armenia: "Armenia",
  DK: "Denmark", Denmark: "Denmark",
  MG: "Madagascar", Madagascar: "Madagascar",
};

const JUNK = new Set(["XX", "Middle East", "Unknown", ""]);

/** US state DOT / 511 networks, by exact source name in the served payload. */
const STATE_NETWORKS = {
  Florida: ["FDOT"],
  Texas: ["TxDOT"],
  Georgia: ["GDOT"],
  California: ["Caltrans", "OpenCCTV / caltrans"],
  Utah: ["UDOT"],
  Virginia: ["OpenCCTV / virginia"],
  "New York": ["OpenCCTV / ny511"],
  Washington: ["OpenCCTV / wsdot"],
  Oregon: ["ODOT TripCheck"],
  "North Carolina": ["NCDOT"],
  Colorado: ["OpenCCTV / cotrip"],
  Michigan: ["MDOT MiDrive"],
  Indiana: ["INDOT TrafficWise"],
  Nevada: ["NDOT"],
  Arizona: ["ADOT"],
  Maryland: ["OpenCCTV / mdchart"],
  Louisiana: ["LADOTD"],
  Ohio: ["OpenCCTV / ohgo"],
  Oklahoma: ["OpenCCTV / oktraffic"],
  "New Mexico": ["OpenCCTV / nmroads"],
};

/** States with a dedicated traffic-camera page in this tree. */
const STATE_PAGE_SLUGS = {
  Georgia: "georgia",
  Utah: "utah",
  Texas: "texas",
  Florida: "florida",
  Indiana: "indiana",
  Nevada: "nevada",
  Arizona: "arizona",
};

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function canonical(raw) {
  const value = clean(raw);
  if (JUNK.has(value)) return null;
  return NORMALIZE[value] ?? value;
}

async function fetchCatalog(fromFile) {
  if (fromFile) {
    const data = JSON.parse(readFileSync(fromFile, "utf8"));
    if (!Array.isArray(data.cameras)) throw new Error(`${fromFile}: no cameras array`);
    console.log(`Production payload from file: ${data.cameras.length} cameras, pending: ${(data.pendingRegions ?? []).join(", ") || "none"}`);
    return data;
  }
  let best = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      console.log(`Fetching production catalogue (attempt ${attempt})...`);
      const res = await fetch(API, { signal: AbortSignal.timeout(120000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.cameras)) throw new Error("no cameras array");
      const pending = data.pendingRegions?.length ?? 0;
      console.log(`  got ${data.cameras.length} cameras, ${pending} regions pending`);
      if (!best || pending < best.pending || (pending === best.pending && data.cameras.length > best.data.cameras.length)) {
        best = { data, pending };
      }
      if (pending === 0) break;
    } catch (e) {
      console.log(`  failed: ${e.message}`);
    }
    if (attempt < 4) await new Promise((r) => setTimeout(r, 8000));
  }
  if (!best) throw new Error("production catalogue unreachable");
  return best.data;
}

const pct = (n, total) => Math.round((n / total) * 1000) / 10;

/**
 * Mirror of previewMedia() in src/lib/camera-preview.ts — the URL a
 * WorldEye player surface would render for this record, and its kind,
 * or null when the record has nothing the player can open. Keep the
 * two implementations in step.
 */
function playableKind(cam) {
  // Exactly previewMedia's reading: only a missing stream_type
  // defaults to "jpg" (an empty one is unrecognised, as in the TS).
  const declared = (cam.stream_type ?? "jpg").toLowerCase();
  if (declared === "mp4" || declared === "hls" || declared === "mjpeg") {
    return clean(cam.stream_url) ? declared : null;
  }
  if (declared === "jpg") {
    return clean(cam.feed_url) || clean(cam.stream_url) ? "jpg" : null;
  }
  return null;
}

async function main() {
  const fromFile = process.argv.includes("--from-file")
    ? process.argv[process.argv.indexOf("--from-file") + 1]
    : null;
  const payload = await fetchCatalog(fromFile);

  // Dedupe by id — the globe client's merge (first record wins within one
  // payload; ids are unique per region slice in practice).
  const byId = new Map();
  for (const c of payload.cameras) if (c && c.id) byId.set(String(c.id), c);
  const served = [...byId.values()];
  const servedTotal = served.length;
  console.log(`Served snapshot: ${payload.cameras.length} records, ${servedTotal} unique cameras`);

  // Country buckets (canonicalised exactly like the country pages).
  const byCountry = new Map();
  let unattributed = 0;
  for (const cam of served) {
    const name = canonical(cam.country);
    if (!name) { unattributed++; continue; }
    byCountry.set(name, (byCountry.get(name) ?? 0) + 1);
  }
  const bucketSum = [...byCountry.values()].reduce((a, b) => a + b, 0);
  if (bucketSum + unattributed !== servedTotal) {
    throw new Error(`reconciliation failed: ${bucketSum} + ${unattributed} != ${servedTotal}`);
  }

  // Indexed side: the committed catalogue the country/city pages use.
  const countryIndex = JSON.parse(readFileSync(join(ROOT, "src/data/camera-countries.json"), "utf8"));
  const cityIndex = JSON.parse(readFileSync(join(ROOT, "src/data/city-pages.json"), "utf8"));
  const indexedByName = new Map(countryIndex.countries.map((c) => [c.name, c]));

  const countries = [...byCountry.entries()]
    .map(([name, count]) => {
      const idx = indexedByName.get(name);
      return {
        name,
        slug: idx?.slug ?? slugify(name),
        served: count,
        indexed: idx?.count ?? null,
        sharePct: pct(count, servedTotal),
      };
    })
    .sort((a, b) => b.served - a.served);
  const indexedOnlyCountries = countryIndex.countries
    .filter((c) => !byCountry.has(c.name))
    .map((c) => ({ name: c.name, slug: c.slug, indexed: c.count }));

  // Sources + formats (unique served records).
  const tally = (key) => {
    const m = new Map();
    for (const cam of served) {
      const v = clean(cam[key]);
      if (v) m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  };
  const sources = tally("source");
  const formats = tally("stream_type");
  const feedKinds = {
    feedUrl: served.filter((c) => clean(c.feed_url)).length,
    streamUrl: served.filter((c) => clean(c.stream_url)).length,
    externalUrl: served.filter((c) => clean(c.external_url)).length,
  };

  // Playable: the subset of served records the WorldEye player could
  // open (playableKind above — the previewMedia rule). Tallied by the
  // kind the player would render.
  const playableByKindMap = new Map();
  let playable = 0;
  for (const cam of served) {
    const kind = playableKind(cam);
    if (!kind) continue;
    playable++;
    playableByKindMap.set(kind, (playableByKindMap.get(kind) ?? 0) + 1);
  }
  const playableByKind = [...playableByKindMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // US state DOT networks.
  const sourceCounts = new Map(sources.map((s) => [s.name, s.count]));
  const usStateNetworks = Object.entries(STATE_NETWORKS)
    .map(([state, nets]) => ({
      state,
      slug: STATE_PAGE_SLUGS[state] ?? null,
      networks: nets,
      cameras: nets.reduce((n, s) => n + (sourceCounts.get(s) ?? 0), 0),
    }))
    .filter((s) => s.cameras > 0)
    .sort((a, b) => b.cameras - a.cameras);

  // Cities: the generated city tier (46 cities at the >=100 threshold).
  const topCities = [...cityIndex.cities]
    .sort((a, b) => b.count - a.count)
    .slice(0, 25)
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      country: c.country,
      countrySlug: c.countrySlug,
      count: c.count,
      sourceCount: c.sourceCount,
      topSource: c.sources[0]?.name ?? null,
      topSourceCount: c.sources[0]?.count ?? null,
      stills: c.stills,
      streams: c.streams,
    }));

  const generatedAt = new Date().toISOString();
  const data = {
    name: "WorldEye Live Camera Index",
    edition: "October 2026",
    generatedAt,
    snapshot: {
      source: "WorldEye production catalogue API (https://worldeye.app/api/cctv?region=all)",
      payloadTimestamp: payload.timestamp ?? null,
      records: payload.cameras.length,
      uniqueCameras: servedTotal,
      regions: payload.regions?.length ?? null,
      pendingRegions: payload.pendingRegions ?? [],
    },
    totals: {
      served: servedTotal,
      servedCountries: countries.length,
      servedUnattributed: unattributed,
      indexedRecords: countryIndex.catalogueTotal,
      indexedAttributed: countryIndex.attributedTotal,
      indexedCountries: countryIndex.countries.length,
      indexedUnattributed: countryIndex.unattributed,
      droppedNearDuplicates: countryIndex.droppedNearDuplicates,
      distinctSources: sources.length,
      playable,
    },
    countries,
    indexedOnlyCountries,
    topCities,
    cityIndexSize: cityIndex.cities.length,
    cityThreshold: cityIndex.threshold,
    usStateNetworks,
    topSources: sources.slice(0, 20),
    formats,
    formatsTypedTotal: formats.reduce((n, f) => n + f.count, 0),
    feedKinds,
    playableByKind,
    citation: `WorldEye (2026). Live Camera Index — October 2026: ${servedTotal.toLocaleString("en-US")} live public cameras served across ${countries.length} countries. WorldEye. https://worldeye.app/live-camera-index`,
  };

  writeFileSync(join(ROOT, "src/data/live-camera-index.json"), JSON.stringify(data, null, 2) + "\n");
  writeFileSync(join(ROOT, "public/data/live-camera-index-2026.json"), JSON.stringify(data, null, 2) + "\n");

  const csvRows = [
    "country,slug,served_cameras,indexed_cameras,share_of_served_pct",
    ...countries.map((c) =>
      [JSON.stringify(c.name), c.slug, c.served, c.indexed ?? "", c.sharePct].join(","),
    ),
  ];
  writeFileSync(join(ROOT, "public/data/live-camera-index-2026.csv"), csvRows.join("\n") + "\n");

  console.log(`Countries served: ${countries.length} (+${unattributed} unattributed); indexed-only: ${indexedOnlyCountries.map((c) => c.name).join(", ") || "none"}`);
  console.log(`Top country: ${countries[0].name} ${countries[0].served}; top source: ${sources[0].name} ${sources[0].count}`);
  console.log(`State networks: ${usStateNetworks.length} states, ${usStateNetworks.reduce((n, s) => n + s.cameras, 0)} cameras`);
  console.log(`Playable (previewMedia rule): ${playable} of ${servedTotal} served — ${playableByKind.map((k) => `${k.name} ${k.count}`).join(", ")}`);
  console.log("Wrote src/data/live-camera-index.json, public/data/live-camera-index-2026.json, public/data/live-camera-index-2026.csv");
}

await main();
