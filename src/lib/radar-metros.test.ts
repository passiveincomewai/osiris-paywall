import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPLORE_SCOPES, recordsForDef } from './explore-data';
import {
  RADAR_METROS,
  radarMetroBySlug,
  radarSnapshotUrl,
  toWebMercator,
} from './radar-metros';
import cityPages from '@/data/city-pages.json';

/**
 * Radar metro walls — the reconciliation the /weather-radar pages
 * publish by. The pages serve counts from recordsForDef over
 * EXPLORE_SCOPES; this suite pins (a) each registry row against its
 * scope definition, (b) the yield of the exact rule recomputed
 * independently from the raw US chunk with its own haversine, (c)
 * the served record count equal to that raw yield, and (d) the
 * rejected metros under the family's 250-camera line at THEIR
 * measured cluster centres — the centre is the rule's point, so
 * rejections are measured there too (St. Louis measured 249 from
 * its seed and 257 from its centre, and qualifies; it is in the
 * registry, not in the rejection pins).
 *
 * If the catalogue regenerates and a yield moves, this test fails
 * loudly — page counts follow the data automatically, but the
 * registry (and the hub's printed claims) must be re-audited by
 * hand rather than drifting silently.
 */

const DATA_DIR = join(process.cwd(), 'src', 'data');

interface Rec {
  lat?: number;
  lng?: number;
  city?: string;
}

