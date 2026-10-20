// Offer-copy pins: the enterprise card and dashboard landing state must
// promise exactly what this build ships — collections, embed, feed,
// optional API, the same 7-day guarantee as Pro, priority support at the
// published address, and integration help. No SLAs, no roadmap claims.
import { describe, it, expect } from "vitest";
import {
  ENTERPRISE_OFFER_FEATURES,
  ENTERPRISE_GUARANTEE_LINE,
  ENTERPRISE_SUPPORT_LINE,
  SUPPORT_EMAIL,
} from "./offer";

describe("enterprise offer copy", () => {
  it("lists the shipped doors: collections, embed, feed, API", () => {
    const all = ENTERPRISE_OFFER_FEATURES.join("\n");
    expect(all).toContain("Custom camera collections");
    expect(all).toContain("Embeddable live camera player");
    expect(all).toContain("Private data feed (JSON)");
    expect(all).toContain("Optional API access with your own keys");
  });

  it("includes priority support and integration help", () => {
    const all = ENTERPRISE_OFFER_FEATURES.join("\n");
    expect(all).toContain("Priority customer support");
    expect(all).toContain("Integration help");
    expect(ENTERPRISE_SUPPORT_LINE).toContain(SUPPORT_EMAIL);
  });

  it("carries the same guarantee sentence as Pro — no invented terms", () => {
    expect(ENTERPRISE_GUARANTEE_LINE).toBe(
      "Covered by a 7-day money-back guarantee on your first charge — email us within 7 days of the charge for a full refund, no questions asked.",
    );
    const all = [...ENTERPRISE_OFFER_FEATURES, ENTERPRISE_SUPPORT_LINE].join("\n");
    // No response-time promises anywhere in the offer.
    expect(all).not.toMatch(/\d+\s*(hour|hr|business day)/i);
    expect(all.toLowerCase()).not.toContain("sla");
    expect(all.toLowerCase()).not.toContain("dedicated account manager");
  });
});
