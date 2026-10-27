"use client";
// Video Studio personalize + export.
//
// Rendering is 100% browser-side (Vercel has no ffmpeg): the official
// video plays into a <canvas> via captureStream, the hook text is burned
// into the first 5 seconds, a personalized end card (eye logo, CTA,
// referral link, discount line when a real code exists, QR) is drawn for
// 3 seconds at the end, and MediaRecorder captures the result.
//
// Credits are charged server-side BEFORE rendering starts (POST
// /api/affiliate/studio/jobs) and refunded by settling the job as
// "failed" if anything throws — including a best-effort sendBeacon
// settle if the tab closes mid-render.
//
// HONEST LIMIT: some browsers cannot expose the source video's audio
// track to captureStream. When that happens the export is silent and
// the UI says so loudly — it never pretends otherwise.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  HOOK_SECONDS,
  END_CARD_SECONDS,
  canvasSizeFor,
  coverFit,
  displayLink,
  endCardLayout,
  extensionForMime,
  hookFontPx,
  hookMaxChars,
  pickMimeType,
  wrapText,
} from "@/lib/studio/video-render";

export interface VideoStudioProps {
  slug: string;
  title: string;
  assetUrl: string;
  posterUrl?: string;
  width: number;
  height: number;
  durationSec: number;
  defaultHook: string;
  cta: string;
  link: string;
  code: string;
  discount: { code: string; pct: number } | null;
}

interface CreditPrices {
  video_personalize?: number;
  video_template?: number;
  image_render?: number;
}

type Phase = "idle" | "charging" | "rendering" | "finishing" | "done" | "error";

const btnPrimary =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f] transition-all disabled:opacity-50";
const btnStyle = {
  background: "linear-gradient(135deg,#38bdf8,#0096FF)",
  boxShadow: "0 0 20px rgba(0,150,255,.45)",
};

type VideoWithCapture = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundedRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

