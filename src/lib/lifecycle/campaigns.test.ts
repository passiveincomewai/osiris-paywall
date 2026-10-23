// Campaign prep tests: the pure contract of the campaign engine —
// code strings are deterministic, and invalid campaigns (bad pct,
// uncapped, already-expired) are rejected at prepare time, long before
// any owner approval or send could happen.
import { describe, it, expect } from "vitest";
import { campaignCodeFor, validateCampaignInput, type CampaignInput } from "./campaigns";

const NOW = new Date(Date.UTC(2026, 9, 22, 18, 0, 0));
const valid: CampaignInput = {
  slug: "halloween-2026",
  pct: 50,
  maxRedemptions: 200,
  expiresAt: new Date(Date.UTC(2026, 10, 1, 5, 59)),
  headline: "Halloween: half off Pro",
  bodyText: "Two days only.",
  audience: "free_users",
};

describe("campaignCodeFor", () => {
  it("derives the code from the slug + pct, alphanumerics only", () => {
    expect(campaignCodeFor("halloween-2026", 50)).toBe("HALLOWEEN202650");
    expect(campaignCodeFor("black friday!", 40)).toBe("BLACKFRIDAY40");
  });
});

describe("validateCampaignInput", () => {
  it("accepts a complete campaign", () => {
    expect(validateCampaignInput(valid, NOW)).toBeNull();
  });
  it("rejects out-of-range percentages and uncapped codes", () => {
    expect(validateCampaignInput({ ...valid, pct: 0 }, NOW)).toMatch(/pct/);
    expect(validateCampaignInput({ ...valid, pct: 101 }, NOW)).toMatch(/pct/);
    expect(validateCampaignInput({ ...valid, maxRedemptions: 0 }, NOW)).toMatch(/maxRedemptions/);
  });
  it("rejects an expiry in the past and missing copy", () => {
    expect(validateCampaignInput({ ...valid, expiresAt: new Date(Date.UTC(2026, 9, 1)) }, NOW)).toMatch(
      /expiresAt/,
    );
    expect(validateCampaignInput({ ...valid, headline: " " }, NOW)).toMatch(/headline/);
    expect(validateCampaignInput({ ...valid, bodyText: "" }, NOW)).toMatch(/bodyText/);
    expect(validateCampaignInput({ ...valid, slug: "ab" }, NOW)).toMatch(/slug/);
  });
});
