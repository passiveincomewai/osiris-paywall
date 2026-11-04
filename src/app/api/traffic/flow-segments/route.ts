import { NextRequest, NextResponse } from 'next/server';
import { requestHasTrafficAccess } from '@/lib/traffic/access';
import { trafficPublicAccess } from '@/lib/traffic/public-access';
import { hereConfigured, hereFlowUrl, hereIncidentsUrl, parseHereFlow, parseHereIncidents, type BBox, type HereIncident } from '@/lib/traffic/here';
import { wsdotConfigured, wsdotTravelTimesUrl, parseWsdotTravelTimes, WA_BBOX } from '@/lib/traffic/wsdot';
import { NDW_SITES_URL, NDW_MEASUREMENTS_URL, NL_BBOX, parseNdwSiteLocations, parseNdwSpeedSamples, ndwPublicationTimeMs, type NdwSiteLocation } from '@/lib/traffic/ndw';
import type { RawFlowFeature } from '@/lib/traffic/flow';
import type { PointFlowSample } from '@/lib/traffic/flow-samples';

/**
 * OSIRIS — Multi-source traffic flow segments.
 *
 * Companion to the TomTom tile proxy (/api/traffic/flow): that route
 * serves TomTom's own vector tiles; this one serves the OTHER measured
 * sources as matchable data for the same speed model —
 *   • HERE flow + incidents (JSON shapes) when HERE_API_KEY is set,
 *   • WSDOT travel-time corridors when the view is over Washington,
 *   • NDW detector point samples when the view is over the Netherlands.
 * Line sources come back as RawFlowFeature[] (properties.relative_speed
 * + properties.source); NDW comes back as pointSamples (measured km/h +
 * source) because detector sites have no free-flow reference of their
 * own. The client's merge (lib/traffic/flow-samples) prefers the
 * freshest source per road and keeps provenance per segment.
 *
 * Access mirrors the tile proxy exactly: subscriber-gated, except
 * while the owner's temporary public-access switch is on. Every source
 * fails soft — a dead upstream omits that source, never the request —
 * and no key ever appears in a response.
 */

export const dynamic = 'force-dynamic';

const MAX_BBOX_SPAN_DEG = 1.0;

function intersects(a: BBox, b: BBox): boolean {
  return a.west <= b.east && a.east >= b.west && a.south <= b.north && a.north >= b.south;
}

function parseBbox(req: NextRequest): BBox | null {
  const raw = req.nextUrl.searchParams.get('bbox');
  if (!raw) return null;
  const parts = raw.split(',').map((s) => Number(s));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [west, south, east, north] = parts;
  if (west < -180 || east > 180 || south < -90 || north > 90) return null;
  if (east <= west || north <= south) return null;
  if (east - west > MAX_BBOX_SPAN_DEG || north - south > MAX_BBOX_SPAN_DEG) return null;
  return { west, south, east, north };
}

