// Render pins for the compact checkout strip (node-only harness,
// renderToString — same pattern as the other component tests). The strip
// replaced the tall summary card that pushed Stripe's form below the
// fold on phones: these pin that it carries the plan in /pricing's words
// (the summary derives from PLAN_COPY) WITHOUT restating the trial terms
// Stripe's own form summary already states, and that the guarantee line
// appears exactly once, in its canonical wording.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
  CheckoutGuaranteeNote,
  CheckoutPlanStrip,
  GUARANTEE_LINE,
} from "./CheckoutPlanStrip";
import { CHECKOUT_PLAN_SUMMARIES } from "@/lib/billing/trial-checkout";

// React SSR splits interpolated text with <!-- --> markers; strip them
// so assertions read the text a visitor sees.
const renderStrip = (plan: keyof typeof CHECKOUT_PLAN_SUMMARIES) =>
  renderToString(
    createElement(CheckoutPlanStrip, { summary: CHECKOUT_PLAN_SUMMARIES[plan] }),
  ).replace(/<!-- -->/g, "");
const renderNote = (plan: keyof typeof CHECKOUT_PLAN_SUMMARIES) =>
  renderToString(
    createElement(CheckoutGuaranteeNote, { summary: CHECKOUT_PLAN_SUMMARIES[plan] }),
  ).replace(/<!-- -->/g, "");

describe("CheckoutPlanStrip", () => {
  it("leads with the weekly plan, price and trial chip — no prose restating the terms", () => {
    const html = renderStrip("weekly");
    expect(html).toContain("Weekly Pro");
    expect(html).toContain("$7.99");
    expect(html).toContain("/week");
    expect(html).toContain("3 days free");
    expect(html).toContain("Just $1.14 a day");
    // Stripe's form states the terms; our strip must not say them twice.
    expect(html).not.toContain("then billed weekly");
    expect(html).not.toContain("Secure checkout");
  });

  it("shows annual with its 3-day chip and per-day framing", () => {
    const html = renderStrip("annual");
    expect(html).toContain("VIP Pro");
    expect(html).toContain("$74.99");
    expect(html).toContain("/year");
    expect(html).toContain("3 days free");
    expect(html).toContain("Just $0.21 a day");
    expect(html).not.toContain("then billed annually");
  });

  it("shows monthly in pricing's words", () => {
    const html = renderStrip("monthly");
    expect(html).toContain("Monthly Pro");
    expect(html).toContain("$13.99");
    expect(html).toContain("Just $0.47 a day");
  });

  it("shows enterprise plainly: no trial chip, no per-day trial framing drift", () => {
    const html = renderStrip("enterprise");
    expect(html).toContain("Enterprise");
    expect(html).toContain("$999");
    expect(html).toContain("/year");
    expect(html).not.toContain("day free");
    expect(html).not.toContain("Pro —");
  });
});

describe("CheckoutGuaranteeNote", () => {
  it("carries the canonical guarantee sentence for the trial plans", () => {
    for (const plan of ["weekly", "monthly", "annual"] as const) {
      const html = renderNote(plan);
      expect(html).toContain(GUARANTEE_LINE);
      expect(GUARANTEE_LINE).toBe(
        "Covered by a 7-day money-back guarantee on your first charge — email us within 7 days of the charge for a full refund, no questions asked.",
      );
    }
  });

  it("gives enterprise Stripe's name only — the guarantee doesn't extend to it here", () => {
    const html = renderNote("enterprise");
    expect(html).toContain("Secured by Stripe");
    expect(html).not.toContain("money-back guarantee");
  });
});
