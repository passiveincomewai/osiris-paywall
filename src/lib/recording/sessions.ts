/**
 * Persistent capture sessions — recording that outlives the viewer.
 *
 * Until now every capture on WorldEye was owned by the component that
 * started it: TimelapseControl owned its poll interval, the Recording
 * Studio's tiles owned their MediaRecorders, and closing the viewer (or
 * navigating away) tore the capture down — for the tiles, the in-memory
 * chunks died with it.
 *
 * This module is the session layer those components now share. A
 * session is owned here, at module level, and viewer components only
 * subscribe to its state:
 *
 *  - timelapse sessions poll the frame route and persist every kept
 *    frame to the timelapse IndexedDB store as it arrives (the storage
 *    lib/timelapse already provided), so nothing is held only in
 *    memory;
 *  - clip sessions record a camera stream (a detached <video> the
 *    session owns, or a canvas fed by stills) with a MediaRecorder
 *    whose timeslice chunks are appended to the clips IndexedDB store
 *    as segments the moment they arrive. Stopping — by the user, or
 *    automatically — assembles the segments into the finished clip
 *    and registers it exactly like a studio recording always has
 *    (saveRecordedClip). A tab that dies mid-recording leaves its
 *    segments behind; the next visit assembles them (see
 *    recoverInterruptedClips).
 *
 * Lifecycle, as promised in the UI: "Keeps recording while you browse
 * WorldEye — the tab must stay open. Stops on its own at 24 hours."
 * A session stops when the user stops it or when CAPTURE_SESSION_MAX_MS
 * of wall clock has passed since it started. Elapsed time is always
 * derived from the stored start time: if the tab slept, the elapsed
 * clock is honest wall time and a timelapse simply has a gap — nothing
 * here fakes continuity. Nothing survives the tab itself closing, and
 * no copy anywhere claims it does.
 *
 * The store half follows the codebase's convention (lib/vision/store):
 * a module-level Map, a listener set, and useSyncExternalStore hooks.
 * All browser machinery (fetch, MediaRecorder, IndexedDB) arrives
 * through CaptureSessionDeps so the lifecycle is unit-testable.
 */
import { useSyncExternalStore } from 'react';
import Hls from 'hls.js';
import {
  TIMELAPSE_MAX_FRAMES,
  TIMELAPSE_POLL_MS,
  frameDecision,
  frameSignature,
  ledgerAfterKeep,
  timelapseSessionId,
  tlGetSession,
  tlPutFrame,
  tlPutSession,
  type CaptureLedger,
  type TimelapseSessionMeta,
} from '@/lib/timelapse';
import { assembleClipMeta, type ClipMetaBody, type MultiCamSource } from './multi';
import { pickRecorderMime, saveRecordedClip } from './save-clip';
import { idbDeleteSegments, idbGetSegments, idbPutSegment } from './idb';

/** A capture session's hard wall-clock limit: 24 hours from its start. */
export const CAPTURE_SESSION_MAX_MS = 24 * 60 * 60 * 1000;

/** MediaRecorder timeslice: one persisted segment per this many ms. */
export const CAPTURE_SEGMENT_MS = 5000;

/** The lifecycle promise, verbatim, wherever capture is offered. */
export const CAPTURE_PERSISTENCE_COPY =
  'Keeps recording while you browse WorldEye — the tab must stay open. Stops on its own at 24 hours.';

export type CaptureKind = 'timelapse' | 'clip';
export type CapturePhase = 'starting' | 'recording' | 'saving';
export type CaptureStopReason =
  | 'user'
  | 'max-duration'
  | 'frames-cap'
  | 'source-ended'
  | 'error'
  | 'recovered';

