import { planTierOf } from './plan-tier';

/**
 * Camera timelapse — a VIP Pro feature for snapshot cameras.
 *
 * While a Pro viewer watches a still ("jpg") camera, WorldEye can capture
 * each new snapshot the camera publishes, in order, on this device. The
 * frames are played back as a timelapse and can be rendered to a WebM file
 * the viewer keeps. The capture itself is run by the persistent session
 * layer (lib/recording/sessions): it keeps going while the tab stays
 * open, even with this viewer closed, and stops on its own at 24 hours.
 * This is not 24/7 recording and nothing is stored in the cloud.
 *
 * Frame source: GET /api/cctv/frame?id=<catalogue id> — the same
 * server-fetched still the built-in detector reads. It answers 422 for live
 * streams (they have no still frame) and for stills it cannot fetch itself
 * (e.g. ones served through a same-origin resolver path), which is why
 * timelapse is offered only for snapshot cameras with a fetchable still. Its X-Frame-At header says when the frame was
 * fetched upstream; an unchanged value means the same held frame, so it is
 * never stored twice. A content hash guards the same rule when the header
 * is missing.
 */

/** How often a capture polls for the camera's next published snapshot. */
export const TIMELAPSE_POLL_MS = 5000;

/** Frames per capture, hard stop. At one frame per poll this is ~50 minutes. */
export const TIMELAPSE_MAX_FRAMES = 600;

/** Playback speeds offered in the player, in frames per second. */
export const TIMELAPSE_SPEEDS = [2, 5, 10, 20] as const;
export const TIMELAPSE_DEFAULT_SPEED = 10;

/** Who may capture, from the caller's session. Timelapse is a VIP Pro
 *  feature: 'pro' means a paying Pro user who is NOT VIP — locked, with
 *  the VIP upgrade path as the upsell. */
export type TimelapseAccess = 'unknown' | 'vip' | 'pro' | 'free' | 'signed-out';

/**
 * The gate (VIP-only since the tier split, lib/plan-tier): the session
 * carries planTier, resolved from the subscription's price id in the
 * jwt path — a trial on the annual price is VIP from day one. Only
 * 'vip' may capture; 'pro' is distinguished so the lock UI can sell the
 * upgrade instead of a generic trial.
 */
export function timelapseAccess(session: unknown): TimelapseAccess {
  if (!session || typeof session !== 'object') return 'unknown';
  const user = (session as { user?: unknown }).user;
  if (!user || typeof user !== 'object') return 'signed-out';
  const tier = planTierOf(session as { user?: { planTier?: unknown; subscriptionStatus?: unknown } });
  if (tier === 'vip') return 'vip';
  if (tier === 'pro') return 'pro';
  return 'free';
}

const HTTP_URL = /^https?:\/\/[^\s]+$/i;

/**
 * Can the frame route actually fetch this camera's still? Mirrors stillOf()
 * in lib/vision/frames.ts, which is what /api/cctv/frame serves from: the
 * camera's feed must be a direct http(s) still, or the camera proxy wrapping
 * one. A camera whose stills are served through a same-origin resolver path
 * (FAA WeatherCams' /api/cctv/faa-image/<id>) has no fetchable still there —
 * the route answers 422 — so offering capture for it would only ever fail.
 */
export function timelapseStillFetchable(camera: Record<string, unknown> | null | undefined): boolean {
  const feed = typeof camera?.feed_url === 'string' ? camera.feed_url : '';
  if (!feed) return false;
  if (feed.startsWith('/api/cctv/proxy?')) {
    const inner = new URLSearchParams(feed.slice(feed.indexOf('?') + 1)).get('url') ?? '';
    return HTTP_URL.test(inner);
  }
  return HTTP_URL.test(feed);
}

/** Whether timelapse can run for the camera on screen, and if not, why not. */
export function timelapseSupport(
  camera: Record<string, unknown> | null | undefined,
  streamType: string,
): { supported: true } | { supported: false; reason: 'stream' | 'no-id' | 'no-still' } {
  if (streamType !== 'jpg') return { supported: false, reason: 'stream' };
  const id = typeof camera?.id === 'number' ? String(camera.id) : camera?.id;
  if (typeof id !== 'string' || !id.trim()) return { supported: false, reason: 'no-id' };
  if (!timelapseStillFetchable(camera)) return { supported: false, reason: 'no-still' };
  return { supported: true };
}

/**
 * A cheap content signature for dedupe: FNV-1a over the byte length and a
 * stride sample of the bytes (every byte for small frames). Two published
 * snapshots of a live scene differ somewhere in the sample; an identical
 * re-serve hashes identically.
 */
export function frameSignature(bytes: Uint8Array): string {
  let h = 0x811c9dc5;
  const mix = (b: number) => {
    h ^= b;
    h = Math.imul(h, 0x01000193);
  };
  mix(bytes.length & 0xff);
  mix((bytes.length >> 8) & 0xff);
  mix((bytes.length >> 16) & 0xff);
  const stride = bytes.length > 65536 ? Math.floor(bytes.length / 8192) : 1;
  for (let i = 0; i < bytes.length; i += stride) mix(bytes[i]);
  return (h >>> 0).toString(16).padStart(8, '0');
}

export interface IncomingFrame {
  /** X-Frame-At from the frame route; null when the header was absent. */
  frameAt: string | null;
  signature: string;
}

export interface CaptureLedger {
  count: number;
  lastFrameAt: string | null;
  lastSignature: string | null;
}

