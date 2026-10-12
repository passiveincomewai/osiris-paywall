"use client";
/**
 * Phase 1 recording tile: plays a saved camera and records the live stream
 * in-browser via MediaRecorder. Real capture — no simulation.
 *
 * Recordable: HLS and MP4 video streams (captureStream on the <video> element).
 * Not recordable: YouTube/external embeds (cross-origin iframes), snapshot
 * JPG feeds, offline cameras. The UI says so plainly instead of pretending.
 *
 * Clips are stored in the browser's IndexedDB (device-local); metadata goes
 * to /api/recording/clips (Pro-enforced server-side).
 */
import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { idbPutClip } from "@/lib/recording/idb";

export type SavedCam = {
  id: string;
  name: string;
  group: string;
  cameraData: any;
};

function pickMime(): string {
  const cands = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  for (const c of cands) {
    try { if (window.MediaRecorder?.isTypeSupported(c)) return c; } catch {}
  }
  return "";
}

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
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [saving, setSaving] = useState(false);
  const [muted, setMuted] = useState(true);
  const [clock, setClock] = useState("");

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

  const stopTimer = () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };

  async function startRecording() {
    if (!pro) { onNeedPro?.(); return; }
    if (recording || !videoRef.current || unsupportedReason) return;
    let stream: MediaStream;
    try {
      stream = (videoRef.current as HTMLVideoElement & { captureStream(): MediaStream }).captureStream();
    } catch {
      setError("This browser blocked stream capture");
      return;
    }
    if (!stream.getVideoTracks().length) { setError("No video track to record"); return; }
    const mime = pickMime();
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 2_500_000 } : undefined);
    } catch {
      setError("Recording not supported in this browser");
      return;
    }
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data?.size) chunksRef.current.push(e.data); };
    rec.onerror = () => { setError("Recording failed"); cleanup(); };
    recRef.current = rec;
    startRef.current = Date.now();
    setRecSecs(0);
    timerRef.current = setInterval(() => setRecSecs(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    rec.start(1000);
    setRecording(true);
  }

  function cleanup() {
    stopTimer();
    setRecording(false);
    recRef.current = null;
  }

  async function stopRecording() {
    const rec = recRef.current;
    if (!rec) return;
    setSaving(true);
    const done = new Promise<Blob>((resolve) => {
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" }));
    });
    rec.stop();
    const blob = await done;
    cleanup();
    const secs = Math.max(1, Math.round(blob.size > 0 ? (Date.now() - startRef.current) / 1000 : 0));
    if (blob.size < 1024) { setError("Recording produced no data"); setSaving(false); return; }
    const clipId = crypto.randomUUID();
    try {
      await idbPutClip(clipId, blob);
      const r = await fetch("/api/recording/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cameraName: cam.name,
          savedCameraId: cam.id,
          durationSec: secs,
          sizeBytes: blob.size,
          startedAt: new Date(startRef.current).toISOString(),
          mimeType: blob.type || "video/webm",
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "metadata save failed");
      // Re-key the blob under the server clip id so library playback lines up.
      const realId: string | undefined = j.clip?.id;
      if (realId && realId !== clipId) {
        await idbPutClip(realId, blob);
        const { idbDeleteClip } = await import("@/lib/recording/idb");
        await idbDeleteClip(clipId);
      }
      onClipSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save clip");
      // Blob is still in IndexedDB under clipId; surface it on next load.
    }
    setSaving(false);
  }

  useEffect(() => () => { stopTimer(); try { recRef.current?.state !== "inactive" && recRef.current?.stop(); } catch {} }, []);

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
              recording ? (
                <button
                  onClick={stopRecording}
                  disabled={saving}
                  className="h-8 px-3 rounded-lg bg-red-500/90 text-white text-xs font-mono font-bold hover:bg-red-500 disabled:opacity-60">
                  {saving ? "…" : `■ ${fmt(recSecs)}`}
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="h-8 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-xs font-mono font-bold hover:border-red-400/70 hover:text-red-200">
                  ● REC
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
        <div className="px-3 py-2 flex items-center justify-between border-t border-white/5">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            {unsupportedReason ? "preview only" : pro ? "Pro recording ready" : "Pro required to record"}
          </span>
          {!pro && playable && !unsupportedReason && (
            <button onClick={onNeedPro} className="text-[11px] font-mono text-cyan-300 hover:text-white underline underline-offset-2">
              Upgrade
            </button>
          )}
        </div>
      )}
    </div>
  );
}
