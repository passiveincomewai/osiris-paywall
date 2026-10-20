export type CatalogCamera = { id: string | number; [key: string]: unknown };

/** Partial loads must add cameras, not erase previously loaded regions. */
export function mergeCameraCatalog<T extends { id: string | number }>(previous: T[], incoming: T[]): T[] {
  const merged = new Map(previous.map(camera => [String(camera.id), camera]));
  for (const camera of incoming) merged.set(String(camera.id), camera);
  return [...merged.values()];
}

/** Regions per catalogue request. The world arrives in slices, not one payload. */
export const REGION_GROUP_SIZE = 8;
/** Shard requests in flight at once — enough to fill the map fast, not a storm. */
const GROUP_CONCURRENCY = 3;
/** Total attempts per region (initial + retries) — the bound the loader promises. */
const MAX_ATTEMPTS = 3;
/** How long a pan/zoom burst settles before its viewport fill is fetched. */
const BOUNDS_DEBOUNCE_MS = 350;
/** Sparse re-checks after the first paint: regions that landed just
 *  after boot join the sample, then demand (viewport / search) rules. */
const MAX_SPARSE_RECHECKS = 2;
const SPARSE_RECHECK_MS = 20_000;

export function chunkRegionKeys(keys: string[], size: number = REGION_GROUP_SIZE): string[][] {
  const groups: string[][] = [];
  for (let i = 0; i < keys.length; i += size) groups.push(keys.slice(i, i + size));
  return groups;
}

export interface CatalogBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface CameraCatalogHandle {
  /** Stop everything: in-flight requests abort, timers clear. */
  cancel: () => void;
  /** Fill the regions a viewport needs (debounced; regions already held
   *  in full are excluded from the request and never re-downloaded). */
  loadForBounds: (bounds: CatalogBounds) => void;
  /** Load every region not yet held in full. Idempotent — this is how
   *  camera search reaches beyond the visitor's viewport. */
  ensureFullCatalog: () => void;
}

const isRegionKey = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-z0-9-]+$/.test(value);

/**
 * Load the camera catalogue viewport-first.
 *
 * The loader this replaces downloaded the whole world in region slices:
 * ~17 MB of JSON at 74k cameras before the map was fully itself, most of
 * it for places the visitor never looked at. The server has always been
 * able to serve the catalogue in pieces; what it lacked was a sparse
 * worldwide layer and a viewport resolver. Both exist now, so loading is:
 *
 *  1. `?region=list` — a few hundred bytes naming every region key.
 *  2. `?sparse=1` — the first paint: a ~2,000-camera worldwide sample
 *     (~450 KB) drawn from everything the server holds. `onDone` fires
 *     here: the globe is usable, honestly labelled a sample by the
 *     payload's own pendingRegions.
 *  3. Demand fills, never speculative ones: `loadForBounds` as the
 *     visitor pans/zooms (?bbox= resolves the regions server-side;
 *     held regions ride &exclude= and are never re-sent), and
 *     `ensureFullCatalog` when a surface needs the whole index (search).
 *
 * Regions still pending on the server are retried per region, bounded
 * at MAX_ATTEMPTS with the loader's historical backoff. If region
 * discovery fails, or the sparse layer does, the loader falls back to
 * loading every region in slices — sharding is an optimization, never
 * a new failure mode.
 */
