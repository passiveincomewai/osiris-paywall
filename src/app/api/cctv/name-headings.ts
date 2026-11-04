import type { CctvCamera } from './types';

/**
 * Name-derived camera headings — attach a facing to cameras whose own
 * NAME, as published by their source, states the view direction with an
 * explicit verb: "… Looking West (COBB)", "… Facing North", "Harrop
 * Ferry Landing North View". The name is the source's own description
 * of the camera, so this is source-stated data — but only at compass-
 * point precision: the bearing recorded is the named point's centre
 * (N=0, NE=45, …) and the true facing may sit anywhere in that octant.
 * heading_source: 'name-derived' keeps that distinction wherever the
 * heading is consumed (the map draws these cones between the exact
 * sourced facings and the road-geometry estimates; the viewer labels
 * them as stated in the camera's name).
 *
 * The parser is deliberately strict — the failure mode that matters is
 * inventing a facing, so anything short of an explicit statement gets
 * nothing:
 *  - A road-direction token alone ("I-15 NB", "SR-6 Westbound", a
 *    trailing "- North") NEVER qualifies: it describes the road (or
 *    which carriageway a listing watches), not where the camera looks.
 *    Those names stay headingless here; the road-geometry derivation
 *    may still estimate some of them under its own contract.
 *  - Two statements that disagree ("Looking East … West View") are
 *    ambiguous and get nothing; two that agree are fine.
 *  - A camera that already carries a heading (a sourced facing, or a
 *    road-derived estimate applied earlier) is never overwritten.
 */
const COMPASS: Record<string, number> = {
  north: 0, northeast: 45, east: 90, southeast: 135,
  south: 180, southwest: 225, west: 270, northwest: 315,
};
const POINT = '(northeast|northwest|southeast|southwest|north|south|east|west)';
const VERB_RE = new RegExp(`\\b(?:looking|facing|viewing)\\s+${POINT}\\b`, 'gi');
const VIEW_RE = new RegExp(`\\b${POINT}\\s+view\\b`, 'gi');

/** The facing a camera name explicitly states, or null. */
export function nameStatedHeading(name: string): number | null {
  const stated = new Set<number>();
  for (const re of [VERB_RE, VIEW_RE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(name || '')) !== null) {
      stated.add(COMPASS[m[1].toLowerCase()]);
    }
  }
  return stated.size === 1 ? [...stated][0] : null;
}

export function applyNameHeadings(cameras: CctvCamera[]): CctvCamera[] {
  let touched = false;
  const out = cameras.map((cam) => {
    if (typeof cam.heading_deg === 'number') return cam;
    const stated = nameStatedHeading(cam.name);
    if (stated === null) return cam;
    touched = true;
    return { ...cam, heading_deg: stated, heading_source: 'name-derived' as const };
  });
  return touched ? out : cameras;
}
