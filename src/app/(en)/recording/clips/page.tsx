"use client";
import { useEffect, useState } from "react";
import { idbGetClip, idbDeleteClip } from "@/lib/recording/idb";
import ShareClipDialog from "@/components/recording/ShareClipDialog";
import SharedClipsSection from "@/components/recording/SharedClipsSection";

type Clip = {
  id: string;
  cameraName: string;
  startedAt: string;
  durationSec: number;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
};

function fmtBytes(b: number) {
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 ** 2).toFixed(1)} MB`;
}
function fmtDur(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Download extension from the clip's real container (Safari records MP4). */
function clipExt(mimeType: string) {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

export default function ClipsPage() {
  const [clips, setClips] = useState<Clip[] | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [shareClip, setShareClip] = useState<Clip | null>(null);
  const [sharesVersion, setSharesVersion] = useState(0);

  const load = async () => {
    const r = await fetch("/api/recording/clips");
    if (r.ok) {
      const j = await r.json();
      setClips(j.clips);
      // Check which blobs are actually on this device.
      const miss = new Set<string>();
      for (const c of j.clips as Clip[]) {
        const blob = await idbGetClip(c.id);
        if (!blob) miss.add(c.id);
      }
      setMissing(miss);
    }
  };
  useEffect(() => { load(); }, []);

  const play = async (c: Clip) => {
    const blob = await idbGetClip(c.id);
    if (!blob) return;
    if (playUrl) URL.revokeObjectURL(playUrl);
    setPlayUrl(URL.createObjectURL(blob));
    setPlaying(c.id);
  };

  const download = async (c: Clip) => {
    const blob = await idbGetClip(c.id);
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `worldeye-${c.cameraName.replace(/[^a-z0-9]+/gi, "-")}-${c.id.slice(0, 6)}.${clipExt(c.mimeType)}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const del = async (c: Clip) => {
    if (!confirm(`Delete clip "${c.cameraName}" (${fmtDur(c.durationSec)})?`)) return;
    await idbDeleteClip(c.id);
    await fetch(`/api/recording/clips/${c.id}`, { method: "DELETE" });
    if (playing === c.id) { setPlaying(null); if (playUrl) URL.revokeObjectURL(playUrl); setPlayUrl(null); }
    load();
  };

  if (!clips) return <div className="text-slate-400 font-mono text-sm">Loading clips…</div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Library</div>
        <h1 className="text-3xl font-bold text-white">Recorded clips</h1>
        <p className="text-sm text-slate-400 mt-1">{clips.length} clips · stored on this device</p>
      </div>

      <SharedClipsSection version={sharesVersion} />

      {shareClip && (
        <ShareClipDialog
          clip={shareClip}
          onClose={() => setShareClip(null)}
          onShared={() => setSharesVersion((v) => v + 1)}
        />
      )}

      {playing && playUrl && (
        <div className="rounded-2xl border border-white/10 bg-black/60 overflow-hidden">
          <video src={playUrl} controls autoPlay className="w-full max-h-[60vh] bg-black" />
          <div className="px-4 py-2 flex justify-end">
            <button onClick={() => { setPlaying(null); if (playUrl) URL.revokeObjectURL(playUrl); setPlayUrl(null); }}
              className="text-xs font-mono text-slate-400 hover:text-white">Close player</button>
          </div>
        </div>
      )}

      {clips.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center">
          <div className="text-4xl mb-3">🎬</div>
          <div className="text-white font-bold">No clips yet</div>
          <p className="text-sm text-slate-400 mt-2">Hit <span className="text-red-300 font-mono">● REC</span> on any live camera to capture your first clip.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clips.map((c) => {
            const gone = missing.has(c.id);
            return (
              <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-white font-bold truncate">{c.cameraName}</div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                      {new Date(c.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-200 text-[11px] font-mono">
                    {fmtDur(c.durationSec)}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 mt-1">{fmtBytes(c.sizeBytes)} · {c.mimeType.split(";")[0]}</div>
                {gone && (
                  <div className="mt-2 text-[11px] text-amber-300/90 bg-amber-400/10 border border-amber-400/20 rounded-lg px-2 py-1">
                    Video file isn't on this device (different browser or cleared storage). Metadata kept.
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => play(c)} disabled={gone}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-200 hover:border-cyan-400/60 disabled:opacity-40">
                    ▸ Play
                  </button>
                  <button onClick={() => download(c)} disabled={gone}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-200 hover:border-cyan-400/60 disabled:opacity-40">
                    ⤓ Download
                  </button>
                  <button onClick={() => setShareClip(c)} disabled={gone}
                    title={gone ? "The video file isn't on this device" : "Share with a public WorldEye watch link"}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-200 hover:border-cyan-400/60 disabled:opacity-40">
                    ↗ Share
                  </button>
                  <button onClick={() => del(c)}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono border border-white/15 text-slate-400 hover:border-red-400/60 hover:text-red-300">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