/** The serialisable state of one running session — what UIs render. */
export interface CaptureSessionView {
  id: string;
  kind: CaptureKind;
  /** Catalogue id (timelapse) or saved-camera id (clip). */
  cameraId: string;
  cameraName: string;
  phase: CapturePhase;
  /** When this run started, epoch ms. Elapsed is always now − startedAt. */
  startedAt: number;
  /** Timelapse: frames kept so far (including any from an earlier run). */
  frameCount: number;
  /** Clip: segments safely persisted to this device so far. */
  segmentCount: number;
  /** Clip: bytes persisted so far. */
  bytes: number;
  /** Timelapse: consecutive polls the camera didn't answer. */
  misses: number;
  /** Plain-words problem the UI should surface, if any. */
  notice: string | null;
}

/** What the indicator reports after a session ends. */
export interface CompletedCapture {
  sessionId: string;
  kind: CaptureKind;
  cameraName: string;
  reason: CaptureStopReason;
  endedAt: number;
  detail: string;
}

export const clipSessionId = (savedCameraId: string) => `clip:${savedCameraId}`;

/** True once a session that started at `startedAt` has hit the 24h cap. */
export function captureSessionExpired(startedAt: number, now: number): boolean {
  return now - startedAt >= CAPTURE_SESSION_MAX_MS;
}

/* ------------------------------------------------------------------ */
/* Dependencies — the browser by default, fakes in tests.              */
/* ------------------------------------------------------------------ */

export type FrameFetchResult =
  | { ok: true; blob: Blob; frameAt: string | null }
  | { ok: false; status: number };

export interface RecorderLike {
  mimeType: string;
  state: string;
  ondataavailable: ((e: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  onerror: (() => void) | null;
  start(timesliceMs: number): void;
  stop(): void;
}

export interface ClipStreamHandle {
  stream: unknown;
  teardown: () => void;
}

export interface ClipRegistryEntry {
  id: string;
  savedCameraId: string;
  cameraName: string;
  startedAt: number;
  lastSegmentAt: number;
  mimeType: string;
}

export interface CaptureSessionDeps {
  now: () => number;
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
  fetchFrame: (cameraId: string) => Promise<FrameFetchResult>;
  tlGet: (id: string) => Promise<TimelapseSessionMeta | null>;
  tlPutSession: (meta: TimelapseSessionMeta) => Promise<void>;
  tlPutFrame: (sessionId: string, seq: number, blob: Blob) => Promise<void>;
  openVideoStream: (streamUrl: string) => Promise<ClipStreamHandle>;
  openStillsStream: (source: MultiCamSource) => Promise<ClipStreamHandle>;
  makeRecorder: (stream: unknown) => RecorderLike;
  putSegment: (sessionId: string, seq: number, blob: Blob) => Promise<void>;
  getSegments: (sessionId: string) => Promise<Blob[]>;
  deleteSegments: (sessionId: string) => Promise<void>;
  saveClip: (blob: Blob, meta: ClipMetaBody) => Promise<string>;
  registryRead: () => ClipRegistryEntry[];
  registryWrite: (entries: ClipRegistryEntry[]) => void;
}

/* ------------------------- browser defaults ------------------------ */

const REGISTRY_KEY = 'worldeye.captureClipSessions';

function browserRegistryRead(): ClipRegistryEntry[] {
  try {
    const raw = window.localStorage.getItem(REGISTRY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as ClipRegistryEntry[]) : [];
  } catch {
    return [];
  }
}

function browserRegistryWrite(entries: ClipRegistryEntry[]): void {
  try {
    if (entries.length === 0) window.localStorage.removeItem(REGISTRY_KEY);
    else window.localStorage.setItem(REGISTRY_KEY, JSON.stringify(entries));
  } catch {
    /* storage full/blocked: recovery is best-effort, recording is not */
  }
}

async function browserFetchFrame(cameraId: string): Promise<FrameFetchResult> {
  const res = await fetch(`/api/cctv/frame?id=${encodeURIComponent(cameraId)}`, {
    cache: 'no-store',
  });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, blob: await res.blob(), frameAt: res.headers.get('x-frame-at') };
}

type VideoCaptureEl = HTMLVideoElement & { captureStream(): MediaStream };
type CanvasCaptureEl = HTMLCanvasElement & { captureStream(fps: number): MediaStream };

async function browserOpenVideoStream(streamUrl: string): Promise<ClipStreamHandle> {
  const video = document.createElement('video') as VideoCaptureEl;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  let hls: Hls | null = null;
  const teardown = () => {
    try { hls?.destroy(); } catch { /* already gone */ }
    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch { /* already gone */ }
  };
  if (/\.m3u8($|\?)/.test(streamUrl)) {
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: false, maxBufferLength: 20 });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
    } else {
      throw new Error('HLS is not supported in this browser');
    }
  } else {
    video.src = streamUrl;
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Stream took too long to start')), 15000);
    const ok = () => { clearTimeout(timer); resolve(); };
    const bad = () => { clearTimeout(timer); reject(new Error('Stream failed to load')); };
    if (video.readyState >= 2) { ok(); return; }
    video.addEventListener('loadeddata', ok, { once: true });
    video.addEventListener('error', bad, { once: true });
    hls?.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) bad(); });
  }).catch((e: unknown) => {
    teardown();
    throw e;
  });
  video.play().catch(() => {});
  let stream: MediaStream;
  try {
    stream = video.captureStream();
  } catch {
    teardown();
    throw new Error('This browser blocked stream capture');
  }
  if (!stream.getVideoTracks().length) {
    teardown();
    throw new Error('No video track to record');
  }
  return { stream, teardown };
}

