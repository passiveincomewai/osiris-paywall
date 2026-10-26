// Derived US places for cameras whose feed label is a state name.
//
// Some DOT feeds file every camera under the state itself — 2,084 Utah
// cameras carry city "Utah", 4,284 Georgia cameras carry "Georgia" — so
// city grouping, city search and the state pages' area tables showed
// the state as its own largest "city" and a search for Ogden found
// almost nothing. tools/build-us-states.mjs repairs this at build
// time: each state-labelled camera adopts a real GeoNames populated
// place derived from its coordinates (nearest town or city, with a
// dominant-city rule for continuous urban strips), and the result is
// committed as src/data/us-camera-places.json. This module is the
// runtime half: an id-keyed lookup the country page, the country API
// route and the state surfaces share.
//
// Only cameras present in the sidecar change behaviour. Every other
// record — including the whole of every other country — keeps its
// feed label exactly.
import sidecar from "@/data/us-camera-places.json";
import type { CountryCamera } from "./country-cameras";

export interface CameraPlace {
  /** The derived populated place, e.g. "Ogden". */
  place: string;
  /** USPS code of the place's state, e.g. "UT". */
  state: string;
}

export interface UsStateAreaCount {
  name: string;
  count: number;
}

interface CameraPlacesSidecar {
  generatedAt: string;
  radiusKm: number;
  assigned: number;
  overrides: Record<string, CameraPlace>;
  stateAreas: Record<string, UsStateAreaCount[]>;
}

const DATA = sidecar as unknown as CameraPlacesSidecar;
const OVERRIDES = new Map<string, CameraPlace>(Object.entries(DATA.overrides ?? {}));

/** The derived place for one camera record, or null when the record
 *  keeps its feed label (the overwhelming majority). */
export function placeForCamera(record: { id?: string | null }): CameraPlace | null {
  if (!record || !record.id) return null;
  return OVERRIDES.get(record.id) ?? null;
}

/** Just the derived city name for a record — the resolver shape
 *  sliceCountryCameras accepts. Null keeps the feed label. */
export function derivedCityForCamera(record: { id?: string | null }): string | null {
  return placeForCamera(record)?.place ?? null;
}

/**
 * The records with derived cities substituted. Only overridden records
 * become new objects; when nothing in the list is overridden the input
 * array is returned as-is, so non-US callers see identical behaviour.
 */
export function withDerivedCities<T extends CountryCamera>(records: readonly T[]): T[] {
  let out: T[] | null = null;
  records.forEach((rec, i) => {
    const place = placeForCamera(rec);
    if (place && place.place !== rec.city) {
      if (!out) out = records.slice() as T[];
      out[i] = { ...rec, city: place.place };
    }
  });
  return out ?? (records as T[]);
}

/** The full derived area list for one state (slug), biggest first —
 *  the same derivation src/data/us-states.json slices its top 8 from. */
export function getStateDerivedAreas(slug: string): UsStateAreaCount[] | undefined {
  return DATA.stateAreas?.[slug];
}

/** How many cameras carry a derived place in the committed sidecar. */
export function derivedPlaceCount(): number {
  return OVERRIDES.size;
}
