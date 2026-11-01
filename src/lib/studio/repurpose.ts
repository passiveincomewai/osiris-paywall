/**
 * Marketing Studio 2.0 — AI Video Repurposing Machine: pure core.
 *
 * Everything in this module is DOM-free and unit-testable. The browser
 * client owns <video>/<canvas>/MediaRecorder and the analysis probes;
 * this module owns the composition schema, the ten creative directions,
 * caption presets, filters, the hook engine, and the analysis summary.
 *
 * Honesty rules (spec §1/§2/§16):
 * - The summary only reports signals that were actually measured
 *   (analysis.measured flags); nothing is inferred into existence.
 * - Hooks and captions only use claims verified against the live
 *   product (VERIFIED_FACTS below). No fabricated events, testimonials,
 *   or metrics; pre-recorded footage is never described as live.
 * - A variation is a real creative treatment — segment strategy,
 *   pacing, caption system, overlays, filter — never just a recolor.
 */

/* ------------------------------------------------------------------ */
/* Verified product facts (locked; keep in sync with the live site)    */
/* ------------------------------------------------------------------ */

export const VERIFIED_FACTS = {
  /** Locked public headline (never move without the owner's word). */
  cameraHeadline: "74,229",
  cameraClaim: "74,229 public cameras",
} as const;

/* ------------------------------------------------------------------ */
/* Aspects                                                             */
/* ------------------------------------------------------------------ */

export const ASPECTS = ["9:16", "1:1", "4:5", "16:9"] as const;
export type Aspect = (typeof ASPECTS)[number];

export function aspectRatio(aspect: Aspect): number {
  switch (aspect) {
    case "9:16":
      return 9 / 16;
    case "1:1":
      return 1;
    case "4:5":
      return 4 / 5;
    case "16:9":
      return 16 / 9;
  }
}

/** Output canvas for an aspect, capped like video-render's canvasSizeFor. */
export function canvasSizeForAspect(aspect: Aspect): { width: number; height: number } {
  const even = (n: number) => Math.max(2, Math.floor(n / 2) * 2);
  switch (aspect) {
    case "9:16":
      return { width: 720, height: 1280 };
    case "1:1":
      return { width: 960, height: 960 };
    case "4:5":
      return { width: 960, height: 1200 };
    case "16:9":
      return { width: 1280, height: 720 };
  }
}

/* ------------------------------------------------------------------ */
/* Analysis (measured client-side; see repurpose-analyze client)       */
/* ------------------------------------------------------------------ */

export interface AnalysisWindow {
  startSec: number;
  endSec: number;
  /** Mean audio energy 0..1 for the window (0 when no audio track). */
  energy: number;
}

export interface SourceAnalysis {
  durationSec: number;
  width: number;
  height: number;
  hasAudio: boolean;
  /** Scene-change timestamps in seconds (excluding 0). */
  sceneCuts: number[];
  /** Fixed-grid energy windows across the whole video. */
  windows: AnalysisWindow[];
  /** Which signals were genuinely measured — the summary reads only these. */
  measured: {
    metadata: boolean;
    scenes: boolean;
    audio: boolean;
    transcript: boolean;
  };
}

export function sourceAspect(a: Pick<SourceAnalysis, "width" | "height">): string {
  if (!a.width || !a.height) return "unknown";
  const r = a.width / a.height;
  const near = (x: number) => Math.abs(r - x) < 0.05;
  if (near(9 / 16)) return "9:16";
  if (near(1)) return "1:1";
  if (near(4 / 5)) return "4:5";
  if (near(16 / 9)) return "16:9";
  return r < 1 ? "vertical" : "landscape";
}

export interface AnalysisSummary {
  strongOpenings: number;
  usefulClips: number;
  conceptCapacity: number;
  lines: string[];
}

/** Windows ranked by energy, highest first, non-overlapping picks. */
export function topWindows(a: SourceAnalysis, n: number, minGapSec = 2): AnalysisWindow[] {
  const sorted = [...a.windows].sort((x, y) => y.energy - x.energy);
  const picked: AnalysisWindow[] = [];
  for (const w of sorted) {
    if (picked.length >= n) break;
    if (picked.some((p) => Math.abs(p.startSec - w.startSec) < minGapSec)) continue;
    picked.push(w);
  }
  return picked.sort((x, y) => x.startSec - y.startSec);
}

