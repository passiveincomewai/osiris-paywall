"use client";
import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import { idbGetClip } from "@/lib/recording/idb";
import { MAX_SHARE_FILE_BYTES } from "@/lib/clip-share/constants";
import { extForMime, sharePosterPathname, shareVideoPathname } from "@/lib/clip-share/paths";
import { platformShareLinks } from "@/lib/clip-share/links";

export type ShareableClip = {
  id: string;
  cameraName: string;
  startedAt: string;
  durationSec: number;
  sizeBytes: number;
  mimeType: string;
};

type Phase =
  | { kind: "checking" }
  | { kind: "unavailable" }
  | { kind: "ready" }
  | { kind: "tooLarge" }
  | { kind: "uploading"; pct: number }
  | { kind: "creating" }
  | { kind: "done"; url: string; title: string }
  | { kind: "error"; message: string };

/** Best-effort poster: grab an early frame of the local clip. */
async function capturePoster(blob: Blob, durationSec: number): Promise<Blob | null> {
  try {
    const url = URL.createObjectURL(blob);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("poster: cannot load video"));
      setTimeout(() => reject(new Error("poster: timeout")), 8000);
    });
    video.currentTime = Math.max(0.1, Math.min(2, durationSec * 0.1));
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      setTimeout(resolve, 3000);
    });
    const scale = Math.min(1, 640 / (video.videoWidth || 640));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round((video.videoWidth || 640) * scale);
    canvas.height = Math.round((video.videoHeight || 360) * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const poster = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    URL.revokeObjectURL(url);
    return poster;
  } catch {
    return null;
  }
}

const PLATFORMS: { key: keyof ReturnType<typeof platformShareLinks>; label: string }[] = [
  { key: "x", label: "X" },
  { key: "facebook", label: "Facebook" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "telegram", label: "Telegram" },
  { key: "reddit", label: "Reddit" },
  { key: "email", label: "Email" },
];

