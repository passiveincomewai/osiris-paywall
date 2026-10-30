// Video-styles pins. The lab analyses FORMAT only, from each video's
// published chapter list + description. Hard rules under test: the
// originals are linked (never rehosted), every style carries a full
// breakdown + a recreation prompt, the prompt stays inside the
// programme's truthful-claims rules and carries the {LINK} +
// disclosure requirement — and NO view counts appear anywhere,
// because per-video counts were not verifiable from the public
// pages when checked (2026-10-30).
import { describe, it, expect } from "vitest";
import { VIDEO_STYLES } from "./video-styles";

describe("VIDEO_STYLES", () => {
  it("has three styles with unique ids, all linking to the original YouTube videos", () => {
    expect(VIDEO_STYLES.length).toBe(3);
    expect(new Set(VIDEO_STYLES.map((s) => s.id)).size).toBe(3);
    for (const s of VIDEO_STYLES) {
      expect(s.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=[\w-]+$/);
      expect(s.creator).toContain("Bilawal Sidhu");
    }
  });

  it("every style has a complete breakdown", () => {
    for (const s of VIDEO_STYLES) {
      expect(s.hook.length).toBeGreaterThan(40);
      expect(s.structure.length).toBeGreaterThanOrEqual(3);
      expect(s.pacing.length).toBeGreaterThan(20);
      expect(s.onScreenText.length).toBeGreaterThan(20);
      expect(s.cta.length).toBeGreaterThan(10);
      expect(s.formatNote).toMatch(/chapters/);
    }
  });

  it("contains no view counts or audience-size claims anywhere", () => {
    const all = JSON.stringify(VIDEO_STYLES);
    expect(all).not.toMatch(/\b\d[\d.,]*\s*[MK]?\s*\+?\s*views?\b/i);
    expect(all).not.toContain("750M");
    expect(all).not.toContain("500M");
    expect(all).not.toContain("5M+");
    expect(all).not.toMatch(/subscribers/i);
  });

  it("every prompt package is self-contained, truthful, and carries the link + disclosure", () => {
    for (const s of VIDEO_STYLES) {
      expect(s.promptPackage).toContain("{LINK}");
      expect(s.promptPackage).toContain("74,229");
      expect(s.promptPackage).toContain("#ad");
      expect(s.promptPackage).toMatch(/original/i);
      expect(s.promptPackage).toMatch(/never copy/i);
    }
  });
});
