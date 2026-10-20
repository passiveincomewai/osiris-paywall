"use client";
/**
 * One tile of the multi-camera recorder (Pro). A tile is a small,
 * self-contained recording session: it previews its camera, records it,
 * saves the clip, and reports its session state upward — a failure in
 * this tile is contained here and never stops the others.
 *
 * Two capture mechanisms, both the studio's proven single-camera ones:
 *  - stream cameras: the Live wall's way — a <video> element (HLS via
 *    hls.js or a direct file) whose captureStream() feeds a
 *    MediaRecorder (see RecordableTile);
 *  - snapshot cameras: the timelapse way — stills fetched one at a time
 *    (the /api/cctv/frame route, or the feed itself), deduped with the
 *    timelapse ledger, drawn onto a canvas whose captureStream() a
 *    MediaRecorder records in real time (see TimelapseControl).
 *
 * Recording happens in this browser and the clip lands in the shared
 * IndexedDB store + clip metadata, exactly like a Live-wall clip.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import type { SavedCam } from "./RecordableTile";
import {
  assembleClipMeta,
  camLocationLabel,
  classifyMultiCam,
  multiCamKindLabel,
  staggerDelayMs,
  MULTI_STILL_POLL_MS,
  type TileEvent,
  type TileSession,
} from "@/lib/recording/multi";
import { pickRecorderMime, saveRecordedClip } from "@/lib/recording/save-clip";
import {
  frameDecision,
  frameSignature,
  ledgerAfterKeep,
  type CaptureLedger,
} from "@/lib/timelapse";

export interface TileControls {
  start: () => void;
  stop: () => void;
}

type CanvasCapture = HTMLCanvasElement & { captureStream(fps: number): MediaStream };
type VideoCapture = HTMLVideoElement & { captureStream(): MediaStream };

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function MultiRecordTile({
  cam,
  index,
  pro,
  session,
  onEvent,
  registerControls,
  pollMs = MULTI_STILL_POLL_MS,
}: {
  cam: SavedCam;
  index: number;
  pro: boolean;
  session: TileSession;
  onEvent: (id: string, event: TileEvent) => void;
  registerControls: (id: string, controls: TileControls | null) => void;
  /** Snapshot poll cadence for this wall (lib/recording/multi's budget math). */
  pollMs?: number;
}) {
  const source = classifyMultiCam(cam.cameraData);
  const location = camLocationLabel(cam);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  // The stills loop reads the cadence through a ref so a wall growing
  // past a tier wave slows the poll without restarting the loop.
  const pollMsRef = useRef(pollMs);
  pollMsRef.current = pollMs;

  // Snapshot-capture state.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasTrackRef = useRef<(MediaStreamTrack & { requestFrame?: () => void }) | null>(null);
  const ledgerRef = useRef<CaptureLedger>({ count: 0, lastFrameAt: null, lastSignature: null });
  const lastBlobRef = useRef<Blob | null>(null);
  const staleRef = useRef(0);

  const [loading, setLoading] = useState(source.kind === "video");
  const [feedError, setFeedError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [clock, setClock] = useState("");

  const fail = useCallback(
    (reason: string) => onEvent(cam.id, { type: "fail", reason }),
    [cam.id, onEvent],
  );

  /* ---------------- clocks ---------------- */
  useEffect(() => {
    const iv = setInterval(() => setClock(new Date().toISOString().slice(11, 19) + "Z"), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (session.phase !== "recording" || session.startedAt === null) { setElapsed(0); return; }
    const startedAt = session.startedAt;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500);
    setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    return () => clearInterval(iv);
  }, [session.phase, session.startedAt]);

  /* ---------------- stream preview (video kind) ---------------- */
  useEffect(() => {
    if (source.kind !== "video") return;
    const v = videoRef.current;
    if (!v) { setLoading(false); return; }
    setLoading(true);
    setFeedError(null);
    const url = source.streamUrl;
    if (/\.m3u8($|\?)/.test(url)) {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false, maxBufferLength: 20 });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { setLoading(false); v.play().catch(() => {}); });
        hls.on(Hls.Events.ERROR, (_e, d) => {
          if (d.fatal) {
            setFeedError("Stream failed to load");
            setLoading(false);
            if (sessionRef.current.phase === "recording") fail("Stream failed to load");
          }
        });
      } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = url;
        v.addEventListener("loadedmetadata", () => { setLoading(false); v.play().catch(() => {}); }, { once: true });
      } else { setFeedError("HLS not supported here"); setLoading(false); }
    } else {
      v.src = url;
      v.addEventListener("loadedmetadata", () => { setLoading(false); v.play().catch(() => {}); }, { once: true });
      v.addEventListener("error", () => {
        setFeedError("Stream failed to load");
        setLoading(false);
        if (sessionRef.current.phase === "recording") fail("Stream failed to load");
      }, { once: true });
    }
    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam.id]);

  /* ---------------- snapshot preview + frame feed (stills kind) ---------------- */
  const drawFrame = useCallback(async (blob: Blob) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bmp = await createImageBitmap(blob).catch(() => null);
    if (!bmp) return;
    if (canvas.width !== bmp.width || canvas.height !== bmp.height) {
      canvas.width = bmp.width;
      canvas.height = bmp.height;
    }
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bmp, 0, 0);
      canvasTrackRef.current?.requestFrame?.();
    }
    bmp.close();
  }, []);

  useEffect(() => {
    if (source.kind !== "stills") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let objectUrl: string | null = null;

    const fetchFrame = async (): Promise<{ blob: Blob; frameAt: string | null }> => {
      if (source.frameId) {
        const res = await fetch(`/api/cctv/frame?id=${encodeURIComponent(source.frameId)}`);
        if (res.ok) return { blob: await res.blob(), frameAt: res.headers.get("X-Frame-At") };
        if (!source.stillUrl) throw new Error("frame route refused");
      }
      if (source.stillUrl) {
        const res = await fetch(source.stillUrl);
        if (!res.ok) throw new Error("still fetch failed");
        return { blob: await res.blob(), frameAt: null };
      }
      throw new Error("no frame source");
    };

    const tick = async () => {
      try {
        const { blob, frameAt } = await fetchFrame();
        if (cancelled) return;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const incoming = { frameAt, signature: frameSignature(bytes) };
        const decision = frameDecision(ledgerRef.current, incoming);
        if (decision === "keep") {
          ledgerRef.current = ledgerAfterKeep(ledgerRef.current, incoming);
          lastBlobRef.current = blob;
          staleRef.current = 0;
          setStalled(false);
          setFeedError(null);
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = URL.createObjectURL(blob);
          setPreviewUrl(objectUrl);
          if (sessionRef.current.phase === "recording") void drawFrame(blob);
        } else if (sessionRef.current.phase === "recording") {
          staleRef.current += 1;
          if (staleRef.current >= 2) setStalled(true);
        }
      } catch {
        if (!cancelled) setFeedError("Can't reach this camera right now");
      }
      if (!cancelled) timer = setTimeout(tick, pollMsRef.current);
    };
    timer = setTimeout(tick, staggerDelayMs(index));
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam.id]);

  /* ---------------- recording ---------------- */
  const startRecording = useCallback(async () => {
    if (!pro) return;
    const phase = sessionRef.current.phase;
    if (phase === "recording" || phase === "saving") return;

    let stream: MediaStream;
    if (source.kind === "video") {
      const v = videoRef.current;
      if (!v) { fail("No video to record yet"); return; }
      // Give a just-attached stream a brief chance to become playable.
      if (v.readyState < 2) {
        await new Promise((r) => setTimeout(r, 1500));
        if (v.readyState < 2) { fail("Stream is still loading — try again in a moment"); return; }
      }
      try {
        stream = (v as VideoCapture).captureStream();
      } catch {
        fail("This browser blocked stream capture");
        return;
      }
      if (!stream.getVideoTracks().length) { fail("No video track to record"); return; }
    } else if (source.kind === "stills") {
      if (!lastBlobRef.current) {
        fail("No frame from this camera yet — can't start recording");
        return;
      }
      const canvas = document.createElement("canvas") as CanvasCapture;
      canvasRef.current = canvas;
      try {
        stream = canvas.captureStream(0);
      } catch {
        fail("This browser blocked canvas capture");
        return;
      }
      canvasTrackRef.current = stream.getVideoTracks()[0] ?? null;
      // Paint the current frame as the clip's first picture.
      void drawFrame(lastBlobRef.current);
    } else {
      return;
    }

    const mime = pickRecorderMime();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 2_500_000 } : undefined);
    } catch {
      fail("Recording not supported in this browser");
      return;
    }
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
    rec.onerror = () => fail("Recording failed");
    recRef.current = rec;
    startedAtRef.current = Date.now();
    rec.start(1000);
    onEvent(cam.id, { type: "start", at: startedAtRef.current });
  }, [cam.id, pro, source.kind, drawFrame, fail, onEvent]);

  const stopRecording = useCallback(async () => {
    const rec = recRef.current;
    if (!rec || sessionRef.current.phase !== "recording") return;
    onEvent(cam.id, { type: "stop" });
    const done = new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" }));
    });
    try { rec.stop(); } catch { /* already stopped */ }
    const blob = await done;
    recRef.current = null;
    canvasTrackRef.current = null;
    const startedAt = startedAtRef.current;
    if (blob.size < 1024) { fail("Recording produced no data"); return; }
    try {
      const meta = assembleClipMeta(cam, startedAt, Date.now(), blob.size, blob.type || "video/webm");
      await saveRecordedClip(blob, meta);
      onEvent(cam.id, { type: "saved", secs: meta.durationSec });
    } catch (e) {
      fail(e instanceof Error ? e.message : "Failed to save clip");
    }
  }, [cam, fail, onEvent]);

  /* Register Record-all / Stop-all controls with the parent. */
  useEffect(() => {
    registerControls(cam.id, {
      start: () => void startRecording(),
      stop: () => void stopRecording(),
    });
    return () => registerControls(cam.id, null);
  }, [cam.id, registerControls, startRecording, stopRecording]);

  /* Unmount: never leave a recorder running. */
  useEffect(
    () => () => {
      try {
        if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
      } catch {}
    },
    [],
  );

  const recording = session.phase === "recording";
  const saving = session.phase === "saving";
  const badge = session.phase === "error"
    ? { text: "ERROR", cls: "bg-red-500/80 text-white" }
    : feedError
      ? { text: "UNREACHABLE", cls: "bg-black/60 border border-white/15 text-red-300" }
      : { text: "LIVE", cls: "bg-black/60 border border-white/15 text-white" };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60">
      <div className="relative aspect-video bg-black">
        {source.kind === "video" && (
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
        )}
        {source.kind === "stills" &&
          (previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={cam.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
              <div className="text-2xl">📡</div>
              <div className="text-xs text-slate-400">
                {feedError ?? "Waiting for the first frame…"}
              </div>
            </div>
          ))}
        {source.kind === "unsupported" && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
            <div className="text-2xl">📡</div>
            <div className="text-xs text-slate-400 max-w-[240px]">{source.reason}</div>
          </div>
        )}
        {loading && source.kind === "video" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400/30 border-t-cyan-300 animate-spin" />
          </div>
        )}

        <div className="absolute top-2 left-2 flex items-center gap-2">
          <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono ${badge.cls}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${session.phase === "error" || feedError ? "bg-red-400" : "bg-emerald-400 animate-pulse"}`} />
            {badge.text}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-black/60 border border-white/15 text-[10px] font-mono text-slate-300">
            {multiCamKindLabel(source)}
          </span>
          {recording && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/80 text-[10px] font-mono font-bold text-white animate-pulse">
              ● REC {fmt(elapsed)}
            </span>
          )}
          {saving && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/70 text-[10px] font-mono font-bold text-white">
              SAVING…
            </span>
          )}
        </div>
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 border border-white/15 text-[10px] font-mono text-slate-300">
          {clock}
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-bold text-white truncate drop-shadow">{cam.name}</div>
            {location && <div className="text-[10px] font-mono text-slate-300/80 truncate">{location}</div>}
          </div>
          {source.kind !== "unsupported" && (
            <div className="shrink-0">
              {recording ? (
                <button
                  onClick={() => void stopRecording()}
                  className="h-8 px-3 rounded-lg bg-red-500/90 text-white text-xs font-mono font-bold hover:bg-red-500">
                  ■ {fmt(elapsed)}
                </button>
              ) : session.phase === "error" ? (
                <button
                  onClick={() => void startRecording()}
                  className="h-8 px-3 rounded-lg bg-white/10 border border-red-400/50 text-red-200 text-xs font-mono font-bold hover:border-red-300">
                  ↻ Retry
                </button>
              ) : (
                <button
                  onClick={() => void startRecording()}
                  disabled={saving}
                  className="h-8 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-mono font-bold hover:border-red-400/70 hover:text-red-200 disabled:opacity-50">
                  ● REC
                </button>
              )}
            </div>
          )}
        </div>

        {stalled && recording && (
          <div className="absolute bottom-12 left-2 right-2 text-[11px] font-mono text-amber-200 bg-amber-950/70 border border-amber-500/30 rounded-lg px-2 py-1">
            Feed stalled — recording is holding the last frame.
          </div>
        )}
        {session.phase === "error" && session.error && (
          <div className="absolute bottom-12 left-2 right-2 flex items-start justify-between gap-2 text-[11px] font-mono text-red-300 bg-red-950/70 border border-red-500/30 rounded-lg px-2 py-1">
            <span>{session.error}</span>
            <button
              onClick={() => onEvent(cam.id, { type: "reset" })}
              className="shrink-0 text-red-200 underline underline-offset-2">
              dismiss
            </button>
          </div>
        )}
        {session.phase === "preview" && session.lastClipSecs !== null && (
          <div className="absolute bottom-12 left-2 text-[11px] font-mono text-emerald-200 bg-emerald-950/70 border border-emerald-500/30 rounded-lg px-2 py-1">
            ✓ Clip saved ({fmt(session.lastClipSecs)}) — find it in Clips
          </div>
        )}
      </div>
    </div>
  );
}