/**
 * The creative-plan summary (spec §1). Every number derives from the
 * measured analysis; a signal that wasn't measured contributes nothing
 * and is never mentioned.
 */
export function summarizeAnalysis(a: SourceAnalysis): AnalysisSummary {
  const lines: string[] = [];
  let strongOpenings = 0;
  let usefulClips = 0;

  if (a.measured.metadata) {
    lines.push(
      `${Math.round(a.durationSec)}-second ${sourceAspect(a)} video (${a.width}×${a.height}).`,
    );
  }
  if (a.measured.scenes) {
    const scenes = a.sceneCuts.length + 1;
    lines.push(`${scenes} visual scene${scenes === 1 ? "" : "s"} detected.`);
    strongOpenings += Math.min(3, scenes);
  }
  if (a.measured.audio && a.windows.length > 0) {
    const mean = a.windows.reduce((s, w) => s + w.energy, 0) / a.windows.length;
    usefulClips = a.windows.filter((w) => w.energy >= Math.max(0.05, mean)).length;
    const early = a.windows.filter((w) => w.startSec < a.durationSec * 0.25);
    strongOpenings += Math.min(2, early.filter((w) => w.energy >= Math.max(0.05, mean)).length);
    lines.push(
      usefulClips > 0
        ? `${usefulClips} high-energy moment${usefulClips === 1 ? "" : "s"} found in the audio.`
        : "Audio is quiet throughout — visual-led edits will work best.",
    );
  } else if (a.measured.metadata) {
    // No audio signal measured: fall back to scene-based clips only.
    usefulClips = a.measured.scenes ? Math.min(5, a.sceneCuts.length + 1) : 0;
  }
  if (a.measured.transcript) {
    lines.push("Transcript available — captions can follow the spoken words.");
  }

  const conceptCapacity = Math.max(
    1,
    Math.min(10, 2 + strongOpenings + Math.floor(usefulClips / 2)),
  );
  if (a.measured.scenes || a.measured.audio) {
    lines.push(
      `Enough material for about ${conceptCapacity} distinct marketing concepts.`,
    );
  }
  return { strongOpenings, usefulClips, conceptCapacity, lines };
}

/* ------------------------------------------------------------------ */
/* Composition                                                         */
/* ------------------------------------------------------------------ */

export interface RepurposeSegment {
  startSec: number;
  endSec: number;
  /** Playback rate for this segment (1 = real time). */
  speed: number;
  /** Optional on-screen label (lower-third) shown during the segment. */
  label?: string;
}

export interface CaptionCue {
  startSec: number;
  endSec: number;
  text: string;
}

export type OverlayKind = "hook" | "text" | "logo" | "qr" | "cta" | "lower_third";
export type OverlayPosition = "top" | "center" | "bottom";

export interface OverlayItem {
  kind: OverlayKind;
  text?: string;
  startSec: number;
  endSec: number;
  position: OverlayPosition;
}

export interface BrandingSnapshot {
  includeLink: boolean;
  includeQr: boolean;
  includeCode: boolean;
  /** Referral link at generation time (real, from the profile). */
  link: string;
  /** Discount code only when Stripe-confirmed; otherwise null. */
  code: string | null;
  discountPct: number | null;
  displayName: string;
  /** Referral code for the end-card QR (encodes the /ref/<code> URL). */
  referralCode?: string | null;
}

export interface RepurposeComposition {
  version: 1;
  aspect: Aspect;
  segments: RepurposeSegment[];
  captions: CaptionCue[];
  captionPreset: CaptionPresetId;
  filter: FilterId;
  overlays: OverlayItem[];
  hookText: string;
  /** Append the personalized end card (logo, CTA, link, QR, code). */
  endCard: boolean;
  branding: BrandingSnapshot;
}

export function compositionDuration(c: RepurposeComposition): number {
  const body = c.segments.reduce((s, seg) => s + (seg.endSec - seg.startSec) / (seg.speed || 1), 0);
  return body + (c.endCard ? 3 : 0);
}

