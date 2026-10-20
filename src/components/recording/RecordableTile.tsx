"use client";
/**
 * Phase 1 recording tile: plays a saved camera and records the live stream
 * in-browser. Real capture — no simulation.
 *
 * Recordable: HLS and MP4 video streams. Not recordable: YouTube/external
 * embeds (cross-origin iframes), snapshot JPG feeds, offline cameras.
 * The UI says so plainly instead of pretending.
 *
 * The recording itself is owned by the persistent capture-session layer
 * (lib/recording/sessions), not by this tile: it keeps running when the
 * viewer closes or the user browses elsewhere on WorldEye, saves its
 * segments to this device as it goes, and stops on its own at 24 hours.
 * Finished clips land in the browser's IndexedDB clip library with
 * metadata in /api/recording/clips (Pro-enforced server-side) — exactly
 * where studio recordings have always landed.
 */
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  CAPTURE_PERSISTENCE_COPY,
  captureSessions,
  useClipSessionFor,
} from "@/lib/recording/sessions";

export type SavedCam = {
  id: string;
  name: string;
  group: string;
  cameraData: any;
};

export default function RecordableTile({
  cam, pro, onClipSaved, onNeedPro, compact,
}: {
  cam: SavedCam;
  pro: boolean;
  onClipSaved?: () => void;
  onNeedPro?: () => void;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [muted, setMuted] = useState(true);
  const [clock, setClock] = useState("");
  const [recSecs, setRecSecs] = useState(0);

  // The recording session for this camera, owned by the session layer —
  // it survives this tile unmounting.
  const clipSession = useClipSessionFor(cam.id);
  const recording = clipSession?.phase === "recording" || clipSession?.phase === "starting";
  const saving = clipSession?.phase === "saving";
  const sessionStartedAt = clipSession?.startedAt ?? null;

  const data = cam.cameraData ?? {};
  const streamType: string = data.stream_type || (data.stream_url?.includes(".m3u8") ? "hls" : "video");
  const streamUrl: string | undefined = data.stream_url;
  const isYouTube = /youtube\.com|youtu\.be/.test(data.external_url ?? "") || /youtube\.com|youtu\.be/.test(streamUrl ?? "");
  const playable = !!(streamUrl && !isYouTube && (streamType === "hls" || streamType === "video" || streamType === "mp4" || /\.m3u8($|\?)/.test(streamUrl)));
  const unsupportedReason = !streamUrl
    ? "No playable stream"
    : isYouTube
      ? "YouTube embeds can't be recorded (platform restriction)"
      : !playable
        ? "Snapshot/image feeds can't be recorded in Phase 1"
        : null;

  useEffect(() => {
    const iv = setInterval(() => {
      setClock(new Date().toISOString().slice(11, 19) + "Z");
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  /* Recording clock, from the session's own start time. */
  useEffect(() => {
    if (sessionStartedAt === null) { setRecSecs(0); return; }
    const tick = () => setRecSecs(Math.max(0, Math.floor((Date.now() - sessionStartedAt) / 1000)));
    tick();
    const iv = setInterval(tick, 500);
    return () => clearInterval(iv);
  }, [sessionStartedAt]);

  useEffect(() => {
    if (!playable || !videoRef.current) { setLoading(false); return; }
    setLoading(true); setError(null);
    const v = videoRef.current;
    if (/\.m3u8($|\?)/.test(streamUrl!) || streamType === "hls") {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false, maxBufferLength: 20 });
        hlsRef.current = hls;
        hls.loadSource(streamUrl!);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => { setLoading(false); v.play().catch(() => {}); });
        hls.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) { setError("Stream failed to load"); setLoading(false); } });
      } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = streamUrl!;
        v.addEventListener("loadedmetadata", () => { setLoading(false); v.play().catch(() => {}); }, { once: true });
      } else { setError("HLS not supported here"); setLoading(false); }
    } else {
      v.src = streamUrl!;
      v.addEventListener("loadedmetadata", () => { setLoading(false); v.play().catch(() => {}); }, { once: true });
      v.addEventListener("error", () => { setError("Stream failed to load"); setLoading(false); }, { once: true });
    }
    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam.id]);

  async function startRecording() {
    if (!pro) { onNeedPro?.(); return; }
    if (clipSession || starting || unsupportedReason || !streamUrl) return;
    setStarting(true);
    setError(null);
    try {
      await captureSessions.startClip({
        savedCameraId: cam.id,
        cameraName: cam.name,
        source: { kind: "video", streamUrl },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recording could not start");
    } finally {
      setStarting(false);
    }
  }

  async function stopRecording() {
    if (!clipSession) return;
    await captureSessions.stopSession(clipSession.id);
    onClipSaved?.();
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 group">
      <div className="relative aspect-video bg-black">
        {playable ? (
          <video ref={videoRef} className="w-full h-full object-cover" muted={muted} playsInline autoPlay />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
            <div className="text-2xl">📡</div>
            <div className="text-xs text-slate-400 max-w-[220px]">{unsupportedReason ?? "Loading…"}</div>
          </div>
        )}
        {loading && playable && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400/30 border-t-cyan-300 animate-spin" />
          </div>
        )}
        {/* overlays */}
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 border border-white/15 text-[10px] font-mono text-white">
            <span className={`w-1.5 h-1.5 rounded-full ${error ? "bg-red-400" : "bg-emerald-400 animate-pulse"}`} />
            {error ? "OFFLINE" : "LIVE"}
          </span>
          {recording && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/80 text-[10px] font-mono font-bold text-white animate-pulse">
              ● REC {fmt(recSecs)}
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
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-white truncate drop-shadow">{cam.name}</div>
          <div className="flex items-center gap-1.5 shrink-0">
            {playable && (
              <button
                onClick={() => { if (videoRef.current) { videoRef.current.muted = !muted; setMuted(!muted); } }}
                className="w-8 h-8 rounded-lg bg-black/60 border border-white/15 text-white text-sm hover:border-cyan-400/60"
                aria-label={muted ? "Unmute" : "Mute"}>
                {muted ? "🔇" : "🔊"}
              </button>
            )}
            {playable && !unsupportedReason && (
              recording || saving ? (
                <button
                  onClick={stopRecording}
                  disabled={saving}
                  className="h-8 px-3 rounded-lg bg-red-500/90 text-white text-xs font-mono font-bold hover:bg-red-500 disabled:opacity-60">
                  {saving ? "…" : `■ ${fmt(recSecs)}`}
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  disabled={starting}
                  className="h-8 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-mono font-bold hover:border-red-400/70 hover:text-red-200 disabled:opacity-60">
                  {starting ? "…" : "● REC"}
                </button>
              )
            )}
          </div>
        </div>
        {error && (
          <div className="absolute bottom-12 left-2 right-2 text-[11px] font-mono text-red-300 bg-red-950/70 border border-red-500/30 rounded-lg px-2 py-1">
            {error}
          </div>
        )}
      </div>
      {!compact && (
        <div className="px-3 py-2 flex items-center justify-between gap-3 border-t border-white/5">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            {unsupportedReason
              ? "preview only"
              : recording
                ? CAPTURE_PERSISTENCE_COPY
                : pro ? "Pro recording ready" : "Pro required to record"}
          </span>
          {!pro && playable && !unsupportedReason && (
            <button onClick={onNeedPro} className="shrink-0 text-[11px] font-mono text-cyan-300 hover:text-white underline underline-offset-2">
              Upgrade
            </button>
          )}
        </div>
      )}
    </div>
  );
}
