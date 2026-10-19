'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Download, Film, Lock, Pause, Play, Square, Trash2, X } from 'lucide-react';
import {
  TIMELAPSE_MAX_FRAMES,
  TIMELAPSE_POLL_MS,
  TIMELAPSE_SPEEDS,
  TIMELAPSE_DEFAULT_SPEED,
  formatElapsed,
  frameDecision,
  frameSignature,
  ledgerAfterKeep,
  timelapseAccess,
  timelapseFileName,
  timelapseSessionId,
  timelapseSupport,
  tlDeleteSession,
  tlGetFrames,
  tlGetSession,
  tlPutFrame,
  tlPutSession,
  type CaptureLedger,
  type TimelapseAccess,
  type TimelapseSessionMeta,
} from '@/lib/timelapse';

/**
 * Timelapse for snapshot cameras (WorldEye Pro).
 *
 * The button lives in the camera viewer's footer; the panel it opens does
 * the work: capture each new still the camera publishes while this viewer
 * stays open, keep the frames on this device, play them back in order, and
 * render them to a WebM the viewer downloads. Nothing about it runs when
 * the tab is closed, and the copy says so — the Recording Studio's rule.
 */

function pickWebmMime(): string {
  const cands = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for (const c of cands) {
    try { if (window.MediaRecorder?.isTypeSupported(c)) return c; } catch {}
  }
  return '';
}

type StopReason = 'cap' | 'ended' | null;