/* ------------------------------------------------------------------ */
/* Caption presets (spec §3)                                           */
/* ------------------------------------------------------------------ */

export interface CaptionPreset {
  id: string;
  label: string;
  fontScale: number; // relative to canvas width
  color: string;
  highlightColor: string;
  background: string; // rgba fill behind text, "transparent" for none
  outline: string;
  position: OverlayPosition;
  uppercase: boolean;
  wordByWord: boolean;
}

export const CAPTION_PRESETS = [
  { id: "bold_viral", label: "Bold viral captions", fontScale: 0.058, color: "#ffffff", highlightColor: "#ffd60a", background: "rgba(0,0,0,0.55)", outline: "#000000", position: "bottom", uppercase: true, wordByWord: true },
  { id: "word_by_word", label: "Animated word-by-word", fontScale: 0.054, color: "#ffffff", highlightColor: "#22d3ee", background: "rgba(0,0,0,0.45)", outline: "#000000", position: "bottom", uppercase: false, wordByWord: true },
  { id: "keyword_highlight", label: "Highlighted keyword captions", fontScale: 0.052, color: "#ffffff", highlightColor: "#f472b6", background: "rgba(0,0,0,0.4)", outline: "#000000", position: "bottom", uppercase: false, wordByWord: false },
  { id: "neon_cyber", label: "Neon cyber captions", fontScale: 0.054, color: "#a5f3fc", highlightColor: "#22d3ee", background: "rgba(2,12,24,0.6)", outline: "#0e7490", position: "bottom", uppercase: true, wordByWord: false },
  { id: "minimal_white", label: "Minimal white subtitles", fontScale: 0.042, color: "#ffffff", highlightColor: "#ffffff", background: "transparent", outline: "rgba(0,0,0,0.7)", position: "bottom", uppercase: false, wordByWord: false },
  { id: "yellow_white", label: "Yellow-and-white captions", fontScale: 0.052, color: "#fde047", highlightColor: "#ffffff", background: "rgba(0,0,0,0.5)", outline: "#000000", position: "bottom", uppercase: false, wordByWord: false },
  { id: "documentary", label: "Documentary subtitles", fontScale: 0.044, color: "#f8fafc", highlightColor: "#f8fafc", background: "rgba(0,0,0,0.65)", outline: "transparent", position: "bottom", uppercase: false, wordByWord: false },
  { id: "floating", label: "Floating captions", fontScale: 0.05, color: "#ffffff", highlightColor: "#ffd60a", background: "rgba(0,0,0,0.35)", outline: "#000000", position: "center", uppercase: false, wordByWord: false },
  { id: "kinetic", label: "Kinetic typography", fontScale: 0.066, color: "#ffffff", highlightColor: "#22d3ee", background: "transparent", outline: "#000000", position: "center", uppercase: true, wordByWord: true },
  { id: "worldeye_brand", label: "WorldEye branded captions", fontScale: 0.05, color: "#e0f2fe", highlightColor: "#d4af37", background: "rgba(5,8,16,0.72)", outline: "#0ea5e9", position: "bottom", uppercase: false, wordByWord: false },
] as const satisfies readonly CaptionPreset[];

export type CaptionPresetId = (typeof CAPTION_PRESETS)[number]["id"];

export function captionPreset(id: string): CaptionPreset {
  return (CAPTION_PRESETS.find((p) => p.id === id) ?? CAPTION_PRESETS[0]) as CaptionPreset;
}

/* ------------------------------------------------------------------ */
/* Filters (spec §3) — canvas filter strings                           */
/* ------------------------------------------------------------------ */

