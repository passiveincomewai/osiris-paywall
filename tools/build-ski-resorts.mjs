/**
 * Build the ski-resort directory (src/data/ski-resorts.json) from the same
 * generated per-country camera chunks the country pages serve
 * (src/data/countries/<slug>.json).
 *
 * The candidate list below is real, named resorts with their base-area
 * coordinates (public geography). A candidate only becomes a page when the
 * served catalogue actually covers it: at least one camera within
 * RESORT_RADIUS_KM of the base and at least MIN_TOTAL cameras within
 * NEARBY_RADIUS_KM. Counts in the output are computed here, never written
 * by hand, so a resort page cannot claim cameras the catalogue lacks.
 * Candidates closer than CLOSE_PAIR_KM to each other (Alta/Snowbird,
 * Park City/Deer Valley) collapse to the better-covered one — two pages
 * over the same camera set would be one page wearing two hats.
 *
 * Usage: node tools/build-ski-resorts.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export const RESORT_RADIUS_KM = 10;
export const NEARBY_RADIUS_KM = 40;
export const MIN_TOTAL = 4;
export const CLOSE_PAIR_KM = 6;

/* name, town, region (state/province/canton), country, country chunk slug,
   base-area latitude, longitude. */
const CANDIDATES = [
  // ── United States ──────────────────────────────────────────────────
  ['Vail', 'Vail', 'Colorado', 'United States', 'united-states', 39.6403, -106.3742],
  ['Aspen', 'Aspen', 'Colorado', 'United States', 'united-states', 39.1911, -106.8175],
  ['Breckenridge', 'Breckenridge', 'Colorado', 'United States', 'united-states', 39.4817, -106.0384],
  ['Keystone', 'Keystone', 'Colorado', 'United States', 'united-states', 39.6069, -105.9437],
  ['Arapahoe Basin', 'Arapahoe Basin', 'Colorado', 'United States', 'united-states', 39.6425, -105.8717],
  ['Copper Mountain', 'Copper Mountain', 'Colorado', 'United States', 'united-states', 39.5017, -106.1578],
  ['Winter Park', 'Winter Park', 'Colorado', 'United States', 'united-states', 39.8917, -105.7631],
  ['Steamboat', 'Steamboat Springs', 'Colorado', 'United States', 'united-states', 40.4572, -106.8045],
  ['Telluride', 'Telluride', 'Colorado', 'United States', 'united-states', 37.9375, -107.8123],
  ['Crested Butte', 'Crested Butte', 'Colorado', 'United States', 'united-states', 38.8999, -106.9658],
  ['Park City', 'Park City', 'Utah', 'United States', 'united-states', 40.6461, -111.498],
  ['Deer Valley', 'Park City', 'Utah', 'United States', 'united-states', 40.6375, -111.4783],
  ['Snowbird', 'Little Cottonwood Canyon', 'Utah', 'United States', 'united-states', 40.583, -111.654],
  ['Alta', 'Little Cottonwood Canyon', 'Utah', 'United States', 'united-states', 40.5884, -111.637],
  ['Brighton', 'Big Cottonwood Canyon', 'Utah', 'United States', 'united-states', 40.598, -111.5832],
  ['Snowbasin', 'Huntsville', 'Utah', 'United States', 'united-states', 41.2166, -111.8568],
  ['Jackson Hole', 'Teton Village', 'Wyoming', 'United States', 'united-states', 43.5875, -110.8279],
  ['Mammoth Mountain', 'Mammoth Lakes', 'California', 'United States', 'united-states', 37.6503, -118.9845],
  ['Palisades Tahoe', 'Olympic Valley', 'California', 'United States', 'united-states', 39.1966, -120.2357],
  ['Heavenly', 'South Lake Tahoe', 'California', 'United States', 'united-states', 38.9393, -119.9106],
  ['Big Sky', 'Big Sky', 'Montana', 'United States', 'united-states', 45.2856, -111.4014],
  ['Sun Valley', 'Ketchum', 'Idaho', 'United States', 'united-states', 43.697, -114.3525],
  ['Mt. Bachelor', 'Bend', 'Oregon', 'United States', 'united-states', 43.9795, -121.6856],
  ['Crystal Mountain', 'Crystal Mountain', 'Washington', 'United States', 'united-states', 46.9356, -121.4745],
  ['Stevens Pass', 'Skykomish', 'Washington', 'United States', 'united-states', 47.7448, -121.0859],
  ['Taos Ski Valley', 'Taos Ski Valley', 'New Mexico', 'United States', 'united-states', 36.5966, -105.453],
  ['Killington', 'Killington', 'Vermont', 'United States', 'united-states', 43.6045, -72.8201],
  ['Stowe', 'Stowe', 'Vermont', 'United States', 'united-states', 44.5303, -72.7814],
  ['Sugarloaf', 'Carrabassett Valley', 'Maine', 'United States', 'united-states', 45.0534, -70.3133],
  ['Whiteface', 'Lake Placid', 'New York', 'United States', 'united-states', 44.3659, -73.9026],
  // ── Canada ─────────────────────────────────────────────────────────
  ['Whistler Blackcomb', 'Whistler', 'British Columbia', 'Canada', 'canada', 50.1163, -122.9574],
  ['Sunshine Village', 'Banff', 'Alberta', 'Canada', 'canada', 51.1152, -115.7631],
  ['Lake Louise', 'Lake Louise', 'Alberta', 'Canada', 'canada', 51.4254, -116.1773],
  ['Revelstoke', 'Revelstoke', 'British Columbia', 'Canada', 'canada', 50.9584, -118.214],
  ['Mont Tremblant', 'Mont-Tremblant', 'Quebec', 'Canada', 'canada', 46.2095, -74.5852],
  // ── The Alps & Europe ──────────────────────────────────────────────
  ['Chamonix', 'Chamonix-Mont-Blanc', 'Haute-Savoie', 'France', 'france', 45.9237, 6.8694],
  ["Val d'Isère", "Val d'Isère", 'Savoie', 'France', 'france', 45.448, 6.9802],
  ['Courchevel', 'Courchevel', 'Savoie', 'France', 'france', 45.4154, 6.6347],
  ['Zermatt', 'Zermatt', 'Valais', 'Switzerland', 'switzerland', 46.0207, 7.7491],
  ['St. Moritz', 'St. Moritz', 'Graubünden', 'Switzerland', 'switzerland', 46.4908, 9.7748],
  ['Verbier', 'Verbier', 'Valais', 'Switzerland', 'switzerland', 46.0966, 7.2286],
  ['Davos', 'Davos', 'Graubünden', 'Switzerland', 'switzerland', 46.8027, 9.836],
  ['St. Anton am Arlberg', 'St. Anton am Arlberg', 'Tyrol', 'Austria', 'austria', 47.1286, 10.2646],
  ['Kitzbühel', 'Kitzbühel', 'Tyrol', 'Austria', 'austria', 47.4444, 12.3914],
  ['Sölden', 'Sölden', 'Tyrol', 'Austria', 'austria', 46.9655, 11.0068],
  ["Cortina d'Ampezzo", "Cortina d'Ampezzo", 'Belluno', 'Italy', 'italy', 46.4102, 12.1357],
  ['Val Gardena', 'Ortisei', 'South Tyrol', 'Italy', 'italy', 46.5597, 11.7598],
  ['Cervinia', 'Breuil-Cervinia', 'Aosta Valley', 'Italy', 'italy', 45.9344, 7.6313],
  ['Sierra Nevada', 'Pradollano', 'Granada', 'Spain', 'spain', 37.096, -3.3927],
  ['Geilo', 'Geilo', 'Buskerud', 'Norway', 'norway', 60.5345, 8.2077],
  ['Hemsedal', 'Hemsedal', 'Buskerud', 'Norway', 'norway', 60.8633, 8.514],
  // ── Japan ──────────────────────────────────────────────────────────
  ['Niseko', 'Kutchan', 'Hokkaido', 'Japan', 'japan', 42.8628, 140.7043],
  ['Hakuba', 'Hakuba', 'Nagano', 'Japan', 'japan', 36.698, 137.8619],
  ['Nozawa Onsen', 'Nozawa Onsen', 'Nagano', 'Japan', 'japan', 36.9236, 138.4514],
  ['Furano', 'Furano', 'Hokkaido', 'Japan', 'japan', 43.3248, 142.3934],
  // ── Southern hemisphere ────────────────────────────────────────────
  ['Queenstown', 'Queenstown', 'Otago', 'New Zealand', 'new-zealand', -45.0312, 168.6626],
  ['Mt Hutt', 'Methven', 'Canterbury', 'New Zealand', 'new-zealand', -43.4689, 171.5253],
  ['Thredbo', 'Thredbo', 'New South Wales', 'Australia', 'australia', -36.5041, 148.3056],
  ['Perisher', 'Perisher Valley', 'New South Wales', 'Australia', 'australia', -36.4053, 148.4106],
];

