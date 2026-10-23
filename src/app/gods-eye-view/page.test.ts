// Conversion-pass pins for /gods-eye-view:
//  - the fenced facts render correctly (74,229 cameras; GEV ~4,000 —
//    the stale ~800 figure must never come back);
//  - the hero offers both ways forward (globe now, plans);
//  - trial facts are rendered FROM the billing config, never restated,
//    and the trial durations stay pinned to src/lib/billing/trials;
//  - the guarantee sentence is the canonical one from /pricing;
//  - the live proof strip uses the real showcase pipeline and deep-links
//    cameras onto the globe; the sticky bar is mobile-only + dismissible.
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import GodsEyeViewPage from "./page";
import { TRIAL_PLAN_OPTIONS } from "@/lib/billing/trial-checkout";
import { TRIAL_DAYS } from "@/lib/billing/trials";

const src = (rel: string) =>
  readFileSync(join(process.cwd(), "src", rel), "utf8");

const html = renderToString(GodsEyeViewPage())
  .replace(/<!-- -->/g, "")
  .replace(/&amp;/g, "&");

describe("gods-eye-view page — fenced facts", () => {
  it("states the exact served camera count and GEV's ~4,000, never ~800", () => {
    expect(html).toContain("74,229");
    expect(html).toContain("~4,000");
    const all = [
      src("app/gods-eye-view/page.tsx"),
      src("components/GodsEyeLiveStrip.tsx"),
      src("components/GodsEyeStickyCta.tsx"),
    ].join("\n");
    expect(all).not.toMatch(/~800|roughly 800|800 cameras/);
  });

  it("credits GEV's keyless start and states the key requirements fairly", () => {
    expect(html).toContain("starts with no account or API keys");
    expect(html).toContain("Cesium ion token or a Google Maps key");
    expect(html).toContain("Free — open source (MIT)");
  });

  it("carries the canonical 7-day first-charge guarantee sentence", () => {
    expect(html).toContain(
      "Covered by a 7-day money-back guarantee on your first charge",
    );
  });
});

describe("gods-eye-view page — conversion structure", () => {
  it("hero offers the globe first and plans second, with tracked links", () => {
    expect(html).toContain("Open the live globe — free");
    expect(html).toContain("See plans");
    expect(html).toContain('href="/?utm_source=gods-eye-view&utm_medium=hero"');
    expect(html).toContain('href="/pricing"');
  });

  it("closing CTA carries its own tracked globe link", () => {
    expect(html).toContain('href="/?utm_source=gods-eye-view&utm_medium=closing"');
  });

  it("keeps the honest sections: starter itinerary and the limits", () => {
    expect(html).toContain("Five places to");
    expect(html).toContain("can’t do");
  });
});

describe("gods-eye-view page — trial section from billing config", () => {
  it("trial durations stay pinned to the checkout config", () => {
    expect(TRIAL_DAYS.weekly).toBe(3);
    expect(TRIAL_DAYS.monthly).toBe(3);
    expect(TRIAL_DAYS.annual).toBe(3);
  });

  it("renders every trial plan's real name, price and note from the config", () => {
    for (const p of TRIAL_PLAN_OPTIONS) {
      expect(html).toContain(p.name);
      expect(html).toContain(p.price);
      expect(html).toContain(p.note);
    }
    // The page must import the options, not restate a second copy.
    expect(src("app/gods-eye-view/page.tsx")).toContain("TRIAL_PLAN_OPTIONS");
  });
});

describe("live proof strip + sticky CTA", () => {
  it("strip resolves real stills via the showcase route and deep-links cameras", () => {
    const strip = src("components/GodsEyeLiveStrip.tsx");
    expect(strip).toContain("/api/cctv/showcase?category=featured");
    expect(strip).toContain("/?camera=");
    // The LIVE badge is earned on load, and a failed frame hides its card.
    expect(strip).toContain("onLoad");
    expect(strip).toContain("onError");
  });

  it("sticky bar is mobile-only, session-dismissible, and tracked", () => {
    const sticky = src("components/GodsEyeStickyCta.tsx");
    expect(sticky).toContain("md:hidden");
    expect(sticky).toContain("sessionStorage");
    expect(sticky).toContain("utm_medium=sticky-bar");
    expect(sticky).toContain("Open WorldEye — free");
  });
});
