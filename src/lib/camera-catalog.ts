export type CatalogCamera = { id: string | number; [key: string]: unknown };

/** Partial retries must add cameras, not erase previously loaded regions. */
export function mergeCameraCatalog<T extends { id: string | number }>(previous: T[], incoming: T[]): T[] {
  const merged = new Map(previous.map(camera => [String(camera.id), camera]));
  for (const camera of incoming) merged.set(String(camera.id), camera);
  return [...merged.values()];
}

/** Regions per catalogue request. The world arrives in slices, not one payload. */
export const REGION_GROUP_SIZE = 8;
/** Shard requests in flight at once — enough to fill the map fast, not a storm. */
const GROUP_CONCURRENCY = 3;
/** Total passes (initial + retries) — the bound the original loader promised. */
const MAX_ATTEMPTS = 3;

export function chunkRegionKeys(keys: string[], size: number = REGION_GROUP_SIZE): string[][] {
  const groups: string[][] = [];
  for (let i = 0; i < keys.length; i += size) groups.push(keys.slice(i, i + size));
  return groups;
}

/**
 * Load the camera catalogue in region shards.
 *
 * The original loader asked for `region=all` — one whole-world payload,
 * 10 MB of JSON at 40k cameras and ~26 MB at the harvest's projected
 * ~106k. The server has always been able to serve region slices; what it
 * lacked was a way for the client to learn the region keys without
 * downloading the world first. `?region=list` is that: a few hundred
 * bytes, then the world in GROUP_SIZE-region slices that merge as they
 * land (first paint after the first slice, not after the last byte).
 * If discovery fails, the loader falls back to the single `all` request
 * it replaces — sharding is an optimization, never a new failure mode.
 *
 * Pending regions (the server's own list of what it could not yet serve)
 * are retried on their own, bounded at MAX_ATTEMPTS passes with backoff.
 */
/** onDone fires when every region has loaded or the retry budget is spent. */
export function loadCameraCatalog(
  onBatch: (cameras: CatalogCamera[]) => void,
  onError: () => void,
  onDone?: () => void,
) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let attempts = 0;
  let done = false;
  const finish = () => { if (!done) { done = true; onDone?.(); } };

  async function fetchSlice(regions: string[]): Promise<string[]> {
    const query = new URLSearchParams({ region: regions.join(',') });
    const response = await fetch(`/api/cctv?${query}`, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`Camera catalogue HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.cameras)) throw new Error('Invalid camera catalogue');
    if (controller.signal.aborted) return [];
    if (data.cameras.length) onBatch(data.cameras);
    return Array.isArray(data.pendingRegions)
      ? data.pendingRegions.filter((region: unknown): region is string => typeof region === 'string' && /^[a-z0-9-]+$/.test(region))
      : data.cameras.length ? [] : regions;
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
          if (controller.signal.aborted) return;
          failed = true;
          for (const region of group) pending.add(region);
        }
      }
    });
    await Promise.all(workers);
    if (failed && !controller.signal.aborted) onError();
    return [...pending];
  }

  async function discoverRegions(): Promise<string[] | null> {
    try {
      const response = await fetch('/api/cctv?region=list', { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) return null;
      const data = await response.json();
      if (!Array.isArray(data?.regions) || !data.regions.length) return null;
      return data.regions.filter((region: unknown): region is string => typeof region === 'string' && /^[a-z0-9-]+$/.test(region));
    } catch {
      return null;
    }
  }

  const schedule = (remaining: string[]) => {
    if (!remaining.length || attempts >= MAX_ATTEMPTS || controller.signal.aborted) {
      finish();
      return;
    }
    timer = setTimeout(() => { void pass(remaining); }, attempts * 15_000);
  };

  async function pass(regions: string[] | null) {
    attempts++;
    if (controller.signal.aborted) return;
    if (regions === null) {
      const discovered = await discoverRegions();
      if (controller.signal.aborted) return;
      if (discovered?.length) {
        schedule(await runPass(discovered));
        return;
      }
      /* Discovery failed — fall back to the single world request this
         loader replaces, with an error surfaced exactly once. */
      onError();
      try {
        schedule(await fetchSlice(['all']));
      } catch {
        if (!controller.signal.aborted) schedule(['all']);
      }
      return;
    }
    schedule(await runPass(regions));
  }

  void pass(null);
  return () => { controller.abort(); clearTimeout(timer); finish(); };
}
