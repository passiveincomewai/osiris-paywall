/* ------------------------------------------------------------------ */
/* City neighbours by distance (INTENT-AND-CLUSTERS chunk C4, §5.2)    */
/*                                                                     */
/* Pure selection logic for the city template's sideways links: given  */
/* every city page's catalogue centroid, pick a page's nearest real    */
/* neighbours so "related cities" stops meaning "first in file order". */
/*                                                                     */
/* Rules (audit §5.2 + §5.3, binding):                                */
/*  - same country only — a nearer city across a border is a          */
/*    different directory's business;                                 */
/*  - same region (state, for US cities) preferred when filling the   */
/*    set, then nearest-first display order;                          */
/*  - a sensible radius caps the set — a city 900 km away is not a    */
/*    neighbour, and pages whose data can't fill the set degrade to   */
/*    their previous links rather than pretend otherwise;             */
/*  - anchors rotate through the three sanctioned shapes by position, */
/*    so no template repeats one exact-match string.                  */
/*                                                                     */
/* This module is pure: callers assemble the CityPoint list from the   */
/* catalogue (the city template builds it from the same chunk records  */
/* cityChunkStats reads, so a centroid here is the centroid the page   */
/* itself quotes). Distances ride along on every returned neighbour   */
/* and link — the anchor layer and later chunks (C9) can use them.    */
/* ------------------------------------------------------------------ */

import { GEO_MAX_RADIUS_M, GEO_MIN_RADIUS_M } from "./share/links";
import { haversineKm } from "./ski-resorts";

export { haversineKm };

/** A city page's position: the mean of the catalogue records filed
 *  under its name in its country's chunk (the page's own centroid). */
export interface CityPoint {
  slug: string;
  name: string;
  countrySlug: string;
  /** Sub-country region where the catalogue supports one — the US
   *  state name today; null everywhere else. */
  region: string | null;
  lat: number;
  lng: number;
}

/** The bounding box of a city's placed catalogue records. */
export interface CityBBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface CityNeighbour extends CityPoint {
  distanceKm: number;
}

export interface CityNeighbourLink {
  label: string;
  href: string;
  /** Straight-line distance from the source city — carried so the
   *  anchor layer (and C9's related searches) can use the fact. */
  distanceKm: number;
}

/** Sideways links per city page (audit §5.1 depth discipline: 3–6). */
export const NEIGHBOUR_LIMIT = 3;

/** The radius a "neighbour" must fall inside. Calibrated on the
 *  catalogue (Oct 2026): the median city page's 3rd-nearest neighbour
 *  sits ~136 km away and the 90th percentile ~490 km, so 500 km keeps
 *  the set regional for the dense networks while still covering the
 *  sparse US West (Seattle's 3rd neighbour, Spokane, is ~364 km). */
export const NEIGHBOUR_MAX_DISTANCE_KM = 500;

/** A full neighbour set — below this the page keeps its previous
 *  related links (the C4 gate: only cities with coordinates for ≥3
 *  neighbours switch to distance-based links). */
export const MIN_NEIGHBOURS = 3;

function isValidPoint(p: CityPoint): boolean {
  return (
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    p.lng >= -180 &&
    p.lng <= 180
  );
}

/**
 * The nearest qualifying city pages to `self`, or fewer (possibly
 * none) when the data can't support them — never padded, never
 * guessed. Selection prefers the same region, then distance; the
 * returned order is nearest-first for display.
 */
