import { NextRequest, NextResponse } from 'next/server';
import { isIP } from 'node:net';
import { cachedSource } from '@/lib/sourceCache';
import { safeFetch, isRateLimited, getClientIp } from '@/lib/ssrf-guard';

/**
 * OSIRIS — GBFS stations proxy: given a system's GBFS auto-discovery URL
 * (from the MobilityData systems directory snapshot the client loaded),
 * resolve its station_information + station_status feeds — or
 * free_bike_status for dockless systems — and return one compact item
 * list: stations with live bikes/docks, or free-floating vehicles.
 *
 * ONE generic fetcher serves all 900+ GBFS systems; the client only ever
 * asks for systems inside the current view. Discovery documents are
 * cached an hour, live status a minute. The caller-supplied URL is held
 * to the same discipline as /api/arcgis: named hosts only, no IP
 * literals, and every hop goes through safeFetch. GBFS is a keyless,
 * public spec — https://gbfs.org/
 */

export const dynamic = 'force-dynamic';

const UA = { 'User-Agent': 'OSIRIS-Intelligence-Platform/3.5' };

function validDiscoveryUrl(raw: string | null): URL | null {
  if (!raw || raw.length > 2048) return null;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (isIP(url.hostname.replace(/^\[|\]$/g, ''))) return null;
  if (!/gbfs/i.test(url.pathname)) return null;
  url.hash = '';
  return url;
}

/* ── Discovery resolution (feed URLs change rarely) ──────────────── */
const discoveryCache = new Map<string, { at: number; feeds: Record<string, string> }>();

async function discoveryFeeds(discoveryUrl: string): Promise<Record<string, string>> {
  const hit = discoveryCache.get(discoveryUrl);
  if (hit && Date.now() - hit.at < 60 * 60_000) return hit.feeds;
  const res = await safeFetch(discoveryUrl, { headers: UA, signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`GBFS discovery ${res.status}`);
  const doc: any = await res.json();
  const data: any = doc?.data;
  const first: any = data ? Object.values(data)[0] : undefined;
  const feedsArr: any[] = Array.isArray(data?.feeds)
    ? data.feeds
    : data?.en?.feeds ?? first?.feeds ?? [];
  const feeds: Record<string, string> = {};
  for (const f of feedsArr) if (f?.name && f?.url) feeds[f.name] = f.url;
  discoveryCache.set(discoveryUrl, { at: Date.now(), feeds });
  return feeds;
}

interface GbfsItem {
  kind: 'station' | 'vehicle';
  id: string;
  name?: string;
  lat: number;
  lng: number;
  bikes?: number;
  ebikes?: number;
  docks?: number;
  vt?: string; // vehicle type id (free-floating)
}

async function fetchItems(discoveryUrl: string): Promise<GbfsItem[]> {
  const feeds = await discoveryFeeds(discoveryUrl);
  const items: GbfsItem[] = [];
  if (feeds.station_information) {
    const [infoRes, statusRes] = await Promise.all([
      safeFetch(feeds.station_information, { headers: UA, signal: AbortSignal.timeout(12000) }),
      feeds.station_status
        ? safeFetch(feeds.station_status, { headers: UA, signal: AbortSignal.timeout(12000) })
        : Promise.resolve(null),
    ]);
    if (!infoRes.ok) throw new Error(`GBFS station_information ${infoRes.status}`);
    const info = await infoRes.json();
    const statusById = new Map<string, any>();
    if (statusRes?.ok) {
      const status = await statusRes.json();
      for (const s of status?.data?.stations ?? []) statusById.set(s.station_id, s);
    }
    for (const st of info?.data?.stations ?? []) {
      if (typeof st.lat !== 'number' || typeof st.lon !== 'number') continue;
      const s = statusById.get(st.station_id);
      items.push({
        kind: 'station',
        id: String(st.station_id),
        name: st.name ?? '',
        lat: st.lat,
        lng: st.lon,
        bikes: typeof s?.num_bikes_available === 'number' ? s.num_bikes_available : undefined,
        ebikes: typeof s?.num_ebikes_available === 'number' ? s.num_ebikes_available : undefined,
        docks: typeof s?.num_docks_available === 'number' ? s.num_docks_available : undefined,
      });
      if (items.length >= 4000) break;
    }
  } else if (feeds.free_bike_status) {
    const res = await safeFetch(feeds.free_bike_status, { headers: UA, signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`GBFS free_bike_status ${res.status}`);
    const doc = await res.json();
    for (const b of doc?.data?.bikes ?? []) {
      const lat = b.lat ?? b.latitude, lng = b.lon ?? b.lng ?? b.longitude;
      if (typeof lat !== 'number' || typeof lng !== 'number' || b.is_disabled) continue;
      items.push({
        kind: 'vehicle',
        id: String(b.bike_id ?? `${lat},${lng}`),
        lat, lng,
        vt: b.vehicle_type_id ?? b.type ?? '',
      });
      if (items.length >= 4000) break;
    }
  }
  return items;
}

export async function GET(req: NextRequest) {
  if (isRateLimited(getClientIp(req), 30, 60_000)) {
    return NextResponse.json({ items: [], count: 0 }, { status: 429 });
  }
  const url = validDiscoveryUrl(req.nextUrl.searchParams.get('url'));
  if (!url) {
    return NextResponse.json({ items: [], count: 0, error: 'invalid gbfs url' }, { status: 400 });
  }
  const key = url.toString();
  try {
    const items = await cachedSource<GbfsItem>(`gbfs:${key}`, () => fetchItems(key), 60_000)();
    return NextResponse.json(
      { items, count: items.length },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } },
    );
  } catch {
    return NextResponse.json(
      { items: [], count: 0 },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=30' } },
    );
  }
}
