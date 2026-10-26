// Render smoke test for the lock picker: the repo's harness is node-only
// (no DOM), so this server-renders the real component and pins what a
// locked-out user actually sees — all three plans, /pricing's CTAs and
// notes verbatim, and the dialog's closed/open states. The checkout call
// itself is pinned in lib/billing/trial-checkout.test.ts.
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
      "10 days free, then billed weekly · cancel anytime",
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
    // The CTA of each plan is a <button> carrying the gold filled
    // treatment and a ≥48px tap height, labelled with its plan.
    for (const label of [
      "Start 10-Day Free Trial — Weekly $7.99/week",
      "Start 10-Day Free Trial — Monthly $13.99/month",
      "Start 10-Day Free Trial — VIP Pro $74.99/year",
    ]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
    expect(html).toContain("bg-[#D4AF37]");
    expect(html).toContain("min-h-[48px]");
    // Exactly the three plan CTAs are buttons in the default render
    // (no close affordance was passed).
    expect(html.match(/<button/g)).toHaveLength(3);
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