export function nearestCityNeighbours(
  self: CityPoint,
  points: readonly CityPoint[],
  opts?: { limit?: number; maxDistanceKm?: number },
): CityNeighbour[] {
  const limit = opts?.limit ?? NEIGHBOUR_LIMIT;
  const maxDistanceKm = opts?.maxDistanceKm ?? NEIGHBOUR_MAX_DISTANCE_KM;
  if (!isValidPoint(self) || limit <= 0) return [];

  const candidates: CityNeighbour[] = [];
  for (const p of points) {
    if (p.slug === self.slug) continue;
    if (p.countrySlug !== self.countrySlug) continue;
    if (!isValidPoint(p)) continue;
    const distanceKm = haversineKm(self.lat, self.lng, p.lat, p.lng);
    if (distanceKm > maxDistanceKm) continue;
    candidates.push({ ...p, distanceKm });
  }

  const sameRegion = (n: CityNeighbour) =>
    self.region !== null && n.region === self.region ? 0 : 1;
  const bySlug = (a: CityNeighbour, b: CityNeighbour) =>
    a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;

  /* Fill: same region first (nearest first inside each class), so a
     page links within its own state before reaching across one. */
  const selected = [...candidates]
    .sort(
      (a, b) =>
        sameRegion(a) - sameRegion(b) || a.distanceKm - b.distanceKm || bySlug(a, b),
    )
    .slice(0, limit);

  /* Display: nearest first, whatever filled the set. */
  return selected
    .sort((a, b) => a.distanceKm - b.distanceKm || bySlug(a, b))
    .map((n) => ({ ...n, distanceKm: Math.round(n.distanceKm * 10) / 10 }));
}

/** The C4 gate: a full set exists, so distance-based links may
 *  replace the page's previous related list. */
export function hasFullNeighbourSet(
  neighbours: readonly CityNeighbour[],
  min: number = MIN_NEIGHBOURS,
): boolean {
  return neighbours.length >= min;
}

