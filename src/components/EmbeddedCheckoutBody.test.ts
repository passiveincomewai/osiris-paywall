// Render pins for the shared embedded-checkout body (node-only harness,
// renderToString — same pattern as CheckoutSheet.test.ts). The session
// lifecycle itself is pinned in lib/billing/embedded-checkout.test.ts
// (the controller: fresh session per mount, destroy on unmount); what a
// server render pins here is the body's structure — strip first, the
// form mount point with its loading state, the guarantee line, the
// hosted option — and enterprise's distinction (no guarantee line).
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import EmbeddedCheckoutBody from "./EmbeddedCheckoutBody";
import { GUARANTEE_LINE } from "./CheckoutPlanStrip";
import { HOSTED_CHECKOUT_LABEL } from "./HostedCheckoutLink";

const render = (plan: "weekly" | "monthly" | "annual" | "enterprise") =>
  renderToString(createElement(EmbeddedCheckoutBody, { plan }))
    .replace(/<!-- -->/g, "")
    .replace(/&#x27;/g, "'");

describe("EmbeddedCheckoutBody", () => {
  it("leads with the compact plan strip, then the form mount and loading state", () => {
    const html = render("weekly");
    expect(html).toContain("Weekly Pro");
    expect(html).toContain("$7.99");
    expect(html.indexOf("Weekly Pro")).toBeLessThan(html.indexOf("Loading secure checkout…"));
    expect(html).toContain("Loading secure checkout…");
  });

  it("carries the guarantee line and the hosted option for trial plans", () => {
    const html = render("annual");
    expect(html).toContain("10 days free");
    expect(html).toContain(GUARANTEE_LINE);
    expect(html).toContain(HOSTED_CHECKOUT_LABEL);
  });

  it("shows enterprise plainly: secured-by-Stripe, no guarantee line", () => {
    const html = render("enterprise");
    expect(html).toContain("$999");
    expect(html).toContain("Secured by Stripe");
    expect(html).not.toContain("money-back guarantee");
    expect(html).toContain(HOSTED_CHECKOUT_LABEL);
  });
});
