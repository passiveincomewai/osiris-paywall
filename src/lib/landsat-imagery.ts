/**
 * OSIRIS — Landsat historical imagery (the satellite slider's
 * pre-2014 reach).
 *
 * The satellite basemap's time slider (lib/wayback-imagery) walks
 * Esri's World Imagery Wayback archive, whose first release is
 * 2014-02-20 — Esri simply has nothing earlier. Everything before
 * 2014 on the slider comes from here instead: **Landsat**, the
 * USGS/NASA archive, served as tiles by the Microsoft Planetary
 * Computer's STAC mosaic tiler over the `landsat-c2-l2` collection
 * (Landsat Collection 2 Level-2; extent verified 2026-10-31 to
 * start 1982-08-22, so every year 1984–2013 has real scenes).
 *
 * How a year works:
 *   - the client registers ONE pgstac mosaic per year (a STAC
 *     search: this collection, that calendar year, cloud cover
 *     < 50%, sorted least-cloudy first) and gets back a stable
 *     content-hash mosaic id — cached in memory and localStorage,
 *     so registration happens once per year per device, ever;
 *   - tiles are the mosaic's WebMercatorQuad tiles rendered from
 *     the scenes' red/green/blue surface-reflectance bands with a
 *     fixed stretch (rescale 7000–22000, chosen by eye against the
 *     alternatives on a Las Vegas test tile — 0–30000 washed out,
 *     0–16000 blew out, sigmoidal crushed the shadows).
 *
 * Time model, stated plainly: a year on the slider is a MOSAIC of
 * that year's clearest scenes. Different spots in one view can
 * come from different dates inside the year. Labels therefore say
 * the YEAR only — never a month, never a fake precise date.
 *
 * The service's hard limit, verified 2026-10-31 with live tile
 * fetches (Landsat and a Sentinel-2 control, every search shape):
 * the pgstac mosaic tiler returns NO items for tiles below z8
 * (HTTP 204, and its per-tile assets endpoint reports 0 items) —
 * a per-tile search guard on their side, not something a query
 * parameter lifts. So this module serves the map through a custom
 * MapLibre protocol (`osiris-landsat://`, the pattern
 * lib/terrain-tiles established with `osiris-dem`):
 *   - z ≥ 8: the Planetary Computer tile, passed through;
 *   - z 6–7: composed on a canvas from the tile's z8 children
 *     (4 or 16 fetches) — the only way to show real Landsat at
 *     continental zooms;
 *   - z < 6: a transparent tile — the base map shows, and the
 *     slider's Landsat footer says imagery loads at zoom 6+.
 * A tile with no Landsat coverage (open ocean, archive gaps) is
 * also a 204 from the service → transparent here: the map shows
 * the base, never a wrong year's imagery.
 *
 * Zoom honesty at the top end lives in lib/wayback-imagery: a
 * Landsat vintage's raster source is created with maxzoom
 * LANDSAT_MAXZOOM (13 ≈ Landsat's native 30 m), so past that the
 * map stretches real z13 tiles instead of pretending there is
 * more detail, and the slider footer says detail is limited.
 *
 * Attribution: Landsat data is USGS public-domain data; the
 * credit line below follows the STAC collection's own provider
 * list (NASA + USGS as producers/licensors, Microsoft as host).
 * The satellite source carries it as part of its one combined
 * attribution constant (see lib/wayback-imagery).
 */
import type { AddProtocolAction } from 'maplibre-gl';

/** First year on the slider's Landsat segment. Landsat 5 began
 *  returning TM imagery in March 1984 (the collection itself
 *  reaches Aug 1982 on sparse Landsat 4 coverage; 1984 is the
 *  first year with the full Landsat 5 record Jameson asked for). */
export const LANDSAT_FIRST_YEAR = 1984;
/** Last Landsat year: 2014 belongs to Esri Wayback (its first
 *  release is 2014-02-20), so the Landsat segment ends at 2013. */
export const LANDSAT_LAST_YEAR = 2013;

export const LANDSAT_YEARS: readonly number[] = Array.from(
  { length: LANDSAT_LAST_YEAR - LANDSAT_FIRST_YEAR + 1 },
  (_, i) => LANDSAT_FIRST_YEAR + i,
);

/** Slider stops in the Landsat segment (one per year). */
export const LANDSAT_STOP_COUNT = LANDSAT_YEARS.length;