/** "Seattle" → "Seattle's"; "Las Vegas" → "Las Vegas'". */
export function possessive(name: string): string {
  const trimmed = name.trim();
  return /s$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`;
}

/** The three sanctioned anchor shapes for a city sideways link
 *  (audit §5.2), rotated by position so adjacent links — and pages —
 *  never repeat one exact-match string. */
export function neighbourAnchor(name: string, position: number): string {
  const shapes = [
    (n: string) => `${n} webcams`,
    (n: string) => `live cameras in ${n}`,
    (n: string) => `${possessive(n)} camera index`,
  ];
  return shapes[Math.abs(position) % shapes.length](name);
}

/** Neighbours as renderable links, anchors rotated by position. */
export function neighbourLinks(
  neighbours: readonly CityNeighbour[],
): CityNeighbourLink[] {
  return neighbours.map((n, i) => ({
    label: neighbourAnchor(n.name, i),
    href: `/city-webcams/${n.slug}`,
    distanceKm: n.distanceKm,
  }));
}

/* ------------------------------------------------------------------ */
/* Same-name place disambiguation                                      */
/*                                                                     */
/* The catalogue files records under a city NAME only — no state or    */
/* region field exists — so one name can be two real places:           */
/* "Marysville" is 49 cameras in Washington and 3 in California. A     */
/* mean over the merged set lands in neither place (47.58,-122.17 —    */
/* Puget Sound lowlands), its bbox spans both states, and every        */
/* distance or radius computed from them is fiction.                   */
/*                                                                     */
/* dominantPlaceRecords() returns the records of the DOMINANT place    */
/* in a name group: the group is split at empty geographic bands, and  */
/* the largest resulting cluster wins. Splits are conservative — a     */
/* group separates only when its bbox diagonal exceeds                   */
/* CITY_SPLIT_DIAGONAL_KM *and* an empty band of at least              */
/* CITY_SPLIT_GAP_KM exists along latitude or longitude — so a         */
/* sprawling single place (a metro, a river corridor) is never cut.    */
/* When no split fires the input comes back whole and in order, so     */
/* every mean/bbox computed over it is bit-identical to before.        */
/* Since the ownership change (2026-10-27) the dominant place owns    */
/* the whole city page: explore-data's dominantCitySet reduces a city  */
/* def's records with this helper, so quoted counts, grids and         */
/* breakdowns describe the dominant place too, not just the points.    */
/* ------------------------------------------------------------------ */

/** A name group only *can* be two places when its cameras span more
 *  than this bbox diagonal — far beyond any single city's spread. */
export const CITY_SPLIT_DIAGONAL_KM = 120;

/** Two clusters count as separate places only when an empty band at
 *  least this wide separates them along latitude or longitude. */
export const CITY_SPLIT_GAP_KM = 40;

interface LatLng {
  lat: number;
  lng: number;
}

function bboxOfPoints<T extends LatLng>(points: readonly T[]): CityBBox {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return { minLat, maxLat, minLng, maxLng };
}

function meanPoint<T extends LatLng>(points: readonly T[]): LatLng {
  let lat = 0;
  let lng = 0;
  for (const p of points) {
    lat += p.lat;
    lng += p.lng;
  }
  return { lat: lat / points.length, lng: lng / points.length };
}

/** Recursive largest-gap split: while a cluster's bbox diagonal says
 *  it *could* be two places, cut it at the widest empty band along
 *  either axis — provided the band clears CITY_SPLIT_GAP_KM. */
function splitPlaceClusters<T extends LatLng>(points: readonly T[]): T[][] {
  if (points.length < 2) return [points.slice()];
  const bbox = bboxOfPoints(points);
  const diagonalKm = haversineKm(
    bbox.minLat,
    bbox.minLng,
    bbox.maxLat,
    bbox.maxLng,
  );
  if (diagonalKm <= CITY_SPLIT_DIAGONAL_KM) return [points.slice()];

  let best: { gapKm: number; lo: T[]; hi: T[] } | null = null;
  for (const axis of ["lat", "lng"] as const) {
    const sorted = [...points].sort((x, y) => x[axis] - y[axis]);
    for (let i = 0; i + 1 < sorted.length; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const gapKm =
        axis === "lat"
          ? haversineKm(a.lat, a.lng, b.lat, a.lng)
          : haversineKm(a.lat, a.lng, a.lat, b.lng);
      if (!best || gapKm > best.gapKm) {
        best = {
          gapKm,
          lo: sorted.slice(0, i + 1),
          hi: sorted.slice(i + 1),
        };
      }
    }
  }

  if (!best || best.gapKm < CITY_SPLIT_GAP_KM) return [points.slice()];
  return [
    ...splitPlaceClusters(best.lo),
    ...splitPlaceClusters(best.hi),
  ];
}

/**
 * The records of the dominant place in a same-name group: the largest
 * gap-split cluster (ties: the cluster whose mean sits nearest the
 * whole group's mean, then the southernmost, then the westernmost —
 * fully deterministic). Input order is preserved within the result,
 * and an unsplit group returns every record in input order.
 */
export function dominantPlaceRecords<T extends LatLng>(
  points: readonly T[],
): T[] {
  if (points.length < 2) return points.slice();
  const clusters = splitPlaceClusters(points);
  if (clusters.length === 1) return clusters[0];
  const groupMean = meanPoint(points);
  let winner = clusters[0];
  let winnerMean = meanPoint(winner);
  let winnerDist = haversineKm(
    winnerMean.lat,
    winnerMean.lng,
    groupMean.lat,
    groupMean.lng,
  );
  for (const cluster of clusters.slice(1)) {
    const m = meanPoint(cluster);
    const d = haversineKm(m.lat, m.lng, groupMean.lat, groupMean.lng);
    const better =
      cluster.length > winner.length ||
      (cluster.length === winner.length &&
        (d < winnerDist ||
          (d === winnerDist &&
            (m.lat < winnerMean.lat ||
              (m.lat === winnerMean.lat && m.lng < winnerMean.lng)))));
    if (better) {
      winner = cluster;
      winnerMean = m;
      winnerDist = d;
    }
  }
  /* The split worked on axis-sorted copies; hand the winner back in
     the caller's original order so downstream sums walk the records
     exactly as they did before. */
  const keep = new Set(winner);
  return points.filter((p) => keep.has(p));
}

/**
 * Globe radius for a city's camera bounding box: half the box's
 * diagonal, so the geo deep link frames the same spread the page's
 * grid covers. Clamped to the geo format's own floor and ceiling
 * (buildGeoUrl's constants), so the link can never ask the globe to
 * frame a pinpoint or a continent.
 */
export function bboxRadiusM(bbox: CityBBox): number {
  const { minLat, maxLat, minLng, maxLng } = bbox;
  if (
    ![minLat, maxLat, minLng, maxLng].every(Number.isFinite) ||
    minLat > maxLat ||
    minLng > maxLng
  ) {
    return GEO_MIN_RADIUS_M;
  }
  const diagonalKm = haversineKm(minLat, minLng, maxLat, maxLng);
  const radiusM = (diagonalKm / 2) * 1000;
  return Math.min(
    GEO_MAX_RADIUS_M,
    Math.max(GEO_MIN_RADIUS_M, Math.round(radiusM)),
  );
}