/**
 * Decide what a freshly fetched frame means for a running capture:
 * keep it, skip it as a duplicate of the last kept frame, or stop —
 * the capture is full. The frameAt check comes first because the frame
 * route holds a frame for a few seconds: an unchanged timestamp is the
 * same picture, whatever its bytes hash to.
 */
export function frameDecision(
  ledger: CaptureLedger,
  incoming: IncomingFrame,
  maxFrames: number = TIMELAPSE_MAX_FRAMES,
): 'keep' | 'duplicate' | 'full' {
  if (ledger.count >= maxFrames) return 'full';
  if (incoming.frameAt && ledger.lastFrameAt && incoming.frameAt === ledger.lastFrameAt) {
    return 'duplicate';
  }
  if (incoming.signature === ledger.lastSignature) return 'duplicate';
  return 'keep';
}

/** The ledger after keeping a frame. */
export function ledgerAfterKeep(ledger: CaptureLedger, incoming: IncomingFrame): CaptureLedger {
  return {
    count: ledger.count + 1,
    lastFrameAt: incoming.frameAt ?? ledger.lastFrameAt,
    lastSignature: incoming.signature,
  };
}

/** Which frame is on screen `elapsedMs` into playback at `fps`. */
export function playbackIndex(elapsedMs: number, frameCount: number, fps: number): number {
  if (frameCount <= 0) return 0;
  const idx = Math.floor((Math.max(0, elapsedMs) / 1000) * Math.max(1, fps));
  return Math.min(idx, frameCount - 1);
}

/** True once playback has run past the last frame. */
export function playbackEnded(elapsedMs: number, frameCount: number, fps: number): boolean {
  if (frameCount <= 0) return true;
  return Math.floor((Math.max(0, elapsedMs) / 1000) * Math.max(1, fps)) >= frameCount;
}

/** "01:05" / "1:02:03" for the capture counter. */
export function formatElapsed(ms: number): string {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}

/** A download filename slug from a camera name. */
export function timelapseFileName(cameraName: string, when: Date = new Date()): string {
  const slug = (cameraName || 'camera').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'camera';
  return `worldeye-timelapse-${slug}-${when.toISOString().slice(0, 10)}.webm`;
}

/* ------------------------------------------------------------------ */
/* Storage — IndexedDB, this device only, mirroring lib/recording/idb. */
/* ------------------------------------------------------------------ */

const DB = 'worldeye-timelapse';
const SESSIONS = 'sessions';
const FRAMES = 'frames';

export interface TimelapseSessionMeta {
  id: string;
  cameraId: string;
  cameraName: string;
  startedAt: number;
  /** Capture cadence the frames were taken at, for honest playback labelling. */
  pollMs: number;
  frameCount: number;
  /** Dedupe ledger of the last kept frame, so a resumed capture never re-stores it. */
  lastFrameAt: string | null;
  lastSignature: string | null;
}

export const timelapseSessionId = (cameraId: string) => `tl:${cameraId}`;
export const timelapseFrameKey = (sessionId: string, seq: number) =>
  `${sessionId}:${String(seq).padStart(5, '0')}`;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(SESSIONS)) req.result.createObjectStore(SESSIONS);
      if (!req.result.objectStoreNames.contains(FRAMES)) req.result.createObjectStore(FRAMES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const t = db.transaction(store, mode);
        let out: T | undefined;
        const req = run(t.objectStore(store));
        if (req) req.onsuccess = () => { out = req.result; };
        t.oncomplete = () => { db.close(); resolve(out); };
        t.onerror = () => { db.close(); reject(t.error); };
      }),
  );
}

export async function tlPutSession(meta: TimelapseSessionMeta): Promise<void> {
  await tx(SESSIONS, 'readwrite', (s) => s.put(meta, meta.id));
}

export async function tlGetSession(id: string): Promise<TimelapseSessionMeta | null> {
  const meta = await tx<TimelapseSessionMeta>(SESSIONS, 'readonly', (s) => s.get(id));
  return meta ?? null;
}

export async function tlPutFrame(sessionId: string, seq: number, blob: Blob): Promise<void> {
  await tx(FRAMES, 'readwrite', (s) => s.put(blob, timelapseFrameKey(sessionId, seq)));
}

/** Every stored frame of a session, in capture order. */
export async function tlGetFrames(sessionId: string, frameCount: number): Promise<Blob[]> {
  const db = await openDb();
  try {
    return await new Promise<Blob[]>((resolve, reject) => {
      const out: Blob[] = [];
      const t = db.transaction(FRAMES, 'readonly');
      const store = t.objectStore(FRAMES);
      let pending = frameCount;
      if (pending === 0) resolve(out);
      for (let seq = 0; seq < frameCount; seq++) {
        const req = store.get(timelapseFrameKey(sessionId, seq));
        req.onsuccess = () => {
          if (req.result) out[seq] = req.result as Blob;
          if (--pending === 0) resolve(out.filter(Boolean));
        };
        req.onerror = () => reject(req.error);
      }
    });
  } finally {
    db.close();
  }
}

/** Delete a session and all of its frames from this device. */
export async function tlDeleteSession(sessionId: string): Promise<void> {
  const meta = await tlGetSession(sessionId).catch(() => null);
  const count = meta?.frameCount ?? 0;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction([SESSIONS, FRAMES], 'readwrite');
      t.objectStore(SESSIONS).delete(sessionId);
      const frames = t.objectStore(FRAMES);
      for (let seq = 0; seq < count; seq++) frames.delete(timelapseFrameKey(sessionId, seq));
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}