/** The raster-source maxzoom for a Landsat vintage. 30 m pixels
 *  are native around z12–z13; 13 is a slight, honest oversample. */
export const LANDSAT_MAXZOOM = 13;

/** The Planetary Computer mosaic tiler serves real tiles from z8
 *  up (see header). The protocol composes z6–z7 from z8 children
 *  and returns transparent below z6. */
export const LANDSAT_CHILD_ZOOM = 8;
export const LANDSAT_COMPOSE_MIN_ZOOM = 6;

export const LANDSAT_PROTOCOL_NAME = 'osiris-landsat';

export const LANDSAT_COLLECTION = 'landsat-c2-l2';
export const PLANETARY_COMPUTER_API_BASE =
  'https://planetarycomputer.microsoft.com/api/data/v1';

/** The credit line for the pre-2014 vintages (the satellite
 *  source's combined attribution appends it to Esri's line). */
export const LANDSAT_ATTRIBUTION =
  'Landsat imagery courtesy of the U.S. Geological Survey and NASA, via Microsoft Planetary Computer';

/** Clamp any year-ish input into the Landsat segment's range. */
export function clampLandsatYear(year: number): number {
  const y = Math.floor(Number(year) || 0);
  return Math.max(LANDSAT_FIRST_YEAR, Math.min(LANDSAT_LAST_YEAR, y));
}

export function isLandsatYear(year: number): boolean {
  return Number.isInteger(year) && year >= LANDSAT_FIRST_YEAR && year <= LANDSAT_LAST_YEAR;
}

/** The tile template a Landsat selection points the satellite
 *  source at. The custom protocol (installed by OsirisMap when
 *  satellite view is on) resolves the year and serves the tile. */
export function landsatProtocolTileUrl(year: number): string {
  return `${LANDSAT_PROTOCOL_NAME}://${clampLandsatYear(year)}/{z}/{x}/{y}`;
}

export interface LandsatTileCoords {
  year: number;
  z: number;
  x: number;
  y: number;
}

/** Parse an `osiris-landsat://{year}/{z}/{x}/{y}` request URL.
 *  Anything malformed or out of range is null (the loader throws
 *  on it, like lib/terrain-tiles' loader does). */
export function parseLandsatProtocolUrl(url: string): LandsatTileCoords | null {
  const m = /^osiris-landsat:\/\/(\d{4})\/(\d{1,2})\/(\d+)\/(\d+)$/.exec(url);
  if (!m) return null;
  const year = Number(m[1]);
  const z = Number(m[2]);
  const x = Number(m[3]);
  const y = Number(m[4]);
  if (!isLandsatYear(year)) return null;
  if (z < 0 || z > 22 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) return null;
  return { year, z, x, y };
}

/** The STAC search registered per year: this collection, that
 *  calendar year, scenes under 50% cloud, least-cloudy first (the
 *  mosaic stacks them in that order per tile). */
export function landsatMosaicSearchBody(year: number): Record<string, unknown> {
  const y = clampLandsatYear(year);
  return {
    collections: [LANDSAT_COLLECTION],
    datetime: `${y}-01-01T00:00:00Z/${y}-12-31T23:59:59Z`,
    query: { 'eo:cloud_cover': { lt: 50 } },
    sortby: [{ field: 'eo:cloud_cover', direction: 'asc' }],
  };
}

/** The real tile URL on the Planetary Computer mosaic tiler.
 *  The `collection` parameter is REQUIRED by the tile endpoint
 *  (its own TileJSON template omits it and 422s without it —
 *  verified 2026-10-31). The rescale is the fixed true-colour
 *  stretch chosen in the header's bake-off. */
export function planetaryTileUrl(mosaicId: string, z: number, x: number, y: number): string {
  return (
    `${PLANETARY_COMPUTER_API_BASE}/mosaic/${mosaicId}/tiles/WebMercatorQuad/${z}/${x}/${y}` +
    `?collection=${LANDSAT_COLLECTION}&assets=red&assets=green&assets=blue&rescale=7000,22000`
  );
}

// ── Mosaic registration ──────────────────────────────────────────

type RegisterFetcher = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const defaultRegisterFetcher: RegisterFetcher = (url, init) =>
  fetch(url, init) as Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const MOSAIC_STORAGE_KEY = 'osiris-landsat-mosaic-ids-v1';

