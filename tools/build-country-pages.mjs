// Builds the data behind /cameras/countries — src/data/camera-countries.json
// (the index + page metadata for every country) and src/data/countries/
// <slug>.json (that country's full camera list, in page order), which
// /api/cctv/country/[country] serves to the country pages in batches.
//
// Run: node tools/build-country-pages.mjs [--from-file payload.json]
// Re-run when the catalogue has grown, then rebuild the site. --from-file
// reads a saved /api/cctv?region=all payload instead of fetching (the
// union with the local snapshot below happens either way).
//
// DERIVATION (every number on a country page reproduces from this):
//   1. Take the camera catalogue the globe serves: the production API
//      (https://worldeye.app/api/cctv?region=all — the same endpoint
//      scripts/build-camera-directory.mjs reads; the most complete of
//      several attempts wins, fewest pending regions first) unioned with
//      the route's local assembly snapshot (.cache/cctv-catalog.json),
//      deduplicated by camera id, production winning. A single build can
//      miss a region whose upstream feeds timed out; the union is the
//      fullest picture of what the loaders index — the same discipline
//      tools/build-city-pages.mjs uses.
//   2. A record's country is canonicalised with the NORMALIZE map below —
//      the same table lib/country-cameras carries at runtime (the {TH,
//      Thailand} pairing is load-bearing: Thai sources use both). Values
//      naming no country (JUNK) are NOT force-assigned: they are counted
//      as the unattributed bucket and get no page.
//   3. Per country, the same two dedupe passes the explorer has always
//      applied run at build time (by id, then near-duplicate: same
//      normalized name within ~100 m), so a page's stated count is exactly
//      the number of cards its grid can show. Dropped near-duplicates are
//      counted, never silently absorbed.
//   4. Records are stored in page order: grouped by city, biggest city
//      first (name order on a tie, then camera name), no-city records
//      last. Chunk files carry only the fields the explorer renders, with
//      absent keys omitted.
//   5. Reconciliation is a hard fail, not a hope: per-country counts +
//      unattributed + dropped near-duplicates must equal the unique-id
//      catalogue total, and the counts are written into the index file
//      next to the totals they reconcile against.
import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://worldeye.app/api/cctv?region=all";

// ISO-ish code / variant -> canonical country name. Copied from
// scripts/build-camera-directory.mjs (the directory's normalization),
// with the city generator's GB -> United Kingdom addition and three
// values the current catalogue carries that both older maps missed
// (Tanzania, Denmark, Madagascar). lib/country-cameras.ts carries the
// runtime copy — the three must agree.
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
const NEAR_DUPLICATE_DEG = 0.001;

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

function normalizedName(name) {
  return clean(name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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
    return data.cameras;
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
      if (!best || pending < best.pending || (pending === best.pending && data.cameras.length > best.cameras.length)) {
        best = { cameras: data.cameras, pending };
      }
      if (pending === 0) break;
    } catch (e) {
      console.log(`  failed: ${e.message}`);
    }
    if (attempt < 4) await new Promise((r) => setTimeout(r, 8000));
  }
  if (!best) throw new Error("production catalogue unreachable");
  return best.cameras;
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

/** The explorer's near-duplicate pass, bucketed by normalized name. */
function dedupe(records) {
  const byName = new Map();
  const out = [];
  let dropped = 0;
  for (const cam of records) {
    const name = normalizedName(cam.name);
    const hasCoords = typeof cam.lat === "number" && typeof cam.lng === "number";
    if (name && hasCoords) {
      const twins = byName.get(name) ?? [];
      if (twins.some((k) => Math.hypot(k.lat - cam.lat, k.lng - cam.lng) <= NEAR_DUPLICATE_DEG)) {
        dropped++;
        continue;
      }
      twins.push(cam);
      byName.set(name, twins);
    }
    out.push(cam);
  }
  return { kept: out, dropped };
}

/** Page order: city groups, biggest first; names inside; no-city last. */
function sortForPage(records) {
  const sizes = new Map();
  for (const cam of records) {
    const city = clean(cam.city);
    if (city) sizes.set(city, (sizes.get(city) ?? 0) + 1);
  }
  return [...records].sort((a, b) => {
    const ca = clean(a.city);
    const cb = clean(b.city);
    if (ca !== cb) {
      if (!ca) return 1;
      if (!cb) return -1;
      const bySize = (sizes.get(cb) ?? 0) - (sizes.get(ca) ?? 0);
      if (bySize !== 0) return bySize;
      return ca.localeCompare(cb);
    }
    return clean(a.name).localeCompare(clean(b.name));
  });
}