export default function TimelapseControl({ camera, streamType }: { camera: any | null; streamType: string }) {
  const support = timelapseSupport(camera, streamType);
  const cameraId: string | null = support.supported
    ? String(typeof camera.id === 'number' ? String(camera.id) : camera.id)
    : null;
  const cameraName: string = camera?.name || camera?.title || 'Camera';

  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState<TimelapseAccess>('unknown');
  const [frameCount, setFrameCount] = useState(0);
  const [recording, setRecording] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const [stopReason, setStopReason] = useState<StopReason>(null);
  const [misses, setMisses] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  // Player
  const [playing, setPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [speed, setSpeed] = useState<number>(TIMELAPSE_DEFAULT_SPEED);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const framesRef = useRef<Blob[]>([]);
  const urlCacheRef = useRef<Map<number, string>>(new Map());

  // Export
  const [exporting, setExporting] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const exportCancelRef = useRef(false);

  // Capture internals
  const ledgerRef = useRef<CaptureLedger>({ count: 0, lastFrameAt: null, lastSignature: null });
  const recordingRef = useRef(false);
  const grabbingRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const metaRef = useRef<TimelapseSessionMeta | null>(null);

  /* ---------------- gate ---------------- */
  useEffect(() => {
    let live = true;
    fetch('/api/auth/session', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => { if (live) setAccess(timelapseAccess(s)); })
      .catch(() => { if (live) setAccess('signed-out'); });
    return () => { live = false; };
  }, []);

  /* ---------------- stored session for this camera ---------------- */
  const loadStored = useCallback(async (camId: string) => {
    try {
      const meta = await tlGetSession(timelapseSessionId(camId));
      metaRef.current = meta;
      sessionIdRef.current = meta?.id ?? null;
      ledgerRef.current = {
        count: meta?.frameCount ?? 0,
        lastFrameAt: meta?.lastFrameAt ?? null,
        lastSignature: meta?.lastSignature ?? null,
      };
      setFrameCount(meta?.frameCount ?? 0);
      setStartedAt(meta?.startedAt ?? null);
      framesRef.current = [];
      urlCacheRef.current.forEach((u) => URL.revokeObjectURL(u));
      urlCacheRef.current.clear();
      setPlayIndex(0);
      setPlaying(false);
    } catch {
      setFrameCount(0);
    }
  }, []);

  /* ---------------- capture ---------------- */
  const stopCapture = useCallback((reason: StopReason = null) => {
    recordingRef.current = false;
    setRecording(false);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (reason) setStopReason(reason);
  }, []);

  const grabFrame = useCallback(async () => {
    if (!recordingRef.current || grabbingRef.current || !cameraId) return;
    grabbingRef.current = true;
    try {
      const res = await fetch(`/api/cctv/frame?id=${encodeURIComponent(cameraId)}`, { cache: 'no-store' });
      if (!recordingRef.current) return;
      if (!res.ok) {
        // 422: the source no longer serves a still (or never did) — stop honestly.
        if (res.status === 422) { setNotice('This camera stopped sending still pictures, so the capture has ended.'); stopCapture('ended'); return; }
        setMisses((m) => m + 1);
        return;
      }
      const frameAt = res.headers.get('x-frame-at');
      const blob = await res.blob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const incoming = { frameAt, signature: frameSignature(bytes) };
      const decision = frameDecision(ledgerRef.current, incoming);
      if (decision === 'full') { stopCapture('cap'); return; }
      if (decision === 'duplicate') { setMisses(0); return; }
      const sessionId = sessionIdRef.current ?? timelapseSessionId(cameraId);
      sessionIdRef.current = sessionId;
      await tlPutFrame(sessionId, ledgerRef.current.count, blob);
      ledgerRef.current = ledgerAfterKeep(ledgerRef.current, incoming);
      const meta: TimelapseSessionMeta = {
        id: sessionId,
        cameraId,
        cameraName,
        startedAt: metaRef.current?.startedAt ?? Date.now(),
        pollMs: TIMELAPSE_POLL_MS,
        frameCount: ledgerRef.current.count,
        lastFrameAt: ledgerRef.current.lastFrameAt,
        lastSignature: ledgerRef.current.lastSignature,
      };
      metaRef.current = meta;
      await tlPutSession(meta);
      setFrameCount(meta.frameCount);
      setMisses(0);
      if (meta.frameCount >= TIMELAPSE_MAX_FRAMES) stopCapture('cap');
    } catch {
      if (recordingRef.current) setMisses((m) => m + 1);
    } finally {
      grabbingRef.current = false;
    }
  }, [cameraId, cameraName, stopCapture]);

  const startCapture = useCallback(() => {
    if (!cameraId || recordingRef.current) return;
    setStopReason(null);
    setNotice(null);
    setSaved(false);
    if (!metaRef.current) setStartedAt(Date.now());
    recordingRef.current = true;
    setRecording(true);
    void grabFrame();
    pollRef.current = setInterval(() => { void grabFrame(); }, TIMELAPSE_POLL_MS);
  }, [cameraId, grabFrame]);

  /* Switching cameras (or closing the viewer) ends any capture; the frames
     already taken stay on this device under that camera's session. */
  useEffect(() => {
    stopCapture();
    setOpen(false);
    setStopReason(null);
    setNotice(null);
    setMisses(0);
    if (cameraId) void loadStored(cameraId);
    else { metaRef.current = null; sessionIdRef.current = null; setFrameCount(0); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId]);

  useEffect(() => () => {
    recordingRef.current = false;
    if (pollRef.current) clearInterval(pollRef.current);
    urlCacheRef.current.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  /* Recording clock. */
  useEffect(() => {
    if (!recording) return;
    const iv = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [recording]);

  /* ---------------- playback ---------------- */
  const ensureFrames = useCallback(async (): Promise<Blob[]> => {
    if (framesRef.current.length === frameCount && frameCount > 0) return framesRef.current;
    if (!sessionIdRef.current) return [];
    const frames = await tlGetFrames(sessionIdRef.current, frameCount);
    framesRef.current = frames;
    return frames;
  }, [frameCount]);

  useEffect(() => {
    let live = true;
    if (!open || frameCount === 0) { setPreviewUrl(null); return; }
    void ensureFrames().then((frames) => {
      if (!live || frames.length === 0) return;
      const idx = Math.min(playIndex, frames.length - 1);
      let url = urlCacheRef.current.get(idx);
      if (!url) {
        url = URL.createObjectURL(frames[idx]);
        urlCacheRef.current.set(idx, url);
      }
      setPreviewUrl(url);
    });
    return () => { live = false; };
  }, [open, playIndex, frameCount, ensureFrames]);

  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      setPlayIndex((i) => {
        if (i + 1 >= frameCount) { setPlaying(false); return i; }
        return i + 1;
      });
    }, 1000 / speed);
    return () => clearInterval(iv);
  }, [playing, speed, frameCount]);

  /* ---------------- export ---------------- */
  const exportVideo = useCallback(async () => {
    const frames = await ensureFrames();
    if (frames.length === 0 || exporting !== null) return;
    exportCancelRef.current = false;
    setSaved(false);
    setExporting(0);
    try {
      const first = await createImageBitmap(frames[0]);
      const canvas = document.createElement('canvas');
      canvas.width = first.width;
      canvas.height = first.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      const stream = (canvas as HTMLCanvasElement & { captureStream(fps: number): MediaStream }).captureStream(0);
      const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
      const mime = pickWebmMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 4_000_000 } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const stopped = new Promise<void>((resolve) => { rec.onstop = () => resolve(); });
      rec.start(250);
      const frameMs = 1000 / speed;
      for (let i = 0; i < frames.length; i++) {
        if (exportCancelRef.current) break;
        const bmp = i === 0 ? first : await createImageBitmap(frames[i]);
        ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        if (i !== 0) bmp.close();
        track.requestFrame?.();
        setExporting(Math.round(((i + 1) / frames.length) * 100));
        await new Promise((r) => setTimeout(r, frameMs));
      }
      first.close();
      rec.stop();
      await stopped;
      if (exportCancelRef.current) return;
      const out = new Blob(chunks, { type: mime || 'video/webm' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(out);
      a.download = timelapseFileName(cameraName);
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setSaved(true);
    } catch {
      setNotice('The video could not be rendered in this browser. Your frames are still saved here.');
    } finally {
      setExporting(null);
    }
  }, [ensureFrames, exporting, speed, cameraName]);

  const discard = useCallback(async () => {
    stopCapture();
    if (sessionIdRef.current) await tlDeleteSession(sessionIdRef.current).catch(() => {});
    metaRef.current = null;
    sessionIdRef.current = null;
    ledgerRef.current = { count: 0, lastFrameAt: null, lastSignature: null };
    framesRef.current = [];
    urlCacheRef.current.forEach((u) => URL.revokeObjectURL(u));
    urlCacheRef.current.clear();
    setFrameCount(0);
    setPlayIndex(0);
    setPlaying(false);
    setStartedAt(null);
    setSaved(false);
    setStopReason(null);
    setNotice(null);
  }, [stopCapture]);

  /* ---------------- render ---------------- */
  if (!camera) return null;

  const btnCls = 'flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-[9px] font-mono text-[var(--gold-primary)] tracking-widest disabled:opacity-50 disabled:cursor-not-allowed';
  const locked = access === 'free' || access === 'signed-out';

  return (
    <>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
        <span className="text-[9px] text-[var(--text-muted)] font-mono tracking-widest">TIMELAPSE</span>
        {support.supported ? (
          <button
            onClick={() => setOpen((o) => !o)}
            className={btnCls}
            title={recording ? 'Timelapse is capturing — open the panel' : 'Timelapse — a WorldEye Pro feature for snapshot cameras'}
            aria-label="Timelapse"
            aria-expanded={open}
          >
            {locked
              ? <><Lock className="w-2.5 h-2.5" /> PRO</>
              : recording
                ? <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> {frameCount} FRAMES</>
                : <><Film className="w-2.5 h-2.5" /> {frameCount > 0 ? `${frameCount} FRAMES` : 'OPEN'}</>}
          </button>
        ) : (
          <button
            disabled
            className={btnCls}
            title={support.reason === 'stream'
              ? 'Timelapse is a snapshot-camera feature — this camera is a live video stream, which has no still pictures to collect.'
              : 'Timelapse needs a catalogue camera — this view has no camera id to fetch stills by.'}
            aria-label="Timelapse is not available for this camera"
          >
            <Film className="w-2.5 h-2.5" /> SNAPSHOT CAMERAS ONLY
          </button>
        )}
      </div>

      {open && support.supported && (
        <div className="border-b border-white/5 px-3 py-2.5 bg-white/[0.02]">
          {access === 'unknown' ? (
            <p className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest">CHECKING YOUR PLAN…</p>
          ) : access === 'signed-out' ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-mono text-white tracking-wider flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[var(--gold-primary)]" /> TIMELAPSE IS A WORLDEYE PRO FEATURE
              </p>
              <p className="text-[9px] font-mono text-[var(--text-muted)] leading-relaxed">
                Pro viewers can collect this camera's snapshots into a timelapse and save it as a video.
                Capture runs only while you watch — it is not 24/7 or cloud recording.
              </p>
              <div className="flex gap-2 mt-0.5">
                <a href="/api/auth/signin?callbackUrl=/" className="px-2.5 py-1 text-[9px] font-mono font-bold tracking-widest bg-[var(--gold-primary)]/15 border border-[var(--gold-primary)]/50 text-[var(--gold-primary)] hover:bg-[var(--gold-primary)]/25 transition-colors">SIGN IN</a>
                <a href="/pricing" className="px-2.5 py-1 text-[9px] font-mono font-bold tracking-widest bg-white/5 border border-white/15 text-white hover:bg-white/10 transition-colors">SEE PRO</a>
              </div>
            </div>
          ) : access === 'free' ? (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-mono text-white tracking-wider flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[var(--gold-primary)]" /> TIMELAPSE IS A WORLDEYE PRO FEATURE
              </p>
              <p className="text-[9px] font-mono text-[var(--text-muted)] leading-relaxed">
                Collect this camera's snapshots into a timelapse, play it back, and save it as a video.
                Capture runs only while you watch — it is not 24/7 or cloud recording.
              </p>
              <div className="mt-0.5">
                <a href="/pricing" className="inline-block px-2.5 py-1 text-[9px] font-mono font-bold tracking-widest bg-[var(--gold-primary)]/15 border border-[var(--gold-primary)]/50 text-[var(--gold-primary)] hover:bg-[var(--gold-primary)]/25 transition-colors">UNLOCK WITH PRO</a>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recording ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-[10px] font-mono text-white tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      CAPTURING — {frameCount} FRAME{frameCount === 1 ? '' : 'S'} · {startedAt ? formatElapsed((nowTick || Date.now()) - startedAt) : '0:00'}
                    </span>
                    <button onClick={() => stopCapture()} className="flex items-center gap-1 px-2 py-1 bg-red-900/30 border border-red-500/40 text-red-300 text-[9px] font-mono tracking-widest hover:bg-red-500/25 transition-colors" aria-label="Stop timelapse capture">
                      <Square className="w-2.5 h-2.5" /> STOP
                    </button>
                  </div>
                  {misses >= 3 && (
                    <p className="text-[9px] font-mono text-[var(--gold-primary)]">The camera isn't answering right now — still checking every few seconds.</p>
                  )}
                  <p className="text-[9px] font-mono text-[var(--text-muted)] leading-relaxed">
                    Each new snapshot is added as the camera publishes it. Keep this viewer open — closing it pauses the capture. Frames save to this device only.
                  </p>
                </>
              ) : frameCount > 0 ? (
                <>
                  {previewUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt={`${cameraName} — timelapse frame ${playIndex + 1} of ${frameCount}`} className="w-full aspect-video object-cover border border-white/10 bg-black" />
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { if (!playing && playIndex + 1 >= frameCount) setPlayIndex(0); setPlaying((p) => !p); }}
                      className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white"
                      aria-label={playing ? 'Pause timelapse' : 'Play timelapse'}
                    >
                      {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, frameCount - 1)}
                      value={Math.min(playIndex, frameCount - 1)}
                      onChange={(e) => { setPlaying(false); setPlayIndex(Number(e.target.value)); }}
                      className="flex-1 accent-[var(--gold-primary)] h-1"
                      aria-label="Scrub timelapse frames"
                    />
                    <span className="text-[9px] font-mono text-[var(--text-muted)] whitespace-nowrap">{Math.min(playIndex + 1, frameCount)} / {frameCount}</span>
                    <select
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      className="bg-black border border-white/15 text-[9px] font-mono text-white px-1 py-1"
                      aria-label="Playback speed, frames per second"
                    >
                      {TIMELAPSE_SPEEDS.map((s) => <option key={s} value={s}>{s} FPS</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => void exportVideo()} disabled={exporting !== null} className="flex items-center gap-1.5 px-2 py-1 bg-[var(--gold-primary)]/15 border border-[var(--gold-primary)]/50 text-[var(--gold-primary)] text-[9px] font-mono tracking-widest hover:bg-[var(--gold-primary)]/25 transition-colors disabled:opacity-50" aria-label="Save timelapse as a WebM video">
                      {saved && exporting === null
                        ? <><Check className="w-2.5 h-2.5" /> SAVED</>
                        : <><Download className="w-2.5 h-2.5" /> {exporting !== null ? `RENDERING ${exporting}%` : 'SAVE VIDEO'}</>}
                    </button>
                    {exporting !== null && (
                      <button onClick={() => { exportCancelRef.current = true; }} className="flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 text-white text-[9px] font-mono tracking-widest hover:bg-white/10 transition-colors" aria-label="Cancel rendering">
                        <X className="w-2.5 h-2.5" /> CANCEL
                      </button>
                    )}
                    <button onClick={startCapture} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 text-white text-[9px] font-mono tracking-widest hover:bg-white/10 transition-colors" aria-label="Capture more frames">
                      <Film className="w-2.5 h-2.5" /> CAPTURE MORE
                    </button>
                    <button onClick={() => void discard()} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 text-red-300 text-[9px] font-mono tracking-widest hover:bg-red-500/15 transition-colors" aria-label="Discard this timelapse">
                      <Trash2 className="w-2.5 h-2.5" /> DISCARD
                    </button>
                  </div>
                  {stopReason === 'cap' && (
                    <p className="text-[9px] font-mono text-[var(--gold-primary)]">Capture stopped at the {TIMELAPSE_MAX_FRAMES}-frame limit. Save or discard it to start a new one.</p>
                  )}
                  {frameCount < 2 && (
                    <p className="text-[9px] font-mono text-[var(--text-muted)]">One frame so far — capture more to build the timelapse.</p>
                  )}
                  <p className="text-[9px] font-mono text-[var(--text-muted)] leading-relaxed">
                    Frames were captured one per new snapshot while you watched, and live on this device only — clearing site data deletes them, so save the video to keep it.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[9px] font-mono text-[var(--text-muted)] leading-relaxed">
                    Collect every new snapshot this camera publishes, in order, and turn them into a video.
                    Capture runs only while this viewer stays open in your tab — it is not 24/7 or cloud recording, and frames save to this device only.
                  </p>
                  <div>
                    <button onClick={startCapture} className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--gold-primary)]/15 border border-[var(--gold-primary)]/50 text-[var(--gold-primary)] text-[9px] font-mono font-bold tracking-widest hover:bg-[var(--gold-primary)]/25 transition-colors" aria-label="Start timelapse capture">
                      <Film className="w-2.5 h-2.5" /> START CAPTURE
                    </button>
                  </div>
                </>
              )}
              {notice && <p className="text-[9px] font-mono text-[var(--gold-primary)]">{notice}</p>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