async function browserOpenStillsStream(source: MultiCamSource): Promise<ClipStreamHandle> {
  if (source.kind !== 'stills') throw new Error('Not a snapshot camera');
  const canvas = document.createElement('canvas') as CanvasCaptureEl;
  let stream: MediaStream;
  try {
    stream = canvas.captureStream(0);
  } catch {
    throw new Error('This browser blocked canvas capture');
  }
  const track = stream.getVideoTracks()[0] as
    | (MediaStreamTrack & { requestFrame?: () => void })
    | undefined;
  const ledger: CaptureLedger = { count: 0, lastFrameAt: null, lastSignature: null };
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const fetchStill = async (): Promise<{ blob: Blob; frameAt: string | null }> => {
    if (source.frameId) {
      const res = await fetch(`/api/cctv/frame?id=${encodeURIComponent(source.frameId)}`);
      if (res.ok) return { blob: await res.blob(), frameAt: res.headers.get('X-Frame-At') };
      if (!source.stillUrl) throw new Error('frame route refused');
    }
    if (source.stillUrl) {
      const res = await fetch(source.stillUrl);
      if (!res.ok) throw new Error('still fetch failed');
      return { blob: await res.blob(), frameAt: null };
    }
    throw new Error('no frame source');
  };

  const tick = async () => {
    if (stopped) return;
    try {
      const { blob, frameAt } = await fetchStill();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const incoming = { frameAt, signature: frameSignature(bytes) };
      if (frameDecision(ledger, incoming) === 'keep') {
        const next = ledgerAfterKeep(ledger, incoming);
        ledger.count = next.count;
        ledger.lastFrameAt = next.lastFrameAt;
        ledger.lastSignature = next.lastSignature;
        const bmp = await createImageBitmap(blob).catch(() => null);
        if (bmp && !stopped) {
          if (canvas.width !== bmp.width || canvas.height !== bmp.height) {
            canvas.width = bmp.width;
            canvas.height = bmp.height;
          }
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(bmp, 0, 0);
            track?.requestFrame?.();
          }
          bmp.close();
        }
      }
    } catch {
      /* a missed still just holds the last frame, like the studio tiles */
    }
    if (!stopped) timer = setTimeout(() => { void tick(); }, TIMELAPSE_POLL_MS);
  };
  void tick();

  return {
    stream,
    teardown: () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

function browserMakeRecorder(stream: unknown): RecorderLike {
  const mime = pickRecorderMime();
  const rec = new MediaRecorder(
    stream as MediaStream,
    mime ? { mimeType: mime, videoBitsPerSecond: 2_500_000 } : undefined,
  );
  return rec as unknown as RecorderLike;
}

export const browserCaptureDeps: CaptureSessionDeps = {
  now: () => Date.now(),
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (h) => clearInterval(h as ReturnType<typeof setInterval>),
  fetchFrame: browserFetchFrame,
  tlGet: tlGetSession,
  tlPutSession,
  tlPutFrame,
  openVideoStream: browserOpenVideoStream,
  openStillsStream: browserOpenStillsStream,
  makeRecorder: browserMakeRecorder,
  putSegment: idbPutSegment,
  getSegments: idbGetSegments,
  deleteSegments: idbDeleteSegments,
  saveClip: saveRecordedClip,
  registryRead: browserRegistryRead,
  registryWrite: browserRegistryWrite,
};

/* ------------------------------------------------------------------ */
/* The manager.                                                        */
/* ------------------------------------------------------------------ */

interface Internal {
  view: CaptureSessionView;
  // timelapse
  ledger: CaptureLedger;
  storedMeta: TimelapseSessionMeta | null;
  pollHandle: unknown;
  grabbing: boolean;
  // clip
  recorder: RecorderLike | null;
  streamTeardown: (() => void) | null;
  seq: number;
  persistChain: Promise<void>;
  mimeType: string;
  finalizing: boolean;
}

export interface CaptureSessionManager {
  startTimelapse: (input: { cameraId: string; cameraName: string }) => Promise<CaptureSessionView>;
  startClip: (input: {
    savedCameraId: string;
    cameraName: string;
    source: MultiCamSource;
  }) => Promise<CaptureSessionView>;
  stopSession: (id: string) => Promise<void>;
  getSession: (id: string) => CaptureSessionView | null;
  listSessions: () => CaptureSessionView[];
  /** The CACHED sessions array (stable reference between changes) —
      the only lawful getSnapshot for useSyncExternalStore. listSessions()
      allocates a fresh array per call and must never be used as one:
      React compares snapshots by reference, and a perpetually "changed"
      snapshot is an infinite render loop (React error #185). */
  getSessionsSnapshot: () => CaptureSessionView[];
  getCompleted: () => CompletedCapture | null;
  dismissCompleted: () => void;
  recoverInterruptedClips: () => Promise<void>;
  subscribe: (listener: () => void) => () => void;
}

export function createCaptureSessionManager(deps: CaptureSessionDeps): CaptureSessionManager {
  const sessions = new Map<string, Internal>();
  const listeners = new Set<() => void>();
  let snapshot: CaptureSessionView[] = [];
  let completed: CompletedCapture | null = null;
  let ticker: unknown = null;

  const notify = () => {
    snapshot = [...sessions.values()].map((s) => s.view);
    for (const l of listeners) l();
  };

  const setView = (s: Internal, patch: Partial<CaptureSessionView>) => {
    s.view = { ...s.view, ...patch };
    notify();
  };

  const setCompleted = (c: CompletedCapture) => {
    completed = c;
    notify();
  };

  /* The 24h watch: one ticker for the whole manager, alive only while
     at least one session runs. Elapsed is wall clock from startedAt. */
  const ensureTicker = () => {
    if (ticker !== null || sessions.size === 0) return;
    ticker = deps.setInterval(() => {
      const now = deps.now();
      for (const s of [...sessions.values()]) {
        if (s.view.phase === 'recording' && captureSessionExpired(s.view.startedAt, now)) {
          void finalize(s, 'max-duration');
        }
      }
    }, 1000);
  };

  const dropTickerIfIdle = () => {
    if (sessions.size === 0 && ticker !== null) {
      deps.clearInterval(ticker);
      ticker = null;
    }
  };

  const registryAdd = (entry: ClipRegistryEntry) => {
    const entries = deps.registryRead().filter((e) => e.id !== entry.id);
    entries.push(entry);
    deps.registryWrite(entries);
  };

  const registryTouch = (id: string, patch: Partial<ClipRegistryEntry>) => {
    const entries = deps.registryRead();
    const i = entries.findIndex((e) => e.id === id);
    if (i < 0) return;
    entries[i] = { ...entries[i], ...patch };
    deps.registryWrite(entries);
  };

  const registryRemove = (id: string) => {
    deps.registryWrite(deps.registryRead().filter((e) => e.id !== id));
  };

  /* ------------------------- timelapse -------------------------- */

  const grabTimelapseFrame = async (s: Internal): Promise<void> => {
    if (s.grabbing || s.finalizing || !sessions.has(s.view.id)) return;
    s.grabbing = true;
    try {
      const res = await deps.fetchFrame(s.view.cameraId);
      if (s.finalizing || !sessions.has(s.view.id)) return;
      if (!res.ok) {
        if (res.status === 422) {
          // The source no longer serves a still — end honestly, keep frames.
          setView(s, { notice: 'This camera stopped sending still pictures, so the capture has ended.' });
          await finalize(s, 'source-ended');
          return;
        }
        setView(s, { misses: s.view.misses + 1 });
        return;
      }
      const bytes = new Uint8Array(await res.blob.arrayBuffer());
      const incoming = { frameAt: res.frameAt, signature: frameSignature(bytes) };
      const decision = frameDecision(s.ledger, incoming);
      if (decision === 'full') {
        await finalize(s, 'frames-cap');
        return;
      }
      if (decision === 'duplicate') {
        if (s.view.misses !== 0) setView(s, { misses: 0 });
        return;
      }
      await deps.tlPutFrame(s.view.id, s.ledger.count, res.blob);
      s.ledger = ledgerAfterKeep(s.ledger, incoming);
      const meta: TimelapseSessionMeta = {
        id: s.view.id,
        cameraId: s.view.cameraId,
        cameraName: s.view.cameraName,
        startedAt: s.storedMeta?.startedAt ?? s.view.startedAt,
        pollMs: TIMELAPSE_POLL_MS,
        frameCount: s.ledger.count,
        lastFrameAt: s.ledger.lastFrameAt,
        lastSignature: s.ledger.lastSignature,
      };
      s.storedMeta = meta;
      await deps.tlPutSession(meta);
      setView(s, { frameCount: meta.frameCount, misses: 0 });
      if (meta.frameCount >= TIMELAPSE_MAX_FRAMES) await finalize(s, 'frames-cap');
    } catch {
      if (!s.finalizing && sessions.has(s.view.id)) {
        setView(s, { misses: s.view.misses + 1 });
      }
    } finally {
      s.grabbing = false;
    }
  };

  const startTimelapse: CaptureSessionManager['startTimelapse'] = async ({ cameraId, cameraName }) => {
    const id = timelapseSessionId(cameraId);
    const existing = sessions.get(id);
    if (existing) return existing.view;
    const stored = await deps.tlGet(id).catch(() => null);
    const s: Internal = {
      view: {
        id,
        kind: 'timelapse',
        cameraId,
        cameraName,
        phase: 'recording',
        startedAt: deps.now(),
        frameCount: stored?.frameCount ?? 0,
        segmentCount: 0,
        bytes: 0,
        misses: 0,
        notice: null,
      },
      ledger: {
        count: stored?.frameCount ?? 0,
        lastFrameAt: stored?.lastFrameAt ?? null,
        lastSignature: stored?.lastSignature ?? null,
      },
      storedMeta: stored,
      pollHandle: null,
      grabbing: false,
      recorder: null,
      streamTeardown: null,
      seq: 0,
      persistChain: Promise.resolve(),
      mimeType: '',
      finalizing: false,
    };
    sessions.set(id, s);
    notify();
    ensureTicker();
    void grabTimelapseFrame(s);
    s.pollHandle = deps.setInterval(() => { void grabTimelapseFrame(s); }, TIMELAPSE_POLL_MS);
    return s.view;
  };

  /* ---------------------------- clips ----------------------------- */

  const startClip: CaptureSessionManager['startClip'] = async ({ savedCameraId, cameraName, source }) => {
    if (source.kind === 'unsupported') throw new Error(source.reason);
    const id = clipSessionId(savedCameraId);
    const existing = sessions.get(id);
    if (existing) return existing.view;
    const s: Internal = {
      view: {
        id,
        kind: 'clip',
        cameraId: savedCameraId,
        cameraName,
        phase: 'starting',
        startedAt: deps.now(),
        frameCount: 0,
        segmentCount: 0,
        bytes: 0,
        misses: 0,
        notice: null,
      },
      ledger: { count: 0, lastFrameAt: null, lastSignature: null },
      storedMeta: null,
      pollHandle: null,
      grabbing: false,
      recorder: null,
      streamTeardown: null,
      seq: 0,
      persistChain: Promise.resolve(),
      mimeType: '',
      finalizing: false,
    };
    sessions.set(id, s);
    notify();
    registryAdd({
      id,
      savedCameraId,
      cameraName,
      startedAt: s.view.startedAt,
      lastSegmentAt: s.view.startedAt,
      mimeType: '',
    });
    try {
      const handle = source.kind === 'video'
        ? await deps.openVideoStream(source.streamUrl)
        : await deps.openStillsStream(source);
      s.streamTeardown = handle.teardown;
      const recorder = deps.makeRecorder(handle.stream);
      s.recorder = recorder;
      s.mimeType = recorder.mimeType || 'video/webm';
      registryTouch(id, { mimeType: s.mimeType });
      recorder.ondataavailable = (e) => {
        if (!e.data || e.data.size === 0) return;
        const seq = s.seq;
        s.seq += 1;
        const at = deps.now();
        // Segments persist in arrival order, each as it lands — a crash
        // loses at most the segment still being recorded.
        s.persistChain = s.persistChain
          .then(() => deps.putSegment(id, seq, e.data))
          .then(() => {
            registryTouch(id, { lastSegmentAt: at });
            if (sessions.has(id) && !s.finalizing) {
              setView(s, {
                segmentCount: s.view.segmentCount + 1,
                bytes: s.view.bytes + e.data.size,
              });
            }
          })
          .catch(() => { /* a lost segment must not kill the chain */ });
      };
      recorder.onerror = () => { void finalize(s, 'error'); };
      recorder.start(CAPTURE_SEGMENT_MS);
    } catch (e) {
      sessions.delete(id);
      registryRemove(id);
      notify();
      dropTickerIfIdle();
      throw e instanceof Error ? e : new Error('Recording could not start');
    }
    setView(s, { phase: 'recording' });
    ensureTicker();
    return s.view;
  };

  /* --------------------------- finalize ---------------------------- */

  async function finalize(s: Internal, reason: CaptureStopReason): Promise<void> {
    if (s.finalizing) return;
    s.finalizing = true;
    const { id, kind, cameraName } = s.view;
    const endedAt = deps.now();

    if (kind === 'timelapse') {
      if (s.pollHandle !== null) {
        deps.clearInterval(s.pollHandle);
        s.pollHandle = null;
      }
      sessions.delete(id);
      dropTickerIfIdle();
      setCompleted({
        sessionId: id,
        kind,
        cameraName,
        reason,
        endedAt,
        detail: s.view.frameCount > 0
          ? `${s.view.frameCount} frame${s.view.frameCount === 1 ? '' : 's'} saved on this device`
          : 'No frames were captured',
      });
      notify();
      return;
    }

    // clip
    setView(s, { phase: 'saving' });
    const recorder = s.recorder;
    try {
      if (recorder && recorder.state !== 'inactive') {
        const stopped = new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
        });
        try { recorder.stop(); } catch { /* already stopped */ }
        await stopped;
      }
    } finally {
      s.streamTeardown?.();
      s.streamTeardown = null;
    }
    await s.persistChain.catch(() => {});
    let detail: string;
    try {
      const segments = await deps.getSegments(id);
      const blob = new Blob(segments, { type: s.mimeType || 'video/webm' });
      if (blob.size >= 1024) {
        const meta = assembleClipMeta(
          { id: s.view.cameraId, name: cameraName },
          s.view.startedAt,
          endedAt,
          blob.size,
          blob.type || 'video/webm',
        );
        try {
          await deps.saveClip(blob, meta);
          detail = reason === 'max-duration'
            ? 'Stopped at the 24-hour limit — the clip is in your clips library'
            : 'Clip saved to your clips library';
        } catch {
          // saveRecordedClip keeps the blob on this device even when the
          // metadata POST fails; the recording is not lost.
          detail = 'Clip kept on this device — its library entry could not be saved';
        }
      } else {
        detail = 'Recording produced no data — nothing was saved';
      }
    } catch {
      detail = 'The recording could not be assembled from its saved segments';
    }
    await deps.deleteSegments(id).catch(() => {});
    registryRemove(id);
    sessions.delete(id);
    dropTickerIfIdle();
    setCompleted({ sessionId: id, kind, cameraName, reason, endedAt, detail });
    notify();
  }

  const stopSession: CaptureSessionManager['stopSession'] = async (id) => {
    const s = sessions.get(id);
    if (!s) return;
    await finalize(s, 'user');
  };

  /* --------------------------- recovery ---------------------------- */

  const recoverInterruptedClips: CaptureSessionManager['recoverInterruptedClips'] = async () => {
    let entries: ClipRegistryEntry[] = [];
    try {
      entries = deps.registryRead();
    } catch {
      return;
    }
    for (const entry of entries) {
      if (sessions.has(entry.id)) continue; // live in this tab — not an orphan
      try {
        const segments = await deps.getSegments(entry.id).catch(() => [] as Blob[]);
        if (segments.length > 0) {
          const blob = new Blob(segments, { type: entry.mimeType || 'video/webm' });
          if (blob.size >= 1024) {
            const meta = assembleClipMeta(
              { id: entry.savedCameraId, name: entry.cameraName },
              entry.startedAt,
              Math.max(entry.lastSegmentAt, entry.startedAt + 1000),
              blob.size,
              blob.type || 'video/webm',
            );
            await deps.saveClip(blob, meta);
            setCompleted({
              sessionId: entry.id,
              kind: 'clip',
              cameraName: entry.cameraName,
              reason: 'recovered',
              endedAt: deps.now(),
              detail: 'A recording that was interrupted was saved to your clips library',
            });
          }
          await deps.deleteSegments(entry.id).catch(() => {});
        }
      } catch {
        /* leave the entry for the next visit rather than dropping footage */
        continue;
      }
      registryRemove(entry.id);
    }
  };

  return {
    startTimelapse,
    startClip,
    stopSession,
    getSession: (id) => sessions.get(id)?.view ?? null,
    listSessions: () => [...sessions.values()].map((s) => s.view),
    getSessionsSnapshot: () => snapshot,
    getCompleted: () => completed,
    dismissCompleted: () => {
      completed = null;
      notify();
    },
    recoverInterruptedClips,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

/** The app-wide manager, backed by the real browser machinery. */
export const captureSessions: CaptureSessionManager = createCaptureSessionManager(browserCaptureDeps);

/* ------------------------------ hooks ------------------------------ */

const EMPTY_SESSIONS: CaptureSessionView[] = [];

export function useCaptureSessions(): CaptureSessionView[] {
  return useSyncExternalStore(
    captureSessions.subscribe,
    captureSessions.getSessionsSnapshot,
    () => EMPTY_SESSIONS,
  );
}

export function useCaptureSession(id: string | null | undefined): CaptureSessionView | null {
  const all = useCaptureSessions();
  if (!id) return null;
  return all.find((s) => s.id === id) ?? null;
}

/** The running clip session for one saved camera, if any. */
export function useClipSessionFor(savedCameraId: string | null | undefined): CaptureSessionView | null {
  return useCaptureSession(savedCameraId ? clipSessionId(savedCameraId) : null);
}

/** The running timelapse session for one catalogue camera, if any. */
export function useTimelapseSessionFor(cameraId: string | null | undefined): CaptureSessionView | null {
  return useCaptureSession(cameraId ? timelapseSessionId(cameraId) : null);
}

export function useLastCompletedCapture(): CompletedCapture | null {
  return useSyncExternalStore(
    captureSessions.subscribe,
    () => captureSessions.getCompleted(),
    () => null,
  );
}