function readStoredMosaicId(year: number): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(MOSAIC_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const id = parsed?.[String(year)];
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

function storeMosaicId(year: number, id: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(MOSAIC_STORAGE_KEY);
    const parsed = (raw ? (JSON.parse(raw) as Record<string, unknown>) : {}) ?? {};
    parsed[String(year)] = id;
    localStorage.setItem(MOSAIC_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* storage is an optimisation; the in-memory cache still holds it */
  }
}

const mosaicIdPromises = new Map<number, Promise<string>>();

/**
 * The pgstac mosaic id for a year: from localStorage if a previous
 * visit registered it, else one POST to the Planetary Computer
 * registration endpoint. Mosaic ids are content hashes of the
 * search — the same search always yields the same id, so a stored
 * id never goes stale. Concurrent calls share one request; a
 * failed registration is evicted so the next pick retries.
 */
export function landsatMosaicId(
  year: number,
  fetcher: RegisterFetcher = defaultRegisterFetcher,
): Promise<string> {
  const y = clampLandsatYear(year);
  const existing = mosaicIdPromises.get(y);
  if (existing) return existing;
  const stored = readStoredMosaicId(y);
  if (stored) {
    const p = Promise.resolve(stored);
    mosaicIdPromises.set(y, p);
    return p;
  }
  const p = (async () => {
    const res = await fetcher(`${PLANETARY_COMPUTER_API_BASE}/mosaic/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(landsatMosaicSearchBody(y)),
    });
    if (!res.ok) throw new Error(`Landsat mosaic registration HTTP ${res.status}`);
    const data = (await res.json()) as { id?: unknown };
    if (typeof data?.id !== 'string' || !data.id) {
      throw new Error('Landsat mosaic registration returned no id');
    }
    storeMosaicId(y, data.id);
    return data.id;
  })();
  mosaicIdPromises.set(y, p);
  p.catch(() => {
    if (mosaicIdPromises.get(y) === p) mosaicIdPromises.delete(y);
  });
  return p;
}

// ── Tile serving (the custom protocol's loader) ──────────────────

/** A 1×1 transparent PNG — what "no imagery here" looks like to
 *  MapLibre: the tile paints nothing and the base map shows. */
const TRANSPARENT_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

let transparentPngCache: ArrayBuffer | null = null;
export function transparentPngBytes(): ArrayBuffer {
  if (transparentPngCache) return transparentPngCache.slice(0);
  let bytes: Uint8Array;
  if (typeof atob === 'function') {
    const bin = atob(TRANSPARENT_PNG_BASE64);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    // Node (tests): Buffer is the base64 decoder.
    bytes = new Uint8Array(
      (globalThis as { Buffer?: typeof Buffer }).Buffer!.from(TRANSPARENT_PNG_BASE64, 'base64'),
    );
  }
  transparentPngCache = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return transparentPngCache.slice(0);
}

export interface ChildTilePlacement {
  x: number;
  y: number;
  /** Where this child lands in the parent's 256×256 canvas. */
  dx: number;
  dy: number;
  size: number;
}

/** The child tiles (at `childZoom`) that compose a parent tile,
 *  with their placement in the parent's canvas. For z ≥ childZoom
 *  the tile itself is the single full-canvas placement. */
export function childTilesFor(
  z: number,
  x: number,
  y: number,
  childZoom: number = LANDSAT_CHILD_ZOOM,
): ChildTilePlacement[] {
  const levels = childZoom - z;
  if (levels <= 0) return [{ x, y, dx: 0, dy: 0, size: 256 }];
  const n = 2 ** levels;
  const size = 256 / n;
  const out: ChildTilePlacement[] = [];
  for (let cx = 0; cx < n; cx++) {
    for (let cy = 0; cy < n; cy++) {
      out.push({ x: x * n + cx, y: y * n + cy, dx: cx * size, dy: cy * size, size });
    }
  }
  return out;
}

export interface LandsatHttpResponse {
  status: number;
  data: ArrayBuffer;
}

export type LandsatTileFetcher = (url: string, signal: AbortSignal) => Promise<LandsatHttpResponse>;

const defaultTileFetcher: LandsatTileFetcher = async (url, signal) => {
  const res = await fetch(url, { signal, credentials: 'omit' });
  return { status: res.status, data: await res.arrayBuffer() };
};

export interface CompositePart {
  data: ArrayBuffer | null;
  dx: number;
  dy: number;
  size: number;
}

export type LandsatCompositeFn = (parts: CompositePart[]) => Promise<ArrayBuffer>;

async function decodeTileImage(data: ArrayBuffer): Promise<CanvasImageSource | null> {
  try {
    const blob = new Blob([data]);
    if (typeof createImageBitmap === 'function') return await createImageBitmap(blob);
    if (typeof document !== 'undefined') {
      return await new Promise<HTMLImageElement | null>(resolve => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
      });
    }
    return null;
  } catch {
    return null;
  }
}

/** The browser compositor: draw each z8 child into its quadrant of
 *  a 256×256 canvas and encode PNG. Children with no data stay
 *  transparent — a partially covered parent shows what exists. */
const canvasComposite: LandsatCompositeFn = async parts => {
  if (typeof document === 'undefined') return transparentPngBytes();
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return transparentPngBytes();
  for (const part of parts) {
    if (!part.data) continue;
    const img = await decodeTileImage(part.data);
    if (!img) continue;
    ctx.drawImage(img, part.dx, part.dy, part.size, part.size);
    if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) img.close();
  }
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return transparentPngBytes();
  return blob.arrayBuffer();
};

export interface LandsatLoaderDeps {
  fetchTile?: LandsatTileFetcher;
  mosaicId?: (year: number) => Promise<string>;
  composite?: LandsatCompositeFn;
}

/**
 * The protocol's request handler core (unit-tested with fakes;
 * `installLandsatTileProtocol` wires it to MapLibre):
 *   - z ≥ 8 → the Planetary Computer tile (204 → transparent);
 *   - z 6–7 → the composed z8 children (all-empty → transparent);
 *   - z < 6 → transparent, no network at all.
 * A failed child fetch degrades that quadrant to transparent
 * rather than failing the whole tile; an aborted request always
 * propagates the abort.
 */
export function createLandsatTileLoader(deps: LandsatLoaderDeps = {}) {
  const fetchTile = deps.fetchTile ?? defaultTileFetcher;
  const getMosaicId = deps.mosaicId ?? ((year: number) => landsatMosaicId(year));
  const composite = deps.composite ?? canvasComposite;

  return async (url: string, signal: AbortSignal): Promise<ArrayBuffer> => {
    const parsed = parseLandsatProtocolUrl(url);
    if (!parsed) throw new Error('Invalid Landsat tile');
    const { year, z, x, y } = parsed;
    if (signal?.aborted) throw new Error('Landsat tile request aborted');
    if (z < LANDSAT_COMPOSE_MIN_ZOOM) return transparentPngBytes();

    const mosaicId = await getMosaicId(year);

    if (z >= LANDSAT_CHILD_ZOOM) {
      const res = await fetchTile(planetaryTileUrl(mosaicId, z, x, y), signal);
      if (res.status === 204) return transparentPngBytes();
      if (res.status !== 200) throw new Error(`Landsat tile HTTP ${res.status}`);
      return res.data;
    }

    const children = childTilesFor(z, x, y);
    const parts = await Promise.all(
      children.map(async (child): Promise<CompositePart> => {
        try {
          const res = await fetchTile(
            planetaryTileUrl(mosaicId, LANDSAT_CHILD_ZOOM, child.x, child.y),
            signal,
          );
          return {
            data: res.status === 200 ? res.data : null,
            dx: child.dx,
            dy: child.dy,
            size: child.size,
          };
        } catch (error) {
          if (signal?.aborted) throw error;
          return { data: null, dx: child.dx, dy: child.dy, size: child.size };
        }
      }),
    );
    if (parts.every(p => !p.data)) return transparentPngBytes();
    return composite(parts);
  };
}

let installed = false;
/** Register `osiris-landsat://` with MapLibre (idempotent; called
 *  by OsirisMap when satellite view turns on, the same site where
 *  the Wayback host preconnect happens). */
export function installLandsatTileProtocol(
  addProtocol: (name: string, handler: AddProtocolAction) => void,
) {
  if (installed) return;
  const load = createLandsatTileLoader();
  addProtocol(LANDSAT_PROTOCOL_NAME, async (request, controller) => ({
    data: await load(request.url, controller.signal),
    cacheControl: 'max-age=86400',
  }));
  installed = true;
}
