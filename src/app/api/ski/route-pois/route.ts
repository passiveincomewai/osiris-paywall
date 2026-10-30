import { NextResponse } from 'next/server';

export const maxDuration = 30;

/**
 * OSIRIS — stops along a driving route, for the ski route tool (P7).
 *
 * POST { route: [lng, lat][] }
 *   → { corridorKm, pois: [{ id, category, name, lat, lng, alongKm, offKm }] }
 *
 * Data is OpenStreetMap via the keyless Overpass API — the same
 * open-data family the site's routing already uses. The route is
 * sampled every few kilometres, each sample asks Overpass for the
 * five stop categories within POI_CORRIDOR_KM of the line, and the
 * results are re-measured against the actual polyline here (the
 * around-radius is a circle per sample; the corridor rule below is
 * the polyline distance, so a stop behind a ridge the road bends
 * away from does not slip in). Names come from the OSM record
 * itself; a stop with no name tag is labelled by its category —
 * never given an invented name. Any Overpass failure surfaces as a
 * 502 so the client can say plainly that stops are unavailable.
 */

const POI_CORRIDOR_KM = 1.5;
const SAMPLE_EVERY_KM = 6;
const MAX_SAMPLES = 25;
const MAX_PER_CATEGORY = 60;
const MAX_ROUTE_POINTS = 6000;

type PoiCategory = 'fuel' | 'ev' | 'food' | 'lodging' | 'parking';

const CATEGORY_TAGS: Record<PoiCategory, string[]> = {
  fuel: ['node["amenity"="fuel"]'],
  ev: ['node["amenity"="charging_station"]'],
  food: [
    'node["amenity"="restaurant"]',
    'node["amenity"="fast_food"]',
    'node["amenity"="cafe"]',
  ],
  lodging: [
    'node["tourism"="hotel"]',
    'node["tourism"="motel"]',
    'node["tourism"="guest_house"]',
    'node["tourism"="hostel"]',
  ],
  parking: ['node["amenity"="parking"]'],
};

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

  const statements: string[] = [];
  for (const cat of Object.keys(CATEGORY_TAGS) as PoiCategory[]) {
    for (const tag of CATEGORY_TAGS[cat]) {
      for (const s of samples) {
        statements.push(`${tag}(around:${radiusM},${s.lat.toFixed(5)},${s.lng.toFixed(5)});`);
      }
    }
  }
  const query = `[out:json][timeout:25];(${statements.join('')});out body 800;`;

  let elements: OverpassElement[];
  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'WorldEye ski route tool (worldeye.app)',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(28000),
    });
    if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
    const json = (await res.json()) as { elements?: OverpassElement[] };
    elements = json.elements ?? [];
  } catch {
    return NextResponse.json(
      { error: 'Stops data is unavailable right now' },
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
    { corridorKm: POI_CORRIDOR_KM, pois },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } },
  );
}
