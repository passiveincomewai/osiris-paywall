// Render pins for /pricing's checkout sheet (node-only harness,
// renderToString — same pattern as the other component tests). The
// mount/close/reopen session lifecycle itself is pinned in
// lib/billing/embedded-checkout.test.ts (the controller); what a server
// render pins here is the sheet's structure and its defining rules:
// closed renders nothing, open leads with the compact strip and the
// form mount point, the guarantee line is present, the hosted option is
// offered — and closing is not dressed up as a Stripe cancel (no
// ?checkout=cancelled anywhere in the sheet).
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import CheckoutSheet from "./CheckoutSheet";
import { GUARANTEE_LINE } from "./CheckoutPlanStrip";
import { HOSTED_CHECKOUT_LABEL } from "./HostedCheckoutLink";

const render = (plan: "weekly" | "monthly" | "annual" | "enterprise" | null) =>
  renderToString(
    createElement(CheckoutSheet, { plan, onClose: vi.fn() }),
    // React SSR splits interpolated text with <!-- --> markers and
    // escapes apostrophes; normalize both so assertions read the text a
    // visitor sees.
  )
    .replace(/<!-- -->/g, "")
    .replace(/&#x27;/g, "'");

describe("CheckoutSheet", () => {
  it("renders nothing while closed", () => {
    expect(render(null)).toBe("");
  });

  it("opens as a dialog: compact strip first, form mount, guarantee, hosted option", () => {
    const html = render("weekly");
    expect(html).toContain('role="dialog"');
    expect(html).toContain("Weekly Pro");
    expect(html).toContain("$7.99");
    expect(html).toContain("Loading secure checkout…");
    expect(html).toContain(GUARANTEE_LINE);
    expect(html).toContain(HOSTED_CHECKOUT_LABEL);
    expect(html).toContain('aria-label="Close checkout"');
  });

  it("never dresses a sheet close up as a Stripe cancel", () => {
    for (const plan of ["weekly", "monthly", "annual", "enterprise"] as const) {
      expect(render(plan)).not.toContain("checkout=cancelled");
    }
  });

  it("carries each plan's own strip (enterprise: no guarantee line)", () => {
    const annual = render("annual");
    expect(annual).toContain("VIP Pro");
    expect(annual).toContain("$74.99");
    expect(annual).toContain("10 days free");

    const enterprise = render("enterprise");
    expect(enterprise).toContain("Enterprise");
    expect(enterprise).toContain("$999");
    expect(enterprise).not.toContain("money-back guarantee");
  });
});
