// Builds src/data/city-pages.json — the data behind the generated tier of
// /city-webcams/[city] pages (the ten editorial cities — London, Houston,
// Dallas, Ottawa, Toronto, Madrid, Fort Worth, Tokyo, Sydney, Auckland — are
// hand-written in the page file and are NOT regenerated here).
//
// Run: node tools/build-city-pages.mjs
// Re-run when the catalogue has grown, then rebuild the site.
//
// DERIVATION (every number on a generated city page reproduces from this):
//   1. SOURCE — the committed catalogue snapshot: src/data/countries/
//      *.json, indexed by src/data/camera-countries.json (the directory
//      build of 2026-10-20). This is the same data the pages' own grids
//      serve (src/lib/explore-data.ts), so a page this build creates
//      quotes exactly the set its explorer renders. Records are taken
//      chunk by chunk (a chunk IS its country's record set — the
//      directory build partitioned by the canonical country name, and
//      every record's own country field agrees with its chunk) and
//      deduplicated by camera id. `assembledTotal` and `generatedAt`
//      are carried over from the previous file (see PRESERVE below);
//      the snapshot's own size is logged at run time.
//      HISTORY: until 2026-10-27 this script instead unioned two live
//      builds of the /api/cctv catalogue (the production endpoint and
//      the route's .cache snapshot, 91,700 records on 2026-10-23).
//      That union is fuller than the committed snapshot but is not
//      reproducible after the fact, and its counts are NOT the counts
//      the chunk-served grids render — so new pages are now derived
//      from the snapshot the site actually serves. A future full
//      catalogue rebuild (fresh chunks) re-bases every tier on the
//      new snapshot in one deliberate pass.
//   2. City names are the records' own `city` field, whitespace-cleaned
//      exactly as the directory cleans them — no taxonomy is invented
//      here. A record's country is its chunk's canonical name.
//   3. A (city, country) group becomes a page only if the place it
//      OWNS — its dominant cluster, see the ownership section below —
//      holds >= THRESHOLD cameras, and only if the `city` value
//      actually names a city. The named EDITORIAL_INCLUSIONS below
//      bypass the threshold only (never the not-a-city exclusions). Excluded as not-a-city (the field is
//      also used for wider areas): the country itself, US states,
//      Canadian provinces, anything ending in " County", Spanish
//      province labels ("Province 9" — DGT files some feeds by
//      province), motorway/route corridors (A1 …, I-5, US26),
//      malformed values ("in Kansas City", "… Area", "CNTY", "City"),
//      camera-system/code labels ("SYD_MET", "RWIS Cameras", "WWD"),
//      EVERY Hong Kong cluster (the field there names districts, not
//      cities — Tai Po, Sham Shui Po, North, …), names with no
//      Latin-letter slug (the Japanese-script duplicate "広島市" of
//      the Hiroshima City cluster), and the region/district names in
//      MANUAL_EXCLUDES below (Swedish län, Taiwanese counties whose
//      camera sets span the whole county, Québec administrative
//      regions, Spanish autonomous communities, Japanese prefectures
//      whose capital has a different name, a New Zealand region, an
//      airport's name, a crossings operator, Maryland region labels,
//      a combined-municipalities label, a district-qualified label,
//      and US labels that merge two different same-named places into
//      one count).
//      THRESHOLD history: 100 until 2026-10-22, then 50 judged on the
//      merged name group (the pages-expansion roadmap's family-2 tier
//      drop), then — 2026-10-27, the city-scale wave (keyword menu
//      #13) — 25 judged on the OWNED (dominant) set: the explorer's
//      own substance line, and the only count a page ever quotes.
//      Judging the bar on the owned set changes no existing page's
//      status: every page the 50-tier created owns >= 25 (the six
//      sub-50 cases are pinned in city-pages.test.ts).
//   4. PRESERVE — an entry already in src/data/city-pages.json is
//      carried over byte-for-byte. Those entries are data owned by
//      the 2026-10-23 API-union build (their counts describe the
//      fuller union catalogue, and the ownership pass of 2026-10-27
//      already reduced them to their dominant places); re-deriving
//      them from the smaller committed snapshot would silently
//      shrink 160 live pages' quoted counts. Only groups with no
//      entry yet get a fresh, snapshot-derived entry. A new entry's
//      `countryTotal` inherits the tier's existing total for its
//      country when one exists (the generated tier quotes one country
//      total per country), and falls back to the snapshot's country
//      total for countries the tier reaches for the first time.
//   5. Display alias: "Wash. DC" -> "Washington, DC" (the only rename;
//      the data's abbreviation, expanded). Japanese "… City" names are
//      the source's own styling and are kept as-is.
//   Per-city extras are computed from the same records: country total
//   (for the share), the top feeding sources by count, the still/stream
//   split (by the records' stream_type: jpg = still-image feed;
//   hls/mjpeg/mp4/iframe = video or embed stream), and up to 12 sample
//   cameras (longest descriptive names first, deduplicated by name —
//   the directory's sample rule) carrying their catalogue ids so the
//   page can deep-link each one into the globe (/?camera=<id>).
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// The page-creation bar, judged on the group's OWNED (dominant) set —
// see the header's THRESHOLD history.
const THRESHOLD = 25;

