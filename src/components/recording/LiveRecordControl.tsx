'use client';

/**
 * Live recording for stream cameras (WorldEye Pro) — the record control
 * in the camera viewer's footer.
 *
 * Until now the viewer could only collect stills (TimelapseControl):
 * a live HLS/MP4 camera showed a disabled "SNAPSHOT CAMERAS ONLY"
 * button and no way to record the stream it was playing. The recording
 * engine for streams already existed — the capture-session layer's
 * clip sessions, used by the Recording Studio — but only for cameras
 * saved to My Cameras. This control wires the same engine to the
 * camera being watched, keyed by its catalogue id (the clips API
 * registers the clip with its camera name; a saved-camera link is
 * attached only when the id happens to be one).
 *
 * What can be recorded is decided by lib/recording/multi's classifier
 * over the EFFECTIVE playback (the viewer's streamType/streamUrl,
 * resolved embeds included) — one classifier for studio and viewer:
 *  - video (HLS / MP4): REC/STOP, gated on Pro via
 *    /api/recording/status (the studio/dashboard signal), with the
 *    tier's concurrent cap (Pro 20 / VIP 40) checked against the
 *    running clip sessions before a start;
 *  - snapshot cameras: renders nothing — the timelapse row above is
 *    their capture control;
 *  - iframe embeds / MJPEG / unroutable streams: a plain-words note
 *    saying why this camera can't be recorded here. No fake button —
 *    a cross-origin embed cannot be captured by the page at all.
 *
 * The session is owned by the session layer, not this component: it
 * keeps recording while the viewer is closed, persists segments to
 * this device every 5 seconds, and lands in the same clip library
 * (and /recording/dashboard) as studio recordings.
 */
import { useCallback, useEffect, useState } from 'react';
import { Lock, Square } from 'lucide-react';
import TrialPicker from '../TrialPicker';
import {
  CAPTURE_PERSISTENCE_COPY,
  captureSessions,
  useCaptureSessions,
  useClipSessionFor,
} from '@/lib/recording/sessions';
import {
  capMessage,
  classifyMultiCam,
  multiCapForTier,
  type MultiTier,
} from '@/lib/recording/multi';
import { liveCaptureSupported } from '@/lib/recording/capture-support';
import { formatElapsed } from '@/lib/timelapse';

type Gate = { loaded: boolean; signedIn: boolean; tier: 'free' | 'pro' | 'vip' };

