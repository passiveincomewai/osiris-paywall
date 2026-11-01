// TrialCtaSection pins:
//  - plan facts render FROM the billing config (name, price, per-day,
//    note, trial label for every grid plan) — the component never
//    restates a price of its own;
//  - the guarantee line is the canonical /pricing sentence, verbatim;
//  - each tier card's trial button starts its selected plan's
//    embedded checkout in place; secondary opens the free globe with
//    the page's utm_source;
//  - no hype mechanics: no scarcity, countdown or urgency copy.
//
// Phase D (2026-10-30): the cards became the 3×3 grid (three tier
// cards × three period rows). Two pins were updated with it, purpose
// preserved: the config-import pin now names TIER_PLAN_OPTIONS (the
// grid table the cards render), and the per-plan CTA pin now checks
// the three rendered CTAs — one per tier card, each its selected
// (annual, by default) option's own button. All nine plans' facts
// still render (the rows), pinned by the facts test below.
//
// 2026-10-31 (owner order): the section's CTA is a real HTML button
// again — the trial artwork rendered as a tiny pill on these cards —
// so the CTA pin checks the three visible HTML buttons carrying the
// selected option's CTA copy and pins the artwork's absence here
// (/pricing still uses the artwork; this section must not).
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import TrialCtaSection, { TRIAL_CTA_GUARANTEE } from "./TrialCtaSection";
import { GRID_PLAN_OPTIONS, TRIAL_PLAN_OPTIONS } from "@/lib/billing/trial-checkout";

const html = renderToString(createElement(TrialCtaSection, { utmSource: "cameras" }))
  .replace(/<!-- -->/g, "")
  .replace(/&#x27;/g, "'")
  .replace(/&amp;/g, "&");

const source = readFileSync(join(process.cwd(), "src/components/TrialCtaSection.tsx"), "utf8");

describe("TrialCtaSection — facts from config", () => {
  it("renders every trial plan's name, price and note from TRIAL_PLAN_OPTIONS", () => {
    for (const p of TRIAL_PLAN_OPTIONS) {
      expect(html).toContain(p.name);
      expect(html).toContain(p.price);
      expect(html).toContain(p.note);
      expect(html).toContain(p.trialLabel.toUpperCase());
    }
  });

  it("renders all nine grid plans' facts from GRID_PLAN_OPTIONS (Phase D)", () => {
    for (const p of GRID_PLAN_OPTIONS) {
      expect(html).toContain(p.name);
      expect(html).toContain(p.price);
      expect(html).toContain(p.note);
      expect(html).toContain(p.trialLabel.toUpperCase());
    }
    // The three tier cards are all present.
    for (const s of ["Lite", "Pro", "Ultra"]) {
      expect(html).toContain(s);
    }
  });

  it("imports the config instead of restating any price", () => {
    const cards = readFileSync(join(process.cwd(), "src/components/TrialCtaCards.tsx"), "utf8");
    expect(cards).toContain("TIER_PLAN_OPTIONS");
    for (const price of ["$4.99", "$7.99", "$8.99", "$12.99", "$13.99", "$24.99", "$44.99", "$74.99", "$149.99"]) {
      expect(cards).not.toContain(price);
    }
    expect(source).not.toContain("$7.99");
    expect(source).not.toContain("$13.99");
    expect(source).not.toContain("$74.99");
  });

  it("carries the canonical guarantee sentence verbatim", () => {
    expect(TRIAL_CTA_GUARANTEE).toBe(
      "Covered by a 7-day money-back guarantee on your first charge — email us within 7 days of the charge for a full refund, no questions asked.",
    );
    expect(html).toContain(TRIAL_CTA_GUARANTEE);
  });
});

describe("TrialCtaSection — conversion structure", () => {
  it("each card starts its plan's embedded checkout; secondary opens the globe tracked per page", () => {
    // One real HTML trial button per tier card, labelled — visibly
    // and by aria — with the card's selected option's CTA from
    // config (annual by default on every tier — the redesign's
    // default view). The trial artwork must NOT render here any
    // more (owner order, 2026-10-31: it rendered as a tiny pill).
    expect(html.match(/aria-label="Start 10-Day Free Trial"/g)).toHaveLength(3);
    expect(html.match(/>Start 10-Day Free Trial</g)).toHaveLength(3);
    expect(html).not.toContain("start-trial-button");
    expect(html).not.toContain('href="/pricing"');
    expect(html).toContain("Open the globe — free");
    expect(html).toContain('href="/?utm_source=cameras&utm_medium=trial-cta"');
  });

  it("states the trial reminder promise from the reference section", () => {
    expect(html).toContain("every plan starts with a free trial");
    expect(html).toContain("We email you before your trial's first charge");
  });

  it("contains no scarcity, countdown or urgency mechanics", () => {
    expect(source.toLowerCase()).not.toMatch(/countdown|limited time|act now|hurry|only \d+ left|spots left/);
    expect(html.toLowerCase()).not.toMatch(/countdown|limited time|act now|hurry/);
  });
});