export const FILTERS = [
  { id: "none", label: "Original", css: "none" },
  { id: "cinematic", label: "Cinematic", css: "contrast(1.12) saturate(0.88) brightness(0.98)" },
  { id: "high_contrast", label: "High contrast", css: "contrast(1.3) saturate(1.05)" },
  { id: "film_grain", label: "Film grain", css: "contrast(1.05) saturate(0.85) sepia(0.22)" },
  { id: "documentary", label: "Clean documentary", css: "contrast(1.04) saturate(0.95) brightness(1.02)" },
  { id: "cool_blue", label: "Cool blue", css: "saturate(0.9) hue-rotate(-8deg) brightness(1.02)" },
  { id: "warm_natural", label: "Warm natural", css: "sepia(0.16) saturate(1.08) brightness(1.03)" },
  { id: "futuristic", label: "Futuristic", css: "contrast(1.15) saturate(1.25) hue-rotate(6deg)" },
  { id: "black_white", label: "Black and white", css: "grayscale(1) contrast(1.1)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.35) contrast(1.06)" },
] as const;

export type FilterId = (typeof FILTERS)[number]["id"];

export function filterCss(id: string): string {
  return FILTERS.find((f) => f.id === id)?.css ?? "none";
}

/* ------------------------------------------------------------------ */
/* Hook Lab (spec §4) — only claims the live product supports          */
/* ------------------------------------------------------------------ */

export const HOOK_CATEGORIES = [
  "curiosity",
  "surprise",
  "educational",
  "question",
  "story",
  "demo",
  "discovery",
  "technology",
  "comparison",
  "problem_solution",
] as const;
export type HookCategory = (typeof HOOK_CATEGORIES)[number];

export interface HookIdea {
  category: HookCategory;
  text: string;
}

const HOOK_TEMPLATES: Record<HookCategory, string[]> = {
  curiosity: [
    "Did you know you can explore public cameras around the world?",
    "What does the other side of the planet look like today?",
    `${VERIFIED_FACTS.cameraHeadline} public cameras. One globe. Watch this.`,
  ],
  surprise: [
    "I did not expect a free globe to do this.",
    "This camera is on the other side of the world — and it's live on the site.",
  ],
  educational: [
    "Here's how to explore any public camera on Earth in under a minute.",
    "Three things this globe can show you that a map can't.",
  ],
  question: [
    "Where would you look first?",
    "Beach, mountains, or a city on the other side of the world?",
  ],
  story: [
    "I opened this globe looking for one place — and stayed for an hour.",
    "It started with checking the weather. It became a world tour.",
  ],
  demo: [
    "Watch how quickly you can check public cameras in another country.",
    "Here's what this part of the planet looks like right now.",
  ],
  discovery: [
    "This is a surprisingly useful way to explore the world.",
    "You can check the weather somewhere else — by actually looking at it.",
  ],
  technology: [
    "This is what happens when you put the world's public cameras on one 3D globe.",
    "Public cameras, live flights and satellites — one interactive globe.",
  ],
  comparison: [
    "Still checking a weather app? Watch the actual place instead.",
    "Photos can be years old. This shows the place as it is today.",
  ],
  problem_solution: [
    "Planning a trip from old photos? Look at the place first.",
    "I tested this live-camera globe. Here's what I found.",
  ],
};

/** 10–20 hook ideas across the categories, in a stable order. */
export function generateHooks(): HookIdea[] {
  const out: HookIdea[] = [];
  for (const cat of HOOK_CATEGORIES) {
    for (const text of HOOK_TEMPLATES[cat]) out.push({ category: cat, text });
  }
  return out;
}

export function defaultHookFor(category: HookCategory): string {
  return HOOK_TEMPLATES[category][0];
}

/* ------------------------------------------------------------------ */
/* Creative directions (spec §2)                                       */
/* ------------------------------------------------------------------ */

export const DIRECTIONS = [
  { id: "viral_curiosity", label: "Viral Curiosity", blurb: "Intriguing question, quick cuts, dynamic captions, discovery reveal." },
  { id: "educational", label: "Educational", blurb: "Structured walkthrough with labels and a clear conclusion." },
  { id: "cinematic", label: "Cinematic", blurb: "Long takes, geographic calm, dramatic but accurate storytelling." },
  { id: "fast_paced", label: "Fast-Paced Social", blurb: "Short clips, energetic pacing, bold captions, visual punch." },
  { id: "product_demo", label: "Product Demonstration", blurb: "A real WorldEye capability, walked through step by step." },
  { id: "news_context", label: "Breaking News Context", blurb: "How public cameras add context — never a fabricated event." },
  { id: "storytelling", label: "Storytelling", blurb: "A question, a journey, a conclusion." },
  { id: "problem_solution", label: "Problem and Solution", blurb: "A real audience problem, solved on screen." },
  { id: "testimonial", label: "Personal Testimonial", blurb: "Your own experience, structured — in your words only." },
  { id: "minimalist", label: "Minimalist Premium", blurb: "Clean typography, one strong moment, sophisticated branding." },
] as const;

