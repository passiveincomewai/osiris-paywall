/**
 * OSIRIS — server-side slicing for the country camera pages.
 *
 * A country page used to fetch whole regions of the catalogue and filter
 * in the browser — fine for Thailand's hundred cameras, impossible for the
 * United States' forty thousand: the records themselves are the payload.
 * So the grid is served in batches from the generated per-country data
 * (tools/build-country-pages.mjs) through /api/cctv/country/[country],
 * and this module is the pure part of that route: filter (the same
 * semantics the explorer always used — lib/country-cameras filterCameras),
 * then slice. Search and city filtering happen here, over the whole
 * country, so a visitor can find one camera among forty thousand without
 * downloading forty thousand records.
 */
import { cameraAreas, filterCameras, type CameraArea, type CountryCamera } from './country-cameras';

export interface CountrySliceRequest {
  offset?: number;
  limit?: number;
  city?: string | null;
  query?: string;
}

export interface CountrySlice {
  /** Records matching the filters, before slicing. */
  total: number;
  offset: number;
  limit: number;
  cameras: CountryCamera[];
  /** The country's biggest cities (unfiltered), for the filter chips. */
  cities: CameraArea[];
}

export const COUNTRY_PAGE_SIZE = 48;
export const MAX_COUNTRY_PAGE_SIZE = 96;
/** Chips beyond this are reachable through the search box instead. */
export const COUNTRY_CITY_CHIPS = 40;

function clampInt(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

export function sliceCountryCameras(
  records: readonly CountryCamera[],
  req: CountrySliceRequest,
): CountrySlice {
  const offset = clampInt(req.offset, 0, 0, Number.MAX_SAFE_INTEGER);
  const limit = clampInt(req.limit, COUNTRY_PAGE_SIZE, 1, MAX_COUNTRY_PAGE_SIZE);
  const filtered = filterCameras(records, { query: req.query, area: req.city ?? null });
  return {
    total: filtered.length,
    offset,
    limit,
    cameras: filtered.slice(offset, offset + limit),
    cities: cameraAreas(records).slice(0, COUNTRY_CITY_CHIPS),
  };
}
