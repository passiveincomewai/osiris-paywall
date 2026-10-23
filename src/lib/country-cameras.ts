/**
 * OSIRIS — country camera explorer: which cameras belong to a country page,
 * and how that page narrows them down.
 *
 * The catalogue itself is the one the globe already reads — /api/cctv,
 * assembled from the regional sources under src/app/api/cctv. A country page
 * asks that API for the regions its part of the world loads on the globe and
 * keeps the records whose country matches. There is no second camera
 * database: this module only holds the per-country configuration and the
 * (pure, tested) selection logic the explorer component renders from.
 */

import { previewMedia } from './camera-preview';

/** The fields of a catalogue record the country pages read. */
export interface CountryCamera {
  id: string;
  name: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  feed_url?: string;
  stream_url?: string;
  stream_type?: string;
  external_url?: string;
  source?: string;
}

export interface CountryExplorerConfig {
  /** Canonical country name as it appears in catalogue records. */
  country: string;
  /** Other spellings/codes sources use for the same country. */
  aliases: string[];
  /**
   * /api/cctv regions to request — the same regions the globe loads for a
   * viewport over this country (see getRegionsForBounds in the cctv route),
   * so the page and the map can never disagree about what exists.
   */
  regions: string[];
}

/**
 * Raw catalogue `country` value → canonical country name. This is the
 * runtime copy of the map the data generators carry (scripts/
 * build-camera-directory.mjs, tools/build-country-pages.mjs) — the three
 * must agree, because a camera's country page is decided by this table.
 * The {Thailand, TH} pairing is load-bearing: Thai sources label records
 * both ways, and dropping either halves the country's page.
 */
