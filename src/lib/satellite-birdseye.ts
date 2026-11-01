import { SAT_MAX_ZOOM } from './satellite-layer';

/**
 * OSIRIS — satellite Bird's-Eye View.
 *
 * The satellite counterpart of flight follow: pick a satellite and the
 * camera drops to its ground position — the patch of Earth directly
 * beneath it — on the satellite-imagery basemap, and rides the ground
 * track as the satellite moves.
 *
 * HONESTY (hard rule): the imagery under the satellite is Esri's
 * reference mosaic — dated archive photography, the same tiles the
 * satellite view and the Wayback slider use. It is NOT a live camera
 * feed from the satellite, and the banner that names this view says so
 * for as long as the view is active, the way flight follow's HUD
 * carries its permanent telemetry tag.
 */

/** The satellite layer stops drawing above SAT_MAX_ZOOM (z7): the
 *  markers stop, the motion ticker stops, and the selection itself
 *  clears. Bird's-eye rides at exactly that ceiling — the closest view
 *  in which the satellite still exists on the globe. */
export const BIRDSEYE_ZOOM = SAT_MAX_ZOOM;

/** Pitched enough to read as a bird's-eye — horizon in frame, the
 *  satellite's marker riding above its ground point in the 3D layer —
 *  and under the terrain manager's 60° cap, so the view behaves the
 *  same with elevation terrain on or off. */
export const BIRDSEYE_PITCH = 55;

/** The permanent banner text for the active view. Names the satellite
 *  and states plainly what the imagery is — and what it is not. */
export function birdsEyeLabel(name: string): string {
  return `BIRD'S-EYE VIEW BENEATH ${name} — REFERENCE SATELLITE IMAGERY (DATED), NOT A LIVE FEED`;
}

/** Longitude continuity for a following camera: pick the representative
 *  of `lng` nearest `prev`, so crossing the antimeridian eases the
 *  short way instead of spinning the globe the long way round. */
export function unwrapLngNear(lng: number, prev: number): number {
  let out = lng;
  while (out - prev > 180) out -= 360;
  while (out - prev < -180) out += 360;
  return out;
}
