/**
 * Photo Geolocation (Beta) — candidates, ranking, and the privacy clamp.
 *
 * Everything in this file is deterministic: candidates come from EXIF
 * GPS or from OpenStreetMap/Nominatim lookups of the vision pass's
 * *clues* (a named landmark, a place name read off a sign). Ranking is
 * arithmetic a reader can audit — named-landmark matches outrank
 * generic place-name matches, corroboration between independent clues
 * adds score, and every candidate carries its evidence for and against
 * in plain words (the Geo-Sleuth board discipline, audit REPORT §7).
 *
 * The privacy clamp is the owner's hard rule, enforced here and
 * nowhere downstream: a public radius is never tighter than 250 m,
 * and a scene the vision pass classified as a likely private residence
 * loses its point entirely — the result is area-level only, whatever
 * the engine believes. Coordinates with a radius beyond 150 km are
 * country-blob noise, not candidates, and are dropped by the caller.
 */
import { haversine } from "@/lib/geo";
import type { ExifGps } from "./exif";

/** The tightest uncertainty radius this tool will ever display. */
export const PRIVACY_RADIUS_FLOOR_M = 250;
/** Radius shown when a point is suppressed for privacy (area-level). */
export const AREA_DISPLAY_RADIUS_M = 5_000;
/** Beyond this a "candidate" is a country outline, not a location. */
export const MAX_USEFUL_RADIUS_M = 150_000;

export type CandidateKind = 'exif' | 'landmark' | 'place';
export type ConfidenceTier = 'high' | 'medium' | 'low';

export interface GeoCandidate {
  id: string;
  kind: CandidateKind;
  label: string;
  lat: number;
  lng: number;
  /** The engine's own radius, before the privacy clamp. */
  baseRadiusM: number;
  score: number;
  confidence: ConfidenceTier;
  evidenceFor: string[];
  evidenceAgainst: string[];
  /** The clue text that produced this candidate (its origin). */
  origin: string;
}

/** What the UI (and any share surface) is allowed to see. */
export interface PublicCandidate extends Omit<GeoCandidate, 'lat' | 'lng' | 'baseRadiusM'> {
  lat: number | null;
  lng: number | null;
  /** Radius after the privacy clamp — the only radius ever displayed. */
  radiusM: number;
  /** 'point' = a displayable point with radius; 'area' = point suppressed. */
  precision: 'point' | 'area';
}

