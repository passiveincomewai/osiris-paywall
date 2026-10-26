// The structured checkout failure, pinned: the server's refusal words
// survive verbatim, its machine code and manage path ride along, and
// the generic line appears ONLY when the server sent no words at all.
// This module is the fix for the bare "Checkout failed" dead end —
// before it, both client flows threw `data?.error || "Checkout failed"`
// as a plain Error and the code/manageUrl never reached a surface.
import { describe, it, expect } from "vitest";
import {
  CHECKOUT_FAILED_MESSAGE,
  CheckoutError,
  checkoutErrorFromData,
  toCheckoutError,
} from "./checkout-error";
import {
  ALREADY_SUBSCRIBED_MESSAGE,
  MANAGE_SUBSCRIPTION_PATH,
} from "./checkout-guard";

describe("checkoutErrorFromData", () => {
  it("carries a refusal's message, code and manage path verbatim", () => {
    const err = checkoutErrorFromData({
      error: ALREADY_SUBSCRIBED_MESSAGE,
      code: "already_subscribed",
      manageUrl: "/settings/subscription",
    });
    expect(err).toBeInstanceOf(CheckoutError);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(ALREADY_SUBSCRIBED_MESSAGE);
    expect(err.serverMessage).toBe(ALREADY_SUBSCRIBED_MESSAGE);
    expect(err.code).toBe("already_subscribed");
    expect(err.alreadySubscribed).toBe(true);
    expect(err.managePath).toBe("/settings/subscription");
  });

  it("falls back to the canonical manage path when the body omits manageUrl", () => {
    const err = checkoutErrorFromData({
      error: ALREADY_SUBSCRIBED_MESSAGE,
      code: "already_subscribed",
    });
    expect(err.manageUrl).toBeNull();
    expect(err.managePath).toBe(MANAGE_SUBSCRIPTION_PATH);
  });

  it("keeps a non-subscription server message verbatim, without the flag", () => {
    const err = checkoutErrorFromData({ error: "STRIPE_WEEKLY_PRICE_ID is not set" });
    expect(err.message).toBe("STRIPE_WEEKLY_PRICE_ID is not set");
    expect(err.code).toBeNull();
    expect(err.alreadySubscribed).toBe(false);
  });

  it("a message-less body (or no body at all) yields only the generic line", () => {
    for (const data of [null, undefined, {}, { error: "" }, { error: 42 }]) {
      const err = checkoutErrorFromData(data);
      expect(err.message).toBe(CHECKOUT_FAILED_MESSAGE);
      expect(err.serverMessage).toBeNull();
      expect(err.code).toBeNull();
      expect(err.alreadySubscribed).toBe(false);
    }
  });
});

describe("toCheckoutError", () => {
  it("passes a CheckoutError through untouched", () => {
    const err = new CheckoutError({ serverMessage: "nope", code: "already_subscribed" });
    expect(toCheckoutError(err)).toBe(err);
  });

  it("widens anything else into the generic, retryable failure", () => {
    for (const e of [new Error("Failed to fetch"), new TypeError("x"), "boom", null, undefined]) {
      const err = toCheckoutError(e);
      expect(err).toBeInstanceOf(CheckoutError);
      expect(err.message).toBe(CHECKOUT_FAILED_MESSAGE);
      expect(err.serverMessage).toBeNull();
      expect(err.alreadySubscribed).toBe(false);
    }
  });
});
