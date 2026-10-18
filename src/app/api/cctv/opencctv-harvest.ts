import type { CctvCamera } from './types';
import {
  OCCAfrica,
  OCCAsiaPacific,
  OCCEurope,
  OCCLatinAmerica,
  OCCNorthAmerica,
} from './opencctv-harvest.generated';

/**
 * OSIRIS — the OpenCCTV global harvest source (camera expansion, Stage B).
 *
 * The existing opencctv.ts samples three Asian boxes from the OpenCCTV
 * index because fetching the whole index live is 2,900 batch round trips.
 * This module is the offline answer to the same source: a generation
 * pipeline (tools/harvest-opencctv.ts) walks the full index, gates each
 * record on its family's licensing verdict, dedupes it against the served
 * catalogue, probe-verifies its feed, and commits the survivors as the
 * generated arrays this module serves. Refreshing the source is a
 * regeneration + commit, never a live fetch — the catalogue's runtime
 * behaviour (and its rollback: revert the commit) is unchanged.
 *
 * Feature flag: OSIRIS_CCTV_OCC_HARVEST=off removes the five region keys
 * from the catalogue entirely. The source is on when generated data is
 * present — an empty generation (nothing verified) registers nothing.
 */

export const OCC_HARVEST_TOTAL =
  OCCNorthAmerica.length + OCCLatinAmerica.length + OCCEurope.length + OCCAfrica.length + OCCAsiaPacific.length;

export function occHarvestEnabled(): boolean {
  if (process.env.OSIRIS_CCTV_OCC_HARVEST === 'off') return false;
  return OCC_HARVEST_TOTAL > 0;
}

const serve = (cameras: CctvCamera[]) => async (): Promise<CctvCamera[]> => cameras;

export const fetchOccHarvestNorthAmerica = serve(OCCNorthAmerica);
export const fetchOccHarvestLatinAmerica = serve(OCCLatinAmerica);
export const fetchOccHarvestEurope = serve(OCCEurope);
export const fetchOccHarvestAfrica = serve(OCCAfrica);
export const fetchOccHarvestAsiaPacific = serve(OCCAsiaPacific);
