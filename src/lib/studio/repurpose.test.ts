// Repurposing Machine pure-core tests: honest analysis summary,
// materially distinct directions, hook claims, composition validation.
import { describe, it, expect } from "vitest";
import {
  ASPECTS,
  DIRECTIONS,
  applyBrandingOverrides,
  buildPostDescription,
  buildVariation,
  canvasSizeForAspect,
  codeIsOutdated,
  compositionDuration,
  creativeUrl,
  generateHooks,
  pickDirections,
  summarizeAnalysis,
  transcriptCues,
  validateComposition,
  type BrandingSnapshot,
  type SourceAnalysis,
} from "./repurpose";

const branding: BrandingSnapshot = {
  includeLink: true,
  includeQr: true,
  includeCode: true,
  link: "https://worldeye.app/ref/TEST",
  code: "TEST15",
  discountPct: 15,
  displayName: "Test Affiliate",
};

function analysis(over: Partial<SourceAnalysis> = {}): SourceAnalysis {
  const windows = Array.from({ length: 12 }, (_, i) => ({
    startSec: i * 5,
    endSec: i * 5 + 5,
    energy: [0.1, 0.8, 0.2, 0.9, 0.3, 0.7, 0.15, 0.85, 0.25, 0.6, 0.2, 0.4][i],
  }));
  return {
    durationSec: 60,
    width: 1080,
    height: 1920,
    hasAudio: true,
    sceneCuts: [12, 30, 47],
    windows,
    measured: { metadata: true, scenes: true, audio: true, transcript: false },
    ...over,
  };
}

describe("summarizeAnalysis — honesty", () => {
  it("reports only measured signals", () => {
    const s = summarizeAnalysis(analysis());
    expect(s.lines.join(" ")).toContain("60-second");
    expect(s.lines.join(" ")).toContain("4 visual scenes");
    expect(s.usefulClips).toBeGreaterThan(0);
    expect(s.lines.join(" ")).not.toContain("Transcript");
  });

  it("claims nothing when nothing was measured", () => {
    const s = summarizeAnalysis(
      analysis({ measured: { metadata: false, scenes: false, audio: false, transcript: false } }),
    );
    expect(s.strongOpenings).toBe(0);
    expect(s.usefulClips).toBe(0);
    expect(s.lines).toHaveLength(0);
  });

  it("concept capacity is capped at 10", () => {
    const s = summarizeAnalysis(analysis());
    expect(s.conceptCapacity).toBeLessThanOrEqual(10);
    expect(s.conceptCapacity).toBeGreaterThanOrEqual(1);
  });
});

describe("directions", () => {
  it("pickDirections returns the curated prefix", () => {
    expect(pickDirections(3)).toEqual(["viral_curiosity", "educational", "cinematic"]);
    expect(pickDirections(10)).toHaveLength(10);
    expect(pickDirections(99)).toHaveLength(10);
  });

  it("every direction builds a valid composition within the source", () => {
    const a = analysis();
    for (const d of DIRECTIONS) {
      const v = buildVariation(d.id, a, { hookText: "A hook", branding });
      expect(validateComposition(v.composition, a.durationSec)).toEqual([]);
      expect(v.composition.segments.length).toBeGreaterThan(0);
      expect(compositionDuration(v.composition)).toBeGreaterThan(0);
    }
  });

  it("directions are materially distinct treatments, not recolors", () => {
    const a = analysis();
    const viral = buildVariation("viral_curiosity", a, { hookText: "H", branding }).composition;
    const cine = buildVariation("cinematic", a, { hookText: "H", branding }).composition;
    const fast = buildVariation("fast_paced", a, { hookText: "H", branding }).composition;
    const mini = buildVariation("minimalist", a, { hookText: "H", branding }).composition;
    // Different segment strategies
    expect(viral.segments.length).not.toBe(cine.segments.length);
    expect(fast.segments.every((s) => s.speed === 1.5)).toBe(true);
    expect(cine.segments.every((s) => s.speed === 1)).toBe(true);
    // Different caption systems and filters
    expect(viral.captionPreset).not.toBe(cine.captionPreset);
    expect(fast.filter).not.toBe(mini.filter);
    expect(mini.segments).toHaveLength(1);
  });

  it("testimonial captions come only from the affiliate's own transcript", () => {
    const a = analysis();
    const noTx = buildVariation("testimonial", a, { hookText: "H", branding }).composition;
    expect(noTx.captions).toEqual([]);
    const withTx = buildVariation("testimonial", a, {
      hookText: "H",
      branding,
      transcript: "I use it every morning. It changed how I plan trips.",
    }).composition;
    expect(withTx.captions.length).toBeGreaterThan(0);
    expect(withTx.captions.map((c) => c.text).join(" ")).toContain("I use it every morning");
  });

  it("news context never invents an event", () => {
    const a = analysis();
    const v = buildVariation("news_context", a, { hookText: "H", branding }).composition;
    const allText = [...v.captions.map((c) => c.text), ...v.overlays.map((o) => o.text ?? "")].join(" ");
    expect(allText).toContain("context");
    expect(allText.toLowerCase()).not.toMatch(/earthquake|explosion|attack|shooting|crash/);
  });
});

