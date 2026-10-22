// Referral-code minting pins. The regression under test: codes used to
// be slugified account names, so a user named "Test" was issued the
// code "test" and the share UI presented worldeye.app/ref/test — a
// link indistinguishable from a placeholder. Codes must be random,
// format-valid, and never name-derived.
import { describe, it, expect } from "vitest";
import {
  REFERRAL_CODE_LENGTH,
  mintReferralCode,
  referralCodeCandidate,
} from "./referral-code";
import { REF_CODE_RE } from "./attribution";

describe("referralCodeCandidate", () => {
  it("is a REF_CODE_RE-valid string of the pinned length and alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const code = referralCodeCandidate();
      expect(code).toHaveLength(REFERRAL_CODE_LENGTH);
      expect(code).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]+$/);
      expect(REF_CODE_RE.test(code)).toBe(true);
    }
  });

  it("does not repeat across a batch (random, not sequential/derived)", () => {
    const batch = new Set(Array.from({ length: 200 }, () => referralCodeCandidate()));
    expect(batch.size).toBe(200);
  });
});

describe("mintReferralCode", () => {
  it("returns the first candidate the checker calls free", async () => {
    const seen: string[] = [];
    const code = await mintReferralCode(async (c) => {
      seen.push(c);
      return false;
    });
    expect(seen).toHaveLength(1);
    expect(code).toBe(seen[0]);
  });

  it("skips taken candidates until one is free", async () => {
    let calls = 0;
    const code = await mintReferralCode(async () => {
      calls += 1;
      return calls < 3; // first two are "taken"
    });
    expect(calls).toBe(3);
    expect(REF_CODE_RE.test(code)).toBe(true);
  });

  it("never returns a taken code — throws after maxTries instead", async () => {
    await expect(mintReferralCode(async () => true, 4)).rejects.toThrow(
      /unique referral code/i,
    );
  });
});