function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const chunkCache = new Map();
function loadChunk(slug) {
  if (!chunkCache.has(slug)) {
    try {
      chunkCache.set(slug, JSON.parse(readFileSync(join(ROOT, 'src/data/countries', `${slug}.json`), 'utf8')));
    } catch {
      chunkCache.set(slug, []);
    }
  }
  return chunkCache.get(slug);
}

const scored = [];
for (const [name, town, region, country, countrySlug, lat, lng] of CANDIDATES) {
  const records = loadChunk(countrySlug);
  let resortCameras = 0;
  let nearbyCameras = 0;
  for (const cam of records) {
    if (typeof cam.lat !== 'number' || typeof cam.lng !== 'number') continue;
    const d = haversineKm(lat, lng, cam.lat, cam.lng);
    if (d <= RESORT_RADIUS_KM) resortCameras += 1;
    else if (d <= NEARBY_RADIUS_KM) nearbyCameras += 1;
  }
  scored.push({ name, town, region, country, countrySlug, lat, lng, resortCameras, nearbyCameras });
}

/* Coverage gate: a page exists only where the catalogue backs it. */
const covered = scored.filter(
  (r) => r.resortCameras >= 1 && r.resortCameras + r.nearbyCameras >= MIN_TOTAL,
);

/* Close pairs share one camera set; keep the better-covered page. */
covered.sort((a, b) => b.resortCameras - a.resortCameras);
const kept = [];
const dropped = [];
for (const r of covered) {
  const twin = kept.find((k) => haversineKm(k.lat, k.lng, r.lat, r.lng) < CLOSE_PAIR_KM);
  if (twin) dropped.push(`${r.name} (within ${CLOSE_PAIR_KM} km of ${twin.name}, fewer resort cameras)`);
  else kept.push(r);
}