describe("hooks", () => {
  it("generates 10–20+ ideas across all categories with only verified claims", () => {
    const hooks = generateHooks();
    expect(hooks.length).toBeGreaterThanOrEqual(10);
    const cats = new Set(hooks.map((h) => h.category));
    expect(cats.size).toBe(10);
    const all = hooks.map((h) => h.text).join(" ");
    expect(all).not.toMatch(/guaranteed|go viral|make money fast/i);
  });
});

describe("transcriptCues + aspects + validation", () => {
  it("splits sentences across the timeline in order", () => {
    const cues = transcriptCues("One. Two! Three?", 30);
    expect(cues).toHaveLength(3);
    expect(cues[0].startSec).toBe(0);
    expect(cues[2].endSec).toBeLessThanOrEqual(30);
  });

  it("canvas sizes are even and capped per aspect", () => {
    for (const aspect of ASPECTS) {
      const s = canvasSizeForAspect(aspect);
      expect(s.width % 2).toBe(0);
      expect(s.height % 2).toBe(0);
      expect(s.width).toBeLessThanOrEqual(1280);
      expect(s.height).toBeLessThanOrEqual(1280);
    }
  });

  it("validation catches out-of-range segments and unknown presets", () => {
    const a = analysis();
    const v = buildVariation("cinematic", a, { hookText: "H", branding }).composition;
    const bad = { ...v, segments: [{ startSec: 50, endSec: 90, speed: 1 }] };
    expect(validateComposition(bad, 60).length).toBeGreaterThan(0);
    const badPreset = { ...v, captionPreset: "nope" as never };
    expect(validateComposition(badPreset, 60).join(" ")).toContain("caption preset");
  });

  it("branding overrides can only remove, never invent a code", () => {
    const noCode: BrandingSnapshot = { ...branding, code: null, includeCode: false };
    const forced = applyBrandingOverrides(noCode, { includeCode: true });
    expect(forced.includeCode).toBe(false);
    const withCode = applyBrandingOverrides(branding, { includeQr: false });
    expect(withCode.includeQr).toBe(false);
    expect(withCode.includeCode).toBe(true);
  });

  it("post description carries hook, tracked creative URL, real code line and #ad", () => {
    const d = buildPostDescription({
      hookText: "Watch this.",
      link: "https://worldeye.app/ref/ABC?t=tokyo",
      creativeId: "v_123",
      code: "SAVE15",
      discountPct: 15,
    });
    expect(d).toContain("Watch this.");
    expect(d).toContain("https://worldeye.app/ref/ABC?t=tokyo&utm_content=v_123");
    expect(d).toContain("Use code SAVE15 for 15% off your first payment.");
    expect(d.trim().endsWith("#ad")).toBe(true);
    const bare = buildPostDescription({ hookText: "H", link: "https://worldeye.app/ref/ABC", creativeId: "v_9" });
    expect(bare).not.toContain("code");
    expect(bare).toContain("?utm_content=v_9");
  });

  it("creativeUrl picks the right separator and outdated-code logic is snapshot-based", () => {
    expect(creativeUrl("https://x.test/ref/A", "v_1")).toBe("https://x.test/ref/A?utm_content=v_1");
    expect(codeIsOutdated(null, "NEW")).toBe(false);
    expect(codeIsOutdated("OLD", "OLD")).toBe(false);
    expect(codeIsOutdated("OLD", "NEW")).toBe(true);
    expect(codeIsOutdated("OLD", null)).toBe(true);
  });
});