export default function LiveRecordControl({
  camera,
  streamType,
  streamUrl,
}: {
  camera: any | null;
  streamType: string;
  streamUrl?: string;
}) {
  const cameraId: string | null =
    camera?.id != null && String(camera.id).trim() ? String(camera.id) : null;
  const cameraName: string = camera?.name || camera?.title || 'Camera';

  // Classify what the viewer is actually playing, not just what the
  // catalogue declared: a resolved YouTube embed must classify as the
  // embed it became, not the link it started as.
  const source = camera
    ? classifyMultiCam({ ...camera, stream_type: streamType, stream_url: streamUrl ?? camera.stream_url })
    : null;

  const session = useClipSessionFor(cameraId);
  const allSessions = useCaptureSessions();
  const recording = session?.phase === 'recording' || session?.phase === 'starting';
  const saving = session?.phase === 'saving';

  const [gate, setGate] = useState<Gate>({ loaded: false, signedIn: false, tier: 'free' });
  const [browserOk, setBrowserOk] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [trialOpen, setTrialOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(0);

  /* The gate — the same status signal the studio and dashboard read. */
  useEffect(() => {
    setBrowserOk(liveCaptureSupported(typeof window === 'undefined' ? null : window));
    let live = true;
    fetch('/api/recording/status', { cache: 'no-store' })
      .then(async (r) => {
        if (!live) return;
        if (!r.ok) { setGate({ loaded: true, signedIn: false, tier: 'free' }); return; }
        const j = await r.json().catch(() => ({}));
        if (!live) return;
        setGate({
          loaded: true,
          signedIn: true,
          tier: j.tier === 'vip' ? 'vip' : j.pro ? 'pro' : 'free',
        });
      })
      .catch(() => { if (live) setGate({ loaded: true, signedIn: false, tier: 'free' }); });
    return () => { live = false; };
  }, []);

  /* Switching cameras re-points the control; a capture already running
     for the previous camera keeps running in the session layer. */
  useEffect(() => {
    setOpen(false);
    setNotice(null);
  }, [cameraId]);

  /* Recording clock, from the session's own start time. */
  useEffect(() => {
    if (!recording) return;
    const iv = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [recording]);

  const start = useCallback(async () => {
    if (!cameraId || !source || source.kind !== 'video' || session || starting) return;
    const tier: MultiTier = gate.tier === 'vip' ? 'vip' : 'pro';
    const cap = multiCapForTier(tier);
    const running = allSessions.filter((s) => s.kind === 'clip' && s.phase !== 'saving').length;
    if (running >= cap) {
      setNotice(capMessage(cap, tier));
      return;
    }
    setStarting(true);
    setNotice(null);
    try {
      await captureSessions.startClip({ savedCameraId: cameraId, cameraName, source });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Recording could not start in this browser.');
    } finally {
      setStarting(false);
    }
  }, [cameraId, cameraName, source, session, starting, gate.tier, allSessions]);

  const stop = useCallback(() => {
    if (session) void captureSessions.stopSession(session.id);
  }, [session]);

  if (!camera || !source) return null;
  // Snapshot cameras already have their capture control (timelapse).
  if (source.kind === 'stills') return null;

  const btnCls =
    'flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-[9px] font-mono text-[var(--gold-primary)] tracking-widest disabled:opacity-50 disabled:cursor-not-allowed';
  const entitled = gate.signedIn && gate.tier !== 'free';
  const elapsed = session ? formatElapsed((nowTick || Date.now()) - session.startedAt) : '0:00';
  const savedKb = session ? Math.max(0, Math.round(session.bytes / 1024)) : 0;

  return (
    <>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5">
        <span className="text-[9px] text-[var(--text-muted)] font-mono tracking-widest">RECORD</span>
        {browserOk === false ? (
          <span
            className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest"
            title="This browser can't capture a playing video (no captureStream / MediaRecorder) — try Chrome, Edge or Firefox. Snapshot timelapse, where offered, still works here."
          >
            NOT SUPPORTED IN THIS BROWSER
          </span>
        ) : source.kind === 'unsupported' ? (
          <span
            className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest max-w-[260px] truncate"
            title={source.reason}
          >
            CAN&apos;T RECORD THIS FEED
          </span>
        ) : !cameraId ? (
          <span
            className="text-[9px] font-mono text-[var(--text-muted)] tracking-widest"
            title="Recording needs the camera's catalogue id to file the clip under — this view doesn't carry one."
          >
            NOT AVAILABLE HERE
          </span>
        ) : recording || saving ? (
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[9px] font-mono text-white tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {saving ? 'SAVING…' : `REC ${elapsed}`}
            </span>
            <button
              onClick={stop}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 bg-red-900/30 border border-red-500/40 text-red-300 text-[9px] font-mono tracking-widest hover:bg-red-500/25 transition-colors disabled:opacity-50"
              aria-label="Stop recording"
            >
              <Square className="w-2.5 h-2.5" /> STOP
            </button>
          </span>
        ) : (
          <button
            onClick={() => { if (entitled) void start(); else setOpen((o) => !o); }}
            disabled={starting || browserOk === null || !gate.loaded}
            className={btnCls}
            title={entitled ? 'Record this live stream — saved to your clips library on this device' : 'Recording is a Pro feature'}
            aria-label="Record this live camera"
            aria-expanded={!entitled ? open : undefined}
          >
            {!entitled && gate.loaded
              ? <><Lock className="w-2.5 h-2.5" /> PRO</>
              : <><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {starting ? 'STARTING…' : 'REC'}</>}
          </button>
        )}
      </div>

      {source.kind === 'unsupported' && browserOk !== false && (
        <p className="px-3 py-1.5 border-b border-white/5 text-[9px] font-mono text-[var(--text-muted)] leading-relaxed">
          {source.reason}
        </p>
      )}

      {recording && session && (
        <p className="px-3 py-1.5 border-b border-white/5 text-[9px] font-mono text-[var(--text-muted)] leading-relaxed">
          Recording this stream — {savedKb} KB saved so far on this device. {CAPTURE_PERSISTENCE_COPY}
        </p>
      )}

      {notice && (
        <p className="px-3 py-1.5 border-b border-white/5 text-[9px] font-mono text-[var(--gold-primary)] leading-relaxed">
          {notice}
        </p>
      )}

      {open && source.kind === 'video' && gate.loaded && !entitled && (
        <div className="border-b border-white/5 px-3 py-2.5 bg-white/[0.02]">
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-mono text-white tracking-wider flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-[var(--gold-primary)]" /> RECORDING IS A PRO FEATURE
            </p>
            <p className="text-[9px] font-mono text-[var(--text-muted)] leading-relaxed">
              Pro viewers can record live camera streams like this one and keep the clips in their
              library on this device. Capture keeps running while the tab stays open — it is not
              24/7 or cloud recording.
            </p>
            <div className="flex gap-2 mt-0.5">
              {!gate.signedIn && (
                <a
                  href="/api/auth/signin?callbackUrl=/"
                  className="px-2.5 py-1 text-[9px] font-mono font-bold tracking-widest bg-[var(--gold-primary)]/15 border border-[var(--gold-primary)]/50 text-[var(--gold-primary)] hover:bg-[var(--gold-primary)]/25 transition-colors"
                >
                  SIGN IN
                </a>
              )}
              <button
                onClick={() => setTrialOpen((v) => !v)}
                aria-expanded={trialOpen}
                className="px-2.5 py-1 text-[9px] font-mono font-bold tracking-widest bg-white/5 border border-white/15 text-white hover:bg-white/10 transition-colors"
              >
                START FREE TRIAL
              </button>
            </div>
            {trialOpen && (
              <div className="mt-1.5 rounded-md border border-white/10 bg-black/40 p-2">
                <TrialPicker variant="compact" emphasizePlan="monthly" onClose={() => setTrialOpen(false)} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
