// Render smoke test for the lock picker: the repo's harness is node-only
// (no DOM), so this server-renders the real component and pins what a
// locked-out user actually sees — the Pro tier's plans by default with
// /pricing's CTAs and notes verbatim, the Lite/Ultra tiers one tab
// away, and the dialog's closed/open states. The checkout call itself
// is pinned in lib/billing/trial-checkout.test.ts.
//
// Phase D (2026-10-30): the picker became the central 3×3 (tier tabs
// over GRID_PLAN_OPTIONS). The C1 button-count pin below was updated
// with it: the tier tabs are real <button>s too, so the pin now counts
// the trial-artwork CTAs specifically — its purpose (each plan's CTA is
// a real filled artwork button, not a text line) is unchanged.
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import TrialPicker, { TrialPickerCheckout, TrialPickerDialog } from "./TrialPicker";
import { GUARANTEE_LINE } from "./CheckoutPlanStrip";

const normalize = (html: string) =>
  html.replace(/<!-- -->/g, "").replace(/&#x27;/g, "'");

describe("TrialPicker", () => {
  it("renders every plan with pricing's copy", () => {
    const html = renderToString(createElement(TrialPicker));
    for (const s of [
      "Start 10-Day Free Trial",
      "$7.99",
      "$13.99",
      "$74.99",
      "3 days free, then billed weekly · cancel anytime",
      "10 days free, then billed monthly · cancel anytime",
      "10 days free, then billed annually · cancel anytime",
      "Secured by Stripe · Cancel anytime · 7-day money-back guarantee on your first charge",
    ]) {
      expect(html).toContain(s);
    }
  });

  it("renders in the compact variant too", () => {
    const html = renderToString(createElement(TrialPicker, { variant: "compact" }));
    expect(html).toContain("Start 10-Day Free Trial");
  });

  it("each plan's CTA is a real filled button, not a text line (C1)", () => {
    const html = normalize(renderToString(createElement(TrialPicker)));
    // The CTA of each plan is a <button> carrying the owner's glowing
    // trial artwork, variant-matched to the plan's trial length and
    // labelled with its plan.
    for (const label of [
      "Start 3-Day Free Trial — Weekly $7.99/week",
      "Start 10-Day Free Trial — Monthly $13.99/month",
      "Start 10-Day Free Trial — VIP Pro $74.99/year",
    ]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
    expect(html).toContain("trial-btn");
    // Weekly carries the 3-day artwork; monthly/annual the 10-day.
    expect(html).toContain("/start-trial-button-3day.png");
    expect(html).toContain("/start-trial-button.png");
    // Exactly the three plan CTAs carry the trial artwork in the
    // default render (the tier tabs are plain buttons; no close
    // affordance was passed).
    expect(html.match(/<button[^>]*class="trial-btn/g)).toHaveLength(3);
  });

  it("offers all three tiers as tabs, opening on Pro by default (Phase D)", () => {
    const html = normalize(renderToString(createElement(TrialPicker)));
    for (const s of ["Lite", "Pro", "Ultra"]) {
      expect(html).toContain(s);
    }
    // Pro is the opening tab: its prices render, Lite/Ultra wait a tap.
    expect(html).toContain("$13.99");
    expect(html).not.toContain("$24.99");
    expect(html).not.toContain("$44.99");
  });

  it("opens on the requested tier with that tier's own prices and trial wording", () => {
    const ultra = normalize(
      renderToString(createElement(TrialPicker, { defaultTier: "ultra" })),
    );
    expect(ultra).toContain("Ultra Weekly");
    expect(ultra).toContain("$12.99");
    expect(ultra).toContain("$24.99");
    expect(ultra).toContain("$149.99");
    // The weekly row says 3 days — trial wording follows the selection.
    expect(ultra).toContain("Start 3-Day Free Trial — Ultra Weekly $12.99/week");
    const lite = normalize(
      renderToString(createElement(TrialPicker, { defaultTier: "lite" })),
    );
    expect(lite).toContain("Lite Annual");
    expect(lite).toContain("$44.99");
    expect(lite).not.toContain("$149.99");
  });

  it("an emphasized grid plan opens its tier's tab (Phase D)", () => {
    const html = normalize(
      renderToString(createElement(TrialPicker, { emphasizePlan: "ultra_annual" })),
    );
    expect(html).toContain("Ultra Annual");
    expect(html).toContain("$149.99");
    expect(html).toContain("VIP pick");
  });

  it("embedded mode starts on the plan list — the form mounts only after a pick (C2)", () => {
    const html = normalize(
      renderToString(createElement(TrialPicker, { mode: "embedded" })),
    );
    expect(html).toContain("data-trial-picker");
    expect(html).toContain("Start 10-Day Free Trial");
    expect(html).not.toContain("Loading secure checkout…");
    expect(html).not.toContain("data-trial-picker-checkout");
  });
});

describe("TrialPickerCheckout (the embedded-mode in-place checkout)", () => {
  it("renders a back control over the shared checkout body", () => {
    const html = normalize(
      renderToString(
        createElement(TrialPickerCheckout, { plan: "annual", onBack: vi.fn() }),
      ),
    );
    expect(html).toContain("data-trial-picker-checkout");
    expect(html).toContain("Back to plans");
    // The shared body: compact strip for the picked plan, the form
    // mount's loading state, the guarantee line.
    expect(html).toContain("VIP Pro");
    expect(html).toContain("$74.99");
    expect(html).toContain("Loading secure checkout…");
    expect(html).toContain(GUARANTEE_LINE);
    // Back sits before the form, so leaving is one tap from the top.
    expect(html.indexOf("Back to plans")).toBeLessThan(
      html.indexOf("Loading secure checkout…"),
    );
  });
});

describe("TrialPickerDialog", () => {
  it("renders nothing while closed", () => {
    const html = renderToString(
      createElement(TrialPickerDialog, { open: false, onClose: () => {}, feature: "OI — the AI assistant" }),
    );
    expect(html).toBe("");
  });

  it("renders the picker with the feature context when open", () => {
    const html = renderToString(
      createElement(TrialPickerDialog, { open: true, onClose: () => {}, feature: "OI — the AI assistant" }),
    );
    expect(html).toContain("Start your free trial");
    expect(html).toContain("OI — the AI assistant");
    expect(html).toContain("Start 10-Day Free Trial");
  });
});
