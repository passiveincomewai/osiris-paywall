/**
 * OSIRIS — NOAA Radar & Lightning: two nowCOAST WMS raster overlays.
 *
 * Both products come from NOAA nowCOAST (US public domain, keyless) and are
 * fetched by the map straight from NOAA as WMS tiles — there is no proxy and
 * nothing is fetched until the layer is switched on.
 *
 *   • Precipitation radar — the NEXRAD base-reflectivity mosaic over the
 *     CONUS, Alaska, Hawaii, the Caribbean and Guam, republished every few
 *     minutes. Layer `base_reflectivity_mosaic` on the observations/
 *     weather_radar workspace.
 *   • Lightning density — the Lightning Detection Network strike-density
 *     grid, layer `ldn_lightning_strike_density` on the observations/
 *     lightning_detection workspace.
 *
 * Both WMS services are time-enabled. The tile URL carries a `time` rounded
 * down to the refresh step, so the map re-requests tiles as new frames land
 * and a CDN can cache a frame for its step instead of every client asking
 * NOAA for a fresh render of the same picture.
 */

export const RADAR_SOURCE = 'noaa-radar';
export const RADAR_LAYER = 'noaa-radar-layer';
/** Credit shown by the map's attribution control while the radar is up. */
export const RADAR_ATTRIBUTION = 'Radar © NOAA/NWS nowCOAST';

export const LIGHTNING_SOURCE = 'noaa-lightning';
export const LIGHTNING_LAYER = 'noaa-lightning-layer';
export const LIGHTNING_ATTRIBUTION = 'Lightning © NOAA/NWS nowCOAST · LDN';

/** How often a fresh mosaic is expected (nowCOAST republishes ~5 min). */
export const RADAR_REFRESH_MS = 5 * 60_000;

function wmsTiles(workspace: string, layer: string, frameIso: string): string {
  return (
    `https://nowcoast.noaa.gov/geoserver/${workspace}/ows?service=WMS&version=1.3.0` +
    `&request=GetMap&layers=${layer}&styles=&format=image/png&transparent=true` +
    `&width=256&height=256&crs=EPSG:3857&time=${frameIso}&bbox={bbox-epsg-3857}`
  );
}

/** The current frame stamp: now, floored to the refresh step, as WMS time. */
export function radarFrameIso(now = Date.now()): string {
  const floored = Math.floor(now / RADAR_REFRESH_MS) * RADAR_REFRESH_MS;
  return new Date(floored).toISOString();
}

export function radarTiles(frameIso: string): string[] {
  return [wmsTiles('observations/weather_radar', 'base_reflectivity_mosaic', frameIso)];
}

export function lightningTiles(frameIso: string): string[] {
  return [wmsTiles('observations/lightning_detection', 'ldn_lightning_strike_density', frameIso)];
}