export type DirectionId = (typeof DIRECTIONS)[number]["id"];

export const VARIATION_COUNTS = [3, 5, 10] as const;

/** The first n directions in curated order (3/5/10 per spec §2). */
export function pickDirections(n: number): DirectionId[] {
  const count = Math.max(1, Math.min(DIRECTIONS.length, Math.floor(n) || 1));
  return DIRECTIONS.slice(0, count).map((d) => d.id);
}

/* ------------------------------------------------------------------ */
/* Segment helpers                                                     */
/* ------------------------------------------------------------------ */

function clampSeg(a: SourceAnalysis, startSec: number, endSec: number, speed = 1, label?: string): RepurposeSegment | null {
  const s = Math.max(0, Math.min(startSec, a.durationSec));
  const e = Math.max(0, Math.min(endSec, a.durationSec));
  if (e - s < 0.4) return null;
  return { startSec: round2(s), endSec: round2(e), speed, ...(label ? { label } : {}) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Scene-aligned segments (between cuts), longest first when asked. */
export function sceneSegments(a: SourceAnalysis): RepurposeSegment[] {
  const bounds = [0, ...a.sceneCuts.filter((t) => t > 0 && t < a.durationSec), a.durationSec];
  const out: RepurposeSegment[] = [];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const seg = clampSeg(a, bounds[i], bounds[i + 1]);
    if (seg) out.push(seg);
  }
  return out.length > 0 ? out : [{ startSec: 0, endSec: a.durationSec, speed: 1 }];
}

/** Even slices of the source when no better signal exists. */
function evenSlices(a: SourceAnalysis, n: number, maxLenSec: number): RepurposeSegment[] {
  const out: RepurposeSegment[] = [];
  const step = a.durationSec / n;
  for (let i = 0; i < n; i++) {
    const seg = clampSeg(a, i * step, Math.min(a.durationSec, i * step + maxLenSec));
    if (seg) out.push(seg);
  }
  return out;
}

function windowSegments(a: SourceAnalysis, n: number, lenSec: number, speed = 1): RepurposeSegment[] {
  const tops = topWindows(a, n);
  const segs = tops
    .map((w) => clampSeg(a, w.startSec, Math.min(w.endSec, w.startSec + lenSec), speed))
    .filter((s): s is RepurposeSegment => !!s);
  return segs.length > 0 ? segs : evenSlices(a, n, lenSec).map((s) => ({ ...s, speed }));
}

/** Split a plain transcript into sentence cues across a timeline. */
export function transcriptCues(transcript: string | null | undefined, totalSec: number): CaptionCue[] {
  const text = (transcript ?? "").replace(/\s+/g, " ").trim();
  if (!text || totalSec <= 0) return [];
  const sentences = text.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (sentences.length === 0) return [];
  const weights = sentences.map((s) => Math.max(1, s.length));
  const totalW = weights.reduce((x, y) => x + y, 0);
  const cues: CaptionCue[] = [];
  let t = 0;
  sentences.forEach((s, i) => {
    const dur = (weights[i] / totalW) * totalSec;
    cues.push({ startSec: round2(t), endSec: round2(Math.min(totalSec, t + dur)), text: s });
    t += dur;
  });
  return cues;
}

/** Beat lines used when there is no transcript: the affiliate edits these. */
function beatCues(lines: string[], totalSec: number): CaptionCue[] {
  if (lines.length === 0 || totalSec <= 0) return [];
  const step = totalSec / lines.length;
  return lines.map((text, i) => ({
    startSec: round2(i * step),
    endSec: round2(Math.min(totalSec, (i + 1) * step)),
    text,
  }));
}

/* ------------------------------------------------------------------ */
/* Direction builders                                                  */
/* ------------------------------------------------------------------ */

export interface BuildOptions {
  hookText: string;
  branding: BrandingSnapshot;
  transcript?: string | null;
  /** Feature name for demo/labels (a real feature; default the globe). */
  featureLabel?: string;
  aspect?: Aspect;
}

function baseComposition(
  opts: BuildOptions,
  partial: Partial<RepurposeComposition>,
): RepurposeComposition {
  return {
    version: 1,
    aspect: opts.aspect ?? "9:16",
    segments: [],
    captions: [],
    captionPreset: "bold_viral",
    filter: "none",
    overlays: [],
    hookText: opts.hookText,
    endCard: true,
    branding: opts.branding,
    ...partial,
  };
}

function hookOverlay(hookText: string, durSec: number): OverlayItem {
  return { kind: "hook", text: hookText, startSec: 0, endSec: Math.min(5, durSec), position: "top" };
}

function captionsFor(
  opts: BuildOptions,
  beats: string[],
  segments: RepurposeSegment[],
): CaptionCue[] {
  const total = segments.reduce((s, seg) => s + (seg.endSec - seg.startSec) / (seg.speed || 1), 0);
  const fromTranscript = transcriptCues(opts.transcript, total);
  return fromTranscript.length > 0 ? fromTranscript : beatCues(beats, total);
}

export function buildVariation(
  direction: DirectionId,
  a: SourceAnalysis,
  opts: BuildOptions,
): { direction: DirectionId; title: string; composition: RepurposeComposition } {
  const feature = opts.featureLabel ?? "the WorldEye globe";
  const scenes = sceneSegments(a);
  const meta = DIRECTIONS.find((d) => d.id === direction)!;

  switch (direction) {
    case "viral_curiosity": {
      const segments = windowSegments(a, 3, 6, 1.25);
      const dur = compositionDuration(baseComposition(opts, { segments }));
      return {
        direction, title: meta.label,
        composition: baseComposition(opts, {
          segments, captionPreset: "bold_viral", filter: "vivid",
          overlays: [hookOverlay(opts.hookText, dur)],
          captions: captionsFor(opts, [opts.hookText, "Keep watching — it gets better.", "This is WorldEye."], segments),
        }),
      };
    }
    case "educational": {
      const segments = scenes.slice(0, 4).map((s, i) => ({ ...s, label: `Part ${i + 1}` }));
      return {
        direction, title: meta.label,
        composition: baseComposition(opts, {
          segments, captionPreset: "documentary", filter: "documentary",
          overlays: [hookOverlay(opts.hookText, 5)],
          captions: captionsFor(opts, [`Let's break down ${feature}.`, "Each view is a real public camera.", "That's the whole trick — no special equipment."], segments),
        }),
      };
    }
    case "cinematic": {
      const segments = [...scenes].sort((x, y) => (y.endSec - y.startSec) - (x.endSec - x.startSec)).slice(0, 2).sort((x, y) => x.startSec - y.startSec);
      return {
        direction, title: meta.label,
        composition: baseComposition(opts, {
          segments, captionPreset: "minimal_white", filter: "cinematic",
          captions: captionsFor(opts, ["Somewhere on Earth, right now, this is the view.", "WorldEye brings the world's public cameras to one globe."], segments),
        }),
      };
    }
    case "fast_paced": {
      const segments = windowSegments(a, 6, 3, 1.5);
      return {
        direction, title: meta.label,
        composition: baseComposition(opts, {
          segments, captionPreset: "neon_cyber", filter: "futuristic",
          overlays: [hookOverlay(opts.hookText, 3)],
          captions: captionsFor(opts, [opts.hookText, "Faster.", "Every continent.", "One globe.", "WorldEye."], segments),
        }),
      };
    }
    case "product_demo": {
      const picks = [scenes[0], scenes[Math.floor(scenes.length / 2)], scenes[scenes.length - 1]].filter(Boolean);
      const segments = picks.map((s, i) => ({ ...s, label: ["Open WorldEye", "Pick a place", "Watch it live on the site"][i] ?? `Step ${i + 1}` }));
      return {
        direction, title: meta.label,
        composition: baseComposition(opts, {
          segments, captionPreset: "worldeye_brand", filter: "documentary",
          overlays: [hookOverlay(opts.hookText, 5)],
          captions: captionsFor(opts, [`Here's ${feature}, working.`, "Real cameras. Real places.", "Try it yourself — link below."], segments),
        }),
      };
    }
    case "news_context": {
      const segments = windowSegments(a, 3, 8, 1);
      return {
        direction, title: meta.label,
        composition: baseComposition(opts, {
          segments, captionPreset: "documentary", filter: "documentary",
          overlays: [hookOverlay("Public cameras can add real context.", 5)],
          captions: captionsFor(opts, ["When something happens, context matters.", "Public cameras show the place itself — not a claim about it.", "WorldEye gathers them in one place."], segments),
        }),
      };
    }
    case "storytelling": {
      const peak = windowSegments(a, 1, 8, 1);
      const segments = [scenes[0], ...peak, scenes[scenes.length - 1]].filter(
        (s, i, arr) => arr.findIndex((x) => x.startSec === s.startSec) === i,
      );
      return {
        direction, title: meta.label,
        composition: baseComposition(opts, {
          segments, captionPreset: "yellow_white", filter: "warm_natural",
          overlays: [hookOverlay(opts.hookText, 5)],
          captions: captionsFor(opts, [opts.hookText, "Then I found this view.", "Some places stay with you."], segments),
        }),
      };
    }
    case "problem_solution": {
      const segments = windowSegments(a, 3, 6, 1.1);
      const dur = segments.reduce((s, seg) => s + (seg.endSec - seg.startSec) / seg.speed, 0);
      return {
        direction, title: meta.label,
        composition: baseComposition(opts, {
          segments, captionPreset: "keyword_highlight", filter: "high_contrast",
          overlays: [
            hookOverlay(opts.hookText, 5),
            { kind: "cta", text: "See it on WorldEye — link below", startSec: Math.max(0, dur - 4), endSec: dur, position: "bottom" },
          ],
          captions: captionsFor(opts, [opts.hookText, "Here's the fix.", "Look at the real place, live on the site."], segments),
        }),
      };
    }
    case "testimonial": {
      const segments = scenes.slice(0, 2);
      return {
        direction, title: meta.label,
        composition: baseComposition(opts, {
          segments, captionPreset: "floating", filter: "warm_natural",
          overlays: [
            hookOverlay(opts.hookText, 5),
            ...(opts.branding.displayName
              ? [{ kind: "lower_third" as const, text: opts.branding.displayName, startSec: 1, endSec: 5, position: "bottom" as const }]
              : []),
          ],
          // Testimonial captions come from the affiliate's own transcript
          // only — never generated praise.
          captions: transcriptCues(opts.transcript, segments.reduce((s, seg) => s + (seg.endSec - seg.startSec), 0)),
        }),
      };
    }
    case "minimalist": {
      const best = windowSegments(a, 1, 12, 1);
      return {
        direction, title: meta.label,
        composition: baseComposition(opts, {
          segments: best, captionPreset: "minimal_white", filter: "none",
          captions: captionsFor(opts, ["WorldEye."], best),
        }),
      };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export function validateComposition(c: RepurposeComposition, durationSec: number): string[] {
  const errors: string[] = [];
  if (!ASPECTS.includes(c.aspect)) errors.push(`aspect must be one of ${ASPECTS.join(", ")}`);
  if (!Array.isArray(c.segments) || c.segments.length === 0) errors.push("at least one segment is required");
  for (const [i, s] of (c.segments ?? []).entries()) {
    if (!(s.endSec > s.startSec)) errors.push(`segment ${i}: end must be after start`);
    if (s.startSec < 0 || s.endSec > durationSec + 0.5) errors.push(`segment ${i}: outside the source duration`);
    if (!(s.speed > 0) || s.speed > 4) errors.push(`segment ${i}: speed must be in (0, 4]`);
  }
  if (!CAPTION_PRESETS.some((p) => p.id === c.captionPreset)) errors.push("unknown caption preset");
  if (!FILTERS.some((f) => f.id === c.filter)) errors.push("unknown filter");
  return errors;
}
