"use client";

// AI Video Repurposing Machine — client.
//
// Flow: create a project (upload / approved library video / your own
// creation / direct URL) → analyze in the browser (metadata, scene
// cuts, audio energy — only what is actually measured is reported) →
// generate 3–10 creative variations server-side from that analysis →
// render any variation in the browser (canvas + MediaRecorder, the
// Studio's proven zero-marginal-cost pipeline) for a per-render credit
// charge with the standard settle/refund contract.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ASPECTS,
  DIRECTIONS,
  HOOK_CATEGORIES,
  captionPreset,
  canvasSizeForAspect,
  compositionDuration,
  filterCss,
  generateHooks,
  VERIFIED_FACTS,
  type Aspect,
  type RepurposeComposition,
  type SourceAnalysis,
} from "@/lib/studio/repurpose";
import { coverFit, displayLink, endCardLayout, pickMimeType, wrapText } from "@/lib/studio/video-render";

/* ---------------- types mirroring the API serializers ---------------- */

interface ProjectLite {
  id: string;
  title: string;
  sourceKind: string;
  sourceRef: string | null;
  sourceName: string | null;
  ownershipConfirmed: boolean;
  status: string;
  folder: string;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  analysisSummary: string | null;
  analysisMeasured: { metadata: boolean; scenes: boolean; audio: boolean } | null;
  trackingLinkId: string | null;
  variationCount: number;
  createdAt: string;
  updatedAt: string;
}

interface VariationLite {
  id: string;
  creativeId: string;
  direction: string;
  title: string;
  aspect: string;
  composition: RepurposeComposition;
  hookText: string | null;
  captionText: string | null;
  status: string;
  favorite: boolean;
  renderJobId: string | null;
  createdAt: string;
}

interface LibraryItem { slug: string; title: string; assetUrl: string | null; previewUrl: string | null }

/* ---------------- small helpers ---------------- */

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const j = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error((j as { error?: string }).error || `Request failed (${r.status})`);
  return j;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function fmtSec(s: number): string {
  if (!isFinite(s) || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/* ---------------- browser-side analysis ----------------
 * Measures only what the browser can actually measure: container
 * metadata, scene cuts from frame differences, and audio energy from
 * the decoded audio track. Anything that fails (CORS, no audio track)
 * is reported as not measured — the variation builders adapt. */

async function analyzeSource(url: string, file?: File, hasTranscript = false): Promise<SourceAnalysis> {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  video.src = url;

  const meta = await new Promise<{ duration: number; w: number; h: number }>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error("The video took too long to load.")), 30000);
    video.onloadedmetadata = () => {
      clearTimeout(to);
      resolve({ duration: video.duration, w: video.videoWidth, h: video.videoHeight });
    };
    video.onerror = () => {
      clearTimeout(to);
      reject(new Error("That video couldn't be loaded in the browser."));
    };
  });

  const duration = meta.duration;
  const measured = { metadata: true, scenes: false, audio: false, transcript: hasTranscript };
  const sceneCuts: number[] = [];

  // Scene cuts: sample frames, compare luma signatures.
  try {
    const cw = 96;
    const ch = Math.max(2, Math.round((cw * meta.h) / Math.max(1, meta.w)));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const g = canvas.getContext("2d", { willReadFrequently: true });
    if (!g) throw new Error("no 2d context");
    const step = Math.max(0.5, duration / 240);
    let prev: Float32Array | null = null;
    for (let t = 0.25; t < duration; t += step) {
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        video.addEventListener("seeked", done, { once: true });
        setTimeout(done, 1500);
        video.currentTime = Math.min(t, duration - 0.05);
      });
      g.drawImage(video, 0, 0, cw, ch);
      const data = g.getImageData(0, 0, cw, ch).data;
      const sig = new Float32Array(cw * ch);
      for (let i = 0; i < cw * ch; i++) {
        sig[i] = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) / 255;
      }
      if (prev) {
        let diff = 0;
        for (let i = 0; i < sig.length; i++) diff += Math.abs(sig[i] - prev[i]);
        diff /= sig.length;
        if (diff > 0.22) sceneCuts.push(Math.round(t * 10) / 10);
      }
      prev = sig;
    }
    measured.scenes = true;
  } catch {
    measured.scenes = false;
  }

  // Audio energy windows (5s) from the decoded track, when available.
  let windows: SourceAnalysis["windows"] = [];
  try {
    let buf: ArrayBuffer | null = null;
    if (file) buf = await file.arrayBuffer();
    else {
      const r = await fetch(url);
      if (r.ok) buf = await r.arrayBuffer();
    }
    if (buf) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        const audio = await ctx.decodeAudioData(buf.slice(0));
        const ch0 = audio.getChannelData(0);
        const sr = audio.sampleRate;
        const winSamples = Math.floor(sr * 5);
        const out: SourceAnalysis["windows"] = [];
        let max = 0.0001;
        const raw: number[] = [];
        for (let s = 0; s < ch0.length; s += winSamples) {
          let sum = 0;
          const end = Math.min(s + winSamples, ch0.length);
          for (let i = s; i < end; i += 16) sum += ch0[i] * ch0[i];
          const rms = Math.sqrt(sum / Math.max(1, (end - s) / 16));
          raw.push(rms);
          if (rms > max) max = rms;
        }
        raw.forEach((rms, i) =>
          out.push({
            startSec: i * 5,
            endSec: Math.min(duration, (i + 1) * 5),
            energy: Math.round((rms / max) * 100) / 100,
          }),
        );
        windows = out;
        measured.audio = raw.some((v) => v > 0.001);
        void ctx.close();
      }
    }
  } catch {
    measured.audio = false;
  }

  return {
    durationSec: Math.round(duration * 10) / 10,
    width: meta.w,
    height: meta.h,
    hasAudio: measured.audio,
    measured,
    sceneCuts,
    windows,
  };
}

