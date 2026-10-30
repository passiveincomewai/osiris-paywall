import { NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * OSIRIS — stops along a driving route, for the ski route tool (P7).
 *
 * POST { route: [lng, lat][] }
 *   → { corridorKm, pois: [{ id, category, name, lat, lng, alongKm, offKm }] }
 *
 * Data is OpenStreetMap via the keyless Overpass API — the same
 * open-data family the site's routing already uses. The route is
 * sampled every few kilometres; the samples form a polyline that a
 * single two-statement Overpass query searches for the five stop
 * categories within POI_CORRIDOR_KM, and the results are
 * re-measured against the actual polyline here (the corridor rule
 * below is the true polyline distance, so a stop behind a ridge
 * the road bends away from does not slip in). Names come from the
 * OSM record itself; a stop with no name tag is labelled by its
 * category — never given an invented name. Any Overpass failure
 * surfaces as a 502 so the client can say plainly that stops are
 * unavailable.
 */

const POI_CORRIDOR_KM = 1.5;
const SAMPLE_EVERY_KM = 6;
const MAX_SAMPLES = 25;
const MAX_PER_CATEGORY = 60;
const MAX_ROUTE_POINTS = 6000;

type PoiCategory = 'fuel' | 'ev' | 'food' | 'lodging' | 'parking';

/* Tag values per OSM key, unioned into the two query statements.
   The response classification further down maps the same values
   back to categories. */
const AMENITY_VALUES = ['fuel', 'charging_station', 'restaurant', 'fast_food', 'cafe', 'parking'];
const TOURISM_VALUES = ['hotel', 'motel', 'guest_house', 'hostel'];

/**
 * Public Overpass instances, asked in parallel (see
 * fetchOverpassElements). TEMPORARY (diagnostic build, 2026-10-30):
 * the full candidate list is attempted so one live probe from the
 * production network can show which instances answer there at all;
 * the final build keeps only the instances that answer.
 */
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
  'https://overpass.nchc.org.tw/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const OVERPASS_BUDGET_MS = 52_000;

const CATEGORY_FALLBACK_NAME: Record<PoiCategory, string> = {
  fuel: 'Fuel station',
  ev: 'EV charging station',
  food: 'Food stop',
  lodging: 'Lodging',
  parking: 'Parking',
};

interface RoutePoi {
  id: string;
  category: PoiCategory;
  name: string;
  lat: number;
  lng: number;
  alongKm: number;
  offKm: number;
}

function isRoutePoint(p: unknown): p is [number, number] {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1]) &&
    (p[1] as number) >= -90 &&
    (p[1] as number) <= 90 &&
    (p[0] as number) >= -180 &&
    (p[0] as number) <= 180
  );
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

/** Cumulative distance (km) at each route vertex. */
function cumulativeKm(route: [number, number][]): number[] {
  const cum = [0];
  for (let i = 1; i < route.length; i++) {
    cum.push(cum[i - 1] + haversineKm(route[i - 1][1], route[i - 1][0], route[i][1], route[i][0]));
  }
  return cum;
}

/** Sample points spaced along the route for the Overpass around-queries. */
function sampleRoute(
  route: [number, number][],
  cum: number[],
): Array<{ lat: number; lng: number }> {
  const total = cum[cum.length - 1];
  const samples: Array<{ lat: number; lng: number }> = [];
  const step = Math.max(SAMPLE_EVERY_KM, total / MAX_SAMPLES);
  let nextAt = 0;
  for (let i = 0; i < route.length; i++) {
    if (cum[i] >= nextAt || i === route.length - 1) {
      samples.push({ lat: route[i][1], lng: route[i][0] });
      nextAt = cum[i] + step;
    }
  }
  return samples;
}

