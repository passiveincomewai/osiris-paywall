/**
 * WorldEye Ambient — the mood collections.
 *
 * WHAT A MOOD IS (and is not): there is no per-camera live-weather
 * join in the catalogue — nothing records "it is raining at this
 * camera right now" — so a mood is a CURATED SCENE COLLECTION derived
 * from real catalogue metadata (camera name, city, country, source,
 * coordinates), never a live-condition claim. The one exception is
 * Night Views: darkness is computable from coordinates + clock (see
 * lib/ambient/solar), so that mood really does mean "dark there now".
 * Page copy says "curated collections" for exactly this reason.
 *
 * Derivation rules, per mood:
 *  - rainy-cities: cameras in cities with famously wet climates (the
 *    curated RAINY_CITIES list below), or with rain/storm words in
 *    the camera name. Urban cameras only in spirit — the city list
 *    does that work.
 *  - snowy-mountains: ski/mountain scene words in name or city, or a
 *    camera in/near a town from the ski-resort catalogue data
 *    (src/data/ski-resorts.json, injected by the feed builder as
 *    `skiTowns`), or high-alpine road sources.
 *  - tropical-beaches: beach/coast scene words, held to the tropical
 *    and warm-temperate band (|lat| ≤ 35) when coordinates exist —
 *    a beach in the tropics, not just any beach.
 *  - night-views: sun elevation at the camera's coordinates is below
 *    NIGHT_ELEVATION_DEG right now (lib/ambient/solar). Cameras with
 *    no coordinates can't be verified dark and are excluded. Urban
 *    scenes (city words in the name) are preferred when the pool is
 *    large enough — see preferUrbanNight.
 *  - all: every playable camera.
 *
 * Everything here is pure and pinned by moods.test.ts.
 */
import { isNightAt } from "./solar";

export type MoodSlug =
  | "all"
  | "rainy-cities"
  | "snowy-mountains"
  | "tropical-beaches"
  | "night-views";

export interface MoodDef {
  slug: MoodSlug;
  label: string;
  blurb: string;
}

export const MOODS: readonly MoodDef[] = [
  { slug: "all", label: "Everywhere", blurb: "The whole planet, shuffled." },
  { slug: "rainy-cities", label: "Rainy Cities", blurb: "Wet streets and grey skies in the world's rainiest cities." },
  { slug: "snowy-mountains", label: "Snowy Mountains", blurb: "Ski towns, alpine passes and high white places." },
  { slug: "tropical-beaches", label: "Tropical Beaches", blurb: "Warm coasts, islands and harbour light." },
  { slug: "night-views", label: "Night Views", blurb: "Places where it is dark right now — city lights and night streets." },
];

export function isMoodSlug(v: string | null | undefined): v is MoodSlug {
  return MOODS.some((m) => m.slug === v);
}

/** The catalogue fields mood derivation reads. */
export interface MoodCamera {
  name?: string;
  city?: string;
  country?: string;
  source?: string;
  lat?: number;
  lng?: number;
}

function text(cam: MoodCamera): string {
  return `${cam.name ?? ""} ${cam.city ?? ""} ${cam.country ?? ""}`.toLowerCase();
}

function cityOf(cam: MoodCamera): string {
  return (cam.city ?? "").trim().toLowerCase();
}

/* ── Rainy Cities ──────────────────────────────────────────────────── */

/** Cities whose climates are famously wet — a curation, stated as one.
 *  Matched against the camera's catalogue city field. */
export const RAINY_CITIES: ReadonlySet<string> = new Set([
  "seattle", "portland", "vancouver", "london", "bergen", "singapore",
  "taipei", "hong kong", "glasgow", "edinburgh", "dublin", "amsterdam",
  "hamburg", "san francisco", "kuala lumpur", "jakarta", "manila",
  "auckland", "wellington", "reykjavik", "reykjavík", "cherrapunji",
  "bogota", "bogotá", "quito", "hilo", "juneau", "prince rupert",
  "stavanger", "gothenburg", "copenhagen", "brussels", "rotterdam",
  "bilbao", "vigo", "porto", "funchal", "ponta delgada",
]);

const RAIN_WORDS = /\b(rain|rainy|storm|monsoon|wet\s+street)\b/;

/* ── Snowy Mountains ───────────────────────────────────────────────── */

const SNOW_WORDS =
  /\b(ski|snow|snowy|alpine|alps|mountain|mountains|summit|glacier|resort|nordic|winter)\b/;
const SNOW_NAME_HINTS = /\b(mt\.?|mount|peak|pass|col|piste|cable\s?car|gondola|lift)\b/;

/* ── Tropical Beaches ──────────────────────────────────────────────── */

const BEACH_WORDS =
  /\b(beach|playa|praia|strand|seaside|surf|lagoon|atoll|boardwalk)\b/;
const COAST_WORDS = /\b(coast|coastal|shore|island|isla|ile|îles|harbour|harbor|marina|bay|pier|cove)\b/;
export const TROPICAL_BAND_DEG = 35;

/* ── Night Views ───────────────────────────────────────────────────── */

const URBAN_WORDS =
  /\b(city|downtown|skyline|street|square|plaza|avenue|bridge|tower|harbour|harbor|station|centre|center| old town|night)\b/;

/** Context the feed builder injects: place names from the ski data. */
export interface MoodContext {
  /** Lowercased town/resort names from src/data/ski-resorts.json. */
  skiTowns?: ReadonlySet<string>;
  /** "Now" for the night computation — injectable for tests. */
  now?: Date;
}

export function cameraMatchesMood(
  cam: MoodCamera,
  mood: MoodSlug,
  ctx: MoodContext = {},
): boolean {
  switch (mood) {
    case "all":
      return true;
    case "rainy-cities": {
      if (RAINY_CITIES.has(cityOf(cam))) return true;
      return RAIN_WORDS.test(text(cam));
    }
    case "snowy-mountains": {
      const t = text(cam);
      if (SNOW_WORDS.test(t) || SNOW_NAME_HINTS.test(cam.name?.toLowerCase() ?? "")) {
        return true;
      }
      const city = cityOf(cam);
      if (city && ctx.skiTowns?.has(city)) return true;
      return false;
    }
    case "tropical-beaches": {
      const t = text(cam);
      if (!BEACH_WORDS.test(t) && !COAST_WORDS.test(t)) return false;
      // Hold the "tropical" promise: with coordinates, stay in band.
      if (typeof cam.lat === "number" && Number.isFinite(cam.lat)) {
        return Math.abs(cam.lat) <= TROPICAL_BAND_DEG;
      }
      return true;
    }
    case "night-views": {
      if (
        typeof cam.lat !== "number" ||
        typeof cam.lng !== "number" ||
        !Number.isFinite(cam.lat) ||
        !Number.isFinite(cam.lng)
      ) {
        return false; // darkness unverifiable without coordinates
      }
      return isNightAt(cam.lat, cam.lng, ctx.now ?? new Date());
    }
  }
}

/**
 * Night Views prefers lit urban scenes over dark countryside when the
 * pool allows: given the full night pool and how many scenes the feed
 * will serve, return the urban subset if it alone can fill the order,
 * otherwise the whole pool (a dark fjord road beats an empty list).
 */
export function preferUrbanNight<T extends MoodCamera>(
  pool: readonly T[],
  needed: number,
): T[] {
  const urban = pool.filter((c) => URBAN_WORDS.test(text(c)));
  return urban.length >= needed ? urban : [...pool];
}