export function loadCameraCatalog(
  onBatch: (cameras: CatalogCamera[]) => void,
  onError: () => void,
  onDone?: () => void,
): CameraCatalogHandle {
  const controller = new AbortController();
  const { signal } = controller;
  let done = false;
  const finish = () => { if (!done) { done = true; onDone?.(); } };

  let allRegions: string[] | null = null;
  /** Regions whose full slice this client already holds. */
  const fullRegions = new Set<string>();
  /** viewport box (quantized) -> region keys the server resolved for it. */
  const boundsCache = new Map<string, string[]>();
  const attempts = new Map<string, number>();
  const retryQueue = new Set<string>();
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let boundsTimer: ReturnType<typeof setTimeout> | undefined;
  let sparseTimer: ReturnType<typeof setTimeout> | undefined;
  let sparseRechecks = 0;
  let filling = false;
  let fullRequested = false;

  async function fetchJson(url: string): Promise<any> {
    const response = await fetch(url, { signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`Camera catalogue HTTP ${response.status}`);
    return response.json();
  }

  /** One region slice; returns the requested regions still pending.
   *  Regions that answered become full and are never fetched again. */
  async function fetchSlice(regions: string[]): Promise<string[]> {
    const query = new URLSearchParams({ region: regions.join(',') });
    const data = await fetchJson(`/api/cctv?${query}`);
    if (!Array.isArray(data.cameras)) throw new Error('Invalid camera catalogue');
    if (signal.aborted) return [];
    if (data.cameras.length) onBatch(data.cameras);
    const pending = Array.isArray(data.pendingRegions)
      ? data.pendingRegions.filter(isRegionKey)
      : data.cameras.length ? [] : regions;
    for (const region of regions) if (!pending.includes(region)) fullRegions.add(region);
    return pending;
  }

  /** One pass over the given region keys, in sharded groups. */
  async function runPass(regions: string[]): Promise<string[]> {
    const pending = new Set<string>();
    let failed = false;
    const groups = chunkRegionKeys(regions);
    let next = 0;
    const workers = Array.from({ length: Math.min(GROUP_CONCURRENCY, groups.length) }, async () => {
      while (next < groups.length) {
        const group = groups[next++];
        try {
          for (const region of await fetchSlice(group)) pending.add(region);
        } catch {
          if (signal.aborted) return;
          failed = true;
          for (const region of group) pending.add(region);
        }
      }
    });
    await Promise.all(workers);
    if (failed && !signal.aborted) onError();
    return [...pending];
  }

  /** Bounded per-region retries with the historical 15s-step backoff. */
  function queueRetry(regions: string[]) {
    if (signal.aborted) return;
    let queued = false;
    for (const region of regions) {
      if (fullRegions.has(region)) continue;
      const used = attempts.get(region) ?? 0;
      if (used >= MAX_ATTEMPTS) continue;
      attempts.set(region, used + 1);
      retryQueue.add(region);
      queued = true;
    }
    if (!queued || retryTimer) return;
    const attempt = Math.min(...[...retryQueue].map(r => attempts.get(r) ?? 1));
    retryTimer = setTimeout(() => {
      retryTimer = undefined;
      const due = [...retryQueue];
      retryQueue.clear();
      void runPass(due).then(pending => queueRetry(pending));
    }, attempt * 15_000);
  }

  async function fillAll() {
    if (filling || signal.aborted) return;
    if (!allRegions) { fullRequested = true; return; }
    const missing = allRegions.filter(r => !fullRegions.has(r));
    if (!missing.length) return;
    filling = true;
    try {
      queueRetry(await runPass(missing));
    } finally {
      filling = false;
    }
  }

  async function loadSparse() {
    const data = await fetchJson('/api/cctv?sparse=1');
    if (!Array.isArray(data.cameras)) throw new Error('Invalid camera catalogue');
    if (signal.aborted) return;
    if (data.cameras.length) onBatch(data.cameras);
    const pending = Array.isArray(data.pendingRegions) ? data.pendingRegions.filter(isRegionKey) : [];
    /* Regions the server had not collected at first paint join the
       sample on a bounded re-check; after that, only demand loads them. */
    if (pending.length && sparseRechecks < MAX_SPARSE_RECHECKS && !signal.aborted) {
      sparseRechecks++;
      sparseTimer = setTimeout(() => { void loadSparse().catch(() => {}); }, SPARSE_RECHECK_MS);
    }
  }

  async function discoverRegions(): Promise<string[] | null> {
    try {
      const data = await fetchJson('/api/cctv?region=list');
      if (!Array.isArray(data?.regions) || !data.regions.length) return null;
      return data.regions.filter(isRegionKey);
    } catch {
      return null;
    }
  }

  /** Discovery is broken: the pre-sharding behaviour, kept as the floor.
   *  One world request, then bounded retries of whatever it lacked. */
  async function fallbackWorld() {
    let remaining: string[] = [];
    try {
      remaining = await fetchSlice(['all']);
    } catch {
      if (!signal.aborted) remaining = ['all'];
    }
    if (remaining.length) {
      let passes = 1;
      const again = (pending: string[]) => {
        if (!pending.length || passes >= MAX_ATTEMPTS || signal.aborted) return;
        passes++;
        setTimeout(() => {
          if (signal.aborted) return;
          void fetchSlice(pending).then(again).catch(() => again(pending));
        }, (passes - 1) * 15_000);
      };
      again(remaining);
    }
  }

  void (async () => {
    const discovered = await discoverRegions();
    if (signal.aborted) return;
    if (discovered?.length) {
      allRegions = discovered;
      try {
        await loadSparse();
      } catch {
        if (signal.aborted) return;
        /* The sparse layer is an optimization; its failure must not
           strand the map, so fill every region the original way. */
        onError();
        await fillAll();
      }
      finish();
      if (fullRequested) void fillAll();
      return;
    }
    onError();
    await fallbackWorld();
    finish();
  })();

  async function fillBounds(bounds: CatalogBounds) {
    if (signal.aborted) return;
    const key = [bounds.west, bounds.south, bounds.east, bounds.north]
      .map(v => Math.round(v * 2) / 2).join(',');
    const cached = boundsCache.get(key);
    if (cached && cached.every(r => fullRegions.has(r))) return;
    try {
      const query = new URLSearchParams({
        bbox: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`,
      });
      if (fullRegions.size) query.set('exclude', [...fullRegions].join(','));
      const data = await fetchJson(`/api/cctv?${query}`);
      if (!Array.isArray(data.cameras)) throw new Error('Invalid camera catalogue');
      if (signal.aborted) return;
      if (data.cameras.length) onBatch(data.cameras);
      const resolved: string[] = (Array.isArray(data.resolvedRegions) ? data.resolvedRegions.filter(isRegionKey)
        : Array.isArray(data.regions) ? data.regions.filter(isRegionKey) : []);
      boundsCache.set(key, resolved);
      const pending = Array.isArray(data.pendingRegions)
        ? data.pendingRegions.filter(isRegionKey).filter((r: string) => resolved.includes(r))
        : [];
      /* Every resolved region the server did not call pending is
         settled for this client: fetched (cameras delivered, or the
         region is legitimately empty), or excluded because it was
         already held in full. */
      for (const region of resolved) if (!pending.includes(region)) fullRegions.add(region);
      queueRetry(pending);
    } catch {
      if (!signal.aborted) onError();
    }
  }

  return {
    cancel: () => {
      controller.abort();
      clearTimeout(retryTimer);
      clearTimeout(boundsTimer);
      clearTimeout(sparseTimer);
      finish();
    },
    loadForBounds: (bounds: CatalogBounds) => {
      if (signal.aborted) return;
      clearTimeout(boundsTimer);
      boundsTimer = setTimeout(() => { void fillBounds(bounds); }, BOUNDS_DEBOUNCE_MS);
    },
    ensureFullCatalog: () => { void fillAll(); },
  };
}

/**
 * Resolve one camera by id from the server, for deep links whose target
 * sits in a region this client has not loaded. Returns the catalogue
 * record (merge it like any batch) or null — an unknown id, a network
 * failure and a stale link are all the same honest "not found".
 */
export async function fetchCameraById(id: string): Promise<CatalogCamera | null> {
  try {
    const response = await fetch(`/api/cctv?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    const camera = Array.isArray(data?.cameras) ? data.cameras[0] : null;
    return (camera ?? null) as CatalogCamera | null;
  } catch {
    return null;
  }
}