/** Distance from a point to the polyline + progress along it. */
function measureToRoute(
  lat: number,
  lng: number,
  route: [number, number][],
  cum: number[],
): { offKm: number; alongKm: number } {
  let best = { offKm: Infinity, alongKm: 0 };
  const cosLat = Math.cos((lat * Math.PI) / 180);
  for (let i = 1; i < route.length; i++) {
    const [x1, y1] = route[i - 1];
    const [x2, y2] = route[i];
    /* Equirectangular projection around the point — accurate at
       corridor scale and cheap enough for a few hundred POIs. */
    const px = (lng - x1) * cosLat;
    const py = lat - y1;
    const dx = (x2 - x1) * cosLat;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
    const projLat = y1 + t * (y2 - y1);
    const projLng = x1 + t * (x2 - x1);
    const off = haversineKm(lat, lng, projLat, projLng);
    if (off < best.offKm) {
      const segKm = cum[i] - cum[i - 1];
      best = { offKm: off, alongKm: cum[i - 1] + t * segKm };
    }
  }
  return best;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

/**
 * Ask every instance at once and take the first good answer. The
 * public Overpass servers are chronically queue-bound — measured
 * 2026-10-30, a single-statement query took 26–93 s end-to-end and
 * several mirrors never answered at all — so one instance inside
 * one short budget (the original design: ~200 statements, a 25 s
 * in-query timeout, a 28 s abort) failed essentially every time.
 * Hedging two instances with a two-statement query over a ~52 s
 * budget is what makes the endpoint reliable; if every instance
 * fails, the caller still gets the honest 502.
 */
async function fetchOverpassElements(
  query: string,
  report: string[],
  waitAll: boolean,
): Promise<OverpassElement[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OVERPASS_BUDGET_MS);
  const attempt = async (url: string): Promise<OverpassElement[]> => {
    const host = new URL(url).host;
    const t0 = Date.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'WorldEye ski route tool (worldeye.app)',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { elements?: OverpassElement[] };
      const els = json.elements ?? [];
      report.push(`${host}: OK ${els.length} els in ${Date.now() - t0}ms`);
      return els;
    } catch (err) {
      const e = err as Error & { cause?: Error };
      report.push(
        `${host}: ${e.message}${e.cause ? ` (${e.cause.message})` : ''} in ${Date.now() - t0}ms`,
      );
      throw err;
    }
  };
  try {
    return await new Promise<OverpassElement[]>((resolve, reject) => {
      let settled = false;
      let done = 0;
      let winner: OverpassElement[] | null = null;
      const finish = () => {
        if (settled) return;
        if (winner) {
          settled = true;
          resolve(winner);
        } else if (done === OVERPASS_ENDPOINTS.length) {
          settled = true;
          reject(new Error('all Overpass instances failed'));
        }
      };
      for (const url of OVERPASS_ENDPOINTS) {
        attempt(url).then(
          (els) => {
            done += 1;
            if (!winner) winner = els;
            if (!waitAll || done === OVERPASS_ENDPOINTS.length) finish();
          },
          () => {
            done += 1;
            if (!waitAll || done === OVERPASS_ENDPOINTS.length) finish();
          },
        );
      }
    });
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

export async function POST(request: Request) {
  let body: { route?: unknown };
  try {
    body = (await request.json()) as { route?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!Array.isArray(body.route) || body.route.length < 2 || !body.route.every(isRoutePoint)) {
    return NextResponse.json(
      { error: 'route must be an array of at least two [lng, lat] points' },
      { status: 400 },
    );
  }
  const route = body.route.slice(0, MAX_ROUTE_POINTS) as [number, number][];
  const cum = cumulativeKm(route);
  const samples = sampleRoute(route, cum);
  const radiusM = Math.round(POI_CORRIDOR_KM * 1000);

  /* One around-search per OSM key along the whole sample polyline
     (2 statements total — the original per-sample form needed ~200
     and drowned in the public instances' queues). The result set is
     the same; every element is still re-measured below. */
  const coords = samples.map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join(',');
  const query =
    `[out:json][timeout:50];(` +
    `node["amenity"~"^(${AMENITY_VALUES.join('|')})$"](around:${radiusM},${coords});` +
    `node["tourism"~"^(${TOURISM_VALUES.join('|')})$"](around:${radiusM},${coords});` +
    `);out body 800;`;

  /* TEMPORARY diagnostic (ski-pois reliability work, 2026-10-30):
     callers sending x-pois-debug: 1 make the fetch wait for every
     instance to settle and get the per-instance outcomes in the
     `upstream` field of either response, so one live probe from the
     production network shows which instances answer there and how
     the rest fail. Remove once the fix is verified. */
  const debug = request.headers.get('x-pois-debug') === '1';
  const report: string[] = [];
  let elements: OverpassElement[];
  try {
    elements = await fetchOverpassElements(query, report, debug);
  } catch {
    return NextResponse.json(
      {
        error: 'Stops data is unavailable right now',
        ...(debug ? { upstream: report } : {}),
      },
      { status: 502 },
    );
  }

  const byId = new Map<string, RoutePoi>();
  const perCategory = new Map<PoiCategory, number>();
  for (const el of elements) {
    if (el.type !== 'node' || typeof el.lat !== 'number' || typeof el.lon !== 'number') continue;
    const tags = el.tags ?? {};
    let category: PoiCategory | null = null;
    if (tags.amenity === 'fuel') category = 'fuel';
    else if (tags.amenity === 'charging_station') category = 'ev';
    else if (tags.amenity === 'parking') category = 'parking';
    else if (['restaurant', 'fast_food', 'cafe'].includes(tags.amenity ?? '')) category = 'food';
    else if (['hotel', 'motel', 'guest_house', 'hostel'].includes(tags.tourism ?? ''))
      category = 'lodging';
    if (!category) continue;
    const { offKm, alongKm } = measureToRoute(el.lat, el.lon, route, cum);
    if (offKm > POI_CORRIDOR_KM) continue;
    const id = `osm-${el.id}`;
    if (byId.has(id)) continue;
    const count = perCategory.get(category) ?? 0;
    if (count >= MAX_PER_CATEGORY) continue;
    perCategory.set(category, count + 1);
    byId.set(id, {
      id,
      category,
      name: tags.name ?? tags.brand ?? CATEGORY_FALLBACK_NAME[category],
      lat: el.lat,
      lng: el.lon,
      alongKm: Math.round(alongKm * 10) / 10,
      offKm: Math.round(offKm * 100) / 100,
    });
  }

  const pois = [...byId.values()].sort((a, b) => a.alongKm - b.alongKm);
  return NextResponse.json(
    { corridorKm: POI_CORRIDOR_KM, pois, ...(debug ? { upstream: report } : {}) },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } },
  );
}
