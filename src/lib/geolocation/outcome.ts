/**
 * Photo Geolocation (Beta) — the analytics outcome token.
 *
 * When an analysis completes, the tool fires the site's standard
 * analytics event (`tool_geolocation_completed`) with ONE coarse
 * detail token from this module — nothing else. The token says how
 * the outcome was reached, never where: no photo data, no clue text,
 * no coordinates (precise or otherwise) ever enter an analytics row.
 *
 *   'exif'   — the top candidate came from GPS in the photo file
 *   'vision' — the top candidate came from a visual-clue place match
 *   'none'   — the analysis honestly could not determine a location
 *
 * Kept as a pure function of the public result shape so the mapping
 * is unit-testable without a browser or a network.
 */
import type { AnalysisResult } from "./analyze";

export type GeolocationOutcomeDetail = 'exif' | 'vision' | 'none';

export function geolocationOutcomeDetail(
  result: Pick<AnalysisResult, 'status' | 'candidates'>,
): GeolocationOutcomeDetail {
  if (result.status !== 'located' || result.candidates.length === 0) return 'none';
  return result.candidates[0].kind === 'exif' ? 'exif' : 'vision';
}
