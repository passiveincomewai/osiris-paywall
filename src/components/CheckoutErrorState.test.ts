// Render pins for the shared checkout failure state (node-only
// harness, renderToString — same pattern as EmbeddedCheckoutBody /
// CheckoutSheet tests). The flows that PRODUCE these errors are pinned
// in lib/billing (embedded-checkout / trial-checkout / checkout-error);
// what a server render pins here is the buyer's way out of each state:
// an already-subscribed member gets the server's words and the manage
// action (and NOT a futile retry), every other failure keeps retry
// plus the hosted route.
import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import CheckoutErrorState, {
  CHECKOUT_RETRY_LABEL,
  HOSTED_FALLBACK_LABEL,
  MANAGE_SUBSCRIPTION_LABEL,
} from "./CheckoutErrorState";
import { CheckoutError } from "@/lib/billing/checkout-error";
import { ALREADY_SUBSCRIBED_MESSAGE } from "@/lib/billing/checkout-guard";

const render = (error: CheckoutError) =>
  renderToString(
    createElement(CheckoutErrorState, {
      plan: "annual",
      error,
      onRetry: vi.fn(),
      onError: vi.fn(),
    }),
  )
    .replace(/<!-- -->/g, "")
    .replace(/&#x27;/g, "'");

describe("CheckoutErrorState", () => {
  it("already subscribed: the server's words + Manage subscription, no Try again", () => {
    const html = render(
      new CheckoutError({
        serverMessage: ALREADY_SUBSCRIBED_MESSAGE,
        code: "already_subscribed",
        manageUrl: "/settings/subscription",
      }),
    );
    expect(html).toContain(ALREADY_SUBSCRIBED_MESSAGE);
    expect(html).toContain(MANAGE_SUBSCRIPTION_LABEL);
    expect(html).toContain('href="/settings/subscription"');
    // A retry would be refused identically — it is not offered.
    expect(html).not.toContain(CHECKOUT_RETRY_LABEL);
    expect(html).not.toContain(HOSTED_FALLBACK_LABEL);
  });

  it("transient failure: generic line + Try again + the hosted route", () => {
    const html = render(new CheckoutError());
    expect(html).toContain("Checkout failed");
    expect(html).toContain(CHECKOUT_RETRY_LABEL);
    expect(html).toContain(HOSTED_FALLBACK_LABEL);
    expect(html).not.toContain(MANAGE_SUBSCRIPTION_LABEL);
  });

  it("another server refusal: its words verbatim, retry + hosted route kept", () => {
    const html = render(
      new CheckoutError({ serverMessage: "STRIPE_WEEKLY_PRICE_ID is not set" }),
    );
    expect(html).toContain("STRIPE_WEEKLY_PRICE_ID is not set");
    expect(html).toContain(CHECKOUT_RETRY_LABEL);
    expect(html).toContain(HOSTED_FALLBACK_LABEL);
    expect(html).not.toContain(MANAGE_SUBSCRIPTION_LABEL);
  });
});
