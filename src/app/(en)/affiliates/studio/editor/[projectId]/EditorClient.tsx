"use client";

// Variation editor (spec §3). Edits one variation's composition —
// timeline segments, captions, overlays, filter, aspect, end card —
// with undo/redo, a live preview (source playback + HTML overlays;
// the burned-in render happens in the Machine), transcript tools, a
// frame-grab thumbnail maker and a carousel slide exporter. Saves go
// through PATCH /repurpose/variations/[id], which validates the
// composition server-side before storing it.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CAPTION_PRESETS,
  FILTERS,
  compositionDuration,
  transcriptCues,
  type Aspect,
  type CaptionCue,
  type OverlayItem,
  type RepurposeComposition,
  type RepurposeSegment,
} from "@/lib/studio/repurpose";

interface ProjectLite {
  id: string;
  title: string;
  sourceKind: string;
  sourceRef: string | null;
  durationSec: number | null;
  analysisSummary?: string | null;
  analysisMeasured?: { metadata: boolean; scenes: boolean; audio: boolean } | null;
  transcript?: string | null;
}
interface VariationLite {
  id: string;
  creativeId: string;
  direction: string;
  title: string;
  composition: RepurposeComposition;
  status: string;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const j = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error((j as { error?: string }).error || `Request failed (${r.status})`);
  return j;
}

const BTN =
  "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-[13px] font-bold text-[#04121f] disabled:opacity-50";
const BTN_STYLE = { background: "linear-gradient(135deg,#38bdf8,#0096FF)" } as const;
const GHOST =
  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/15 text-[12px] font-mono text-slate-300 hover:bg-white/5 disabled:opacity-50";
const INPUT =
  "rounded-lg bg-black/30 border border-white/10 px-2 py-1.5 text-[13px] text-white placeholder:text-slate-500";
const NUM = INPUT + " w-[86px]";

