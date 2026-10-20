// Render pins for the /checkout page's plan summary: it must speak with
// /pricing's voice (the summary records derive from PLAN_COPY and
// pricing's enterprise entry), carry the guarantee line for the trial
// plans, and NOT extend trial promises to enterprise. Node-only harness
// (renderToString), same pattern as TrialPicker.test.ts — the Stripe
// mount itself sits behind lib/billing/embedded-checkout's tested flow.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { CheckoutPlanSummaryCard } from "./CheckoutClient";
import { CHECKOUT_PLAN_SUMMARIES } from "@/lib/billing/trial-checkout";

const render = (plan: keyof typeof CHECKOUT_PLAN_SUMMARIES) =>
  renderToString(
    createElement(CheckoutPlanSummaryCard, { summary: CHECKOUT_PLAN_SUMMARIES[plan] }),
    // React SSR splits interpolated text with <!-- --> markers; strip them
    // so assertions read the text a visitor sees.
  ).replace(/<!-- -->/g, "");

describe("CheckoutPlanSummaryCard", () => {
  it("shows the annual plan in pricing's words, trial badge and guarantee included", () => {
    const html = render("annual");
    for (const s of [
      "$74.99",
      "/year",
      "3 days free, then billed annually · cancel anytime",
      "Just $0.21 a day",
      "3 days free — card not charged yet",
      "Secured by Stripe · Cancel anytime · 1-click cancellation",
      "Covered by a 7-day money-back guarantee on your first charge — email us within 7 days of the charge for a full refund, no questions asked.",
    ]) {
      expect(html).toContain(s);
    }
  });

  it("shows weekly and monthly with their 1-day trial terms", () => {
    const weekly = render("weekly");
    expect(weekly).toContain("$7.99");
    expect(weekly).toContain("1 day free, then billed weekly · cancel anytime");
    expect(weekly).toContain("1 day free — card not charged yet");

    const monthly = render("monthly");
    expect(monthly).toContain("$13.99");
    expect(monthly).toContain("1 day free, then billed monthly · cancel anytime");
    expect(monthly).toContain("Just $0.47 a day");
  });

  it("shows enterprise plainly: no trial badge, no guarantee line", () => {
    const html = render("enterprise");
    expect(html).toContain("ENTERPRISE");
    expect(html).toContain("$999");
    expect(html).toContain("Billed annually · cancel anytime");
    expect(html).toContain("Just $2.74 a day");
    expect(html).toContain("Secured by Stripe");
    expect(html).not.toContain("card not charged yet");
    expect(html).not.toContain("money-back guarantee");
  });
});