// Slugs owned by the hand-written editorial pages in
// src/app/city-webcams/[city]/page.tsx — never generated here.
const CURATED_SLUGS = new Set([
  "london", "ottawa", "toronto", "madrid", "houston",
  "dallas", "tokyo", "sydney", "auckland", "fort-worth",
]);

// Editorial inclusions — "city|country" groups that earn a
// generated-tier page BELOW the threshold on purpose (camera
// findability rollout, 2026-10-30). An inclusion bypasses THRESHOLD
// only: the not-a-city exclusions above still apply, and the entry is
// derived from the group's owned records exactly like any other new
// entry. Once published, the PRESERVE rule carries the entry over
// byte-for-byte like every other, so an inclusion is a one-time
// admission decision, not a standing exception in the data.
//   - "McAlester|United States": the named test case completing
//     Oklahoma's city tier — McAlester's single catalogue camera
//     ("US-69 & C Tree NE", OpenCCTV / oktraffic) had no hub page at
//     any level, so a search for its exact name could never land on
//     WorldEye. Oklahoma City and Tulsa already have pages; this
//     inclusion gives the state's third catalogue city its page.
const EDITORIAL_INCLUSIONS = new Set([
  "McAlester|United States",
]);

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
  // Hong Kong districts are excluded wholesale in excludedReason —
  // the catalogue's Hong Kong `city` values are its 18 districts.
  // Added at the >=50 tier (2026-10-22 QA pass over the new clusters):
  "Bas-Saint-Laurent—Gaspésie—Îles-de-la-Madeleine|Canada", // a Québec administrative region
  "Asturias|Spain",                // an autonomous community; no city of this name (capital: Oviedo)
  "Canterbury|New Zealand",        // a region; the city is Christchurch
  "Shiga|Japan",                   // a prefecture; its capital is Otsu
  "Hyogo|Japan",                   // a prefecture; its capital is Kobe
  "Billy Bishop Toronto City|Canada", // an airport's name, not a city
  "Jefferson|United States",       // merges Jefferson County KY with Jefferson SD and others — no single place
  "Richmond|United States",        // merges Richmond VA with Richmond CA — no single place
  "Franklin|United States",        // Franklin County OH (Columbus) cameras under a county label
  "Hanover|United States",         // New Hampshire corridor cameras, not Hanover town
  "Skåne|Sweden",                  // a län (county), like Västra Götaland above
  "Western MD|United States",      // a region label (Western Maryland), not a city
  // Added at the >=25 tier (2026-10-27 city-scale wave QA pass over
  // the clusters the lower bar surfaces):
  "Chaudière-Appalaches|Canada",   // a Québec administrative region (Québec 511 files by region)
  "Mauricie—Centre-du-Québec|Canada", // a Québec administrative region
  "Saguenay—Lac-Saint-Jean|Canada", // a Québec administrative region
  "Montérégie|Canada",             // a Québec administrative region
  "Outaouais|Canada",              // a Québec administrative region; the city is Gatineau
  "Brampton-Caledon|Canada",       // an Ontario 511 combined-area label (two municipalities)
  "Halland|Sweden",                // a län (county), like Skåne above
  "Eastern Shore|United States",   // a Maryland region label (MDOT CHART files by region)
  "Southern MD|United States",     // a Maryland region label, like Western MD above
  "Elizabeth River Crossings|United States", // a crossings operator (Norfolk–Portsmouth tunnels), not a place
  "Cantabria|Spain",               // an autonomous community; its capital is Santander (cf. Asturias)
  "Nantou|Taiwan",                 // a county — twipcam files by county and the set spans it (63 km across), like Yunlin
  "Pingtung|Taiwan",               // a county — the set spans it end to end (112 km across)
  "Taitung|Taiwan",                // a county — the set spans its whole coast (133 km across)
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