const usChunk = JSON.parse(
  readFileSync(join(DATA_DIR, 'countries', 'united-states.json'), 'utf8'),
) as Rec[];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const t = (x: number) => (x * Math.PI) / 180;
  const h =
    Math.sin(t(lat2 - lat1) / 2) ** 2 +
    Math.cos(t(lat1)) * Math.cos(t(lat2)) * Math.sin(t(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function rawWall(lat: number, lng: number, radiusKm: number): Rec[] {
  return usChunk.filter(
    (r) =>
      typeof r.lat === 'number' &&
      typeof r.lng === 'number' &&
      haversineKm(lat, lng, r.lat, r.lng) <= radiusKm,
  );
}

/** Pinned yields at the committed centres, audited 2026-10-28. */
const PINS: Record<string, number> = {
  atlanta: 1879,
  dallas: 722,
  'salt-lake-city': 748,
  houston: 697,
  minneapolis: 687,
  orlando: 628,
  portland: 619,
  seattle: 599,
  tampa: 564,
  'washington-dc': 496,
  'new-york-city': 448,
  denver: 407,
  philadelphia: 378,
  'los-angeles': 365,
  'las-vegas': 349,
  'norfolk-virginia-beach': 315,
  phoenix: 287,
  'kansas-city': 285,
  'san-antonio': 268,
  jacksonville: 264,
  'st-louis': 257,
};

/** Rejected metros: exact yields at their measured cluster centres,
 *  all under the 250 line (audited 2026-10-28). */
const REJECTED: Array<{ name: string; lat: number; lng: number; yield: number }> = [
  { name: 'Chicago', lat: 41.8363, lng: -87.9913, yield: 220 },
  { name: 'El Paso', lat: 31.7989, lng: -106.4161, yield: 225 },
  { name: 'Austin', lat: 30.3346, lng: -97.7299, yield: 223 },
  { name: 'Boise', lat: 43.6178, lng: -116.304, yield: 219 },
  { name: 'San Diego', lat: 32.7799, lng: -117.0882, yield: 219 },
  { name: 'Pittsburgh', lat: 40.4668, lng: -80.0397, yield: 213 },
  { name: 'Indianapolis', lat: 39.7914, lng: -86.1608, yield: 196 },
  { name: 'Hartford', lat: 41.686, lng: -72.715, yield: 184 },
  { name: 'Raleigh', lat: 35.7731, lng: -78.6944, yield: 183 },
  { name: 'Charlotte', lat: 35.2721, lng: -80.8539, yield: 179 },
  { name: 'Milwaukee', lat: 43.0289, lng: -88.0185, yield: 177 },
  { name: 'Rochester (NY)', lat: 43.1563, lng: -77.6053, yield: 163 },
  { name: 'Baltimore', lat: 39.2904, lng: -76.627, yield: 160 },
  { name: 'Nashville', lat: 36.1502, lng: -86.757, yield: 156 },
  { name: 'Columbia (SC)', lat: 34.0271, lng: -81.0505, yield: 153 },
  { name: 'Sacramento', lat: 38.5881, lng: -121.3926, yield: 151 },
  { name: 'Honolulu', lat: 21.3351, lng: -157.8595, yield: 128 },
  { name: 'Reno', lat: 39.5043, lng: -119.8145, yield: 121 },
  { name: 'Memphis', lat: 35.1293, lng: -89.9767, yield: 112 },
  { name: 'Buffalo', lat: 42.9407, lng: -78.8493, yield: 110 },
  { name: 'Richmond', lat: 37.5111, lng: -77.4401, yield: 105 },
  { name: 'Oklahoma City', lat: 35.4713, lng: -97.5081, yield: 89 },
  { name: 'New Orleans', lat: 29.9851, lng: -90.1401, yield: 48 },
  { name: 'Tulsa', lat: 36.1137, lng: -95.8962, yield: 48 },
];

describe('radar registry ↔ EXPLORE_SCOPES', () => {
  it('covers exactly the radar-* scopes, both ways', () => {
    const scopeKeys = Object.keys(EXPLORE_SCOPES).filter((k) => k.startsWith('radar-'));
    expect(scopeKeys.sort()).toEqual(RADAR_METROS.map((m) => m.scopeKey).sort());
    expect(RADAR_METROS).toHaveLength(21);
  });

  it('pins every registry row to its scope definition', () => {
    for (const m of RADAR_METROS) {
      const def = EXPLORE_SCOPES[m.scopeKey];
      expect(def, m.slug).toBeDefined();
      expect(def.geo, m.slug).toEqual({ lat: m.lat, lng: m.lng, radiusKm: 30 });
      expect(def.slugs, m.slug).toEqual(['united-states']);
      expect(radarMetroBySlug(m.slug), m.slug).toBe(m);
    }
    expect(radarMetroBySlug('chicago')).toBeNull();
  });

  it('keeps every city-page link pointed at a real city page', () => {
    const slugs = new Set(
      (cityPages as { cities: Array<{ slug: string }> }).cities.map((c) => c.slug),
    );
    for (const m of RADAR_METROS) {
      for (const link of m.cityLinks) {
        const slug = link.href.replace('/city-webcams/', '');
        expect(slugs.has(slug), `${m.slug} → ${link.href}`).toBe(true);
      }
    }
  });
});

describe('radar walls — raw-chunk reconciliation', () => {
  it('recomputes every wall yield from the raw chunk and matches the pin', () => {
    for (const m of RADAR_METROS) {
      const wall = rawWall(m.lat, m.lng, m.radiusKm);
      expect(wall.length, m.slug).toBe(PINS[m.slug]);
      expect(wall.length, m.slug).toBeGreaterThanOrEqual(250);
    }
  });

  it('keeps each centre inside its own cluster (centroid within 6 km)', () => {
    for (const m of RADAR_METROS) {
      const wall = rawWall(m.lat, m.lng, m.radiusKm);
      let lat = 0;
      let lng = 0;
      for (const r of wall) {
        lat += r.lat as number;
        lng += r.lng as number;
      }
      const d = haversineKm(m.lat, m.lng, lat / wall.length, lng / wall.length);
      expect(d, m.slug).toBeLessThan(6);
    }
  });

  it('serves exactly the raw yield through recordsForDef', async () => {
    for (const m of RADAR_METROS) {
      const records = await recordsForDef(EXPLORE_SCOPES[m.scopeKey]);
      expect(records.length, m.slug).toBe(PINS[m.slug]);
    }
  }, 600_000);
});

describe('radar rejections stay under the line', () => {
  it('pins every rejected metro under 250 at its cluster centre', () => {
    for (const r of REJECTED) {
      const yieldNow = rawWall(r.lat, r.lng, 30).length;
      expect(yieldNow, r.name).toBe(r.yield);
      expect(yieldNow, r.name).toBeLessThan(250);
    }
  });

  it('pins the place-evidence rejections (names that are not the place)', () => {
    const byCity = (name: string) =>
      usChunk.filter((r) => (r.city ?? '').trim() === name).length;
    // "Arlington" in the US chunk is a handful of records (its
    // dominant cluster is Arlington, Tennessee — 3 records);
    // "Des Moines" has a single record; "Columbus" eleven split
    // across places. None can anchor a metro wall under its name.
    expect(byCity('Arlington')).toBe(5);
    expect(byCity('Des Moines')).toBe(1);
    expect(byCity('Columbus')).toBe(11);
    // Tuscaloosa and Lexington: 1 record each within 35 km of the
    // place itself, whatever their directory counts say.
    expect(rawWall(33.2098, -87.5345, 35).length).toBe(1);
    expect(rawWall(38.0406, -84.5037, 35).length).toBe(1);
  });
});

describe('radar snapshot URL', () => {
  it('builds the nowCOAST GetMap request the globe layer uses', () => {
    const url = radarSnapshotUrl({
      lat: 30.3346,
      lng: -97.7299,
      frameIso: '2026-10-28T04:25:00.000Z',
    });
    expect(url).toContain('https://nowcoast.noaa.gov/geoserver/observations/weather_radar/ows');
    expect(url).toContain('layers=base_reflectivity_mosaic');
    expect(url).toContain('time=2026-10-28T04:25:00.000Z');
    expect(url).toContain('width=1200&height=900');
    expect(url).toContain('crs=EPSG:3857');
    expect(url).toContain('transparent=true');
  });

  it('projects the bbox in EPSG:3857 metres around the centre', () => {
    const origin = toWebMercator(0, 0);
    expect(origin.x).toBe(0);
    expect(origin.y).toBeCloseTo(0, 6);
    expect(toWebMercator(0, 180).x).toBeCloseTo(20037508.34, 1);
    const url = radarSnapshotUrl({ lat: 30.3346, lng: -97.7299, frameIso: '2026-10-28T04:25:00.000Z' });
    const bbox = url.split('bbox=')[1].split('&')[0].split(',').map(Number);
    const centre = toWebMercator(30.3346, -97.7299);
    // Vertical half-extent is the 30 km frame radius; horizontal
    // follows the 4:3 aspect.
    expect((bbox[3] - bbox[1]) / 2).toBeCloseTo(30000, 0);
    expect((bbox[2] - bbox[0]) / 2).toBeCloseTo(40000, 0);
    expect((bbox[0] + bbox[2]) / 2).toBeCloseTo(centre.x, 0);
    expect((bbox[1] + bbox[3]) / 2).toBeCloseTo(centre.y, 0);
  });
});
