/**
 * OSIRIS — NIFC WFIGS current fire perimeters (server lib).
 *
 * The one server-side reader for the WFIGS Interagency Fire
 * Perimeters (Current) service — the named-incident source the
 * globe's fire-perimeter layer has always used (via
 * /api/fire-perimeters, which is now a thin wrapper over this lib)
 * and the /wildfires pages are built on.
 *
 * What the feed carries, and only this: for each CURRENT US incident
 * in the federal system — a name (poly_IncidentName /
 * attr_IncidentName), a state (attr_POOState), acres
 * (poly_GISAcres / attr_IncidentSize), percent contained
 * (attr_PercentContained), the perimeter polygon (simplified
 * upstream at ≈500 m), and the polygon's timestamp. There are no
 * ignition dates, causes, personnel counts or evacuation fields —
 * pages print the fields that exist and omit the ones that don't,
 * never the reverse.
 *
 * A page exists for an incident exactly while the incident is in
 * this feed. When WFIGS drops it (contained, merged, closed), the
 * page 404s — the hub says so in plain words. Slugs are derived
 * from the feed's own name + state; collisions inside one fetch
 * (two incidents sharing a name and state) are disambiguated in
 * feed order with a numeric suffix, deterministically for that
 * fetch.
 *
 * Public, keyless; upstream refreshes about every 5 minutes and
 * the shared cache holds 5 minutes (the route's original TTL).
 * Source: NIFC / WFIGS — https://www.nifc.gov/ (data via the
 * ArcGIS FeatureServer).
 */

import { cachedSource } from './sourceCache';

export const WFIGS_SERVICE =
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

export type PerimeterGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] };

export interface FirePerimeterFeature {
  type: 'Feature';
  geometry: PerimeterGeometry | unknown;
  properties: {
    name: string;
    acres: number | null;
    contained: number | null;
    state: string;
    updated: string | null;
  };
}

/** A feature with its page identity resolved for one fetch. */
export interface WildfireIncident extends FirePerimeterFeature {
  slug: string;
  centroid: { lat: number; lng: number } | null;
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null;
}

async function fetchPerimeters(): Promise<FirePerimeterFeature[]> {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: OUTFIELDS,
    outSR: '4326',
    geometryPrecision: '3',
    maxAllowableOffset: '0.005',
    resultRecordCount: '2000',
    f: 'geojson',
  });
  const res = await fetch(`${WFIGS_SERVICE}?${params}`, {
    headers: { 'User-Agent': 'OSIRIS-Intelligence-Platform/3.5' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`WFIGS ${res.status}`);
  const fc = await res.json();
  const features: FirePerimeterFeature[] = [];
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

/** The process-wide cached read (5 min, stale-on-error via the
 *  shared source cache) — the same data /api/fire-perimeters
 *  serves the globe. */
export const getFirePerimeters = cachedSource<FirePerimeterFeature>(
  'wfigs-fire-perimeters',
  fetchPerimeters,
  5 * 60_000,
);

/* ------------------------------------------------------------------ */
/* Page identity + geometry helpers                                    */
/* ------------------------------------------------------------------ */

/** "Aspen Acres" + "CO" → "aspen-acres-co". Names are the feed's
 *  own; diacritics fold to ASCII, everything non-alphanumeric
 *  collapses to a single hyphen. */
export function incidentSlug(name: string, state: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const st = state.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return st ? `${base}-${st}` : base;
}

/** All polygon rings of a feature, normalised: an array of
 *  polygons, each an array of rings, each ring [lng, lat] pairs. */
export function perimeterPolygons(geometry: unknown): number[][][][] {
  const g = geometry as PerimeterGeometry | null;
  if (!g) return [];
  if (g.type === 'Polygon') return [g.coordinates];
  if (g.type === 'MultiPolygon') return g.coordinates;
  return [];
}

/** Mean of the largest polygon's outer-ring vertices — a
 *  representative point for camera search, weather and the globe
 *  link. Deliberately NOT a geographic centre of the incident's
 *  extent claim; pages label it as the perimeter's midpoint area. */
export function perimeterCentroid(
  geometry: unknown,
): { lat: number; lng: number } | null {
  const polys = perimeterPolygons(geometry);
  if (polys.length === 0) return null;
  let ring: number[][] | null = null;
  for (const poly of polys) {
    const outer = poly[0];
    if (outer && (!ring || outer.length > ring.length)) ring = outer;
  }
  if (!ring || ring.length === 0) return null;
  let lat = 0;
  let lng = 0;
  for (const [x, y] of ring) {
    lng += x;
    lat += y;
  }
  return {
    lat: Math.round((lat / ring.length) * 10000) / 10000,
    lng: Math.round((lng / ring.length) * 10000) / 10000,
  };
}

export function perimeterBbox(
  geometry: unknown,
): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  const polys = perimeterPolygons(geometry);
  if (polys.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const poly of polys) {
    for (const ring of poly) {
      for (const [x, y] of ring) {
        if (y < minLat) minLat = y;
        if (y > maxLat) maxLat = y;
        if (x < minLng) minLng = x;
        if (x > maxLng) maxLng = x;
      }
    }
  }
  if (!isFinite(minLat)) return null;
  return { minLat, maxLat, minLng, maxLng };
}

/** Resolve one fetch's features into page-ready incidents:
 *  slugs assigned (collisions suffixed -2, -3… in feed order),
 *  centroid + bbox computed. Pure — the feed's order is preserved. */
export function toIncidents(features: FirePerimeterFeature[]): WildfireIncident[] {
  const seen = new Map<string, number>();
  return features.map((f) => {
    const base = incidentSlug(f.properties.name, f.properties.state);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return {
      ...f,
      slug: count === 1 ? base : `${base}-${count}`,
      centroid: perimeterCentroid(f.geometry),
      bbox: perimeterBbox(f.geometry),
    };
  });
}

/** The current incidents, page-ready. Empty when the feed is
 *  unreachable and nothing is cached — callers render the honest
 *  empty state rather than inventing incidents. */
export async function getWildfireIncidents(): Promise<WildfireIncident[]> {
  try {
    return toIncidents(await getFirePerimeters());
  } catch {
    return [];
  }
}
