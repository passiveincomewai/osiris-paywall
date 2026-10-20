/**
 * OSIRIS — /api/satellites wire format (v2)
 *
 * The satellites payload is the biggest response on the site: ~19,000 objects
 * whose JSON repeated the same eight key names, the same ~13 mission strings
 * and the same 6 category strings on every single row — 2.7 MB of mostly
 * repetition, re-serialized for every request.
 *
 * v2 dictionary-encodes the repeated strings. Rows travel as tuples
 *
 *     [name, lat, lng, alt, missionIndex, categoryIndex, noradId]
 *
 * with two legends at the top of the body: `missions` ([mission, color]
 * pairs — colour is a pure function of mission in the route's classifier, so
 * it is stored once instead of 19,000 times) and `categories`. Everything
 * else in the envelope (total, category_counts, source, raw_count, timestamp)
 * keeps its v1 shape: LayerPanel counts, the HUD total, the stats route and
 * the orbit-epoch hand-off all read those, unchanged.
 *
 * decodeSatelliteRows() restores the exact v1 row objects, so every consumer
 * downstream (map layer, popup, satellite card) sees the contract it always
 * had. It also accepts v1 object rows: while a deploy rolls out, the CDN can
 * hand a new client the previous body's cache entry (s-maxage=120 +
 * stale-while-revalidate) and the layer must not break on it.
 */

export interface SatelliteRow {
  name: string;
  lat: number;
  lng: number;
  alt: number;
  mission: string;
  color: string;
  category: string;
  noradId: string;
}

/** [name, lat, lng, alt, missionIndex, categoryIndex, noradId] */
export type SatelliteWireRow = [
  name: string,
  lat: number,
  lng: number,
  alt: number,
  missionIndex: number,
  categoryIndex: number,
  noradId: string,
];

export interface EncodedSatelliteRows {
  /** [mission, color] pairs, indexed by the rows' missionIndex. */
  missions: [string, string][];
  /** Category names, indexed by the rows' categoryIndex. */
  categories: string[];
  rows: SatelliteWireRow[];
}

const FALLBACK_MISSION = 'Unknown';
const FALLBACK_COLOR = '#00E5FF';
const FALLBACK_CATEGORY = 'other';

/** Rows → dictionary-encoded rows plus their legends. */
export function encodeSatelliteRows(rows: SatelliteRow[]): EncodedSatelliteRows {
  const missionIndex = new Map<string, number>();
  const missions: [string, string][] = [];
  const categoryIndex = new Map<string, number>();
  const categories: string[] = [];

  const wire: SatelliteWireRow[] = rows.map((s) => {
    // Colour rides with the mission: two rows that share a mission string but
    // (hypothetically) differ in colour must not collapse into one legend
    // entry, so the key is the pair.
    const key = `${s.mission}\0${s.color}`;
    let mi = missionIndex.get(key);
    if (mi === undefined) {
      mi = missions.length;
      missionIndex.set(key, mi);
      missions.push([s.mission, s.color]);
    }
    let ci = categoryIndex.get(s.category);
    if (ci === undefined) {
      ci = categories.length;
      categoryIndex.set(s.category, ci);
      categories.push(s.category);
    }
    return [s.name, s.lat, s.lng, s.alt, mi, ci, s.noradId];
  });

  return { missions, categories, rows: wire };
}

/**
 * Anything shaped like an /api/satellites body → the v1 row objects the map
 * has always consumed. Tolerates v2 tuple rows, v1 object rows, and junk
 * (a failed fetch must yield an empty layer, not a thrown render).
 */
export function decodeSatelliteRows(body: unknown): SatelliteRow[] {
  if (!body || typeof body !== 'object') return [];
  const { satellites, missions, categories } = body as {
    satellites?: unknown;
    missions?: unknown;
    categories?: unknown;
  };
  if (!Array.isArray(satellites)) return [];

  const missionLegend = Array.isArray(missions) ? missions : [];
  const categoryLegend = Array.isArray(categories) ? categories : [];

  const out: SatelliteRow[] = [];
  for (const row of satellites) {
    if (Array.isArray(row)) {
      const [name, lat, lng, alt, mi, ci, noradId] = row as unknown[];
      if (typeof lat !== 'number' || typeof lng !== 'number') continue;
      const pair = missionLegend[typeof mi === 'number' ? mi : -1] as [string, string] | undefined;
      out.push({
        name: typeof name === 'string' ? name : '',
        lat,
        lng,
        alt: typeof alt === 'number' ? alt : 0,
        mission: pair?.[0] ?? FALLBACK_MISSION,
        color: pair?.[1] ?? FALLBACK_COLOR,
        category: (typeof ci === 'number' ? categoryLegend[ci] : undefined) ?? FALLBACK_CATEGORY,
        noradId: typeof noradId === 'string' ? noradId : String(noradId ?? ''),
      });
    } else if (row && typeof row === 'object') {
      // v1 object row — pass the contract through untouched.
      const s = row as Partial<SatelliteRow>;
      if (typeof s.lat !== 'number' || typeof s.lng !== 'number') continue;
      out.push({
        name: s.name ?? '',
        lat: s.lat,
        lng: s.lng,
        alt: s.alt ?? 0,
        mission: s.mission ?? FALLBACK_MISSION,
        color: s.color ?? FALLBACK_COLOR,
        category: s.category ?? FALLBACK_CATEGORY,
        noradId: s.noradId ?? '',
      });
    }
  }
  return out;
}
