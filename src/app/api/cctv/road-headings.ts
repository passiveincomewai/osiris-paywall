import type { CctvCamera } from './types';
import { ROAD_HEADINGS } from './road-headings.generated';

/**
 * Road-derived camera headings — attach an ESTIMATED facing to cameras
 * whose source publishes none.
 *
 * The table in road-headings.generated.ts was built offline from
 * OpenStreetMap road geometry (ODbL) by the derivation pipeline
 * documented in ~/workspace/road-headings (derive.py + NOTES.md). The
 * contract the pipeline enforced — this module trusts the table, so
 * the contract is the safety property:
 *
 *  - Only cameras beside a ONE-WAY carriageway were assigned: the
 *    bearing is that carriageway's direction of travel at the camera's
 *    point (oneway=yes/-1 followed, motorways' implied one-way
 *    accepted). Two-way roads give an axis, not a direction, and were
 *    never assigned.
 *  - The carriageway had to be the unambiguous nearest road: within
 *    30 m, with every differently-directed road (crossing road, ramp,
 *    opposing carriageway) clearly farther away. Interchanges and
 *    median poles mostly failed this test on purpose.
 *  - Cameras sharing identical coordinates with another camera (the
 *    "- North" / "- South" multi-view poles) were excluded: one point
 *    cannot stand for two opposite facings.
 *
 * A derived heading is marked heading_source: 'road-derived' so the
 * map can draw it at reduced opacity and the viewer can label it an
 * estimate — it is never presented as a source-published direction.
 * Cameras that already carry a heading (today: FAA's sourced facing)
 * are never overwritten.
 */
export function applyRoadHeadings(cameras: CctvCamera[]): CctvCamera[] {
  let touched = false;
  const out = cameras.map((cam) => {
    if (typeof cam.heading_deg === 'number') return cam;
    const derived = ROAD_HEADINGS[cam.id];
    if (typeof derived !== 'number') return cam;
    touched = true;
    return { ...cam, heading_deg: derived, heading_source: 'road-derived' as const };
  });
  return touched ? out : cameras;
}
