// Render pins for the globe panel's Premium section (node-only
// renderToString harness, same as ProUpgradeEmbed.test): the full
// premium list from lib/billing/premium-features with tier badges,
// the upgrade embed for free viewers only, and included-state rows —
// never a checkout embed — for premium viewers.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import PremiumSection from "./PremiumSection";
import { PREMIUM_FEATURES } from "@/lib/billing/premium-features";
import type { PlanTier } from "@/lib/plan-tier";

const render = (tier: PlanTier) =>
  renderToString(createElement(PremiumSection, { tier })).replace(/<!-- -->/g, "");

describe("PremiumSection", () => {
  it("lists every premium feature with its tier badge for a free viewer", () => {
    const html = render("free");
    expect(html).toContain("data-premium-section");
    for (const f of PREMIUM_FEATURES) {
      expect(html, f.name).toContain(f.name);
    }
    expect(html).toContain("VIP Pro");
    expect(html).not.toContain("Included");
  });

  it("gives a free viewer the existing upgrade embed", () => {
    const html = render("free");
    expect(html).toContain("data-pro-upgrade-embed");
    expect(html).toContain("WORLDEYE PRO");
  });

  it("shows a Pro viewer's Pro features as included and keeps VIP locked — no checkout embed", () => {
    const html = render("pro");
    expect(html).toContain("Pro active");
    expect(html).toContain("Included");
    // VIP-only rows stay locked and badged, never marked included wholesale:
    expect(html).toContain("Camera Timelapse");
    expect(html).not.toContain("data-pro-upgrade-embed");
    // The only upsell left is a plain pricing link.
    expect(html).toContain('href="/pricing"');
  });

  it("shows a VIP viewer everything included, with no embed and no upsell", () => {
    const html = render("vip");
    expect(html).toContain("VIP Pro active");
    expect(html).not.toContain("data-pro-upgrade-embed");
    expect(html).not.toContain('href="/pricing"');
    // No lock badges remain: every row's pill reads Included.
    expect(html).not.toContain(">Pro<");
    expect(html).not.toContain(">VIP Pro<");
  });
});