export default function ShareClipDialog({
  clip,
  onClose,
  onShared,
}: {
  clip: ShareableClip;
  onClose: () => void;
  onShared: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "checking" });
  const [title, setTitle] = useState(clip.cameraName);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const r = await fetch("/api/share/clips").catch(() => null);
      if (!live) return;
      if (!r || !r.ok) return setPhase({ kind: "error", message: "Could not check sharing availability." });
      const j = await r.json().catch(() => ({}));
      if (!j.configured) return setPhase({ kind: "unavailable" });
      if (clip.sizeBytes > MAX_SHARE_FILE_BYTES) return setPhase({ kind: "tooLarge" });
      setPhase({ kind: "ready" });
    })();
    return () => {
      live = false;
    };
  }, [clip.sizeBytes]);

  const startShare = async () => {
    const blob = await idbGetClip(clip.id);
    if (!blob) {
      setPhase({ kind: "error", message: "The video file isn't on this device, so there's nothing to upload." });
      return;
    }
    try {
      setPhase({ kind: "uploading", pct: 0 });
      const ext = extForMime(clip.mimeType);
      const videoBlob = await upload(shareVideoPathname(clip.id, ext), blob, {
        access: "public",
        handleUploadUrl: "/api/share/upload-token",
        multipart: blob.size > 4_000_000,
        contentType: blob.type || clip.mimeType.split(";")[0],
        onUploadProgress: ({ percentage }) => setPhase({ kind: "uploading", pct: Math.round(percentage) }),
      });

      let posterUrl: string | null = null;
      const poster = await capturePoster(blob, clip.durationSec);
      if (poster) {
        const p = await upload(sharePosterPathname(clip.id), poster, {
          access: "public",
          handleUploadUrl: "/api/share/upload-token",
          contentType: "image/jpeg",
        }).catch(() => null);
        posterUrl = p?.url ?? null;
      }

      setPhase({ kind: "creating" });
      const r = await fetch("/api/share/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clipId: clip.id, blobUrl: videoBlob.url, posterUrl, title: title.trim() || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 503 || j.error === "sharing_unavailable") return setPhase({ kind: "unavailable" });
      if (!r.ok || !j.share?.url) {
        return setPhase({
          kind: "error",
          message:
            j.error === "share_limit"
              ? "You've reached the limit of 50 shared clips. Revoke one to share another."
              : j.error === "clip_too_large"
                ? "That clip is over the 200 MB sharing limit."
                : "Sharing failed — please try again.",
        });
      }
      setPhase({ kind: "done", url: j.share.url, title: j.share.title });
      onShared();
    } catch {
      setPhase({ kind: "error", message: "Upload failed — check your connection and try again." });
    }
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can refuse in odd contexts; the input stays selectable.
    }
  };

  const nativeShare = async (url: string, shareTitle: string) => {
    try {
      await navigator.share({ title: shareTitle, url });
    } catch {
      // User dismissed the sheet — nothing to do.
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/10 bg-[#0a0f1c] p-5 space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase">Share clip</div>
            <div className="text-white font-bold mt-1 truncate">{clip.cameraName}</div>
            <p className="text-xs text-slate-400 mt-1">
              The video uploads to WorldEye and gets a public watch page on worldeye.app — no downloading or
              re-uploading anywhere else. Your referral code rides along, so visits from this link credit you.
            </p>
          </div>
          <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-white text-xl leading-none px-2" aria-label="Close">
            ×
          </button>
        </div>

        {phase.kind === "checking" && <div className="text-sm text-slate-400 font-mono">Checking sharing…</div>}

        {phase.kind === "unavailable" && (
          <div className="text-sm text-amber-200 bg-amber-400/10 border border-amber-400/25 rounded-xl px-4 py-3">
            In-app sharing isn't available yet — hosted video sharing is still being set up. Your clip stays on
            this device; you can still download it from the library.
          </div>
        )}

        {phase.kind === "tooLarge" && (
          <div className="text-sm text-amber-200 bg-amber-400/10 border border-amber-400/25 rounded-xl px-4 py-3">
            This clip is {(clip.sizeBytes / 1_000_000).toFixed(0)} MB — over the 200 MB limit for hosted shares.
            Shorter clips share fine.
          </div>
        )}

        {phase.kind === "ready" && (
          <>
            <label className="block">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Title on the watch page</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={140}
                className="mt-1 w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
              />
            </label>
            <button
              onClick={startShare}
              className="w-full py-3 rounded-xl bg-cyan-500/90 hover:bg-cyan-400 text-white text-sm font-bold"
            >
              Upload &amp; create share link
            </button>
            <p className="text-[11px] text-slate-500">
              Up to 200 MB per clip · 50 shared clips per account. You can revoke a share anytime — revoking
              deletes the hosted video and the link stops working.
            </p>
          </>
        )}

        {phase.kind === "uploading" && (
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
              <span>Uploading to WorldEye…</span>
              <span>{phase.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-cyan-400 transition-all" style={{ width: `${phase.pct}%` }} />
            </div>
          </div>
        )}

        {phase.kind === "creating" && <div className="text-sm text-slate-400 font-mono">Creating your watch page…</div>}

        {phase.kind === "error" && (
          <div className="text-sm text-red-200 bg-red-400/10 border border-red-400/25 rounded-xl px-4 py-3">
            {phase.message}
          </div>
        )}

        {phase.kind === "done" && (
          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Your watch link</span>
              <div className="mt-1 flex gap-2">
                <input
                  readOnly
                  value={phase.url}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm text-cyan-200 outline-none"
                />
                <button
                  onClick={() => copyLink(phase.url)}
                  className="shrink-0 px-3 py-2 rounded-lg text-xs font-mono border border-cyan-400/50 text-cyan-200 hover:bg-cyan-400/10"
                >
                  {copied ? "Copied ✓" : "Copy link"}
                </button>
              </div>
            </div>
            <div>
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Share to</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <button
                    onClick={() => nativeShare(phase.url, phase.title)}
                    className="px-3 py-2 rounded-lg text-xs font-mono bg-cyan-500/90 text-white font-bold hover:bg-cyan-400"
                  >
                    Share…
                  </button>
                )}
                {PLATFORMS.map((p) => {
                  const links = platformShareLinks(phase.url, phase.title);
                  return (
                    <a
                      key={p.key}
                      href={links[p.key]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-lg text-xs font-mono border border-white/15 text-slate-200 hover:border-cyan-400/60"
                    >
                      {p.label}
                    </a>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-3">
                Links unfurl with the video preview on social platforms, and every visit lands on worldeye.app.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