export const COUNTRY_NORMALIZE: Record<string, string> = {
  US: 'United States', 'United States': 'United States',
  JP: 'Japan', Japan: 'Japan',
  TW: 'Taiwan', Taiwan: 'Taiwan',
  UK: 'United Kingdom', GB: 'United Kingdom', 'United Kingdom': 'United Kingdom',
  TR: 'Turkey', Turkey: 'Turkey',
  HK: 'Hong Kong', 'Hong Kong': 'Hong Kong',
  ID: 'Indonesia', Indonesia: 'Indonesia',
  VN: 'Vietnam', Vietnam: 'Vietnam',
  RU: 'Russia', Russia: 'Russia',
  KR: 'South Korea', 'South Korea': 'South Korea',
  TH: 'Thailand', Thailand: 'Thailand',
  RO: 'Romania', Romania: 'Romania',
  BG: 'Bulgaria', Bulgaria: 'Bulgaria',
  GR: 'Greece', Greece: 'Greece',
  MY: 'Malaysia', Malaysia: 'Malaysia', Philippines: 'Philippines', PH: 'Philippines',
  MO: 'Macau', Macau: 'Macau',
  IL: 'Israel', Israel: 'Israel',
  KZ: 'Kazakhstan', Kazakhstan: 'Kazakhstan',
  CN: 'China', China: 'China',
  LT: 'Lithuania', Lithuania: 'Lithuania',
  GE: 'Georgia', Georgia: 'Georgia',
  UA: 'Ukraine', Ukraine: 'Ukraine',
  MD: 'Moldova', Moldova: 'Moldova',
  IN: 'India', India: 'India',
  MV: 'Maldives', Maldives: 'Maldives',
  CY: 'Cyprus', Cyprus: 'Cyprus',
  EG: 'Egypt', Egypt: 'Egypt',
  SG: 'Singapore', Singapore: 'Singapore',
  NP: 'Nepal', Nepal: 'Nepal',
  BY: 'Belarus', Belarus: 'Belarus',
  AZ: 'Azerbaijan', Azerbaijan: 'Azerbaijan',
  KG: 'Kyrgyzstan', Kyrgyzstan: 'Kyrgyzstan',
  SA: 'Saudi Arabia', 'Saudi Arabia': 'Saudi Arabia',
  LV: 'Latvia', Latvia: 'Latvia',
  YE: 'Yemen', Yemen: 'Yemen',
  IR: 'Iran', Iran: 'Iran',
  OM: 'Oman', Oman: 'Oman',
  CX: 'Christmas Island', 'Christmas Island': 'Christmas Island',
  NO: 'Norway', Norway: 'Norway',
  SE: 'Sweden', Sweden: 'Sweden',
  FI: 'Finland', Finland: 'Finland',
  ES: 'Spain', Spain: 'Spain',
  AT: 'Austria', Austria: 'Austria',
  CA: 'Canada', Canada: 'Canada',
  IT: 'Italy', Italy: 'Italy',
  IS: 'Iceland', Iceland: 'Iceland',
  NL: 'Netherlands', Netherlands: 'Netherlands',
  AU: 'Australia', Australia: 'Australia',
  NZ: 'New Zealand', 'New Zealand': 'New Zealand',
  PL: 'Poland', Poland: 'Poland',
  MT: 'Malta', Malta: 'Malta',
  FR: 'France', France: 'France',
  BR: 'Brazil', Brazil: 'Brazil',
  HR: 'Croatia', Croatia: 'Croatia',
  MX: 'Mexico', Mexico: 'Mexico',
  PE: 'Peru', Peru: 'Peru',
  CL: 'Chile', Chile: 'Chile',
  ZA: 'South Africa', 'South Africa': 'South Africa',
  AR: 'Argentina', Argentina: 'Argentina',
  CH: 'Switzerland', Switzerland: 'Switzerland',
  PT: 'Portugal', Portugal: 'Portugal',
  CR: 'Costa Rica', 'Costa Rica': 'Costa Rica',
  IE: 'Ireland', Ireland: 'Ireland',
  HU: 'Hungary', Hungary: 'Hungary',
  SI: 'Slovenia', Slovenia: 'Slovenia',
  DE: 'Germany', Germany: 'Germany',
  DO: 'Dominican Republic', 'Dominican Republic': 'Dominican Republic',
  KE: 'Kenya', Kenya: 'Kenya',
  SC: 'Seychelles', Seychelles: 'Seychelles',
  CZ: 'Czechia', Czechia: 'Czechia',
  AL: 'Albania', Albania: 'Albania',
  BA: 'Bosnia and Herzegovina', 'Bosnia and Herzegovina': 'Bosnia and Herzegovina',
  BE: 'Belgium', Belgium: 'Belgium',
  RS: 'Serbia', Serbia: 'Serbia',
  MK: 'North Macedonia', 'North Macedonia': 'North Macedonia',
  SK: 'Slovakia', Slovakia: 'Slovakia',
  EC: 'Ecuador', Ecuador: 'Ecuador',
  SV: 'El Salvador', 'El Salvador': 'El Salvador',
  BZ: 'Belize', Belize: 'Belize',
  BM: 'Bermuda', Bermuda: 'Bermuda',
  BO: 'Bolivia', Bolivia: 'Bolivia',
  GD: 'Grenada', Grenada: 'Grenada',
  GP: 'Guadeloupe', Guadeloupe: 'Guadeloupe',
  HN: 'Honduras', Honduras: 'Honduras',
  PA: 'Panama', Panama: 'Panama',
  LB: 'Lebanon', Lebanon: 'Lebanon',
  JO: 'Jordan', Jordan: 'Jordan',
  LK: 'Sri Lanka', 'Sri Lanka': 'Sri Lanka',
  BB: 'Barbados', Barbados: 'Barbados',
  MQ: 'Martinique', Martinique: 'Martinique',
  UY: 'Uruguay', Uruguay: 'Uruguay',
  VE: 'Venezuela', Venezuela: 'Venezuela',
  MA: 'Morocco', Morocco: 'Morocco',
  SN: 'Senegal', Senegal: 'Senegal',
  FO: 'Faroe Islands', 'Faroe Islands': 'Faroe Islands',
  LU: 'Luxembourg', Luxembourg: 'Luxembourg',
  SM: 'San Marino', 'San Marino': 'San Marino',
  EE: 'Estonia', Estonia: 'Estonia',
  VA: 'Vatican City', 'Vatican City': 'Vatican City',
  BQ: 'Bonaire', Bonaire: 'Bonaire',
  CW: 'Curaçao', Curaçao: 'Curaçao',
  PR: 'Puerto Rico', 'Puerto Rico': 'Puerto Rico',
  SX: 'Sint Maarten', 'Sint Maarten': 'Sint Maarten',
  'US Virgin Islands': 'US Virgin Islands',
  TZ: 'Tanzania', Tanzania: 'Tanzania',
  AM: 'Armenia', Armenia: 'Armenia',
  DK: 'Denmark', Denmark: 'Denmark',
  MG: 'Madagascar', Madagascar: 'Madagascar',
};

/** Country values that name no country — records carrying one (or none)
 *  belong to no country page; the country generator counts them as the
 *  unattributed bucket rather than force-assigning them. */
export const JUNK_COUNTRY_VALUES = new Set(['XX', 'Middle East', 'Unknown', '']);

/**
 * The canonical country a record belongs to, or null when its country
 * value names no country. A value missing from COUNTRY_NORMALIZE that is
 * not junk is its own canonical name — that fall-through is how a country
 * the table has never seen still gets a page instead of vanishing.
 */