/** Only the fields the explorer renders; absent keys omitted entirely. */
function minimal(cam, countryName) {
  const out = { id: String(cam.id), name: clean(cam.name) || "Camera", country: countryName };
  const city = clean(cam.city);
  if (city) out.city = city;
  if (typeof cam.lat === "number" && Number.isFinite(cam.lat)) out.lat = Math.round(cam.lat * 1e5) / 1e5;
  if (typeof cam.lng === "number" && Number.isFinite(cam.lng)) out.lng = Math.round(cam.lng * 1e5) / 1e5;
  for (const key of ["feed_url", "stream_url", "stream_type", "external_url", "source"]) {
    const v = clean(cam[key]);
    if (v) out[key] = v;
  }
  return out;
}

async function main() {
  const fromFile = process.argv.includes("--from-file")
    ? process.argv[process.argv.indexOf("--from-file") + 1]
    : null;

  const byId = new Map();
  for (const c of await fetchCatalog(fromFile)) if (c && c.id) byId.set(String(c.id), c);
  for (const c of snapshotCatalog()) if (c && c.id && !byId.has(String(c.id))) byId.set(String(c.id), c);
  const cameras = [...byId.values()];
  const catalogueTotal = cameras.length;
  console.log(`Assembled catalogue (union, deduped by id): ${catalogueTotal}`);

  const groups = new Map(); // canonical name -> { records, aliases:Set }
  let unattributed = 0;
  const unmapped = new Set();
  for (const cam of cameras) {
    const raw = clean(cam.country);
    const name = canonical(cam.country);
    if (!name) {
      unattributed++;
      continue;
    }
    if (!(raw in NORMALIZE)) unmapped.add(raw);
    if (!groups.has(name)) groups.set(name, { records: [], aliases: new Set() });
    const g = groups.get(name);
    g.records.push(cam);
    if (raw) g.aliases.add(raw);
  }
  if (unmapped.size) console.log(`Unmapped raw values standing as their own country: ${[...unmapped].join(", ")}`);

  const countriesDir = join(ROOT, "src", "data", "countries");
  rmSync(countriesDir, { recursive: true, force: true });
  mkdirSync(countriesDir, { recursive: true });

  const countries = [];
  const usedSlugs = new Set();
  let droppedNearDuplicates = 0;
  for (const [name, g] of [...groups.entries()].sort((a, b) => b[1].records.length - a[1].records.length)) {
    const slug = slugify(name);
    if (usedSlugs.has(slug)) throw new Error(`slug collision: ${slug} (${name})`);
    usedSlugs.add(slug);

    const { kept, dropped } = dedupe(g.records);
    droppedNearDuplicates += dropped;
    const ordered = sortForPage(kept).map((cam) => minimal(cam, name));

    const cityCounts = new Map();
    for (const cam of ordered) {
      if (cam.city) cityCounts.set(cam.city, (cityCounts.get(cam.city) ?? 0) + 1);
    }
    const topCities = [...cityCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([cityName, count]) => ({ name: cityName, count }));

    const seenNames = new Set();
    const samples = [];
    for (const c of [...ordered].sort((a, b) => b.name.length - a.name.length)) {
      if (c.name.length < 8 || /^https?:/i.test(c.name) || seenNames.has(c.name.toLowerCase())) continue;
      seenNames.add(c.name.toLowerCase());
      samples.push({ id: c.id, name: c.name.slice(0, 80), city: (c.city ?? "").slice(0, 40) });
      if (samples.length >= 6) break;
    }

    writeFileSync(join(countriesDir, `${slug}.json`), JSON.stringify(ordered));
    countries.push({
      slug,
      name,
      count: ordered.length,
      aliases: [...g.aliases].sort(),
      topCities,
      cityCount: cityCounts.size,
      samples,
    });
    console.log(`  ${name}: ${ordered.length} cameras (${g.records.length} raw, ${dropped} near-dupes dropped), ${cityCounts.size} cities`);
  }

  countries.sort((a, b) => b.count - a.count);
  const attributedTotal = countries.reduce((n, c) => n + c.count, 0);

  // The reconciliation this whole tier stands on — a hard fail, not a hope.
  const reconciled = attributedTotal + unattributed + droppedNearDuplicates;
  if (reconciled !== catalogueTotal) {
    throw new Error(`RECONCILIATION FAILED: ${attributedTotal} attributed + ${unattributed} unattributed + ${droppedNearDuplicates} near-dupes = ${reconciled} != ${catalogueTotal} catalogue total`);
  }
  console.log(`Reconciliation OK: ${attributedTotal} + ${unattributed} unattributed + ${droppedNearDuplicates} near-dupes = ${catalogueTotal}`);

  const out = {
    generatedAt: new Date().toISOString(),
    catalogueTotal,
    attributedTotal,
    unattributed,
    droppedNearDuplicates,
    countries,
  };
  writeFileSync(join(ROOT, "src", "data", "camera-countries.json"), JSON.stringify(out, null, 1));
  console.log(`Wrote ${countries.length} countries to src/data/camera-countries.json + src/data/countries/*.json`);
  console.log("Top 10:", countries.slice(0, 10).map((c) => `${c.name} (${c.count})`).join(", "));
}

main().catch((e) => { console.error(e); process.exit(1); });
