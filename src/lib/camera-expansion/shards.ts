/**
 * Camera expansion — geographic shards for the OpenCCTV harvest source.
 *
 * The harvest is registered as five region keys, not one world key, for
 * the same reason public-webcams.ts splits its arrays by continent: the
 * catalogue's bounds→region mapping (getRegionsForBounds in route.ts) can
 * only shard loading if the data is sharded. Every camera belongs to
 * exactly one shard; the route's boxes are drawn to cover each shard's
 * full extent (boxes may overlap — regions are additive — shards may not).
 *
 * The generator (tools/harvest-opencctv.ts) assigns records with
 * `shardFor`; the catalogue module serves the generated arrays under
 * these keys.
 */

export const OCC_HARVEST_SHARDS = [
  'occ-north-america',
  'occ-latin-america',
  'occ-europe',
  'occ-africa',
  'occ-asia-pacific',
] as const;

export type OccHarvestShard = (typeof OCC_HARVEST_SHARDS)[number];

/** The one shard a coordinate belongs to. Ordered rules; total function. */
export function shardFor(lat: number, lng: number): OccHarvestShard {
  if (lng >= 55) return 'occ-asia-pacific';
  if (lng <= -30) return lat >= 14 ? 'occ-north-america' : 'occ-latin-america';
  // -30 < lng < 55: Europe / Africa / Middle East
  if (lat >= 36) return 'occ-europe';
  if (lng >= 30) return 'occ-asia-pacific'; // Levant & Gulf west of 55E
  return 'occ-africa';
}

/**
 * Bounds each shard's records can occupy — the route's viewport boxes are
 * these, widened slightly. Kept beside the partition so the two cannot
 * drift apart silently (a route test asserts coverage of the partition).
 */
export const OCC_HARVEST_SHARD_BOUNDS: Record<OccHarvestShard, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  'occ-north-america': { minLat: 14, maxLat: 90, minLng: -180, maxLng: -30 },
  'occ-latin-america': { minLat: -90, maxLat: 14, minLng: -180, maxLng: -30 },
  'occ-europe': { minLat: 36, maxLat: 90, minLng: -30, maxLng: 55 },
  'occ-africa': { minLat: -90, maxLat: 36, minLng: -30, maxLng: 30 },
  'occ-asia-pacific': { minLat: -90, maxLat: 90, minLng: 30, maxLng: 180 },
};
