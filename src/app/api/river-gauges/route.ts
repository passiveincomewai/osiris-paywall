import { NextRequest, NextResponse } from 'next/server';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — River Gauges: real-time USGS stream gauges (gage height +
 * discharge) from the USGS Water Data OGC API (`latest-continuous`).
 *
 * Keyless, US public domain. The full national pull is two parameter
 * series (00065 gage height, 00060 discharge) merged per monitoring
 * location, trimmed to a compact record per gauge, and cached server-side
 * for 10 minutes — clients never touch the USGS paging API directly.
 * Gauges whose newest reading is over 48 h old are dropped: this is a
 * real-time layer, not a directory of silent stations.
 *
 * Flood stage is NOT part of this dataset (it lives in NWS AHPS), so the
 * layer reports height/flow only and claims no flood status.
 *
 * `?site=10346000` resolves one gauge's official name/state/type from the
 * monitoring-locations collection (the bulk list carries no names).
 * Source: USGS — https://waterdata.usgs.gov/
 */

export const dynamic = 'force-dynamic';

const OGC = 'https://api.waterdata.usgs.gov/ogcapi/v0/collections';
const FRESH_MS = 48 * 60 * 60_000;
const PROPS = 'monitoring_location_id,parameter_code,value,time';

interface Gauge {
  id: string; // site number, e.g. "10346000"
  lat: number;
  lng: number;
  gh?: number; // gage height, ft
  flow?: number; // discharge, ft³/s
  t: string; // newest reading time (ISO)
}

async function fetchSeries(param: string): Promise<any[]> {
  const items: any[] = [];
  let url: string | null =
    `${OGC}/latest-continuous/items?parameter_code=${param}` +
    `&limit=10000&properties=${PROPS}&f=json`;
  for (let page = 0; page < 4 && url; page++) {
    const res: Response = await fetch(url, {
      headers: { 'User-Agent': 'OSIRIS-Intelligence-Platform/3.5' },
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) throw new Error(`USGS ${param} → ${res.status}`);
    const fc: any = await res.json();
    items.push(...(fc.features ?? []));
    const next: any = (fc.links ?? []).find((l: any) => l.rel === 'next');
    url = next?.href ?? null;
  }
  return items;
}

function sane(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'string' ? parseFloat(value) : (value as number);
  return typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max ? n : null;
}

async function fetchGauges(): Promise<Gauge[]> {
  const bySite = new Map<string, Gauge>();
  const series = await Promise.allSettled([fetchSeries('00065'), fetchSeries('00060')]);
  for (const result of series) {
    if (result.status !== 'fulfilled') continue;
    for (const f of result.value) {
      const coords = f.geometry?.coordinates;
      const p = f.properties ?? {};
      const rawId: string = p.monitoring_location_id ?? '';
      const id = rawId.replace(/^USGS-/, '');
      if (!id || !Array.isArray(coords)) continue;
      const value =
        p.parameter_code === '00065'
          ? sane(p.value, -100, 10000)
          : sane(p.value, 0, 100_000_000);
      if (value == null || !p.time) continue;
      let g = bySite.get(id);
      if (!g) {
        g = {
          id,
          lat: Math.round(coords[1] * 10000) / 10000,
          lng: Math.round(coords[0] * 10000) / 10000,
          t: p.time,
        };
        bySite.set(id, g);
      }
      if (p.parameter_code === '00065') g.gh = Math.round(value * 100) / 100;
      else g.flow = Math.round(value);
      if (p.time > g.t) g.t = p.time;
    }
  }
  const cutoff = Date.now() - FRESH_MS;
  return [...bySite.values()].filter(g => new Date(g.t).getTime() >= cutoff);
}

const getGauges = cachedSource<Gauge>('usgs-river-gauges', fetchGauges, 10 * 60_000);

/* ── Single-site name lookup (popup) ─────────────────────────────── */
const nameCache = new Map<string, { at: number; data: unknown }>();

async function lookupSite(id: string): Promise<unknown> {
  const hit = nameCache.get(id);
  if (hit && Date.now() - hit.at < 24 * 60 * 60_000) return hit.data;
  let data: unknown = { id, name: null };
  try {
    const res = await fetch(`${OGC}/monitoring-locations/items/USGS-${id}?f=json`, {
      headers: { 'User-Agent': 'OSIRIS-Intelligence-Platform/3.5' },
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const item = await res.json();
      const p = item.properties ?? {};
      data = {
        id,
        name: p.monitoring_location_name ?? null,
        state: p.state_name ?? null,
        county: p.county_name ?? null,
        type: p.site_type ?? null,
      };
    }
  } catch { /* popup falls back to the bare site id */ }
  nameCache.set(id, { at: Date.now(), data });
  return data;
}

export async function GET(req: NextRequest) {
  const site = req.nextUrl.searchParams.get('site');
  if (site) {
    const id = site.replace(/^USGS-/i, '');
    if (!/^[0-9A-Za-z-]{4,20}$/.test(id)) {
      return NextResponse.json({ id: site, name: null }, { status: 400 });
    }
    const data = await lookupSite(id);
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' },
    });
  }
  try {
    const gauges = await getGauges();
    return NextResponse.json(
      { gauges, count: gauges.length, source: 'USGS' },
      { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' } },
    );
  } catch {
    return NextResponse.json(
      { gauges: [], count: 0, source: 'USGS' },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=60' } },
    );
  }
}
