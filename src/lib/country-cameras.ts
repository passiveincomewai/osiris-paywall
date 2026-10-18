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

function clean(value: string | undefined): string {
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