/* ------------------------------------------------------------------ */
/* Dominant-place ownership (owner decision, 2026-10-27): a generated  */
/* city page describes the DOMINANT place filed under its name, so     */
/* every group is reduced to its dominant cluster before counts,       */
/* sources and samples are computed — the same rule the runtime        */
/* applies in src/lib/explore-data.ts (dominantCitySet). The split     */
/* below is a line-for-line port of splitPlaceClusters /               */
/* dominantPlaceRecords in src/lib/place-neighbours.ts — keep the two  */
/* in sync; the TypeScript version is canonical. Records without       */
/* coordinates cannot be assigned to either place and are kept.        */
/* ------------------------------------------------------------------ */

const CITY_SPLIT_DIAGONAL_KM = 120;
const CITY_SPLIT_GAP_KM = 40;

function haversineKm(aLat, aLng, bLat, bLng) {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

function bboxOfPoints(points) {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

function meanPoint(points) {
  let lat = 0;
  let lng = 0;
  for (const p of points) {
    lat += p.lat;
    lng += p.lng;
  }
  return { lat: lat / points.length, lng: lng / points.length };
}

function splitPlaceClusters(points) {
  if (points.length < 2) return [points.slice()];
  const bbox = bboxOfPoints(points);
  const diagonalKm = haversineKm(bbox.minLat, bbox.minLng, bbox.maxLat, bbox.maxLng);
  if (diagonalKm <= CITY_SPLIT_DIAGONAL_KM) return [points.slice()];

  let best = null;
  for (const axis of ["lat", "lng"]) {
    const sorted = [...points].sort((x, y) => x[axis] - y[axis]);
    for (let i = 0; i + 1 < sorted.length; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const gapKm =
        axis === "lat"
          ? haversineKm(a.lat, a.lng, b.lat, a.lng)
          : haversineKm(a.lat, a.lng, a.lat, b.lng);
      if (!best || gapKm > best.gapKm) {
        best = { gapKm, lo: sorted.slice(0, i + 1), hi: sorted.slice(i + 1) };
      }
    }
  }

  if (!best || best.gapKm < CITY_SPLIT_GAP_KM) return [points.slice()];
  return [...splitPlaceClusters(best.lo), ...splitPlaceClusters(best.hi)];
}

function dominantPlaceRecords(points) {
  if (points.length < 2) return points.slice();
  const clusters = splitPlaceClusters(points);
  if (clusters.length === 1) return clusters[0];
  const groupMean = meanPoint(points);
  let winner = clusters[0];
  let winnerMean = meanPoint(winner);
  let winnerDist = haversineKm(winnerMean.lat, winnerMean.lng, groupMean.lat, groupMean.lng);
  for (const cluster of clusters.slice(1)) {
    const m = meanPoint(cluster);
    const d = haversineKm(m.lat, m.lng, groupMean.lat, groupMean.lng);
    const better =
      cluster.length > winner.length ||
      (cluster.length === winner.length &&
        (d < winnerDist ||
          (d === winnerDist &&
            (m.lat < winnerMean.lat ||
              (m.lat === winnerMean.lat && m.lng < winnerMean.lng)))));
    if (better) {
      winner = cluster;
      winnerMean = m;
      winnerDist = d;
    }
  }
  const keep = new Set(winner);
  return points.filter((p) => keep.has(p));
}

/** A name group's owned set: the dominant place's records plus any
 *  records without coordinates (unassignable, kept). Returns the
 *  input array itself when the name describes a single place. */
function ownedRecords(recs) {
  const placed = recs.filter((c) => typeof c.lat === "number" && typeof c.lng === "number");
  if (placed.length < 2) return recs;
  const owned = new Set(dominantPlaceRecords(placed));
  if (owned.size === placed.length) return recs;
  return recs.filter(
    (c) => typeof c.lat !== "number" || typeof c.lng !== "number" || owned.has(c),
  );
}

/** The committed catalogue snapshot: every record of every country
 *  chunk under src/data/countries/, tagged with its chunk's canonical
 *  country name (the index's name for the chunk's slug). The directory
 *  build partitioned the catalogue by canonical country, so a chunk
 *  is its country's record set; a record's own country field is not
 *  consulted. Records keep every field the derivation reads (id,
 *  name, city, source, stream_type, lat, lng). */
function snapshotChunks() {
  const dataDir = join(ROOT, "src", "data");
  const index = JSON.parse(readFileSync(join(dataDir, "camera-countries.json"), "utf8"));
  const slugToName = new Map(index.countries.map((c) => [c.slug, c.name]));
  const out = [];
  for (const file of readdirSync(join(dataDir, "countries"))) {
    if (!file.endsWith(".json")) continue;
    const country = slugToName.get(file.replace(/\.json$/, ""));
    if (!country) throw new Error(`country chunk with no index entry: ${file}`);
    const recs = JSON.parse(readFileSync(join(dataDir, "countries", file), "utf8"));
    for (const r of recs) out.push({ ...r, __country: country });
  }
  console.log(`Committed snapshot (${index.generatedAt}): ${out.length} records in ${slugToName.size} country chunks`);
  return out;
}

/** The previous build's file, for the PRESERVE rule (header §4).
 *  Null on a first-ever build. */
function previousFile() {
  const p = join(ROOT, "src", "data", "city-pages.json");
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

function excludedReason(city, country) {
  if (JUNK_CITIES.has(city)) return "junk value";
  if (city === country) return "country name, not a city";
  if (country === "Hong Kong") return "a Hong Kong district, not a city";
  if (city.includes("_") || city.endsWith(" Cameras") || /^[A-Z]{2,5}$/.test(city)) return "a camera-system/code label, not a city";
  if (city.endsWith(" County")) return "a county";
  if (country === "United States" && US_STATES.has(city)) return "a US state";
  if (country === "Canada" && CA_PROVINCES.has(city)) return "a Canadian province";
  if (/^A\d+[\s-]/.test(city) || /^I-\d+/.test(city) || /^US-?\d+/.test(city)) return "a motorway/route corridor";
  if (/^Province \d+$/.test(city)) return "a province label, not a city";
  // A parenthesised qualifier files a sub-city district or a
  // qualified area, not the bare city: every at-scale instance in
  // the snapshot is one (Ulsan's five gu/gun district labels —
  // 남구/북구/중구/울주군/동구, 193 cameras in all — Geoje's
  // myeon/dong labels, and the Québec region label above).
  if (/\([^)]*\)/.test(city)) return "a district/qualified label, not a bare city name";
  if (city.startsWith("in ") || city.endsWith(" Area")) return "malformed/area label";
  if (MANUAL_EXCLUDES.has(`${city}|${country}`)) return "region/district (manual)";
  return null;
}

async function main() {
  const byId = new Map();
  for (const c of snapshotChunks()) if (c && c.id && !byId.has(c.id)) byId.set(c.id, c);
  const cameras = [...byId.values()];
  console.log(`Snapshot catalogue (deduped by id): ${cameras.length}`);

  const countryTotals = new Map();
  const groups = new Map(); // "city|country" -> records[]
  for (const cam of cameras) {
    const country = cam.__country;
    countryTotals.set(country, (countryTotals.get(country) || 0) + 1);
    const city = CITY_ALIASES[cleanName(cam.city)] || cleanName(cam.city);
    if (!city) continue;
    const key = `${city}|${country}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(cam);
  }

  // PRESERVE (header §4): entries the previous build already published
  // are carried over byte-for-byte; this build only derives entries
  // for groups that have none.
  const prev = previousFile();
  const prevByKey = new Map(
    (prev?.cities ?? []).map((c) => [`${c.name}|${c.country}`, c]),
  );
  const prevCountryTotals = new Map();
  for (const c of prev?.cities ?? []) {
    if (!prevCountryTotals.has(c.country)) prevCountryTotals.set(c.country, c.countryTotal);
  }
  if (prev) console.log(`Preserving ${prevByKey.size} existing entries; deriving new groups from the snapshot.`);

  const usedSlugs = new Set([...CURATED_SLUGS, ...(prev?.cities ?? []).map((c) => c.slug)]);
  // Preserved entries enter in the previous file's own order: the
  // final sort by count is stable, so this keeps every published
  // page's position among equals (file order drives the generated
  // tier's sibling/top related lists) exactly as it was.
  const cities = [...(prev?.cities ?? [])];
  const added = [];
  const dropped = [];
  for (const [key, recs] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const [city, country] = key.split("|");
    if (prevByKey.has(key)) continue; // preserved above, verbatim
    // The page owns the dominant place filed under this name: the
    // bar, the counts, the sources and the samples all describe the
    // owned set (owner decision, 2026-10-27 — a name that files two
    // places earns its page from the place the page will describe).
    const owned = ownedRecords(recs);
    if (owned.length < THRESHOLD && !EDITORIAL_INCLUSIONS.has(key)) continue;
    const reason = excludedReason(city, country);
    if (reason) {
      dropped.push(`${key} (merged ${recs.length}, owned ${owned.length}) — ${reason}`);
      continue;
    }
    const countrySlug = slugify(country);
    let slug = slugify(city);
    if (!slug) {
      dropped.push(`${key} (merged ${recs.length}, owned ${owned.length}) — no Latin-letter slug (non-Latin duplicate of another cluster)`);
      continue;
    }
    if (CURATED_SLUGS.has(slug)) {
      dropped.push(`${key} (merged ${recs.length}, owned ${owned.length}) — hand-written editorial page`);
      continue;
    }
    if (usedSlugs.has(slug)) slug = `${slug}-${countrySlug}`;
    if (usedSlugs.has(slug)) throw new Error(`slug collision: ${slug}`);
    usedSlugs.add(slug);

    const srcCounts = new Map();
    let stills = 0;
    let streams = 0;
    for (const c of owned) {
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
    const byNameLen = [...owned].sort((a, b) => cleanName(b.name).length - cleanName(a.name).length);
    for (const c of byNameLen) {
      const nm = cleanName(c.name);
      if (nm.length < 8 || /^https?:/i.test(nm) || seenNames.has(nm.toLowerCase())) continue;
      seenNames.add(nm.toLowerCase());
      samples.push({ id: c.id, name: nm.slice(0, 80) });
      if (samples.length >= 12) break;
    }

    const entry = {
      slug,
      name: city,
      country,
      countrySlug,
      count: owned.length,
      // The tier quotes one country total per country: inherit the
      // preserved tier's total where it has one (header §4).
      countryTotal: prevCountryTotals.get(country) ?? countryTotals.get(country),
      sources,
      sourceCount,
      stills,
      streams,
      samples,
    };
    cities.push(entry);
    added.push(entry);
  }

  cities.sort((a, b) => b.count - a.count);
  const out = {
    generatedAt: prev?.generatedAt ?? new Date().toISOString(),
    assembledTotal: prev?.assembledTotal ?? cameras.length,
    threshold: THRESHOLD,
    cities,
  };
  const dir = join(ROOT, "src", "data");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "city-pages.json"), JSON.stringify(out, null, 1));
  console.log(`Wrote ${cities.length} generated cities (${prevByKey.size} preserved, ${added.length} new at >= ${THRESHOLD} owned cameras).`);
  console.log("New:", added.length ? added.map((c) => `${c.slug} (${c.count})`).join(", ") : "none");
  console.log("Largest:", cities.slice(0, 5).map((c) => `${c.name} (${c.count})`).join(", "));
  console.log("Smallest:", cities.slice(-3).map((c) => `${c.name} (${c.count})`).join(", "));
  console.log("Excluded at/above threshold:", dropped.length ? dropped.join("; ") : "none");
}

main().catch((e) => { console.error(e); process.exit(1); });