export function canonicalCountryName(raw: string | undefined): string | null {
  const value = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (JUNK_COUNTRY_VALUES.has(value)) return null;
  return COUNTRY_NORMALIZE[value] ?? value;
}

/* ------------------------------------------------------------------ */
/* Working feeds first                                                 */
/* ------------------------------------------------------------------ */

/**
 * How playable a record is, from the record alone — the live-status
 * signal the catalogue data actually carries. Directory records hold
 * no probe result or online flag, so the honest pre-render signal is
 * what the card can attempt the moment it mounts:
 *
 *  0 — a directly playable feed (previewMedia resolves a jpg / mjpeg /
 *      mp4 / hls URL): the card loads a real frame or stream.
 *  1 — an embed (YouTube & friends): no frame to preview, but the
 *      viewer plays it on open.
 *  2 — a listing only: no playable URL at all. The card can show
 *      nothing until the viewer's resolver tries at open time; a good
 *      share of these are feeds that have gone away.
 *
 * The card still earns its LIVE badge at runtime (camera-feed-card) —
 * this ranking only decides who gets seen first, never who is claimed
 * live.
 */
export function cameraFeedTier(cam: CountryCamera): 0 | 1 | 2 {
  if (previewMedia(cam)) return 0;
  if (cameraMediaKind(cam) === 'embed') return 1;
  return 2;
}

/**
 * Stable working-feeds-first ordering: playable records keep their
 * incoming order among themselves, embeds follow, listings last. The
 * incoming order is each grid's own (distance on ski pages, city/name
 * on country pages), so this layers on top of it rather than replacing
 * it. Input is not mutated.
 */
export function sortWorkingFeedsFirst<T extends CountryCamera>(cameras: readonly T[]): T[] {
  return [...cameras].sort((a, b) => cameraFeedTier(a) - cameraFeedTier(b));
}

/** URL slug for a canonical country name (diacritics folded, as the city
 *  generator slugifies). */
export function countrySlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Countries with a playable explorer on their country page. Adding a row
 * here (and nothing else) is the whole rollout for another country — see
 * worldeye-thailand-poc/TEMPLATE.md.
 */
export const COUNTRY_CAMERA_EXPLORERS: Record<string, CountryExplorerConfig> = {
  thailand: {
    country: 'Thailand',
    aliases: ['TH'],
    regions: ['thailand', 'asia-live', 'asia', 'eastasia', 'seasia', 'public-webcams-rest'],
  },
};