// ── In-instance caches (same restraint pattern as the tile proxy) ──
interface Timed<T> { value: T; expiresAt: number }
const hereCache = new Map<string, Timed<{ features: RawFlowFeature[]; incidents: HereIncident[]; at: number | null }>>();
let wsdotCache: Timed<{ features: RawFlowFeature[]; at: number | null }> | null = null;
let ndwSitesCache: Timed<Map<string, NdwSiteLocation>> | null = null;
let ndwMeasCache: Timed<{ samples: PointFlowSample[]; at: number | null }> | null = null;

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const r = await fetch(url, {
    headers: { 'User-Agent': 'WorldEye-Traffic/1.0' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  return r.text();
}

async function hereSource(bbox: BBox, key: string) {
  const q = [bbox.west, bbox.south, bbox.east, bbox.north].map((n) => Math.round(n * 50) / 50).join(',');
  const cached = hereCache.get(q);
  if (cached && Date.now() < cached.expiresAt) return cached.value;
  const [flowJson, incJson] = await Promise.all([
    fetch(hereFlowUrl(bbox, key), { signal: AbortSignal.timeout(8000) }).then((r) => (r.ok ? r.json() : null)),
    fetch(hereIncidentsUrl(bbox, key), { signal: AbortSignal.timeout(8000) }).then((r) => (r.ok ? r.json() : null)),
  ]);
  const updated = Date.parse(String((flowJson as { sourceUpdated?: unknown })?.sourceUpdated ?? ''));
  const value = {
    features: flowJson ? parseHereFlow(flowJson) : [],
    incidents: incJson ? parseHereIncidents(incJson) : [],
    at: Number.isFinite(updated) ? updated : null,
  };
  hereCache.set(q, { value, expiresAt: Date.now() + 60_000 });
  if (hereCache.size > 200) hereCache.clear();
  return value;
}

async function wsdotSource(bbox: BBox, code: string) {
  if (!wsdotCache || Date.now() >= wsdotCache.expiresAt) {
    const text = await fetchText(wsdotTravelTimesUrl(code), 8000);
    const parsed = parseWsdotTravelTimes(JSON.parse(text));
    wsdotCache = { value: parsed, expiresAt: Date.now() + 60_000 };
  }
  const { features, at } = wsdotCache.value;
  // Corridors are long; include one when its chord midpoint falls in
  // the (slightly expanded) view — the matcher limits its reach.
  const pad = 0.3;
  const kept = features.filter((f) => {
    if (!f.geometry) return false;
    const c = f.geometry.coordinates as [number, number][];
    const mx = (c[0][0] + c[1][0]) / 2;
    const my = (c[0][1] + c[1][1]) / 2;
    return mx >= bbox.west - pad && mx <= bbox.east + pad && my >= bbox.south - pad && my <= bbox.north + pad;
  });
  return { features: kept, at };
}

async function ndwSource(bbox: BBox) {
  if (!ndwSitesCache || Date.now() >= ndwSitesCache.expiresAt) {
    const xml = await fetchText(NDW_SITES_URL, 30_000);
    ndwSitesCache = { value: parseNdwSiteLocations(xml), expiresAt: Date.now() + 12 * 3600_000 };
  }
  if (!ndwMeasCache || Date.now() >= ndwMeasCache.expiresAt) {
    const xml = await fetchText(NDW_MEASUREMENTS_URL, 30_000);
    ndwMeasCache = {
      value: { samples: parseNdwSpeedSamples(xml, ndwSitesCache.value), at: ndwPublicationTimeMs(xml) },
      expiresAt: Date.now() + 120_000,
    };
  }
  const { samples, at } = ndwMeasCache.value;
  const kept = samples.filter(
    (s) => s.lng >= bbox.west && s.lng <= bbox.east && s.lat >= bbox.south && s.lat <= bbox.north,
  );
  return { samples: kept, at };
}

export async function GET(req: NextRequest) {
  const bbox = parseBbox(req);
  if (!bbox) return new NextResponse(null, { status: 400 });
  if (!trafficPublicAccess() && !(await requestHasTrafficAccess())) {
    return NextResponse.json(
      { error: 'subscription_required' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const features: RawFlowFeature[] = [];
  const pointSamples: PointFlowSample[] = [];
  const incidents: HereIncident[] = [];
  let attempted = 0;
  let failed = 0;
  let newestAt = 0;

  if (hereConfigured()) {
    attempted += 1;
    try {
      const h = await hereSource(bbox, process.env.HERE_API_KEY as string);
      features.push(...h.features);
      incidents.push(...h.incidents);
      if (h.at) newestAt = Math.max(newestAt, h.at);
    } catch { failed += 1; }
  }
  if (wsdotConfigured() && intersects(bbox, WA_BBOX)) {
    attempted += 1;
    try {
      const w = await wsdotSource(bbox, (process.env.WSDOT_ACCESS_CODE as string).trim());
      features.push(...w.features);
      if (w.at) newestAt = Math.max(newestAt, w.at);
    } catch { failed += 1; }
  }
  if (intersects(bbox, NL_BBOX)) {
    attempted += 1;
    try {
      const n = await ndwSource(bbox);
      pointSamples.push(...n.samples);
      if (n.at) newestAt = Math.max(newestAt, n.at);
    } catch { failed += 1; }
  }

  if (attempted === 0) return new NextResponse(null, { status: 204 });
  if (failed === attempted && features.length === 0 && pointSamples.length === 0) {
    return NextResponse.json({ error: 'upstream' }, { status: 502 });
  }
  return NextResponse.json(
    {
      at: newestAt ? new Date(newestAt).toISOString() : null,
      features,
      pointSamples,
      incidents,
    },
    { headers: { 'Cache-Control': 'private, max-age=60' } },
  );
}
