// Render pins for the hosted-checkout option link (node-only harness,
// renderToString — same pattern as the other component tests). The click
// behavior itself rides on startHostedCheckout, pinned in
// lib/billing/trial-checkout.test.ts; what a server render can and must
// pin is the label and the honest caption — it leaves this site for
// Stripe's page, and it has to say so before anyone taps it.
import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import HostedCheckoutLink, {
  HOSTED_CHECKOUT_CAPTION,
  HOSTED_CHECKOUT_LABEL,
} from "./HostedCheckoutLink";

// React SSR escapes apostrophes as &#x27; — normalize so assertions read
// the text a visitor sees.
const render = (props: Parameters<typeof HostedCheckoutLink>[0]) =>
  renderToString(createElement(HostedCheckoutLink, props)).replace(/&#x27;/g, "'");

describe("HostedCheckoutLink", () => {
  it("renders the quiet Stripe option with its honest caption", () => {
    const html = render({ plan: "weekly" });
    expect(html).toContain(HOSTED_CHECKOUT_LABEL);
    expect(HOSTED_CHECKOUT_LABEL).toBe("Continue on Stripe instead →");
    expect(html).toContain(HOSTED_CHECKOUT_CAPTION);
    expect(HOSTED_CHECKOUT_CAPTION).toContain("Stripe's hosted checkout page");
  });

  it("can render without the caption (tight placements)", () => {
    const html = render({ plan: "annual", caption: false });
    expect(html).toContain(HOSTED_CHECKOUT_LABEL);
    expect(html).not.toContain(HOSTED_CHECKOUT_CAPTION);
  });
});
