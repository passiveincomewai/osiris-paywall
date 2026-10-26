// TrialCtaSection pins:
//  - plan facts render FROM the billing config (name, price, per-day,
//    note, trial label for all three plans) — the component never
//    restates a price of its own;
//  - the guarantee line is the canonical /pricing sentence, verbatim;
//  - each card's artwork button starts that plan's embedded checkout in
//    place; secondary opens the free globe with the page's utm_source;
//  - no hype mechanics: no scarcity, countdown or urgency copy.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import TrialCtaSection, { TRIAL_CTA_GUARANTEE } from "./TrialCtaSection";
import { TRIAL_PLAN_OPTIONS } from "@/lib/billing/trial-checkout";

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

  it("imports the config instead of restating any price", () => {
    const cards = readFileSync(join(process.cwd(), "src/components/TrialCtaCards.tsx"), "utf8");
    expect(cards).toContain("TRIAL_PLAN_OPTIONS");
    expect(cards).not.toContain("$7.99");
    expect(cards).not.toContain("$13.99");
    expect(cards).not.toContain("$74.99");
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
    // The owner's trial-artwork button, one per plan, labelled from config.
    for (const p of TRIAL_PLAN_OPTIONS) {
      expect(html).toContain(`aria-label="${p.cta}"`);
    }
    expect(html).toContain("/start-trial-button.png");
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
