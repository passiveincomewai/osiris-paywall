/**
 * WorldEye — Traffic layer configuration.
 *
 * The traffic layer draws SIMULATED vehicles on real OpenStreetMap road
 * geometry (the same CARTO/OpenMapTiles vector tiles the basemap already
 * renders — no second tile source, no Overpass queries). Nothing here is
 * a real tracked vehicle; the honest labeling lives in the map chip and
 * docs/traffic.md.
 *
 * Design adapted from the MIT-licensed traffic layer architecture of
 * God's Eye View (github.com/bilawalsidhu/gods-eye-view,
 * src/layers/traffic): modular ingestion → model → animation split,
 * viewport-driven road loading, flow matched onto OSM roads. Ideas and
 * structure only — this is an independent MapLibre implementation; no
 * Cesium code and none of that repo's bundled datasets are used.
 * MIT notice retained in docs/traffic.md.
 */

/** Road classes from the OpenMapTiles `transportation` layer we simulate on. */
export type RoadClass =
  | 'motorway' | 'trunk' | 'primary' | 'secondary' | 'tertiary' | 'minor' | 'service';

/** Simulation only makes sense at city level; below this the chip says so. */
export const TRAFFIC_MIN_ZOOM = 10.5;

/** Zoom past which `service` roads (parking aisles excluded) join the network. */
export const SERVICE_MIN_ZOOM = 15.5;

/**
 * Road-class filtering by zoom: arterials first when zoomed out, the full
 * local network when zoomed in. Keeps tile-feature volume — and therefore
 * extraction cost and vehicle clutter — bounded on wide views.
 */
export function classesForZoom(zoom: number): RoadClass[] {
  if (zoom < 11.5) return ['motorway', 'trunk'];
  if (zoom < 13) return ['motorway', 'trunk', 'primary'];
  if (zoom < 14.5) return ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];
  if (zoom < SERVICE_MIN_ZOOM) return ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor'];
  return ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'minor', 'service'];
}

/** Hard vehicle caps. Mobile gets a lower cap: smaller GPUs, smaller screens. */
export const VEHICLE_CAP_DESKTOP = 240;
export const VEHICLE_CAP_MOBILE = 100;

/** Metres of road network per vehicle at full city zoom — the density dial. */
const METRES_PER_VEHICLE = 420;

/**
 * How many vehicles a network of this size should carry. Longer networks
 * earn more vehicles up to the hard cap; at wide zooms only arterials are
 * loaded anyway, so their total length naturally thins the fleet.
 * `meanRatio` (the network's length-weighted mean speed ratio, when the
 * caller knows it) scales density by measured congestion: a gridlocked
 * network is packed, a free-flowing one at 3 AM is sparse.
 */
export function targetVehicleCount(totalLengthM: number, zoom: number, mobile: boolean, meanRatio?: number): number {
  const cap = mobile ? VEHICLE_CAP_MOBILE : VEHICLE_CAP_DESKTOP;
  const zoomScale = zoom >= 14.5 ? 1 : zoom >= 13 ? 0.55 : 0.3;
  const density = typeof meanRatio === 'number' && Number.isFinite(meanRatio)
    ? densityScaleForMeanRatio(meanRatio)
    : 1;
  const byLength = Math.round((totalLengthM / METRES_PER_VEHICLE) * zoomScale * density);
  return Math.max(0, Math.min(cap, byLength));
}

/**
 * Fleet-density scale for a network whose mean speed ratio is
 * `meanRatio` (1 = everything at free flow, ~0.25 = gridlock).
 * Free-flowing networks thin out; jammed ones fill up.
 */
export function densityScaleForMeanRatio(meanRatio: number): number {
  const r = Math.max(0, Math.min(1, meanRatio));
  return Math.max(0.45, Math.min(1.35, 0.45 + (1 - r) * 0.95));
}

/**
 * Per-road spawn weight from the road's own speed ratio: the slower a
 * road is running, the more vehicles pile onto it. Free flow still
 * carries traffic — just less of it.
 */
export function congestionDensityWeight(ratio: number): number {
  const r = Math.max(0, Math.min(1, ratio));
  return Math.max(0.6, Math.min(1.45, 1.6 - r));
}

/** Relative spawn weight per class — the big roads carry most of the traffic. */
export const CLASS_SPAWN_WEIGHT: Record<RoadClass, number> = {
  motorway: 6, trunk: 5, primary: 4, secondary: 3, tertiary: 2, minor: 1.2, service: 0.5,
};

/** Congestion bands: ratio of current speed to free-flow speed. */
export const BAND_FREE_MIN = 0.7;
export const BAND_SLOW_MIN = 0.4;

export type CongestionBand = 'free' | 'slow' | 'jam';

export function congestionBand(ratio: number): CongestionBand {
  if (ratio >= BAND_FREE_MIN) return 'free';
  if (ratio >= BAND_SLOW_MIN) return 'slow';
  return 'jam';
}

/** Green / amber / red road-flow colors, readable on the dark basemap. */
export const BAND_COLORS: Record<CongestionBand, string> = {
  free: '#2AE57B',
  slow: '#FFC105',
  jam: '#FB2D09',
};

/** Radius for the "cameras near this road" lookup (requirement: bounded). */
export const CAMERA_SEARCH_RADIUS_M = 1500;
export const CAMERA_SEARCH_MAX = 5;

/** TomTom flow features further than this from a road do not influence it. */
export const FLOW_MATCH_RADIUS_M = 60;

/** Server-side TomTom tile proxy bounds (see src/app/api/traffic/flow). */
export const TOMTOM_PROXY_MIN_ZOOM = 9;
export const TOMTOM_PROXY_MAX_ZOOM = 19;
export const TOMTOM_TILE_TTL_MS = 60_000;

// ── Chip copy ─────────────────────────────────────────────────────────
// The one line that rides with the traffic layer. The congestion/flow
// data is live TomTom where configured; the vehicles are always a
// model drawn from the road data — the line says both, in those words.

/** What the chip can honestly say about its flow data right now. */
export type TrafficFlowState = 'live' | 'unavailable';

export function trafficChipText(flow: TrafficFlowState, belowMinZoom: boolean): string {
  if (belowMinZoom) {
    return flow === 'live'
      ? 'Live traffic flow · vehicles modeled from road data — zoom in to city level for street traffic'
      : 'Vehicles modeled from road data — zoom in to city level for street traffic';
  }
  return flow === 'live'
    ? 'Live traffic flow · vehicles modeled from road data'
    : 'Vehicles modeled from road data · live traffic flow unavailable';
}
