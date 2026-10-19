/**
 * OSIRIS vision on the server: a camera's current frame, by the camera's id.
 *
 * The detector reads pixels, and a browser only gives those up for a picture
 * from the page's own site, so still frames reach it through OSIRIS. Only
 * cameras in OSIRIS's own catalogue can be fetched: callers name a camera, never
 * a URL, so this cannot be turned into a way to fetch anything else. Every hop
 * still goes through the SSRF guard, only real pictures are passed on, and a
 * frame is held for a few seconds so a dozen readers watching the same camera
 * cost its operator one request.
 */
import { getPayload, readSnapshot } from '@/lib/cctv-snapshot';
import { haversine } from '@/lib/geo';
import { safeFetch } from '@/lib/ssrf-guard';
import { buildCatalogueHere } from './catalogue-build';

export interface CatalogueCamera {
  id: string;
  name: string;
  city: string;
  country: string;
  source: string;
  lat: number;
  lng: number;
  /** The still image to fetch, or null for a live stream or web player. */
  still: string | null;
  /** The operator's own page for the camera, to cite. */
  page?: string;
}

interface Index { cameras: Map<string, CatalogueCamera>; stills: CatalogueCamera[]; builtAt: number; at: number; complete: boolean }

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const httpUrl = (v: string) => (/^https?:\/\/[^\s]+$/i.test(v) ? v : undefined);

/** The still image a catalogue entry points at: its snapshot, unwrapped from the camera proxy where it goes through one. */
export function stillOf(raw: Record<string, unknown>): string | null {
  const type = str(raw.stream_type) || 'jpg';
  const feed = str(raw.feed_url);
  if (type !== 'jpg' || !feed) return null;
  if (feed.startsWith('/api/cctv/proxy?')) {
    const inner = new URLSearchParams(feed.slice(feed.indexOf('?') + 1)).get('url') ?? '';
    return httpUrl(inner) ?? null;
  }
  return httpUrl(feed) ?? null;
}

export function cameraOf(raw: unknown): CatalogueCamera | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'number' ? String(r.id) : str(r.id);
  const lat = Number(r.lat), lng = Number(r.lng);
  if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id, lat, lng,
    name: str(r.name) || 'Camera', city: str(r.city), country: str(r.country), source: str(r.source),
    still: stillOf(r),
    page: httpUrl(str(r.external_url)),
  };
}

let index: Index | null = null;
let building: Promise<Index | null> | null = null;

/** The catalogue is re-read when it has been rebuilt, at most once a minute; from disk, every five. */
const REREAD_MS = 60_000;
const DISK_MS = 5 * 60_000;
/** How long a cold instance's first catalogue read may wait for the build
 *  it triggered to finish filling (see load()). */
const CHASE_MS = 45_000;

let lastBuildAt = 0;
/** True once this process has built the catalogue itself (see load()). */
let builtHere = false;

/**
 * Build the catalogue in this process, at most once a minute: a cold
 * instance pays for it once, and one whose build keeps failing is not
 * retried on every request.
 */
async function buildHere(): Promise<void> {
  if (Date.now() - lastBuildAt < REREAD_MS) return;
  lastBuildAt = Date.now();
  try {
    await buildCatalogueHere();
    builtHere = true;
  } catch (error) {
    console.warn('[OSIRIS] Vision could not build the camera catalogue:', error);
  }
}

async function load(): Promise<Index | null> {
  let payload = getPayload();
  let list: unknown[] = [];
  let builtAt = 0;
  let complete = true;
  if (payload && !payload.complete && builtHere) {
    /* A cold build answers with whatever regions landed inside its budget
       and lets the rest finish behind it. Rebuild before reading again, so
       the late regions join this index instead of waiting for a payload
       refresh nobody else will trigger in this process. */
    await buildHere();
    payload = getPayload();
  }
  if (payload) {
    const body = JSON.parse(payload.json.toString('utf8')) as { cameras?: unknown[] };
    list = Array.isArray(body?.cameras) ? body.cameras : [];
    builtAt = payload.builtAt;
    complete = payload.complete;
  } else {
    const saved = await readSnapshot();
    if (saved) {
      list = Object.values(saved.regions).flat();
      builtAt = saved.builtAt;
    } else {
      /* Nothing in memory and nothing on disk. On Vercel that is every
         frame instance, permanently: the payload lives in the /api/cctv
         function's memory, not this one's, and the disk snapshot is
         git-ignored and never deployed — which is why the frame route
         answered 503 "still loading" for every camera. The catalogue is
         assembled from loaders in this repo, so build it here rather
         than report it missing forever. */
      await buildHere();
      payload = getPayload();
      if (!payload) return null;
      const body = JSON.parse(payload.json.toString('utf8')) as { cameras?: unknown[] };
      list = Array.isArray(body?.cameras) ? body.cameras : [];
      builtAt = payload.builtAt;
      complete = payload.complete;
      /* A cold build answers with the regions that landed inside its
         budget; the rest keep fetching behind it, slowest last. Answering
         from that partial catalogue would report cameras that exist as
         missing, so the first request waits — bounded — while the build
         finishes filling. Each rebuild just re-reads the sources that
         have landed, so it is cheap; the parse is only redone when the
         catalogue actually grew. If the deadline passes the partial
         catalogue is served and later reads keep completing it. */
      const chaseUntil = Date.now() + CHASE_MS;
      while (!complete && Date.now() < chaseUntil) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        try {
          await buildCatalogueHere();
        } catch { /* a failed rebuild leaves the partial catalogue in place */ }
        const next = getPayload();
        if (!next) break;
        const grew = next.total !== payload.total;
        payload = next;
        builtAt = next.builtAt;
        complete = next.complete;
        if (grew || complete) {
          const grown = JSON.parse(next.json.toString('utf8')) as { cameras?: unknown[] };
          list = Array.isArray(grown?.cameras) ? grown.cameras : [];
        }
      }
      lastBuildAt = Date.now();
    }
  }
  const cameras = new Map<string, CatalogueCamera>();
  for (const raw of list) {
    const cam = cameraOf(raw);
    if (cam) cameras.set(cam.id, cam);
  }
  return { cameras, stills: [...cameras.values()].filter(c => c.still), builtAt, at: Date.now(), complete };
}

