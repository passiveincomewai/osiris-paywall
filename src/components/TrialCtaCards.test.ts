// Render smoke test for the Phase D tier cards (the client half of
// TrialCtaSection): node-only harness, so this server-renders the
// section and pins the three tiers with their default (annual)
// selections. Phase E added an IntersectionObserver impression
// effect and period-change funnel events — effects and handlers
// never run under renderToString, so what's pinned here is that the
// instrumented component still renders identically; the emission
// contract itself is pinned in lib/billing/picker-analytics.test.ts
// and trial-checkout.test.ts.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import TrialCtaCards from "./TrialCtaCards";

const normalize = (html: string) =>
  html.replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");

describe("TrialCtaCards", () => {
  it("renders all three tier cards with every period row", () => {
    const html = normalize(renderToString(createElement(TrialCtaCards)));
    for (const s of [
      "Lite",
      "Pro",
      "Ultra",
      // annual defaults across the tiers
      "$44.99",
      "$74.99",
      "$149.99",
      // weekly + monthly rows render too
      "$4.99",
      "$8.99",
      "$12.99",
      "$24.99",
    ]) {
      expect(html).toContain(s);
    }
  });
});
