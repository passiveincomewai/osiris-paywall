/**
 * OSIRIS — transit agency viewport relevance (pure; shared by the map
 * client and unit tests).
 *
 * THE BUG THIS REPLACES: the client used to fetch an agency only when
 * the agency's single `center` point fell inside the viewport padded
 * by 0.75× the viewport span, and it evicted every non-selected
 * agency's cached vehicles on each moveend. Padding scales WITH the
 * viewport, so as the user zooms in the pad collapses toward zero and
 * the center point falls outside anywhere except within ~a kilometre
 * of the nominal center — the agency is evicted and all its vehicle
 * dots disappear at street level (reproduced live 2026-10-18: UTA's
 * Ogden buses dropped at every zoom ≥ 11, its south TRAX at ≥ 13).
 *
 * THE RULE NOW: an agency is relevant when its service-area BOUNDS
 * intersect the (lightly padded) viewport. Any viewport inside the
 * service area intersects at every zoom, so dots persist from globe
 * to street level; the agency is only dropped when the user pans
 * genuinely outside its service area, where none of its vehicles are
 * on screen anyway.
 */

export interface AgencyGeo {
  /** [lat, lng] */
  center: [number, number];
  /** [south, west, north, east] — optional for stale API payloads. */
  bounds?: [number, number, number, number] | null;
}

export interface ViewGeo {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Pad a viewport by a fraction of its own span (load-just-before-visible hysteresis). */
export function padView(view: ViewGeo, frac: number): ViewGeo {
  const padLat = (view.north - view.south) * frac;
  const padLng = (view.east - view.west) * frac;
  return {
    south: view.south - padLat,
    north: view.north + padLat,
    west: view.west - padLng,
    east: view.east + padLng,
  };
}

export function agencyIntersectsView(agency: AgencyGeo, view: ViewGeo): boolean {
  const v = padView(view, 0.25);
  if (agency.bounds) {
    const [s, w, n, e] = agency.bounds;
    return n >= v.south && s <= v.north && e >= v.west && w <= v.east;
  }
  // Fallback for payloads without bounds (older cached directory):
  // the legacy center test. Kept only so a stale directory response
  // degrades to the old behavior instead of showing nothing.
  const [clat, clng] = agency.center;
  return clat >= v.south && clat <= v.north && clng >= v.west && clng <= v.east;
}

/**
 * Agencies relevant to a viewport, nearest-center first, capped.
 * Sorting by distance keeps the cap spent on the agencies the user is
 * actually looking at when several service areas overlap a wide view.
 */
export function selectAgenciesForView<T extends AgencyGeo>(agencies: T[], view: ViewGeo, cap = 6): T[] {
  const vlat = (view.south + view.north) / 2;
  const vlng = (view.west + view.east) / 2;
  return agencies
    .filter(a => agencyIntersectsView(a, view))
    .map(a => ({ a, d: (a.center[0] - vlat) ** 2 + (a.center[1] - vlng) ** 2 }))
    .sort((x, y) => x.d - y.d)
    .slice(0, cap)
    .map(x => x.a);
}