/** The camera catalogue, indexed by id. Null while it has never been built. */
export async function catalogue(): Promise<Index | null> {
  const payload = getPayload();
  const age = index ? Date.now() - index.at : Infinity;
  const stale = !index
    || (payload ? payload.builtAt !== index.builtAt && age > REREAD_MS : age > DISK_MS)
    /* A catalogue this process built for itself may have started partial
       (regions still landing); keep re-reading it until it is whole. */
    || (builtHere && !!index && !index.complete && age > REREAD_MS);
  if (!stale) return index;
  building ??= load().then(next => { if (next) index = next; return index; }).finally(() => { building = null; });
  return building;
}

/** Still cameras within `radiusKm` of a point, nearest first. */
export async function stillsNear(lat: number, lng: number, radiusKm: number, limit: number): Promise<(CatalogueCamera & { km: number })[]> {
  const idx = await catalogue();
  if (!idx) return [];
  return idx.stills
    .map(c => ({ ...c, km: haversine([lng, lat], [c.lng, c.lat]) }))
    .filter(c => c.km <= radiusKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, limit)
    .map(c => ({ ...c, km: Math.round(c.km * 10) / 10 }));
}

/* ───────────── Fetching a frame ───────────── */

export class FrameError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export interface Frame { bytes: Buffer; type: string; at: string }

/** What a picture's first bytes say it is. Anything else is not passed on. */
export function sniffImage(b: Uint8Array): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length >= 12 && String.fromCharCode(...b.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...b.subarray(8, 12)) === 'WEBP') return 'image/webp';
  if (b.length >= 4 && String.fromCharCode(...b.subarray(0, 4)) === 'GIF8') return 'image/gif';
  return null;
}

const MAX_BYTES = 4_000_000;
const HOLD_MS = 4_000;
const TIMEOUT_MS = 8_000;
const held = new Map<string, Frame & { until: number }>();
const inflight = new Map<string, Promise<Frame>>();

/**
 * Taiwan's highway cameras send a malformed header when asked with a Referer,
 * and the camera proxy leaves it off for them; every other host gets its own
 * site as the Referer, which hotlink-protected ones expect.
 */
const sendsReferer = (host: string) => !/(^|\.)thb\.gov\.tw$/i.test(host);

async function readCapped(res: Response): Promise<Buffer> {
  const declared = Number(res.headers.get('content-length'));
  if (declared > MAX_BYTES) throw new FrameError(502, 'The camera sent a picture too large to analyse');
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel().catch(() => {});
      throw new FrameError(502, 'The camera sent a picture too large to analyse');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function fetchFrame(cam: CatalogueCamera & { still: string }): Promise<Frame> {
  const host = new URL(cam.still).hostname;
  const headers: Record<string, string> = {
    Accept: 'image/avif,image/webp,image/*;q=0.9,*/*;q=0.5',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  };
  if (sendsReferer(host)) headers.Referer = `https://${host}/`;
  let res: Response;
  try {
    res = await safeFetch(cam.still, { headers, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    throw new FrameError(502, timedOut ? 'The camera did not answer in time' : 'The camera could not be reached');
  }
  if (!res.ok) {
    await res.body?.cancel().catch(() => {});
    throw new FrameError(502, `The camera answered ${res.status}`);
  }
  const bytes = await readCapped(res);
  const type = sniffImage(bytes);
  if (!type) throw new FrameError(502, 'The camera did not send a picture');
  return { bytes, type, at: new Date().toISOString() };
}

/** A camera's current frame: fetched, or the one fetched in the last few seconds. */
export async function frameOf(cam: CatalogueCamera): Promise<Frame> {
  if (!cam.still) throw new FrameError(422, 'This camera is a live stream or web player: it has no still frame');
  const now = Date.now();
  const hit = held.get(cam.id);
  if (hit && hit.until > now) return hit;
  const pending = inflight.get(cam.id);
  if (pending) return pending;
  const job = fetchFrame(cam as CatalogueCamera & { still: string })
    .then(frame => {
      held.set(cam.id, { ...frame, until: Date.now() + HOLD_MS });
      // Held frames are a few seconds' worth; keep the map from growing with every camera ever asked for.
      if (held.size > 200) for (const [k, v] of held) if (v.until < Date.now() || held.size > 200) held.delete(k);
      return frame;
    })
    .finally(() => inflight.delete(cam.id));
  inflight.set(cam.id, job);
  return job;
}

/** For tests: forget the catalogue and every held frame. */
export function resetFrames() {
  index = null;
  building = null;
  lastBuildAt = 0;
  builtHere = false;
  held.clear();
  inflight.clear();
}