/* ---------------- browser-side variation renderer ---------------- */

interface RenderOpts {
  sourceUrl: string;
  composition: RepurposeComposition;
  onProgress: (frac: number) => void;
}

async function renderVariation({ sourceUrl, composition, onProgress }: RenderOpts): Promise<Blob> {
  if (typeof MediaRecorder === "undefined") {
    throw new Error("This browser doesn't support MediaRecorder, so it can't render video exports. Try a recent Chrome, Edge, Firefox or Safari.");
  }
  const video = document.createElement("video");
  video.muted = false;
  video.playsInline = true;
  video.preload = "auto";
  video.crossOrigin = "anonymous";
  video.src = sourceUrl;
  await new Promise<void>((resolve, reject) => {
    const to = setTimeout(() => reject(new Error("The source video took too long to load.")), 30000);
    video.onloadeddata = () => { clearTimeout(to); resolve(); };
    video.onerror = () => { clearTimeout(to); reject(new Error("The source video couldn't be loaded.")); };
  });

  const size = canvasSizeForAspect(composition.aspect);
  const W = size.width;
  const H = size.height;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("Canvas isn't available in this browser.");

  const branding = composition.branding;
  const [logo, qr] = await Promise.all([
    branding.includeLink ? loadImage("/icon-512.png") : Promise.resolve(null),
    branding.includeQr && branding.referralCode
      ? fetch(`/api/affiliate/qr?code=${encodeURIComponent(branding.referralCode)}`)
          .then((r) => r.json())
          .then((j) => (typeof j.qr === "string" ? loadImage(j.qr) : null))
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const total = compositionDuration(composition);
  const preset = captionPreset(composition.captionPreset);

  // Output-timeline spans per segment.
  const spans: { start: number; end: number }[] = [];
  {
    let acc = 0;
    for (const seg of composition.segments) {
      const len = (seg.endSec - seg.startSec) / (seg.speed || 1);
      spans.push({ start: acc, end: acc + len });
      acc += len;
    }
  }

  const canvasStream = canvas.captureStream(30);
  try {
    const v = video as HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
    const src = v.captureStream?.() ?? v.mozCaptureStream?.();
    const track = src?.getAudioTracks?.()[0];
    if (track) canvasStream.addTrack(track);
  } catch { /* silent export on browsers without element capture */ }

  const mime = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
  const recorder = new MediaRecorder(canvasStream, {
    ...(mime ? { mimeType: mime } : {}),
    videoBitsPerSecond: 6_000_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
  const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

  const drawCaptions = (t: number) => {
    const cue = composition.captions.find((c) => t >= c.startSec && t <= c.endSec);
    if (!cue) return;
    const rawWords = cue.text.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return;
    const frac = Math.min(1, Math.max(0, (t - cue.startSec) / Math.max(0.1, cue.endSec - cue.startSec)));
    const spokenCount = preset.wordByWord
      ? Math.max(1, Math.ceil(frac * rawWords.length))
      : rawWords.length;
    const words = rawWords.slice(0, spokenCount).map((w) => (preset.uppercase ? w.toUpperCase() : w));
    const fontPx = Math.round(W * preset.fontScale);
    g.font = `800 ${fontPx}px system-ui, sans-serif`;
    g.textBaseline = "middle";
    const maxChars = Math.max(8, Math.floor((W * 0.86) / (fontPx * 0.52)));
    const lines = wrapText(words.join(" "), maxChars);
    if (lines.length === 0) return;
    const lineH = fontPx * 1.25;
    const blockH = lines.length * lineH;
    const cy =
      preset.position === "center"
        ? H / 2
        : preset.position === "top"
          ? Math.round(H * 0.14) + blockH / 2
          : H - Math.round(H * 0.16) - blockH / 2;
    if (preset.background !== "transparent") {
      const widest = Math.max(...lines.map((l) => g.measureText(l).width));
      g.fillStyle = preset.background;
      const pad = fontPx * 0.35;
      g.beginPath();
      g.roundRect(W / 2 - widest / 2 - pad, cy - blockH / 2 - pad, widest + pad * 2, blockH + pad * 2, fontPx * 0.3);
      g.fill();
    }
    lines.forEach((line, i) => {
      const y = cy - blockH / 2 + lineH * (i + 0.5);
      const isLastLine = i === lines.length - 1;
      if (preset.outline !== "transparent") {
        g.lineWidth = Math.max(2, fontPx / 8);
        g.strokeStyle = preset.outline;
        g.textAlign = "center";
        g.strokeText(line, W / 2, y);
      }
      if (preset.wordByWord && isLastLine && preset.highlightColor !== preset.color) {
        // Karaoke-style: the current (last) word renders in the
        // preset's highlight color, the rest in the base color.
        const parts = line.split(" ");
        const lastWord = parts[parts.length - 1];
        const head = parts.slice(0, -1).join(" ");
        const fullW = g.measureText(line).width;
        const headW = head ? g.measureText(head + " ").width : 0;
        g.textAlign = "left";
        g.fillStyle = preset.color;
        if (head) g.fillText(head, W / 2 - fullW / 2, y);
        g.fillStyle = preset.highlightColor;
        g.fillText(lastWord, W / 2 - fullW / 2 + headW, y);
        g.textAlign = "center";
      } else {
        g.textAlign = "center";
        g.fillStyle = preset.color;
        g.fillText(line, W / 2, y);
      }
    });
  };

  const drawOverlays = (t: number) => {
    for (const o of composition.overlays) {
      if (t < o.startSec || t > o.endSec || !o.text) continue;
      if (o.kind === "hook" || o.kind === "text") {
        const fontPx = Math.round(W * (o.kind === "hook" ? 0.062 : 0.048));
        g.font = `900 ${fontPx}px system-ui, sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        const maxChars = Math.max(8, Math.floor((W * 0.88) / (fontPx * 0.55)));
        const lines = wrapText(o.text, maxChars);
        const lineH = fontPx * 1.22;
        const baseY = o.position === "center" ? H / 2 : o.position === "bottom" ? H * 0.72 : H * 0.12;
        lines.forEach((line, i) => {
          const y = baseY + i * lineH;
          g.lineWidth = Math.max(3, fontPx / 6);
          g.strokeStyle = "rgba(0,0,0,0.8)";
          g.strokeText(line, W / 2, y);
          g.fillStyle = "#ffffff";
          g.fillText(line, W / 2, y);
        });
      } else if (o.kind === "lower_third") {
        const fontPx = Math.round(W * 0.04);
        g.font = `700 ${fontPx}px system-ui, sans-serif`;
        g.textAlign = "left";
        g.textBaseline = "middle";
        const tw = g.measureText(o.text).width;
        const x = W * 0.05;
        const y = H * 0.78;
        g.fillStyle = "rgba(2,12,24,0.72)";
        g.beginPath();
        g.roundRect(x - fontPx * 0.4, y - fontPx * 0.75, tw + fontPx * 0.8, fontPx * 1.5, fontPx * 0.35);
        g.fill();
        g.fillStyle = "#7dd3fc";
        g.fillText(o.text, x, y);
      } else if (o.kind === "cta") {
        const fontPx = Math.round(W * 0.045);
        g.font = `800 ${fontPx}px system-ui, sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        const tw = g.measureText(o.text).width;
        const y = H * 0.86;
        const grad = g.createLinearGradient(W / 2 - tw / 2, 0, W / 2 + tw / 2, 0);
        grad.addColorStop(0, "#38bdf8");
        grad.addColorStop(1, "#0096FF");
        g.fillStyle = grad;
        g.beginPath();
        g.roundRect(W / 2 - tw / 2 - fontPx * 0.7, y - fontPx * 0.85, tw + fontPx * 1.4, fontPx * 1.7, fontPx * 0.85);
        g.fill();
        g.fillStyle = "#04121f";
        g.fillText(o.text, W / 2, y);
      }
    }
  };

  const drawEndCard = () => {
    const L = endCardLayout(W, H);
    g.filter = "none";
    g.fillStyle = L.bg;
    g.fillRect(0, 0, W, H);
    if (logo) g.drawImage(logo, L.logo.x, L.logo.y, L.logo.size, L.logo.size);
    g.textAlign = "center";
    g.textBaseline = "middle";
    const ctaText = composition.overlays.find((o) => o.kind === "cta")?.text;
    g.fillStyle = "#ffffff";
    g.font = `800 ${L.headline.fontPx}px system-ui, sans-serif`;
    const headMax = Math.max(10, Math.floor((W * 0.9) / (L.headline.fontPx * 0.55)));
    wrapText(ctaText || "Explore live cameras worldwide", headMax).forEach((line, i) => {
      g.fillText(line, W / 2, L.headline.y + i * L.headline.fontPx * 1.2);
    });
    if (branding.includeLink && branding.link) {
      g.fillStyle = "#7dd3fc";
      g.font = `600 ${L.link.fontPx}px system-ui, sans-serif`;
      g.fillText(displayLink(branding.link), W / 2, L.link.y);
    }
    if (branding.includeCode && branding.code) {
      g.fillStyle = "#fbbf24";
      g.font = `800 ${L.discount.fontPx}px system-ui, sans-serif`;
      const pct = branding.discountPct ? `${branding.discountPct}% off with code ` : "Code ";
      g.fillText(`${pct}${branding.code}`, W / 2, L.discount.y);
    }
    if (qr) {
      g.fillStyle = "#ffffff";
      g.fillRect(L.qr.x - L.qr.pad, L.qr.y - L.qr.pad, L.qr.size + L.qr.pad * 2, L.qr.size + L.qr.pad * 2);
      g.drawImage(qr, L.qr.x, L.qr.y, L.qr.size, L.qr.size);
    }
  };

  recorder.start(250);
  const startedAt = performance.now();
  try {
    for (let i = 0; i < composition.segments.length; i++) {
      const seg = composition.segments[i];
      const span = spans[i];
      video.playbackRate = seg.speed || 1;
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        video.addEventListener("seeked", done, { once: true });
        setTimeout(done, 1500);
        video.currentTime = seg.startSec;
      });
      await video.play().catch(() => undefined);
      await new Promise<void>((resolve) => {
        const tick = () => {
          const outT = span.start + Math.max(0, (video.currentTime - seg.startSec) / (seg.speed || 1));
          const fit = coverFit(video.videoWidth || W, video.videoHeight || H, W, H);
          g.filter = filterCss(composition.filter);
          g.fillStyle = "#000";
          g.fillRect(0, 0, W, H);
          g.drawImage(video, fit.dx, fit.dy, fit.dw, fit.dh);
          g.filter = "none";
          drawOverlays(outT);
          if (seg.label) {
            // Segment lower-third label.
            const fontPx = Math.round(W * 0.04);
            g.font = `700 ${fontPx}px system-ui, sans-serif`;
            g.textAlign = "left";
            g.textBaseline = "middle";
            const tw = g.measureText(seg.label).width;
            const x = W * 0.05;
            const y = H * 0.78;
            g.fillStyle = "rgba(2,12,24,0.72)";
            g.beginPath();
            g.roundRect(x - fontPx * 0.4, y - fontPx * 0.75, tw + fontPx * 0.8, fontPx * 1.5, fontPx * 0.35);
            g.fill();
            g.fillStyle = "#7dd3fc";
            g.fillText(seg.label, x, y);
          }
          drawCaptions(outT);
          onProgress(Math.min(1, outT / total));
          if (video.currentTime >= seg.endSec - 0.03 || video.ended) return resolve();
          requestAnimationFrame(tick);
        };
        tick();
      });
      video.pause();
    }
    if (composition.endCard) {
      const endStart = performance.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          drawEndCard();
          const elapsed = (performance.now() - startedAt) / 1000;
          onProgress(Math.min(1, elapsed / total));
          if (performance.now() - endStart >= 3000) return resolve();
          requestAnimationFrame(tick);
        };
        tick();
      });
    }
  } finally {
    recorder.stop();
    await stopped;
    video.pause();
  }
  return new Blob(chunks, { type: mime || "video/webm" });
}

