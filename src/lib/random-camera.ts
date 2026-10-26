/**
 * OSIRIS — Random Camera Roulette: pick + score logic (pure).
 *
 * The /random page drops the player at a random live camera somewhere
 * on Earth and asks them to guess the country. Everything game-shaped
 * that does not need the DOM lives here, so it can be unit-tested:
 *
 *  - which catalogue records may be dealt (only feeds the site's own
 *    viewer plays natively — HLS/MP4/MJPEG streams and refreshing
 *    snapshot stills; embeds and listing-only records never play in
 *    place, so they are never dealt);
 *  - how a round is scored (exact country / same region / way off);
 *  - how a pool is sampled. Sampling is stratified by country —
 *    round-robin across a shuffled country order — because the raw
 *    catalogue is majority-US: a uniform pick would deal an American
 *    highway camera every other round and ruin the geography game.
 *
 * Records come from the same generated catalogue the country pages
 * serve (src/data/countries/*.json via lib/explore-data), so a dealt
 * camera is a real camera with a real feed URL — nothing here invents
 * names, places or counts.
 */

import {
  cameraMediaKind,
  countrySlug,
  type CountryCamera,
} from './country-cameras';
import {
  COUNTRY_REGION,
  REGION_LABEL,
  type RegionKey,
} from './country-page-content';

/** How a dealt camera's feed is rendered by the game component. */
export type RouletteFeedKind = 'hls' | 'mp4' | 'mjpeg' | 'snapshot';

/** A catalogue camera reduced to exactly what the game needs. */
export interface RouletteCamera {
  id: string;
  name: string;
  city: string | null;
  country: string;
  countrySlug: string;
  region: RegionKey;
  regionLabel: string;
  lat: number;
  lng: number;
  feed: RouletteFeedKind;
  url: string;
}

/** One row of the guess dropdown: every country a dealt camera can be in. */
export interface GuessCountry {
  slug: string;
  name: string;
  region: RegionKey;
  regionLabel: string;
}

export type GuessVerdict = 'nailed' | 'close' | 'way-off';

export const VERDICT_POINTS: Record<GuessVerdict, number> = {
  nailed: 100,
  close: 25,
  'way-off': 0,
};

/** Random source, injectable so sampling is testable. Returns [0, 1). */
export type Rng = () => number;

/**
 * Convert a catalogue record into a roulette camera, or null when the
 * record cannot be dealt: embeds and listing-only records (they never
 * play in place), records without a country or coordinates, and
 * countries with no region mapping (scoring needs the region).
 */
export function toRouletteCamera(rec: CountryCamera): RouletteCamera | null {
  const kind = cameraMediaKind(rec);
  if (kind !== 'video' && kind !== 'snapshot') return null;
  if (!rec.country) return null;
  if (typeof rec.lat !== 'number' || typeof rec.lng !== 'number') return null;
  if (!Number.isFinite(rec.lat) || !Number.isFinite(rec.lng)) return null;
  const slug = countrySlug(rec.country);
  const region = COUNTRY_REGION[slug];
  if (!region) return null;

  let feed: RouletteFeedKind;
  let url: string;
  if (kind === 'snapshot') {
    feed = 'snapshot';
    url = rec.feed_url as string;
  } else {
    url = rec.stream_url as string;
    const declared = (rec.stream_type ?? '').toLowerCase();
    if (declared === 'mp4') feed = 'mp4';
    else if (declared === 'mjpeg') feed = 'mjpeg';
    else if (/\.mp4(\?|$)/i.test(url)) feed = 'mp4';
    else feed = 'hls';
  }

  return {
    id: rec.id,
    name: rec.name,
    city: rec.city?.trim() ? rec.city : null,
    country: rec.country,
    countrySlug: slug,
    region,
    regionLabel: REGION_LABEL[region],
    lat: rec.lat,
    lng: rec.lng,
    feed,
    url,
  };
}

/** Every dealable camera in a record set, catalogue order preserved. */
export function playableRouletteCameras(
  records: readonly CountryCamera[],
): RouletteCamera[] {
  const out: RouletteCamera[] = [];
  for (const rec of records) {
    const cam = toRouletteCamera(rec);
    if (cam) out.push(cam);
  }
  return out;
}

/** The guess dropdown's options: the countries dealable cameras live in. */
export function guessCountries(
  cameras: readonly RouletteCamera[],
): GuessCountry[] {
  const bySlug = new Map<string, GuessCountry>();
  for (const cam of cameras) {
    if (!bySlug.has(cam.countrySlug)) {
      bySlug.set(cam.countrySlug, {
        slug: cam.countrySlug,
        name: cam.country,
        region: cam.region,
        regionLabel: cam.regionLabel,
      });
    }
  }
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Score one guess against the dealt camera's true country. */
export function scoreGuess(
  actual: Pick<RouletteCamera, 'countrySlug' | 'region'>,
  guessed: Pick<GuessCountry, 'slug' | 'region'>,
): { verdict: GuessVerdict; points: number } {
  if (guessed.slug === actual.countrySlug) {
    return { verdict: 'nailed', points: VERDICT_POINTS.nailed };
  }
  if (guessed.region === actual.region) {
    return { verdict: 'close', points: VERDICT_POINTS.close };
  }
  return { verdict: 'way-off', points: VERDICT_POINTS['way-off'] };
}

/** Fisher–Yates shuffle on a copy; the input array is not mutated. */
export function shuffled<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Deal a pool of `count` cameras, stratified by country: countries are
 * shuffled, each country's cameras are shuffled, and the pool is dealt
 * round-robin so consecutive rounds jump around the planet instead of
 * clustering wherever the catalogue is densest. Ids are unique within
 * the pool. Asking for more than the catalogue holds returns everything
 * dealable, shuffled the same way.
 */
export function sampleRoulettePool(
  cameras: readonly RouletteCamera[],
  count: number,
  rng: Rng = Math.random,
): RouletteCamera[] {
  if (count <= 0 || cameras.length === 0) return [];
  const byCountry = new Map<string, RouletteCamera[]>();
  for (const cam of cameras) {
    const list = byCountry.get(cam.countrySlug);
    if (list) list.push(cam);
    else byCountry.set(cam.countrySlug, [cam]);
  }
  const queues = shuffled([...byCountry.values()], rng).map((list) =>
    shuffled(list, rng),
  );
  const seen = new Set<string>();
  const pool: RouletteCamera[] = [];
  let dealt = true;
  while (pool.length < count && dealt) {
    dealt = false;
    for (const queue of queues) {
      if (pool.length >= count) break;
      const next = queue.pop();
      if (!next) continue;
      dealt = true;
      if (seen.has(next.id)) continue;
      seen.add(next.id);
      pool.push(next);
    }
  }
  return pool;
}