kept.sort((a, b) => b.resortCameras + b.nearbyCameras - (a.resortCameras + a.nearbyCameras));

const out = {
  generatedAt: new Date().toISOString(),
  resortRadiusKm: RESORT_RADIUS_KM,
  nearbyRadiusKm: NEARBY_RADIUS_KM,
  resorts: kept.map((r) => ({
    slug: slugify(r.name),
    name: r.name,
    town: r.town,
    region: r.region,
    country: r.country,
    countrySlug: r.countrySlug,
    lat: r.lat,
    lng: r.lng,
    resortCameraCount: r.resortCameras,
    nearbyCameraCount: r.nearbyCameras,
  })),
};

writeFileSync(join(ROOT, 'src/data/ski-resorts.json'), `${JSON.stringify(out, null, 1)}\n`);

console.log(`candidates: ${CANDIDATES.length}`);
console.log(`covered:    ${covered.length}`);
console.log(`kept:       ${kept.length}`);
for (const r of kept) {
  console.log(`  ${r.name.padEnd(22)} resort ${String(r.resortCameras).padStart(4)}  nearby ${String(r.nearbyCameras).padStart(4)}`);
}
for (const r of scored) {
  if (!covered.includes(r)) console.log(`  ✗ ${r.name}: resort ${r.resortCameras}, nearby ${r.nearbyCameras} — below the coverage gate`);
}
for (const d of dropped) console.log(`  ✗ dropped close pair: ${d}`);
