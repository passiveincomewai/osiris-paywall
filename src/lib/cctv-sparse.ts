import type { Camera, RegionCameras } from './cctv-snapshot';

/**
 * OSIRIS — the camera catalogue's sparse layer.
 *
 * The globe opens on the whole planet at zoom ~2, where 74,000 camera
 * records are ~17 MB of JSON but only ever drawn as a few thousand dots.
 * The sparse layer is what the first paint actually needs: a coarse,
 * worldwide sample of the held catalogue — every region represented in
 * proportion to its size, no region silently absent — so the planet
 * reads as populated from the first frame, and the dense regional slices
 * only cross the wire when a visitor zooms into them (or a search asks
 * for the whole catalogue).
 *
 * Sampling is a pure function of the held regions: a fixed stride over
 * each region's records, quotas proportional to region size. The same
 * catalogue always yields the same sample — no randomness, so two
 * instances (and a test) agree on what "sparse" contains, and a camera
 * in the sample is a real catalogue record, unchanged.
 */

/** Cameras in the sparse layer. ~2,000 records ≈ 450 KB of JSON
 *  (~85 KB gzipped) against the full catalogue's ~17 MB. */
export const SPARSE_CATALOG_CAP = 2_000;

export interface SparseSample {
  cameras: Camera[];
  /** How many records each region contributed (0 for empty regions). */
  perRegion: Record<string, number>;
  /** Cameras held across all regions when the sample was taken. */
  heldTotal: number;
}

/**
 * Stride-sample each region down to its proportional quota.
 *
 * Every non-empty region contributes at least one record (a one-camera
 * region must not vanish from the planet view), and a catalogue at or
 * under the cap is returned whole. Stride picks are evenly spaced
 * indices, so a region's sample spreads across its whole extent rather
 * than clustering on whichever records its loader emitted first.
 */
export function sparseSampleRegions(
  regions: RegionCameras,
  cap: number = SPARSE_CATALOG_CAP,
): SparseSample {
  const keys = Object.keys(regions).sort();
  const heldTotal = keys.reduce((n, key) => n + (regions[key]?.length ?? 0), 0);
  const perRegion: Record<string, number> = {};

  if (heldTotal <= cap) {
    const cameras: Camera[] = [];
    for (const key of keys) {
      const list = regions[key] ?? [];
      perRegion[key] = list.length;
      cameras.push(...list);
    }
    return { cameras, perRegion, heldTotal };
  }

  // Proportional quotas, floored at 1 for non-empty regions.
  const quotas = new Map<string, number>();
  let assigned = 0;
  for (const key of keys) {
    const len = regions[key]?.length ?? 0;
    const quota = len === 0 ? 0 : Math.max(1, Math.floor((cap * len) / heldTotal));
    quotas.set(key, quota);
    assigned += quota;
  }
  // Rounding can overshoot the cap; trim the largest quotas back first
  // (they lose the least coverage per record removed).
  while (assigned > cap) {
    let largest: string | null = null;
    for (const key of keys) {
      const q = quotas.get(key) ?? 0;
      if (q > 1 && (largest === null || q > (quotas.get(largest) ?? 0))) largest = key;
    }
    if (largest === null) break; // every region is at its floor of 1
    quotas.set(largest, (quotas.get(largest) ?? 0) - 1);
    assigned--;
  }

  const cameras: Camera[] = [];
  for (const key of keys) {
    const list = regions[key] ?? [];
    const quota = Math.min(quotas.get(key) ?? 0, list.length);
    perRegion[key] = quota;
    if (quota === 0) continue;
    if (quota >= list.length) {
      cameras.push(...list);
      continue;
    }
    for (let i = 0; i < quota; i++) {
      cameras.push(list[Math.floor((i * list.length) / quota)]);
    }
  }
  return { cameras, perRegion, heldTotal };
}