export default function EditorClient({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectLite | null>(null);
  const [variations, setVariations] = useState<VariationLite[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [comp, setComp] = useState<RepurposeComposition | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [outT, setOutT] = useState(0);
  const [playing, setPlaying] = useState(false);

  const undoRef = useRef<RepurposeComposition[]>([]);
  const redoRef = useRef<RepurposeComposition[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const segIdxRef = useRef(0);

  const selected = variations.find((v) => v.id === selectedId) ?? null;
  const sourceUrl = project ? (project.sourceKind === "upload" || project.sourceKind === "library" || project.sourceKind === "url" ? project.sourceRef : null) : null;

  const load = useCallback(async () => {
    const j = await api<{ project: ProjectLite; variations: VariationLite[] }>(
      `/api/affiliate/studio/repurpose/projects/${projectId}`,
    );
    setProject(j.project);
    setVariations(j.variations);
    if (j.variations.length > 0) {
      const first = j.variations[0];
      setSelectedId(first.id);
      setComp(structuredClone(first.composition));
      undoRef.current = [];
      redoRef.current = [];
      setDirty(false);
    }
  }, [projectId]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : "Couldn't load the project."));
  }, [load]);

  const apply = useCallback((next: RepurposeComposition) => {
    setComp((prev) => {
      if (prev) {
        undoRef.current = [...undoRef.current.slice(-49), structuredClone(prev)];
        redoRef.current = [];
      }
      return next;
    });
    setDirty(true);
  }, []);

  const undo = () => {
    const prev = undoRef.current.pop();
    if (!prev || !comp) return;
    redoRef.current.push(structuredClone(comp));
    setComp(prev);
    setDirty(true);
  };
  const redo = () => {
    const next = redoRef.current.pop();
    if (!next || !comp) return;
    undoRef.current.push(structuredClone(comp));
    setComp(next);
    setDirty(true);
  };

  const selectVariation = (v: VariationLite) => {
    setSelectedId(v.id);
    setComp(structuredClone(v.composition));
    undoRef.current = [];
    redoRef.current = [];
    setDirty(false);
    setOutT(0);
    segIdxRef.current = 0;
  };

  const save = async () => {
    if (!selected || !comp) return;
    setBusy("save");
    setError(null);
    try {
      const j = await api<{ variation: VariationLite }>(`/api/affiliate/studio/repurpose/variations/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ composition: comp }),
      });
      setVariations((vs) => vs.map((v) => (v.id === selected.id ? { ...v, composition: j.variation.composition } : v)));
      setDirty(false);
      setNotice("Saved. Reopen this editor any time — your edit is stored on the variation.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  };

  /* ---------- preview playback (segment playlist) ---------- */
  const spans = useMemo(() => {
    if (!comp) return [] as { start: number; end: number }[];
    let acc = 0;
    return comp.segments.map((s) => {
      const len = (s.endSec - s.startSec) / (s.speed || 1);
      const span = { start: acc, end: acc + len };
      acc += len;
      return span;
    });
  }, [comp]);

  useEffect(() => {
    if (!playing) return;
    const iv = setInterval(() => {
      const video = videoRef.current;
      if (!video || !comp) return;
      const idx = segIdxRef.current;
      const seg = comp.segments[idx];
      if (!seg) {
        setPlaying(false);
        return;
      }
      if (video.currentTime >= seg.endSec - 0.03 || video.ended) {
        const next = idx + 1;
        if (next >= comp.segments.length) {
          video.pause();
          setPlaying(false);
          return;
        }
        segIdxRef.current = next;
        video.currentTime = comp.segments[next].startSec;
        video.playbackRate = comp.segments[next].speed || 1;
        void video.play().catch(() => undefined);
        return;
      }
      const span = spans[idx];
      if (span) setOutT(span.start + Math.max(0, (video.currentTime - seg.startSec) / (seg.speed || 1)));
    }, 90);
    return () => clearInterval(iv);
  }, [playing, comp, spans]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !comp || comp.segments.length === 0) return;
    if (playing) {
      video.pause();
      setPlaying(false);
      return;
    }
    segIdxRef.current = 0;
    video.currentTime = comp.segments[0].startSec;
    video.playbackRate = comp.segments[0].speed || 1;
    void video.play().catch(() => undefined);
    setPlaying(true);
  };

  const currentCue = comp?.captions.find((c) => outT >= c.startSec && outT <= c.endSec) ?? null;
  const currentOverlays = (comp?.overlays ?? []).filter((o) => outT >= o.startSec && outT <= o.endSec && o.text);

  /* ---------- segment ops ---------- */
  const patchSeg = (i: number, patch: Partial<RepurposeSegment>) => {
    if (!comp) return;
    apply({ ...comp, segments: comp.segments.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  };
  const moveSeg = (i: number, dir: -1 | 1) => {
    if (!comp) return;
    const j = i + dir;
    if (j < 0 || j >= comp.segments.length) return;
    const segs = [...comp.segments];
    [segs[i], segs[j]] = [segs[j], segs[i]];
    apply({ ...comp, segments: segs });
  };
  const splitSeg = (i: number) => {
    if (!comp) return;
    const s = comp.segments[i];
    const mid = Math.round(((s.startSec + s.endSec) / 2) * 10) / 10;
    if (mid <= s.startSec || mid >= s.endSec) return;
    const a = { ...s, endSec: mid };
    const b = { ...s, startSec: mid, label: s.label ? `${s.label} (cont.)` : undefined };
    apply({ ...comp, segments: [...comp.segments.slice(0, i), a, b, ...comp.segments.slice(i + 1)] });
  };
  const dupSeg = (i: number) => {
    if (!comp) return;
    apply({ ...comp, segments: [...comp.segments.slice(0, i + 1), { ...comp.segments[i] }, ...comp.segments.slice(i + 1)] });
  };
  const delSeg = (i: number) => {
    if (!comp || comp.segments.length <= 1) return;
    apply({ ...comp, segments: comp.segments.filter((_, j) => j !== i) });
  };
  const addSeg = () => {
    if (!comp || !project?.durationSec) return;
    const last = comp.segments[comp.segments.length - 1];
    const start = last ? last.endSec : 0;
    if (start + 1 > project.durationSec) return setError("No room after the last segment — trim one first.");
    apply({
      ...comp,
      segments: [...comp.segments, { startSec: start, endSec: Math.min(project.durationSec, start + 3), speed: 1 }],
    });
  };

  /* ---------- caption ops ---------- */
  const patchCue = (i: number, patch: Partial<CaptionCue>) => {
    if (!comp) return;
    apply({ ...comp, captions: comp.captions.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  };
  const addCue = () => {
    if (!comp) return;
    const lastEnd = comp.captions.reduce((m, c) => Math.max(m, c.endSec), 0);
    apply({ ...comp, captions: [...comp.captions, { startSec: lastEnd, endSec: lastEnd + 2, text: "" }] });
  };
  const cuesFromTranscript = () => {
    if (!comp) return;
    const total = compositionDuration(comp) - (comp.endCard ? 3 : 0);
    const cues = transcriptCues(project?.transcript, total);
    if (cues.length === 0) return setError("No transcript on this project yet — add one in the Machine, or write cues manually.");
    apply({ ...comp, captions: cues });
    setNotice("Captions rebuilt from the project transcript.");
  };
  const aiRestyle = async () => {
    if (!comp || !selected) return;
    const presetLabel = CAPTION_PRESETS.find((p) => p.id === comp.captionPreset)?.label ?? comp.captionPreset;
    setBusy("ai");
    setError(null);
    try {
      const text = comp.captions.map((c) => c.text).join(" ");
      const j = await api<{ job?: { id: string; creditCost: number }; error?: string }>("/api/affiliate/studio/ai", {
        method: "POST",
        body: JSON.stringify({
          kind: "ai_caption",
          subject: `Restyle these video captions in a ${presetLabel} voice, keeping every fact identical: ${text}`.slice(0, 900),
          platform: "TikTok",
        }),
      });
      setNotice(
        `AI restyle queued (${j.job?.creditCost ?? 2} credits) — Cosmo makes it to order and it lands in My Creations. The captions here stay unchanged until you apply the result.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI restyle couldn't be queued.");
    } finally {
      setBusy(null);
    }
  };

  /* ---------- overlay ops ---------- */
  const setHook = (text: string) => {
    if (!comp) return;
    const overlays = comp.overlays.map((o) => (o.kind === "hook" ? { ...o, text } : o));
    apply({ ...comp, hookText: text, overlays });
  };
  const setCta = (text: string) => {
    if (!comp) return;
    const total = compositionDuration(comp);
    const has = comp.overlays.some((o) => o.kind === "cta");
    const overlays: OverlayItem[] = has
      ? comp.overlays.map((o) => (o.kind === "cta" ? { ...o, text } : o))
      : [...comp.overlays, { kind: "cta", text, startSec: Math.max(0, total - 6), endSec: Math.max(1, total - 3), position: "bottom" }];
    apply({ ...comp, overlays });
  };

  /* ---------- frame tools ---------- */
  const grabFrame = async (withTitle: boolean): Promise<string | null> => {
    const video = videoRef.current;
    if (!video || !comp) return null;
    const size = { width: 720, height: Math.round((720 * video.videoHeight) / Math.max(1, video.videoWidth)) || 1280 };
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const g = canvas.getContext("2d");
    if (!g) return null;
    g.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (withTitle) {
      const fontPx = Math.round(canvas.width * 0.07);
      g.font = `900 ${fontPx}px system-ui, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      const text = comp.hookText || project?.title || "WorldEye";
      g.lineWidth = Math.max(3, fontPx / 6);
      g.strokeStyle = "rgba(0,0,0,0.85)";
      g.strokeText(text, canvas.width / 2, canvas.height * 0.14);
      g.fillStyle = "#ffffff";
      g.fillText(text, canvas.width / 2, canvas.height * 0.14);
    }
    return canvas.toDataURL("image/png");
  };
  const downloadDataUrl = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };
  const makeThumbnail = async () => {
    const url = await grabFrame(true);
    if (url) downloadDataUrl(url, `${selected?.creativeId ?? "thumbnail"}-thumbnail.png`);
  };
  const makeCarousel = async () => {
    const video = videoRef.current;
    if (!video || !comp) return;
    setBusy("carousel");
    try {
      const starts = comp.segments.slice(0, 5);
      for (let i = 0; i < starts.length; i++) {
        const seg = starts[i];
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          video.addEventListener("seeked", done, { once: true });
          setTimeout(done, 1500);
          video.currentTime = Math.min(seg.startSec + 0.1, seg.endSec - 0.05);
        });
        const url = await grabFrame(false);
        if (url) downloadDataUrl(url, `${selected?.creativeId ?? "slide"}-slide-${i + 1}.png`);
      }
      setNotice("Carousel slides downloaded — post them in order; slide 1 carries your hook in the burned-in render.");
    } finally {
      setBusy(null);
    }
  };

  if (!project) {
    return <p className="text-sm text-slate-400">{error ?? "Loading editor…"}</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Editor — {project.title}</h1>
          <p className="text-sm text-slate-400">
            Timeline, captions and branding for this project&apos;s variations. Preview overlays are indicative — the
            Machine render burns them in.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/affiliates/studio/repurpose" className={GHOST}>← Repurposing Machine</Link>
          <button onClick={save} disabled={!dirty || busy === "save"} className={BTN} style={BTN_STYLE}>
            {busy === "save" ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
      {notice && <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">{notice}</div>}

      <div className="flex flex-wrap gap-2">
        {variations.map((v) => (
          <button
            key={v.id}
            onClick={() => selectVariation(v)}
            className={`px-3 py-1.5 rounded-lg font-mono text-[12px] ${v.id === selectedId ? "bg-sky-500/20 text-sky-200 border border-sky-400/40" : "border border-white/10 text-slate-400"}`}
          >
            {v.title}
          </button>
        ))}
      </div>

      {variations.length === 0 && (
        <section className="rounded-2xl border border-sky-400/25 bg-sky-500/[0.06] p-5 space-y-3">
          {project.analysisSummary ? (
            <>
              <h2 className="font-bold text-white">Analyzed and ready — no variations yet</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                This project has been analyzed, so it&apos;s ready to generate. Variations are created in the
                Repurposing Machine — pick how many you want and their creative directions there, and each one
                appears here for timeline, caption and branding edits.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-bold text-white">This project hasn&apos;t been analyzed yet</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                The editor works on generated variations, and variations are built from the video analysis — so a
                new project needs two quick steps in the Repurposing Machine first: <strong>1.</strong> analyze the
                video, then <strong>2.</strong> generate variations. After that, reopen this editor and your
                variations will be here to trim, caption and brand.
              </p>
            </>
          )}
          <Link href={`/affiliates/studio/repurpose?project=${project.id}`} className={BTN} style={BTN_STYLE}>
            Open this project in the Machine →
          </Link>
        </section>
      )}

      {comp && selected && (
        <div className="grid lg:grid-cols-2 gap-5 items-start">
          {/* Preview */}
          <div className="space-y-3 lg:sticky lg:top-4">
            <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10">
              {sourceUrl ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video ref={videoRef} src={sourceUrl} className="w-full max-h-[520px]" playsInline preload="auto" />
              ) : (
                <div className="p-8 text-sm text-slate-400">
                  This project&apos;s video isn&apos;t available in this browser session, so the preview can&apos;t play —
                  you can still edit the timeline and captions below.
                </div>
              )}
              {currentOverlays.map((o, i) => (
                <div
                  key={i}
                  className={`absolute left-0 right-0 px-4 text-center font-black text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] ${
                    o.position === "top" ? "top-3 text-lg" : o.position === "center" ? "top-1/2 -translate-y-1/2 text-lg" : "bottom-14 text-base"
                  }`}
                >
                  {o.text}
                </div>
              ))}
              {currentCue && (
                <div className="absolute left-0 right-0 bottom-4 px-6 text-center">
                  <span className="inline-block rounded-lg bg-black/60 px-3 py-1.5 text-[15px] font-bold text-white">
                    {currentCue.text}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={togglePlay} disabled={!sourceUrl} className={BTN} style={BTN_STYLE}>
                {playing ? "Pause" : "Play edit"}
              </button>
              <span className="font-mono text-[12px] text-slate-400">
                {outT.toFixed(1)}s / {compositionDuration(comp).toFixed(1)}s
              </span>
              <span className="ml-auto flex gap-2">
                <button onClick={undo} className={GHOST}>Undo</button>
                <button onClick={redo} className={GHOST}>Redo</button>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={makeThumbnail} disabled={!sourceUrl} className={GHOST}>
                Download thumbnail (current frame + hook)
              </button>
              <button onClick={makeCarousel} disabled={!sourceUrl || busy === "carousel"} className={GHOST}>
                {busy === "carousel" ? "Exporting…" : "Export carousel slides"}
              </button>
            </div>
            <p className="text-[12px] text-slate-500">
              Seek the preview by playing the edit, then grab a thumbnail at the frame you want. Thumbnails and slides
              are free — they&apos;re made in your browser.
            </p>
          </div>

          {/* Controls */}
          <div className="space-y-5">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
              <h3 className="font-bold text-white text-sm">Look &amp; branding</h3>
              <label className="block text-[12px] text-slate-400">
                Opening hook
                <input value={comp.hookText} onChange={(e) => setHook(e.target.value)} className={INPUT + " w-full mt-1"} />
              </label>
              <label className="block text-[12px] text-slate-400">
                Call to action (end of video)
                <input
                  value={comp.overlays.find((o) => o.kind === "cta")?.text ?? ""}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="Try WorldEye free"
                  className={INPUT + " w-full mt-1"}
                />
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="block text-[12px] text-slate-400">
                  Format
                  <select
                    value={comp.aspect}
                    onChange={(e) => apply({ ...comp, aspect: e.target.value as Aspect })}
                    className={INPUT + " w-full mt-1"}
                  >
                    {(["9:16", "1:1", "4:5", "16:9"] as Aspect[]).map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-[12px] text-slate-400">
                  Captions
                  <select
                    value={comp.captionPreset}
                    onChange={(e) => apply({ ...comp, captionPreset: e.target.value as RepurposeComposition["captionPreset"] })}
                    className={INPUT + " w-full mt-1"}
                  >
                    {CAPTION_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-[12px] text-slate-400">
                  Filter
                  <select
                    value={comp.filter}
                    onChange={(e) => apply({ ...comp, filter: e.target.value as RepurposeComposition["filter"] })}
                    className={INPUT + " w-full mt-1"}
                  >
                    {FILTERS.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-[13px] text-slate-300">
                <input
                  type="checkbox"
                  checked={comp.endCard}
                  onChange={(e) => apply({ ...comp, endCard: e.target.checked })}
                />
                Personalized end card (logo, link, QR, code)
              </label>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">Timeline segments</h3>
                <button onClick={addSeg} className={GHOST}>+ Add segment</button>
              </div>
              {comp.segments.map((s, i) => (
                <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-xl bg-black/20 border border-white/5 px-2.5 py-2">
                  <span className="font-mono text-[11px] text-slate-500 w-5">#{i + 1}</span>
                  <input type="number" step="0.1" min="0" value={s.startSec} onChange={(e) => patchSeg(i, { startSec: Number(e.target.value) })} className={NUM} title="Start (s)" />
                  <span className="text-slate-500">→</span>
                  <input type="number" step="0.1" min="0" value={s.endSec} onChange={(e) => patchSeg(i, { endSec: Number(e.target.value) })} className={NUM} title="End (s)" />
                  <select value={s.speed} onChange={(e) => patchSeg(i, { speed: Number(e.target.value) })} className={INPUT} title="Speed">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((v) => (
                      <option key={v} value={v}>{v}×</option>
                    ))}
                  </select>
                  <input value={s.label ?? ""} onChange={(e) => patchSeg(i, { label: e.target.value || undefined })} placeholder="Lower-third label" className={INPUT + " flex-1 min-w-[110px]"} />
                  <span className="flex gap-1">
                    <button onClick={() => moveSeg(i, -1)} className={GHOST} title="Move up">↑</button>
                    <button onClick={() => moveSeg(i, 1)} className={GHOST} title="Move down">↓</button>
                    <button onClick={() => splitSeg(i)} className={GHOST} title="Split at midpoint">Split</button>
                    <button onClick={() => dupSeg(i)} className={GHOST} title="Duplicate">Dup</button>
                    <button onClick={() => delSeg(i)} className={GHOST} title="Delete">✕</button>
                  </span>
                </div>
              ))}
              <p className="text-[12px] text-slate-500">Times are seconds into the SOURCE video. Save validates the timeline against the source length.</p>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-white text-sm">Captions</h3>
                <span className="flex gap-2">
                  <button onClick={cuesFromTranscript} className={GHOST}>From transcript</button>
                  <button onClick={aiRestyle} disabled={busy === "ai"} className={GHOST}>
                    {busy === "ai" ? "Queuing…" : "AI restyle (Cosmo)"}
                  </button>
                  <button onClick={addCue} className={GHOST}>+ Cue</button>
                </span>
              </div>
              {comp.captions.map((c, i) => (
                <div key={i} className="flex flex-wrap items-center gap-1.5 rounded-xl bg-black/20 border border-white/5 px-2.5 py-2">
                  <input type="number" step="0.1" min="0" value={c.startSec} onChange={(e) => patchCue(i, { startSec: Number(e.target.value) })} className={NUM} title="Start (output s)" />
                  <span className="text-slate-500">→</span>
                  <input type="number" step="0.1" min="0" value={c.endSec} onChange={(e) => patchCue(i, { endSec: Number(e.target.value) })} className={NUM} title="End (output s)" />
                  <input value={c.text} onChange={(e) => patchCue(i, { text: e.target.value })} className={INPUT + " flex-1 min-w-[140px]"} />
                  <button
                    onClick={() => apply({ ...comp, captions: comp.captions.filter((_, j) => j !== i) })}
                    className={GHOST}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <p className="text-[12px] text-slate-500">
                Caption times are on the OUTPUT timeline. Correct the words freely — they&apos;re burned into the render
                exactly as written. AI restyle is made to order by Cosmo (credits apply, result lands in My Creations).
              </p>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
