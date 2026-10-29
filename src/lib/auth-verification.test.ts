import { describe, it, expect } from "vitest";
import { isProviderVerified, isVerifiedRow } from "./auth-verification";

describe("isProviderVerified", () => {
  it("is true only for a Google link (the sole configured provider)", () => {
    expect(isProviderVerified([{ provider: "google" }])).toBe(true);
    expect(isProviderVerified([{ provider: "resend" }])).toBe(false);
    expect(isProviderVerified([])).toBe(false);
  });
});

describe("isVerifiedRow", () => {
  it("column set → verified, whatever the links", () => {
    expect(isVerifiedRow({ emailVerified: new Date(), accounts: [] })).toBe(true);
  });
  it("column null + Google link → verified (legacy unstamped OAuth rows)", () => {
    expect(isVerifiedRow({ emailVerified: null, accounts: [{ provider: "google" }] })).toBe(true);
  });
  it("column null + no provider link → unverified (credentials accounts)", () => {
    expect(isVerifiedRow({ emailVerified: null, accounts: [] })).toBe(false);
    expect(isVerifiedRow({ emailVerified: null, accounts: [{ provider: "resend" }] })).toBe(false);
  });
});
