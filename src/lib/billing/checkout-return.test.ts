// Checkout-return strip rules: it exists for exactly one situation —
// Stripe sent this visitor back from a cancelled checkout — and it is
// allowed exactly one appearance per session. Anything wider would be
// a nag; anything narrower loses the people it was built for.
import { describe, it, expect } from "vitest";
import { shouldShowCheckoutReturn } from "./checkout-return";

describe("shouldShowCheckoutReturn", () => {
  it("shows for a cancelled checkout that hasn't been dismissed", () => {
    expect(shouldShowCheckoutReturn("cancelled", false)).toBe(true);
  });

  it("stays hidden once dismissed this session", () => {
    expect(shouldShowCheckoutReturn("cancelled", true)).toBe(false);
  });

  it("stays hidden for every other arrival", () => {
    expect(shouldShowCheckoutReturn("success", false)).toBe(false);
    expect(shouldShowCheckoutReturn(null, false)).toBe(false);
    expect(shouldShowCheckoutReturn(undefined, false)).toBe(false);
    expect(shouldShowCheckoutReturn("", false)).toBe(false);
  });
});