export default function VideoStudioClient(props: VideoStudioProps) {
  const { slug, title, assetUrl, posterUrl, width, height, durationSec, defaultHook, cta, link, code, discount } = props;

  const [hookText, setHookText] = useState(defaultHook);
  const [balance, setBalance] = useState<number | null>(null);
  const [prices, setPrices] = useState<CreditPrices | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [silentNotice, setSilentNotice] = useState(false);
  const [producedFormat, setProducedFormat] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const qrRef = useRef<HTMLImageElement | null>(null);
  const jobRef = useRef<{ jobId: string; settled: boolean } | null>(null);
  const renderingRef = useRef(false);

  const hookWasEdited = hookText.trim() !== defaultHook.trim();
  const jobKind = hookWasEdited ? "video_template" : "video_personalize";
  const cost = prices ? prices[jobKind] : undefined;

  /* Credits balance + prices (route owned by the credits workstream). */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/affiliate/studio/credits", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (cancelled || !r.ok) return;
        if (typeof j.balance === "number") setBalance(j.balance);
        const p = j?.config?.prices;
        if (p && typeof p === "object") setPrices(p as CreditPrices);
      } catch {
        // Non-fatal: the jobs route enforces credits server-side anyway.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Preload end-card images: eye logo + the affiliate's real QR. */
  useEffect(() => {
    let cancelled = false;
    void loadImage("/worldeye-eye.png").then((img) => {
      if (!cancelled) logoRef.current = img;
    });
    (async () => {
      try {
        const r = await fetch(`/api/affiliate/qr?code=${encodeURIComponent(code)}`, {
          cache: "no-store",
        });
        const j = await r.json().catch(() => ({}));
        if (cancelled || typeof j.qr !== "string") return;
        const img = await loadImage(j.qr);
        if (!cancelled) qrRef.current = img;
      } catch {
        // QR is best-effort here; the end card still carries the link text.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const settle = useCallback(async (jobId: string, outcome: "done" | "failed", err?: string) => {
    if (jobRef.current?.jobId === jobId) jobRef.current.settled = true;
    try {
      await fetch(`/api/affiliate/studio/jobs/${encodeURIComponent(jobId)}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(err ? { outcome, error: err } : { outcome }),
      });
    } catch {
      // Settle is best-effort from the client; the server also expires
      // unsettled jobs. A failed "done" settle never blocks the download.
    }
  }, []);

  /* If the tab closes mid-render, beacon a failed settle so the server
     refunds the charge. Only fires for a job that was never settled. */
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      const job = jobRef.current;
      if (renderingRef.current && job && !job.settled) {
        e.preventDefault();
        try {
          navigator.sendBeacon(
            `/api/affiliate/studio/jobs/${encodeURIComponent(job.jobId)}/settle`,
            new Blob([JSON.stringify({ outcome: "failed", error: "Export interrupted — tab closed or navigated away." })], {
              type: "application/json",
            }),
          );
          job.settled = true;
        } catch {
          // Nothing more we can do on unload.
        }
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const drawHook = useCallback(
    (g: CanvasRenderingContext2D, W: number, H: number, text: string) => {
      const fontPx = hookFontPx(W);
      const lines = wrapText(text, hookMaxChars(W));
      if (lines.length === 0) return;
      g.font = `800 ${fontPx}px Inter, system-ui, sans-serif`;
      const lineH = fontPx * 1.28;
      const padX = fontPx * 0.62;
      const padY = fontPx * 0.42;
      const textW = Math.max(...lines.map((l) => g.measureText(l).width));
      const pillW = Math.min(W * 0.88, textW + padX * 2);
      const pillH = lines.length * lineH + padY * 2;
      const x = (W - pillW) / 2; // centered inside the 6%..94% safe margins
      const y = H * 0.07; // top third
      g.fillStyle = "rgba(3,7,18,0.55)";
      roundedRect(g, x, y, pillW, pillH, fontPx * 0.45);
      g.fill();
      g.fillStyle = "#ffffff";
      g.textAlign = "center";
      g.textBaseline = "middle";
      lines.forEach((line, i) => {
        g.fillText(line, W / 2, y + padY + lineH * (i + 0.5), pillW - padX);
      });
    },
    [],
  );

  const drawEndCard = useCallback(
    (g: CanvasRenderingContext2D, W: number, H: number) => {
      const L = endCardLayout(W, H);
      g.fillStyle = L.bg;
      g.fillRect(0, 0, W, H);
      g.textAlign = "center";
      g.textBaseline = "middle";

      const logo = logoRef.current;
      if (logo) g.drawImage(logo, L.logo.x, L.logo.y, L.logo.size, L.logo.size);

      g.fillStyle = "#ffffff";
      g.font = `800 ${L.headline.fontPx}px Inter, system-ui, sans-serif`;
      g.fillText(cta, W / 2, L.headline.y, W * 0.88);

      g.fillStyle = "#94a3b8";
      g.font = `600 ${L.link.fontPx}px 'JetBrains Mono', monospace`;
      g.fillText(displayLink(link), W / 2, L.link.y, W * 0.88);

      if (discount) {
        g.fillStyle = "#38bdf8";
        g.font = `700 ${L.discount.fontPx}px Inter, system-ui, sans-serif`;
        g.fillText(`Get ${discount.pct}% off — code ${discount.code}`, W / 2, L.discount.y, W * 0.88);
      }

      const qr = qrRef.current;
      if (qr) {
        g.fillStyle = "#ffffff";
        g.fillRect(L.qr.x - L.qr.pad, L.qr.y - L.qr.pad, L.qr.size + L.qr.pad * 2, L.qr.size + L.qr.pad * 2);
        g.drawImage(qr, L.qr.x, L.qr.y, L.qr.size, L.qr.size);
      }
    },
    [cta, link, discount],
  );

  const exportVideo = useCallback(async () => {
    const video = videoRef.current as VideoWithCapture | null;
    const canvas = canvasRef.current;
    if (!video || !canvas || renderingRef.current) return;
    if (typeof MediaRecorder === "undefined") {
      setError("This browser doesn't support MediaRecorder, so it can't render video exports. Try a recent Chrome, Edge, Firefox or Safari.");
      setPhase("error");
      return;
    }

    setError("");
    setSilentNotice(false);
    setProducedFormat(null);
    setProgress(0);
    setPhase("charging");

    let jobId: string | null = null;
    try {
      /* (1) Charge credits first — the server is the price authority. */
      const r = await fetch("/api/affiliate/studio/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: jobKind, slug, hookText: hookText.trim() }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 402) {
        const need = typeof j.cost === "number" ? j.cost : cost;
        const have = typeof j.balance === "number" ? j.balance : balance;
        setError(
          `Not enough credits — need ${need ?? "?"}, you have ${have ?? "?"}.`,
        );
        if (typeof j.balance === "number") setBalance(j.balance);
        setPhase("error");
        return;
      }
      if (!r.ok || typeof j.jobId !== "string") {
        throw new Error(typeof j.error === "string" ? j.error : "Couldn't start the export job.");
      }
      const activeJobId: string = j.jobId;
      jobId = activeJobId;
      jobRef.current = { jobId: activeJobId, settled: false };
      if (typeof j.balance === "number") setBalance(j.balance);

      /* (2) Render: play the source into a canvas stream + recorder. */
      setPhase("rendering");
      renderingRef.current = true;

      const { width: cw, height: ch } = canvasSizeFor(width, height);
      canvas.width = cw;
      canvas.height = ch;
      const g = canvas.getContext("2d");
      if (!g) throw new Error("Canvas 2D isn't available in this browser.");

      video.pause();
      video.currentTime = 0;
      await video.play();

      const canvasStream = canvas.captureStream(30);
      const stream = new MediaStream(canvasStream.getVideoTracks());
      let hasAudio = false;
      try {
        const src = video.captureStream?.() ?? video.mozCaptureStream?.();
        const audioTracks = src?.getAudioTracks() ?? [];
        for (const t of audioTracks) stream.addTrack(t);
        hasAudio = audioTracks.length > 0;
      } catch {
        hasAudio = false;
      }
      if (!hasAudio) {
        // Honest notice: never ship a silent export without saying so.
        setSilentNotice(true);
      }

      const mime = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : { videoBitsPerSecond: 8_000_000 },
      );
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });
      recorder.start(250);

      const hook = hookText.trim();
      await new Promise<void>((resolve, reject) => {
        const tick = () => {
          if (video.ended) return resolve();
          if (video.error) return reject(new Error("The source video failed to play."));
          const fit = coverFit(video.videoWidth || width, video.videoHeight || height, cw, ch);
          g.drawImage(video, fit.dx, fit.dy, fit.dw, fit.dh);
          if (video.currentTime < HOOK_SECONDS && hook) drawHook(g, cw, ch, hook);
          setProgress(durationSec > 0 ? Math.min(1, video.currentTime / durationSec) : 0);
          requestAnimationFrame(tick);
        };
        tick();
      });

      /* End card: hold for END_CARD_SECONDS while the recorder runs. */
      const cardStart = performance.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          drawEndCard(g, cw, ch);
          if (performance.now() - cardStart >= END_CARD_SECONDS * 1000) return resolve();
          requestAnimationFrame(tick);
        };
        tick();
      });

      recorder.stop();
      await stopped;
      renderingRef.current = false;
      video.pause();

      const outMime = recorder.mimeType || mime || "video/webm";
      const ext = extensionForMime(outMime);
      const blob = new Blob(chunks, { type: outMime });
      if (blob.size === 0) throw new Error("The recorder produced an empty file.");

      /* (3) Settle the job as done. */
      setPhase("finishing");
      await settle(activeJobId, "done");

      /* (4) Save the creation (params only — same rule as images). */
      try {
        await fetch("/api/affiliate/studio/creations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateSlug: slug,
            title,
            values: { hook: hookText.trim() },
            jobId: activeJobId,
          }),
        });
      } catch {
        // The export itself succeeded; a failed save shouldn't eat it.
      }

      /* (5) Download. */
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `worldeye-${slug}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);

      setProducedFormat(ext);
      setPhase("done");
    } catch (err) {
      renderingRef.current = false;
      try {
        video.pause();
      } catch {
        // ignore
      }
      const message = err instanceof Error ? err.message : "The export failed.";
      if (jobId) await settle(jobId, "failed", message);
      setError(`${message} Your credits were refunded.`);
      setPhase("error");
    }
  }, [balance, cost, drawEndCard, drawHook, durationSec, height, hookText, jobKind, settle, slug, title, width]);

  const busy = phase === "charging" || phase === "rendering" || phase === "finishing";

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">
          Marketing Studio · Video
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
        <p className="text-sm text-slate-400 mt-1">
          Personalize this official WorldEye video in your browser: your hook text over the first{" "}
          {HOOK_SECONDS} seconds, then an end card with your call to action, referral link
          {discount ? ", discount code" : ""} and QR. Rendering happens on this device — it takes
          about as long as the video itself.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-3">
          <video
            ref={videoRef}
            src={assetUrl}
            poster={posterUrl}
            controls
            preload="metadata"
            playsInline
            className="w-full rounded-2xl border border-white/10 bg-black"
          />
          <canvas ref={canvasRef} className="hidden" aria-hidden />
          <div className="text-[11px] font-mono text-slate-500">
            {width}×{height}
            {durationSec > 0 ? ` · ${Math.round(durationSec)}s` : ""} · Source: official WorldEye
            footage
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <label className="block">
            <span className="text-xs font-mono tracking-widest text-slate-400 uppercase">
              Hook overlay text (first {HOOK_SECONDS}s)
            </span>
            <input
              value={hookText}
              onChange={(e) => setHookText(e.target.value.slice(0, 90))}
              maxLength={90}
              disabled={busy}
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/60 disabled:opacity-50"
            />
            <span className="mt-1 block text-[11px] font-mono text-slate-500">
              {hookText.length}/90 · Editing the hook uses the template price; the stock hook uses
              the personalize price.
            </span>
          </label>

          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-300 space-y-1">
            <div>
              <span className="text-slate-500">End card:</span> {cta}
            </div>
            <div className="font-mono text-xs break-all">
              <span className="text-slate-500">Link:</span> {displayLink(link)}
            </div>
            {discount ? (
              <div>
                <span className="text-slate-500">Discount:</span> Get {discount.pct}% off — code{" "}
                <span className="font-mono">{discount.code}</span>
              </div>
            ) : (
              <div className="text-slate-500">
                No discount code on your profile — the end card shows your link and QR only.
              </div>
            )}
          </div>

          <div className="text-sm text-slate-300">
            {cost !== undefined ? (
              <>
                Export cost: <span className="font-mono font-bold text-white">{cost} credits</span>
                {balance !== null && (
                  <>
                    {" "}· Your balance: <span className="font-mono">{balance}</span>
                  </>
                )}
              </>
            ) : (
              <>Credit pricing is loading — the server confirms the exact cost before rendering.</>
            )}
          </div>

          <button onClick={() => void exportVideo()} disabled={busy} className={btnPrimary} style={btnStyle}>
            {phase === "charging"
              ? "Reserving credits…"
              : phase === "rendering"
                ? `Rendering… ${Math.round(progress * 100)}%`
                : phase === "finishing"
                  ? "Finishing…"
                  : "Personalize & export"}
          </button>

          {phase === "rendering" && (
            <p className="text-xs text-slate-500">
              Keep this tab open and in front — the video has to actually play through to be
              recorded.
            </p>
          )}

          {silentNotice && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200" role="alert">
              This browser couldn&apos;t capture the audio track — the export will be silent.
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">
              {error}
            </div>
          )}

          {phase === "done" && producedFormat && (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200" role="status">
              Export complete — check your downloads. Exported as {producedFormat.toUpperCase()} —
              your browser&apos;s recording format.
              {silentNotice ? " Note: this export has no audio (see above)." : ""} Saved to My
              Creations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
