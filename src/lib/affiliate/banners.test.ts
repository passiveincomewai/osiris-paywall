// Banner artwork pins. The regression under test: the resources page's
// "Copy HTML" snippet used to hotlink /og-image.png for every design, so
// the copied embed never showed the design on screen. The artwork now
// lives in BANNER_DESIGNS as self-contained SVGs, served per-design from
// /affiliate-banners/<slug>.svg. These tests pin: one hosted URL per
// design, valid SVG framing at the declared size, truthful copy only
// (the locked 74,229 figure), and NO referral data inside the artwork.
import { describe, it, expect } from "vitest";
import { BANNER_DESIGNS, bannerBySlug, bannerImageUrl } from "./banners";

describe("BANNER_DESIGNS", () => {
  it("has at least four designs with unique slugs", () => {
    expect(BANNER_DESIGNS.length).toBeGreaterThanOrEqual(4);
    const slugs = BANNER_DESIGNS.map((b) => b.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("every design renders a standalone SVG at its declared size", () => {
    for (const b of BANNER_DESIGNS) {
      const svg = b.svg();
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain(`viewBox="0 0 ${b.width} ${b.height}"`);
      expect(svg).toContain(`width="${b.width}"`);
      expect(svg).toContain(`height="${b.height}"`);
      expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    }
  });

  it("artwork carries no referral data, links, or scripts", () => {
    for (const b of BANNER_DESIGNS) {
      const svg = b.svg();
      expect(svg).not.toMatch(/ref=|\?r=|affiliate|referral/i);
      expect(svg).not.toContain("<script");
      expect(svg).not.toContain("href=");
      // No external assets: the only URL allowed is the SVG namespace.
      const urls = svg.match(/https?:\/\/[^"'\s]+/g) ?? [];
      for (const u of urls) expect(u).toBe("http://www.w3.org/2000/svg");
    }
  });

  it("copy stays truthful: WorldEye branding, and the one network figure is the locked 74,229", () => {
    for (const b of BANNER_DESIGNS) {
      const svg = b.svg();
      expect(svg).toMatch(/WORLDEYE/);
      const figures = svg.match(/\b\d{2,3},\d{3}\b/g) ?? [];
      for (const f of figures) expect(f).toBe("74,229");
    }
  });

  it("bannerBySlug + bannerImageUrl resolve every design to its hosted URL", () => {
    for (const b of BANNER_DESIGNS) {
      expect(bannerBySlug(b.slug)).toBe(b);
      expect(bannerImageUrl(b.slug)).toBe(`https://worldeye.app/affiliate-banners/${b.slug}.svg`);
    }
    expect(bannerBySlug("does-not-exist")).toBeUndefined();
  });
});
