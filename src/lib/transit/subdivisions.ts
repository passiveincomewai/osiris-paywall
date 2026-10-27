/**
 * OSIRIS — Live Transit subdivision toggles (Layers → TRANSIT &
 * MOBILITY → LIVE TRANSIT NETWORK).
 *
 * The transit layer used to be one switch: vehicles, route lines and
 * stops all rode the single `transit` key. The redesign splits the
 * RENDERED subdivisions into toggles stored in the same activeLayers
 * record, each bound to a real data subdivision:
 *
 *   transit_vehicles   — the live GTFS-RT vehicle render itself
 *   transit_bus_routes — bus-mode route lines AND bus-mode vehicles
 *   transit_rail_routes— tram/metro/train route lines AND vehicles
 *   transit_stops      — static-network stop dots + stop labels
 *   transit_alerts     — service-alert surfaces (summary count,
 *                        Explorer alerts, route-detail alert banners)
 *   transit_labels     — route short-name labels along the lines
 *
 * Semantics: the five default-on subdivisions read ON unless the
 * stored value is explicitly false. Persisted layer state predates
 * these keys, so an absent key must mean "as it always was" (on) —
 * never a silent disappearance of vehicles someone had yesterday.
 * Route labels are the one exception: they are a NEW visual that did
 * not exist before, so they are opt-in (on only when explicitly true).
 *
 * Mode families: GTFS route_type gives bus / tram / metro / train /
 * ferry exactly (lib/transit/staticGtfs.routeTypeMode) and the feeds'
 * own rules resolve the rest (lib/transit/agencies.resolveMode). The
 * bus toggle governs mode 'bus'; the rail toggle governs 'tram',
 * 'metro' and 'train'. Ferries and the neutral 'transit' mode belong
 * to neither family — they follow Live Vehicles alone. That is what
 * keeps every toggle live in every covered city: bus/rail filter the
 * vehicles themselves, not just UTA's route lines, so the toggles do
 * real work in Seattle or Amsterdam where no static network exists.
 */

export const TRANSIT_SUB = {
  vehicles: 'transit_vehicles',
  busRoutes: 'transit_bus_routes',
  railRoutes: 'transit_rail_routes',
  stops: 'transit_stops',
  alerts: 'transit_alerts',
  labels: 'transit_labels',
} as const;

export type TransitSubKey = (typeof TRANSIT_SUB)[keyof typeof TRANSIT_SUB];

/** A default-on subdivision: on unless explicitly stored false. */
export function transitSubOn(
  activeLayers: Record<string, boolean> | null | undefined,
  key: string,
): boolean {
  return activeLayers?.[key] !== false;
}

/** Route labels are opt-in (a new visual): on only when explicitly true. */
export function transitLabelsOn(
  activeLayers: Record<string, boolean> | null | undefined,
): boolean {
  return activeLayers?.[TRANSIT_SUB.labels] === true;
}

export type ModeFamily = 'bus' | 'rail' | 'other';

export function modeFamily(mode: string | null | undefined): ModeFamily {
  if (mode === 'bus') return 'bus';
  if (mode === 'tram' || mode === 'metro' || mode === 'train') return 'rail';
  return 'other';
}

/**
 * Whether one live vehicle renders: Live Vehicles gates everything;
 * the bus/rail toggles gate their own mode family on top.
 */
export function vehicleModeVisible(
  mode: string | null | undefined,
  activeLayers: Record<string, boolean> | null | undefined,
): boolean {
  const fam = modeFamily(mode);
  if (fam === 'bus') return transitSubOn(activeLayers, TRANSIT_SUB.busRoutes);
  if (fam === 'rail') return transitSubOn(activeLayers, TRANSIT_SUB.railRoutes);
  return true;
}

/** Whether one route line renders — the same family split as vehicles. */
export function lineModeVisible(
  mode: string | null | undefined,
  activeLayers: Record<string, boolean> | null | undefined,
): boolean {
  return vehicleModeVisible(mode, activeLayers);
}

/** Any route-line family on (lines + highlight + labels need this). */
export function anyLineFamilyOn(
  activeLayers: Record<string, boolean> | null | undefined,
): boolean {
  return (
    transitSubOn(activeLayers, TRANSIT_SUB.busRoutes) ||
    transitSubOn(activeLayers, TRANSIT_SUB.railRoutes)
  );
}