/** The Nominatim row shape this pipeline reads (jsonv2). */
export interface NominatimRowLike {
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  class?: string;
  type?: string;
  importance?: number;
  boundingbox?: string[];
  address?: Record<string, string>;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A short human label from a Nominatim row: name, then place context. */
export function shortLabel(row: NominatimRowLike): string {
  const first = (row.display_name ?? '').split(',')[0]?.trim();
  const name = (row.name ?? '').trim() || first || 'Unnamed place';
  const a = row.address ?? {};
  const context = [a.city || a.town || a.village || a.county, a.state, a.country]
    .map(s => (s ?? '').trim())
    .filter(s => s && s.toLowerCase() !== name.toLowerCase());
  return [name, ...context.slice(-2)].join(', ');
}

/** Radius implied by a Nominatim bounding box (half its diagonal). */
export function radiusFromRow(row: NominatimRowLike): number {
  const bb = row.boundingbox;
  if (Array.isArray(bb) && bb.length === 4) {
    const [south, north, west, east] = bb.map(Number);
    if ([south, north, west, east].every(Number.isFinite)) {
      const diagKm = haversine([west, south], [east, north]);
      // Deliberately NOT clamped to MAX_USEFUL_RADIUS_M: a country
      // box must stay visibly over the usefulness threshold so the
      // pipeline's filter can drop it.
      return clamp(Math.round((diagKm * 1000) / 2), 100, 500_000);
    }
  }
  // No box: fall back to the granularity the row's class/type implies.
  if (row.class === 'boundary' || row.type === 'country') return 500_000;
  if (row.class === 'place' && ['city', 'town'].includes(row.type ?? '')) return 5_000;
  if (row.class === 'place') return 3_000;
  return 1_000;
}

const fmtKm = (m: number) => (m >= 10_000 ? `${Math.round(m / 1000)} km` : `${(m / 1000).toFixed(1)} km`);

function confidenceFor(score: number): ConfidenceTier {
  if (score >= 620) return 'high';
  if (score >= 430) return 'medium';
  return 'low';
}

/** The EXIF-GPS candidate: strongest evidence this tool has, still clamped on display. */
export function exifCandidate(gps: ExifGps, label: string): GeoCandidate {
  return {
    id: 'exif',
    kind: 'exif',
    label,
    lat: gps.lat,
    lng: gps.lng,
    baseRadiusM: 250,
    score: 1000,
    confidence: 'high',
    evidenceFor: ['GPS coordinates are embedded in the photo file itself (EXIF metadata)'],
    evidenceAgainst: [
      'Photo metadata can be edited or copied from another photo — a strong clue, not proof on its own',
    ],
    origin: 'exif',
  };
}

let seq = 0;

/** Candidates from one clue's Nominatim rows. */
export function candidatesFromRows(
  rows: NominatimRowLike[],
  opts: { kind: 'landmark' | 'place'; clue: string },
): GeoCandidate[] {
  const out: GeoCandidate[] = [];
  for (const row of rows.slice(0, 3)) {
    const lat = Number(row.lat);
    const lng = Number(row.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;
    const radius = radiusFromRow(row);
    const importance = typeof row.importance === 'number' ? clamp(row.importance, 0, 1) : 0.3;
    const base = opts.kind === 'landmark' ? 560 : 400;
    const evidenceFor =
      opts.kind === 'landmark'
        ? [`A named landmark in the photo: “${opts.clue}”`, `OpenStreetMap holds a matching place: ${shortLabel(row)}`]
        : [`Text read from the photo: “${opts.clue}”`, `OpenStreetMap holds a matching place: ${shortLabel(row)}`];
    const evidenceAgainst: string[] = ['No second, independent clue confirms this match yet'];
    if (radius >= 10_000) {
      evidenceAgainst.push(`The matched area spans about ${fmtKm(radius * 2)} across, so any point inside it is approximate`);
    }
    out.push({
      id: `${opts.kind}-${seq++}`,
      kind: opts.kind,
      label: shortLabel(row),
      lat,
      lng,
      baseRadiusM: radius,
      score: Math.round(base + importance * 250),
      confidence: 'low', // recomputed by rankCandidates
      evidenceFor,
      evidenceAgainst,
      origin: opts.clue,
    });
  }
  return out;
}

const SAME_SPOT_M = 200;
const CORROBORATION_M = 25_000;

/**
 * Rank: merge same-spot duplicates, reward independent corroboration,
 * recompute confidence, sort best first. Pure — inputs are not mutated.
 */
export function rankCandidates(input: GeoCandidate[]): GeoCandidate[] {
  const merged: GeoCandidate[] = [];
  for (const c of input) {
    const twin = merged.find(
      m => haversine([m.lng, m.lat], [c.lng, c.lat]) * 1000 <= SAME_SPOT_M,
    );
    if (twin) {
      twin.score = Math.max(twin.score, c.score);
      twin.baseRadiusM = Math.min(twin.baseRadiusM, c.baseRadiusM);
      for (const e of c.evidenceFor) if (!twin.evidenceFor.includes(e)) twin.evidenceFor.push(e);
    } else {
      merged.push({ ...c, evidenceFor: [...c.evidenceFor], evidenceAgainst: [...c.evidenceAgainst] });
    }
  }
  for (const c of merged) {
    const corroborators = merged.filter(
      o => o !== c && o.origin !== c.origin &&
        haversine([o.lng, o.lat], [c.lng, c.lat]) * 1000 <= CORROBORATION_M,
    );
    if (corroborators.length && c.kind !== 'exif') {
      c.score += Math.min(160, 80 * corroborators.length);
      c.evidenceFor.push('A second, independent clue points at the same area');
      c.evidenceAgainst = c.evidenceAgainst.filter(e => !e.startsWith('No second, independent clue'));
    }
    c.confidence = confidenceFor(c.score);
  }
  return merged.sort((a, b) => b.score - a.score);
}

/** Apply the owner's privacy clamp — the last step before anything is shown. */
export function toPublicCandidate(c: GeoCandidate, opts: { residential: boolean }): PublicCandidate {
  const { baseRadiusM, ...rest } = c;
  const radiusM = Math.max(Math.round(baseRadiusM), PRIVACY_RADIUS_FLOOR_M);
  if (opts.residential) {
    return {
      ...rest,
      lat: null,
      lng: null,
      radiusM: Math.max(radiusM, AREA_DISPLAY_RADIUS_M),
      precision: 'area',
    };
  }
  return { ...rest, radiusM, precision: 'point' };
}

/** Is this scene one whose point must never be shown? */
export function isResidentialScene(clues: { sceneType: string; privateResidenceLikely: boolean } | null): boolean {
  return !!clues && (clues.privateResidenceLikely || clues.sceneType === 'residential');
}
