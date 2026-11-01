/**
 * OSIRIS — geometry for the clickable US map on the United States
 * pages. Pure projection of the Census state boundaries vendored in
 * src/data/us-state-boundaries.json — the same polygons lib/us-states
 * uses to derive every camera's state, so the shapes on the map are
 * the site's own state boundaries, not a second artwork file that
 * could drift from them.
 *
 * Layout (viewBox 0 0 960 600): the mainland states share one
 * equirectangular projection (latitude stretched by 1/cos(37°) so
 * state shapes keep their natural proportions). Alaska and Hawaii are
 * drawn as insets from their real polygons — Alaska unwrapped across
 * the antimeridian, scaled down and set below the West Coast; Hawaii
 * scaled up and set below the Southwest — the conventional treatment,
 * because a single true-coordinate frame either wraps Alaska around
 * the world or shrinks the mainland to a corner. The District of
 * Columbia is a 0.2° square at mainland scale: it renders as a small
 * diamond marker at its true position, with its label led out to the
 * Atlantic-side label column like the small New England states.
 *
 * Label anchors are the bounding-box centre of each state's largest
 * ring; the small north-eastern states get a hand offset into open
 * water with a leader line back to the state (LABEL_OFFSETS), so no
 * two USPS labels collide.
 */

import boundaries from "@/data/us-state-boundaries.json";

export interface UsMapState {
  slug: string;
  name: string;
  usps: string;
  /** SVG path data for every ring of the state, in viewBox units. */
  path: string;
  /** Label anchor in viewBox units (after any LABEL_OFFSETS shift). */
  labelX: number;
  labelY: number;
  /** True centroid in viewBox units — the leader line runs from here
   *  to the label anchor when the label was offset, and the DC marker
   *  is centred here. */
  anchorX: number;
  anchorY: number;
  /** DC only: render a marker diamond at the anchor instead of
   *  relying on its (sub-pixel) polygon. */
  isMarker?: boolean;
}

interface RawState {
  name: string;
  slug: string;
  usps: string;
  polygons: number[][][];
}

const RAW = (boundaries as unknown as { states: RawState[] }).states;

export const US_MAP_VIEWBOX = { width: 960, height: 600 } as const;

/* Mainland frame: lon −125.5..−66.5, lat 24.3..50.0 stretched by the
   latitude factor, fitted into x 40..950 / y 10..480 (uniform scale,
   horizontally centred). */
const LAT_FACTOR = 1.252; // 1 / cos(37°)
const MAIN = (() => {
  const lonMin = -125.5;
  const lonMax = -66.5;
  const latMin = 24.3;
  const latMax = 50.0;
  const x0 = 40;
  const x1 = 950;
  const y0 = 10;
  const y1 = 480;
  const scale = Math.min(
    (x1 - x0) / (lonMax - lonMin),
    (y1 - y0) / ((latMax - latMin) * LAT_FACTOR),
  );
  const width = (lonMax - lonMin) * scale;
  const height = (latMax - latMin) * LAT_FACTOR * scale;
  const ox = x0 + (x1 - x0 - width) / 2;
  const oy = y0 + (y1 - y0 - height) / 2;
  return {
    scale,
    project: (lon: number, lat: number): [number, number] => [
      ox + (lon - lonMin) * scale,
      oy + (latMax - lat) * LAT_FACTOR * scale,
    ],
  };
})();

/* Inset frames. Alaska: longitudes unwrapped (the vendored rings run
   to −188.9°, i.e. past the antimeridian) into 171..230. Hawaii:
   true coordinates. Each inset fits its own box with its own uniform
   scale and a gentler latitude factor, so the islands keep their
   shapes at inset size. */