/* ---------------- the Machine ---------------- */

const BTN =
  "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-[13px] font-bold text-[#04121f] disabled:opacity-50";
const BTN_STYLE = { background: "linear-gradient(135deg,#38bdf8,#0096FF)" } as const;
const GHOST =
  "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/15 text-[12px] font-mono text-slate-300 hover:bg-white/5 disabled:opacity-50";

export default function RepurposeClient() {
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [renderPrice, setRenderPrice] = useState(25);
  const [open, setOpen] = useState<{ project: ProjectLite; variations: VariationLite[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // new-project form
  const [tab, setTab] = useState<"upload" | "library" | "url">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [own, setOwn] = useState(false);

  // per-project working state
  const [transcript, setTranscript] = useState("");
  const [hookInput, setHookInput] = useState("");
  const [count, setCount] = useState(3);
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [customDirs, setCustomDirs] = useState<string[] | null>(null);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [renderState, setRenderState] = useState<Record<string, { frac: number; url?: string; name?: string }>>({});

  const localUrls = useRef(new Map<string, string>());
  const localFilesRef = useRef(new Map<string, File>());
  const jobRef = useRef<{ jobId: string; settled: boolean } | null>(null);

  const refreshProjects = useCallback(async () => {
    const j = await api<{ projects: ProjectLite[] }>("/api/affiliate/studio/repurpose/projects");
    setProjects(j.projects);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refreshProjects();
        const lib = await api<{ library: LibraryItem[] }>("/api/affiliate/studio/repurpose/library");
        setLibrary(lib.library);
        const credits = await api<{
          account?: { balance: number };
          config?: { kinds?: Record<string, { credits?: number }> };
        }>("/api/affiliate/studio/credits").catch(() => null);
        if (credits?.account) setBalance(credits.account.balance);
        const price = credits?.config?.kinds?.repurpose_render?.credits;
        if (typeof price === "number") setRenderPrice(price);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load the Machine.");
      }
    })();
  }, [refreshProjects]);

  /* Refund beacon: tab closing mid-render settles the job as failed. */
  useEffect(() => {
    const onBeforeUnload = () => {
      const job = jobRef.current;
      if (job && !job.settled) {
        try {
          navigator.sendBeacon(
            `/api/affiliate/studio/jobs/${encodeURIComponent(job.jobId)}/settle`,
            new Blob([JSON.stringify({ outcome: "failed", error: "tab closed during render" })], { type: "application/json" }),
          );
          job.settled = true;
        } catch { /* best effort */ }
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const settle = useCallback(async (jobId: string, outcome: "done" | "failed", err?: string) => {
    if (jobRef.current?.jobId === jobId) jobRef.current.settled = true;
    try {
      await fetch(`/api/affiliate/studio/jobs/${encodeURIComponent(jobId)}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, ...(err ? { error: err } : {}) }),
      });
    } catch { /* server reaps stale jobs and auto-refunds */ }
  }, []);

  const playableUrl = useCallback((p: ProjectLite): string | null => {
    if (p.sourceKind === "upload") return p.sourceRef ?? localUrls.current.get(p.id) ?? null;
    if (p.sourceKind === "library" || p.sourceKind === "url") return p.sourceRef;
    return null;
  }, []);

  const openProject = useCallback(async (id: string) => {
    setBusy("open");
    setError(null);
    try {
      const j = await api<{ project: ProjectLite & { transcript: string | null }; variations: VariationLite[] }>(
        `/api/affiliate/studio/repurpose/projects/${id}`,
      );
      setOpen({ project: j.project, variations: j.variations });
      setTranscript(j.project.transcript ?? "");
      setTrackingUrl(null);
      setRenderState({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open that project.");
    } finally {
      setBusy(null);
    }
  }, []);

  /* ---- create project ---- */
  const createFromUpload = async () => {
    if (!file) return setError("Choose a video file first.");
    if (!own) return setError("Confirm you own this media or have permission to edit and distribute it.");
    if (file.size > 500_000_000) return setError("That file is over 500 MB. Trim it or export a smaller copy first.");
    setBusy("create");
    setError(null);
    try {
      const j = await api<{ project: ProjectLite }>("/api/affiliate/studio/repurpose/projects", {
        method: "POST",
        body: JSON.stringify({
          title: titleInput.trim() || file.name.replace(/\.[^.]+$/, ""),
          sourceKind: "upload",
          sourceName: file.name,
          ownershipConfirmed: true,
        }),
      });
      const project = j.project;
      // Persist the file to Blob storage when available; otherwise keep
      // it browser-local for this session (honest note either way).
      let persisted = false;
      try {
        const { upload } = await import("@vercel/blob/client");
        const blob = await upload(`studio-sources/${project.id}/${file.name}`, file, {
          access: "public",
          handleUploadUrl: "/api/affiliate/studio/repurpose/upload-token",
        });
        await api(`/api/affiliate/studio/repurpose/projects/${project.id}`, {
          method: "PATCH",
          body: JSON.stringify({ sourceRef: blob.url }),
        });
        project.sourceRef = blob.url;
        persisted = true;
      } catch {
        localUrls.current.set(project.id, URL.createObjectURL(file));
        localFilesRef.current.set(project.id, file);
      }
      setNotice(
        persisted
          ? "Project created and your video saved — hit Analyze to measure it."
          : "Project created. Cloud upload isn't available right now, so this video stays in this browser for this session — analysis and rendering still work.",
      );
      setFile(null);
      setOwn(false);
      setTitleInput("");
      await refreshProjects();
      await openProject(project.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the project.");
    } finally {
      setBusy(null);
    }
  };

  const createFromLibrary = async (item: LibraryItem) => {
    setBusy("create");
    setError(null);
    try {
      const j = await api<{ project: ProjectLite }>("/api/affiliate/studio/repurpose/projects", {
        method: "POST",
        body: JSON.stringify({ title: item.title, sourceKind: "library", sourceRef: item.assetUrl }),
      });
      setNotice("Project created from the approved WorldEye library — hit Analyze to measure it.");
      await refreshProjects();
      await openProject(j.project.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the project.");
    } finally {
      setBusy(null);
    }
  };

  const createFromUrl = async () => {
    if (!own) return setError("Confirm you own this media or have permission to edit and distribute it.");
    setBusy("create");
    setError(null);
    try {
      const j = await api<{ project: ProjectLite }>("/api/affiliate/studio/repurpose/projects", {
        method: "POST",
        body: JSON.stringify({
          title: titleInput.trim() || "Imported video",
          sourceKind: "url",
          sourceRef: urlInput.trim(),
          ownershipConfirmed: true,
        }),
      });
      setNotice("Project created — hit Analyze to measure the video.");
      setUrlInput("");
      setOwn(false);
      setTitleInput("");
      await refreshProjects();
      await openProject(j.project.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the project.");
    } finally {
      setBusy(null);
    }
  };

  /* ---- analyze ---- */
  const runAnalysis = async () => {
    if (!open) return;
    const url = playableUrl(open.project);
    if (!url) return setError("No playable source for this project in this browser — re-import the video to analyze it.");
    setBusy("analyze");
    setError(null);
    try {
      const analysis = await analyzeSource(url, localFilesRef.current.get(open.project.id), transcript.trim().length > 0);
      const j = await api<{ project: ProjectLite }>(`/api/affiliate/studio/repurpose/projects/${open.project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ analysis, ...(transcript.trim() ? { transcript: transcript.trim() } : {}) }),
      });
      setOpen({ ...open, project: j.project });
      setNotice("Analysis saved. Generate variations whenever you're ready.");
      await refreshProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setBusy(null);
    }
  };

  const saveTranscript = async () => {
    if (!open) return;
    setBusy("transcript");
    try {
      await api(`/api/affiliate/studio/repurpose/projects/${open.project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ transcript: transcript.trim() }),
      });
      setNotice("Transcript saved — testimonial-style variations use only these words.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the transcript.");
    } finally {
      setBusy(null);
    }
  };

  /* ---- generate ---- */
  const runGenerate = async () => {
    if (!open) return;
    setBusy("generate");
    setError(null);
    try {
      const j = await api<{ variations: VariationLite[]; trackingLink: { url: string } | null; trackingNote: string | null }>(
        `/api/affiliate/studio/repurpose/projects/${open.project.id}/generate`,
        {
          method: "POST",
          body: JSON.stringify({
            ...(customDirs ? { directions: customDirs } : { count }),
            aspect,
            ...(hookInput.trim() ? { hookText: hookInput.trim() } : {}),
          }),
        },
      );
      setOpen({ ...open, variations: [...open.variations, ...j.variations] });
      if (j.trackingLink) setTrackingUrl(j.trackingLink.url);
      if (j.trackingNote) setNotice(j.trackingNote);
      else setNotice(`${j.variations.length} variations created — generation is free; you only spend credits when you render.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setBusy(null);
    }
  };

  /* ---- render one variation ---- */
  const runRender = async (v: VariationLite) => {
    if (!open) return;
    const url = playableUrl(open.project);
    if (!url) return setError("No playable source in this browser — re-import the video to render.");
    setError(null);
    setRenderState((s) => ({ ...s, [v.id]: { frac: 0 } }));
    let jobId: string | null = null;
    try {
      const j = await api<{ job: { id: string; creditCost: number }; balance: number }>(
        "/api/affiliate/studio/repurpose/render",
        { method: "POST", body: JSON.stringify({ variationId: v.id }) },
      );
      jobId = j.job.id;
      jobRef.current = { jobId, settled: false };
      setBalance(j.balance);
      const blob = await renderVariation({
        sourceUrl: url,
        composition: v.composition,
        onProgress: (frac) => setRenderState((s) => ({ ...s, [v.id]: { frac } })),
      });
      const objUrl = URL.createObjectURL(blob);
      await settle(jobId, "done");
      await api(`/api/affiliate/studio/repurpose/variations/${v.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rendered" }),
      }).catch(() => undefined);
      setRenderState((s) => ({
        ...s,
        [v.id]: { frac: 1, url: objUrl, name: `${v.title.replace(/[^a-z0-9-_]+/gi, "-")}.${blob.type.includes("mp4") ? "mp4" : "webm"}` },
      }));
      setOpen({
        ...open,
        variations: open.variations.map((x) => (x.id === v.id ? { ...x, status: "rendered" } : x)),
      });
      const credits = await api<{ account?: { balance: number } }>("/api/affiliate/studio/credits").catch(() => null);
      if (credits?.account) setBalance(credits.account.balance);
    } catch (e) {
      if (jobId) await settle(jobId, "failed", e instanceof Error ? e.message : "render failed");
      setRenderState((s) => {
        const next = { ...s };
        delete next[v.id];
        return next;
      });
      setError(
        e instanceof Error
          ? `${e.message}${jobId ? " Your credits were refunded." : ""}`
          : "Render failed. Your credits were refunded.",
      );
      const credits = await api<{ account?: { balance: number } }>("/api/affiliate/studio/credits").catch(() => null);
      if (credits?.account) setBalance(credits.account.balance);
    }
  };

  const deleteVariation = async (v: VariationLite) => {
    if (!open) return;
    await api(`/api/affiliate/studio/repurpose/variations/${v.id}`, { method: "DELETE" }).catch(() => undefined);
    setOpen({ ...open, variations: open.variations.filter((x) => x.id !== v.id) });
  };

  const p = open?.project;
  const srcUrl = p ? playableUrl(p) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">AI Video Repurposing Machine</h1>
          <p className="text-sm text-slate-400 max-w-2xl">
            Turn one video you own into many platform-ready WorldEye variations — new hooks, pacing,
            captions and formats, each with your referral link, QR and code, and its own trackable
            creative ID. Analysis and rendering run in your browser; generation is free and a render
            costs {renderPrice} credits.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-right">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">Credit balance</div>
          <div className="text-lg font-black text-white">{balance === null ? "—" : balance}</div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
      {notice && <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">{notice}</div>}

      {/* ---------- start a project ---------- */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <h2 className="font-bold text-white">Start a project</h2>
        <div className="flex gap-2">
          {(["upload", "library", "url"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg font-mono text-[12px] ${tab === t ? "bg-sky-500/20 text-sky-200 border border-sky-400/40" : "border border-white/10 text-slate-400"}`}
            >
              {t === "upload" ? "Upload a video" : t === "library" ? "WorldEye library" : "Paste a video URL"}
            </button>
          ))}
        </div>

        {tab === "upload" && (
          <div className="space-y-3">
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-300 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border file:border-white/15 file:bg-white/5 file:text-slate-200 file:font-mono file:text-[12px]"
            />
            <input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="Project title (defaults to the file name)"
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <label className="flex items-start gap-2 text-[13px] text-slate-300">
              <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} className="mt-0.5" />
              I own this media or have permission to edit and distribute it. (Required — it&apos;s recorded on the project.)
            </label>
            <button onClick={createFromUpload} disabled={busy === "create"} className={BTN} style={BTN_STYLE}>
              {busy === "create" ? "Creating…" : "Create project"}
            </button>
            <p className="text-[12px] text-slate-500">MP4, MOV or WebM, up to 500 MB. Horizontal, vertical and square sources all work.</p>
          </div>
        )}

        {tab === "library" && (
          <div className="space-y-3">
            <p className="text-[13px] text-slate-400">
              Approved WorldEye promotional footage — cleared for affiliate use. Pick one to start a project.
            </p>
            {library.length === 0 && <p className="text-sm text-slate-500">No library videos are available right now.</p>}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {library.map((item) => (
                <button
                  key={item.slug}
                  onClick={() => createFromLibrary(item)}
                  disabled={busy === "create"}
                  className="text-left rounded-xl border border-white/10 bg-black/20 overflow-hidden hover:border-sky-400/40 disabled:opacity-50"
                >
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.previewUrl} alt="" className="w-full aspect-video object-cover" />
                  ) : (
                    <div className="w-full aspect-video bg-white/5" />
                  )}
                  <div className="p-2.5 text-[13px] font-semibold text-white leading-snug">{item.title}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "url" && (
          <div className="space-y-3">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://…/my-video.mp4"
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <input
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="Project title"
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <label className="flex items-start gap-2 text-[13px] text-slate-300">
              <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} className="mt-0.5" />
              I own this media or have permission to edit and distribute it.
            </label>
            <button onClick={createFromUrl} disabled={busy === "create"} className={BTN} style={BTN_STYLE}>
              {busy === "create" ? "Creating…" : "Create project"}
            </button>
            <p className="text-[12px] text-slate-500">Direct links to MP4, MOV or WebM files only (https). The file loads in your browser for analysis.</p>
          </div>
        )}
      </section>

      {/* ---------- project list ---------- */}
      <section className="space-y-2">
        <h2 className="font-bold text-white">Your projects</h2>
        {projects.length === 0 && <p className="text-sm text-slate-500">No projects yet — start one above.</p>}
        <div className="grid md:grid-cols-2 gap-2">
          {projects.map((pr) => (
            <button
              key={pr.id}
              onClick={() => openProject(pr.id)}
              className={`text-left rounded-xl border px-4 py-3 ${p?.id === pr.id ? "border-sky-400/50 bg-sky-500/10" : "border-white/10 bg-white/[0.03] hover:bg-white/5"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-white text-sm">{pr.title}</span>
                <span className="font-mono text-[11px] text-slate-500">{pr.sourceKind}</span>
              </div>
              <div className="text-[12px] text-slate-400 mt-0.5">
                {pr.variationCount} variation{pr.variationCount === 1 ? "" : "s"}
                {pr.durationSec ? ` · ${fmtSec(pr.durationSec)}` : ""} · {pr.status}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ---------- open project ---------- */}
      {p && (
        <section className="rounded-2xl border border-sky-400/20 bg-white/[0.02] p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-white">{p.title}</h2>
            <span className="font-mono text-[11px] text-slate-500">
              {p.sourceKind} · {p.ownershipConfirmed ? "ownership confirmed" : "ownership NOT confirmed"}
            </span>
          </div>

          {srcUrl ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={srcUrl} controls className="w-full max-h-[420px] rounded-xl bg-black" />
          ) : (
            <p className="text-sm text-slate-400">
              This project&apos;s video isn&apos;t available in this browser session (browser-local upload). Re-import it
              from the Upload tab to analyze or render.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={runAnalysis} disabled={busy === "analyze" || !srcUrl} className={BTN} style={BTN_STYLE}>
              {busy === "analyze" ? "Analyzing…" : p.analysisSummary ? "Re-analyze" : "Analyze video"}
            </button>
            {p.analysisMeasured && (
              <div className="flex gap-1.5 font-mono text-[11px]">
                <span className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-300">metadata ✓</span>
                <span className={`px-2 py-1 rounded ${p.analysisMeasured.scenes ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-slate-500"}`}>
                  scenes {p.analysisMeasured.scenes ? "✓" : "—"}
                </span>
                <span className={`px-2 py-1 rounded ${p.analysisMeasured.audio ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-slate-500"}`}>
                  audio energy {p.analysisMeasured.audio ? "✓" : "—"}
                </span>
              </div>
            )}
          </div>
          {p.analysisSummary && <p className="text-sm text-slate-300 leading-relaxed">{p.analysisSummary}</p>}

          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-slate-200">
              Transcript (optional) — paste or correct it; testimonial-style variations use only your own words.
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={3}
              placeholder="Paste what is said in the video…"
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <button onClick={saveTranscript} disabled={busy === "transcript"} className={GHOST}>
              {busy === "transcript" ? "Saving…" : "Save transcript"}
            </button>
          </div>

          {/* Hook Lab */}
          <details className="rounded-xl border border-white/10 bg-black/20 p-4">
            <summary className="cursor-pointer text-sm font-bold text-white">Hook Lab — proven hook formulas</summary>
            <p className="text-[12px] text-slate-500 mt-1">
              Every hook uses only facts WorldEye can stand behind ({VERIFIED_FACTS.cameraClaim}). Click one to use
              it as your opening hook, then edit it freely.
            </p>
            <div className="mt-3 space-y-3">
              {HOOK_CATEGORIES.map((cat) => (
                <div key={cat}>
                  <div className="font-mono text-[11px] uppercase tracking-wider text-sky-300">
                    {cat.replace(/_/g, " ")}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {generateHooks()
                      .filter((h) => h.category === cat)
                      .map((h) => (
                        <button
                          key={h.text}
                          onClick={() => setHookInput(h.text)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-left text-[12px] text-slate-200"
                        >
                          {h.text}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </details>

          {/* Generate */}
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
            <h3 className="text-sm font-bold text-white">Generate variations — free</h3>
            <input
              value={hookInput}
              onChange={(e) => setHookInput(e.target.value)}
              placeholder="Opening hook (or pick one from the Hook Lab)"
              className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <div className="flex flex-wrap items-center gap-2">
              {[3, 5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => { setCount(n); setCustomDirs(null); }}
                  className={`px-3 py-1.5 rounded-lg font-mono text-[12px] ${customDirs === null && count === n ? "bg-sky-500/20 text-sky-200 border border-sky-400/40" : "border border-white/10 text-slate-400"}`}
                >
                  {n} variations
                </button>
              ))}
              <button
                onClick={() => setCustomDirs(customDirs === null ? ["viral_curiosity"] : null)}
                className={`px-3 py-1.5 rounded-lg font-mono text-[12px] ${customDirs !== null ? "bg-sky-500/20 text-sky-200 border border-sky-400/40" : "border border-white/10 text-slate-400"}`}
              >
                Choose directions
              </button>
              <select
                value={aspect}
                onChange={(e) => setAspect(e.target.value as Aspect)}
                className="rounded-lg bg-black/30 border border-white/10 px-2 py-1.5 text-[12px] font-mono text-slate-200"
              >
                {ASPECTS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <button onClick={runGenerate} disabled={busy === "generate" || !p.analysisSummary} className={BTN} style={BTN_STYLE}>
                {busy === "generate" ? "Generating…" : "Generate"}
              </button>
              {!p.analysisSummary && <span className="text-[12px] text-slate-500">Analyze the video first.</span>}
            </div>
            {customDirs !== null && (
              <div className="flex flex-wrap gap-1.5">
                {DIRECTIONS.map((d) => {
                  const on = customDirs.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      onClick={() =>
                        setCustomDirs(on ? customDirs.filter((x) => x !== d.id) : [...customDirs, d.id].slice(0, 10))
                      }
                      title={d.blurb}
                      className={`px-2.5 py-1.5 rounded-lg text-[12px] ${on ? "bg-sky-500/20 text-sky-200 border border-sky-400/40" : "border border-white/10 text-slate-400"}`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            )}
            {trackingUrl && (
              <p className="text-[12px] text-slate-400">
                Project tracking link: <span className="font-mono text-sky-300">{trackingUrl}</span> — every variation
                adds its own creative ID on top of it.
              </p>
            )}
          </div>

          {/* Variations */}
          {open.variations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white">Variations ({open.variations.length})</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {open.variations.map((v) => {
                  const rs = renderState[v.id];
                  const dir = DIRECTIONS.find((d) => d.id === v.direction);
                  return (
                    <div key={v.id} className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-white text-sm leading-snug">{v.title}</div>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400">{v.aspect}</span>
                      </div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {dir?.label ?? v.direction} · {fmtSec(compositionDuration(v.composition))} · {v.composition.segments.length} segment
                        {v.composition.segments.length === 1 ? "" : "s"} · {v.creativeId}
                      </div>
                      {v.hookText && <p className="text-[13px] text-slate-300">“{v.hookText}”</p>}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {rs?.url ? (
                          <a href={rs.url} download={rs.name} className={BTN} style={BTN_STYLE}>
                            Download render
                          </a>
                        ) : (
                          <button onClick={() => runRender(v)} disabled={!!rs} className={BTN} style={BTN_STYLE}>
                            {rs ? `Rendering… ${Math.round(rs.frac * 100)}%` : `Render · ${renderPrice} credits`}
                          </button>
                        )}
                        <span className={`font-mono text-[11px] ${v.status === "rendered" ? "text-emerald-300" : "text-slate-500"}`}>
                          {v.status}
                        </span>
                        <button onClick={() => deleteVariation(v)} className="ml-auto font-mono text-[11px] text-slate-500 hover:text-red-300">
                          delete
                        </button>
                      </div>
                      {rs && !rs.url && (
                        <div className="h-1.5 rounded bg-white/10 overflow-hidden">
                          <div className="h-full bg-sky-400" style={{ width: `${Math.round(rs.frac * 100)}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[12px] text-slate-500">
                Renders happen in your browser and download as MP4/WebM. If a render fails, the {renderPrice} credits are
                refunded automatically. Post with #ad or your platform&apos;s paid-partnership label — you&apos;re earning
                commission on this content.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
