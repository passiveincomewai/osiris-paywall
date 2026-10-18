import { NextResponse } from 'next/server';
import { cachedSource } from '@/lib/sourceCache';

/**
 * OSIRIS — Fire Perimeters: current US wildfire perimeters from NIFC's
 * WFIGS Interagency Fire Perimeters (Current) service on ArcGIS.
 *
 * Public, keyless, refreshed upstream about every 5 minutes. Geometries are
 * simplified server-side (maxAllowableOffset ≈ 500 m, 3-decimal precision)
 * and properties reduced to what the popup shows, so the payload stays a
 * small fraction of the raw service response. Source: NIFC / WFIGS —
 * https://www.nifc.gov/ (data via ArcGIS FeatureServer).
 */

export const dynamic = 'force-dynamic';

const SERVICE =
  'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/' +
  'WFIGS_Interagency_Perimeters_Current/FeatureServer/0/query';

const OUTFIELDS = [
  'poly_IncidentName',
  'attr_IncidentName',
  'attr_PercentContained',
  'poly_GISAcres',
  'attr_IncidentSize',
  'attr_POOState',
  'poly_PolygonDateTime',
].join(',');

interface PerimeterFeature {
  type: 'Feature';
  geometry: unknown;
  properties: {
    name: string;
    acres: number | null;
    contained: number | null;
    state: string;
    updated: string | null;
  };
}

async function fetchPerimeters(): Promise<PerimeterFeature[]> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: OUTFIELDS,
    outSR: '4326',
    geometryPrecision: '3',
    maxAllowableOffset: '0.005',
    resultRecordCount: '2000',
    f: 'geojson',
  });
  const res = await fetch(`${SERVICE}?${params}`, {
    headers: { 'User-Agent': 'OSIRIS-Intelligence-Platform/3.5' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`WFIGS ${res.status}`);
  const fc = await res.json();
  const features: PerimeterFeature[] = [];
  for (const f of fc.features ?? []) {
    if (!f.geometry) continue;
    const p = f.properties ?? {};
    const acresRaw = p.poly_GISAcres ?? p.attr_IncidentSize;
    features.push({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        name: p.poly_IncidentName || p.attr_IncidentName || 'Unknown incident',
        acres: typeof acresRaw === 'number' ? Math.round(acresRaw) : null,
        contained:
          typeof p.attr_PercentContained === 'number' ? p.attr_PercentContained : null,
        state: (p.attr_POOState || '').replace(/^US-/, ''),
        updated: p.poly_PolygonDateTime
          ? new Date(p.poly_PolygonDateTime).toISOString()
          : null,
      },
    });
  }
  return features;
}

const getPerimeters = cachedSource<PerimeterFeature>(
  'wfigs-fire-perimeters',
  fetchPerimeters,
  5 * 60_000,
);

export async function GET() {
  try {
    const features = await getPerimeters();
    return NextResponse.json(
      { type: 'FeatureCollection', features, count: features.length, source: 'NIFC WFIGS' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch {
    return NextResponse.json(
      { type: 'FeatureCollection', features: [], count: 0, source: 'NIFC WFIGS' },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=60' } },
    );
  }
}