function insetProjector(
  lonMin: number,
  lonMax: number,
  latMin: number,
  latMax: number,
  latFactor: number,
  box: { x0: number; y0: number; x1: number; y1: number },
): (lon: number, lat: number) => [number, number] {
  const scale = Math.min(
    (box.x1 - box.x0) / (lonMax - lonMin),
    (box.y1 - box.y0) / ((latMax - latMin) * latFactor),
  );
  const width = (lonMax - lonMin) * scale;
  const height = (latMax - latMin) * latFactor * scale;
  const ox = box.x0 + (box.x1 - box.x0 - width) / 2;
  const oy = box.y0 + (box.y1 - box.y0 - height) / 2;
  return (lon, lat) => [
    ox + (lon - lonMin) * scale,
    oy + (latMax - lat) * latFactor * scale,
  ];
}

const AK_PROJECT = insetProjector(171, 230.5, 51.4, 71.6, 1.45, {
  x0: 30,
  y0: 445,
  x1: 275,
  y1: 592,
});
const HI_PROJECT = insetProjector(-161.2, -154.6, 18.7, 22.5, 1.06, {
  x0: 300,
  y0: 495,
  x1: 480,
  y1: 590,
});

function projectorFor(slug: string): (lon: number, lat: number) => [number, number] {
  if (slug === "alaska") {
    /* Every Alaskan longitude shifts +360 into the inset's
       171..230 frame — the vendored rings run −188.9..−130, so a
       plain shift unwraps the antimeridian crossing AND brings the
       mainland coast into the same frame. */
    return (lon, lat) => AK_PROJECT(lon < 0 ? lon + 360 : lon, lat);
  }
  if (slug === "hawaii") return HI_PROJECT;
  return MAIN.project;
}

/** Hand label offsets (viewBox px) for the states too small to hold
 *  their USPS code: the label sits in open space and a leader line
 *  ties it to the state. DC's marker gets the furthest lead. */
const LABEL_OFFSETS: Record<string, [number, number]> = {
  /* Bbox-centre nudges for states whose centre lands badly: Idaho's
     panhandle drags its centre into Washington, Florida's lands in
     the Gulf, Louisiana's onto the Mississippi line. */
  idaho: [4, 30],
  florida: [-2, -18],
  louisiana: [-8, 4],
  "new-hampshire": [16, -8],
  vermont: [-16, -6],
  massachusetts: [20, 2],
  "rhode-island": [26, 10],
  connecticut: [18, 14],
  "new-jersey": [18, 4],
  delaware: [20, 10],
  maryland: [22, 16],
  "district-of-columbia": [34, 26],
};

const round1 = (n: number) => Math.round(n * 10) / 10;

function buildState(raw: RawState): UsMapState {
  const project = projectorFor(raw.slug);
  const parts: string[] = [];
  let largest: { ring: number[][]; area: number } | null = null;
  for (const ring of raw.polygons) {
    const pts = ring.map(([lon, lat]) => project(lon, lat));
    parts.push(
      pts
        .map(([x, y], i) => `${i === 0 ? "M" : "L"}${round1(x)},${round1(y)}`)
        .join("") + "Z",
    );
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const area =
      (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    if (!largest || area > largest.area) {
      largest = {
        ring: pts as unknown as number[][],
        area,
      };
    }
  }
  const ringPts = largest!.ring;
  const xs = ringPts.map((p) => p[0]);
  const ys = ringPts.map((p) => p[1]);
  const anchorX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const anchorY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const [dx, dy] = LABEL_OFFSETS[raw.slug] ?? [0, 0];
  return {
    slug: raw.slug,
    name: raw.name,
    usps: raw.usps,
    path: parts.join(""),
    anchorX: round1(anchorX),
    anchorY: round1(anchorY),
    labelX: round1(anchorX + dx),
    labelY: round1(anchorY + dy),
    ...(raw.slug === "district-of-columbia" ? { isMarker: true } : {}),
  };
}

/** All 51 map states (50 states + DC), in the boundaries file's order. */
export const US_MAP_STATES: UsMapState[] = RAW.map(buildState);

const BY_SLUG = new Map(US_MAP_STATES.map((s) => [s.slug, s]));

export function usMapState(slug: string): UsMapState | undefined {
  return BY_SLUG.get(slug);
}
