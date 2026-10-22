/**
 * Event alerts — rule config shapes + the launch lead-time choices.
 *
 * Deliberately a pure module (no imports): the /vip/alerts client
 * component renders the lead-time choices, and importing them from
 * ./logic would drag the orbit propagator (lib/orbit → satellite.js)
 * into the client bundle — which hangs the Turbopack production
 * build. Keep everything here dependency-free; ./logic re-exports
 * these so server code keeps one import home.
 */

export interface QuakeConfig {
  minMag: number;
}
export interface LaunchConfig {
  leadHours: number[];
}
export interface IssConfig {
  minElevationDeg: number;
  leadHours: number;
}

/** Lead times (hours before a launch) the UI offers for launch rules. */
export const LAUNCH_LEAD_CHOICES = [48, 24, 6, 1];