/** Collapse whitespace and trim — the one normalization every rule below shares. */
export function clean(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function countryKeys(config: CountryExplorerConfig): Set<string> {
  return new Set([config.country, ...config.aliases].map(k => clean(k).toLowerCase()));
}

/** Name as sources disagree on it: "Chaweng - Soi…" vs "Chaweng — Soi…". */
function normalizedName(name: string | undefined): string {
  return clean(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function hasCoords(cam: CountryCamera): boolean {
  return typeof cam.lat === 'number' && typeof cam.lng === 'number';
}

/** ~0.001° of arc — roughly 100 m on the ground. */
const NEAR_DUPLICATE_DEG = 0.001;

/**
 * Every record in the catalogue that belongs to this country, deduplicated
 * and sorted area-then-name so the grid reads geographically. Two passes:
 * by id (region responses are concatenated, and a camera can ride in two
 * regions), then by near-duplicate — the same physical camera reported by
 * two sources under punctuation-variant names ("Chaweng - Soi Green Mango"
 * vs "Chaweng — Soi Green Mango") at effectively the same spot. Records
 * without coordinates can only take part in the id pass.
 */
export function selectCountryCameras(
  cameras: readonly CountryCamera[],
  config: CountryExplorerConfig,
): CountryCamera[] {
  const keys = countryKeys(config);
  const seen = new Set<string>();
  const keptNames: { name: string; cam: CountryCamera }[] = [];
  const out: CountryCamera[] = [];
  for (const cam of cameras) {
    if (!cam?.id || seen.has(cam.id)) continue;
    if (!keys.has(clean(cam.country).toLowerCase())) continue;
    const name = normalizedName(cam.name);
    if (
      name &&
      hasCoords(cam) &&
      keptNames.some(
        k =>
          k.name === name &&
          hasCoords(k.cam) &&
          Math.hypot((k.cam.lat as number) - (cam.lat as number), (k.cam.lng as number) - (cam.lng as number)) <=
            NEAR_DUPLICATE_DEG,
      )
    ) {
      continue;
    }
    seen.add(cam.id);
    if (name) keptNames.push({ name, cam });
    out.push(cam);
  }
  return out.sort((a, b) => {
    const byCity = clean(a.city).localeCompare(clean(b.city));
    return byCity !== 0 ? byCity : clean(a.name).localeCompare(clean(b.name));
  });
}

export interface CameraArea {
  name: string;
  count: number;
}

/** Filter chips for a country's page: real city values only, biggest first. */
export function cameraAreas(cameras: readonly CountryCamera[]): CameraArea[] {
  const counts = new Map<string, number>();
  for (const cam of cameras) {
    const area = clean(cam.city);
    if (!area) continue;
    counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Search box + area chip filtering, applied together. */
export function filterCameras(
  cameras: readonly CountryCamera[],
  opts: { query?: string; area?: string | null },
): CountryCamera[] {
  const q = clean(opts.query).toLowerCase();
  const area = opts.area ? clean(opts.area) : null;
  return cameras.filter(cam => {
    if (area && clean(cam.city) !== area) return false;
    if (!q) return true;
    const haystack = `${clean(cam.name)} ${clean(cam.city)} ${clean(cam.source)}`.toLowerCase();
    return haystack.includes(q);
  });
}

/**
 * What a card may honestly claim about a camera before it is opened.
 * 'link' records hold no feed of their own — the viewer's resolver may still
 * find one at open time, but the card must not promise it.
 */
export type CameraMediaKind = 'video' | 'snapshot' | 'embed' | 'link';

export function cameraMediaKind(cam: CountryCamera): CameraMediaKind {
  if (cam.stream_url) {
    const declared = (cam.stream_type ?? '').toLowerCase();
    if (declared === 'hls' || declared === 'mp4' || declared === 'mjpeg') return 'video';
    if (declared === 'iframe') return 'embed';
    if (!declared) {
      if (/\.m3u8(\?|$)/i.test(cam.stream_url)) return 'video';
      if (/youtube\.com\/embed|youtube-nocookie\.com\/embed/i.test(cam.stream_url)) return 'embed';
    }
    return 'video';
  }
  if (cam.feed_url) return 'snapshot';
  return 'link';
}

/**
 * A still poster for an embed that names its YouTube video. Channel "live"
 * links name no video, so they get no poster — returns null and the card
 * falls back to its placeholder.
 */
export function youtubePosterUrl(cam: CountryCamera): string | null {
  const url = cam.stream_url ?? '';
  const m = url.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/i);
  return m ? `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` : null;
}

/**
 * The two passes selectCountryCameras applies, for a list already known to
 * be one country's: dedupe by id, then drop near-duplicates — the same
 * physical camera reported by two sources under punctuation-variant names
 * at effectively the same spot. The country generator (tools/
 * build-country-pages.mjs) applies these at build time so a page's stated
 * count is exactly the number of cards its grid can show; it carries its
 * own copy of the rule, as the other generators do. Bucketed by normalized
 * name — only same-name records can be near-duplicates — so a 40k-camera
 * country stays linear-ish instead of quadratic.
 */
export function dedupeCountryCameras(cameras: readonly CountryCamera[]): CountryCamera[] {
  const seen = new Set<string>();
  const byName = new Map<string, CountryCamera[]>();
  const out: CountryCamera[] = [];
  for (const cam of cameras) {
    if (!cam?.id || seen.has(cam.id)) continue;
    const name = normalizedName(cam.name);
    if (name && hasCoords(cam)) {
      const twins = byName.get(name) ?? [];
      if (
        twins.some(
          k =>
            hasCoords(k) &&
            Math.hypot((k.lat as number) - (cam.lat as number), (k.lng as number) - (cam.lng as number)) <=
              NEAR_DUPLICATE_DEG,
        )
      ) {
        continue;
      }
      twins.push(cam);
      byName.set(name, twins);
    }
    seen.add(cam.id);
    out.push(cam);
  }
  return out;
}

/**
 * A country page's browsing order: cameras grouped by city, the biggest
 * city first (alphabetical on a tie), name order inside a city. Records
 * with no city value form one last group — the page labels it "Other
 * locations" rather than inventing a place for them.
 */
export function sortForCountryPage(cameras: readonly CountryCamera[]): CountryCamera[] {
  const sizes = new Map<string, number>();
  for (const cam of cameras) {
    const city = clean(cam.city);
    if (city) sizes.set(city, (sizes.get(city) ?? 0) + 1);
  }
  return [...cameras].sort((a, b) => {
    const ca = clean(a.city);
    const cb = clean(b.city);
    if (ca !== cb) {
      if (!ca) return 1; // the no-city group always sorts last
      if (!cb) return -1;
      const bySize = (sizes.get(cb) ?? 0) - (sizes.get(ca) ?? 0);
      if (bySize !== 0) return bySize;
      return ca.localeCompare(cb);
    }
    return clean(a.name).localeCompare(clean(b.name));
  });
}
