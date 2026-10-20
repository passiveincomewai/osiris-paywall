// Render smoke test for the lock picker: the repo's harness is node-only
// (no DOM), so this server-renders the real component and pins what a
// locked-out user actually sees — all three plans, /pricing's CTAs and
// notes verbatim, and the dialog's closed/open states. The checkout call
// itself is pinned in lib/billing/trial-checkout.test.ts.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import TrialPicker, { TrialPickerDialog } from "./TrialPicker";

describe("TrialPicker", () => {
  it("renders every plan with pricing's copy", () => {
    const html = renderToString(createElement(TrialPicker));
    for (const s of [
      "Start 1-Day Free Trial",
      "Start 3-Day Free Trial",
      "$3.99",
      "$9.99",
      "$59.99",
      "1 day free, then billed weekly · cancel anytime",
      "1 day free, then billed monthly · cancel anytime",
      "3 days free, then billed annually · cancel anytime",
      "Secured by Stripe · Cancel anytime",
    ]) {
      expect(html).toContain(s);
    }
  });

  it("renders in the compact variant too", () => {
    const html = renderToString(createElement(TrialPicker, { variant: "compact" }));
    expect(html).toContain("Start 1-Day Free Trial");
    expect(html).toContain("Start 3-Day Free Trial");
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
    expect(html).toContain("Start 3-Day Free Trial");
  });
});
