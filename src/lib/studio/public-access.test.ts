// TEMPORARY public test access (public-access.ts): the pure gate
// decision in BOTH switch states, plus the shipped switch value.
// When the switch is reverted to false, update the last test's
// expectation — the withPublicTestAccess cases pin the behavior either
// way, because they pass the state explicitly.
import { describe, it, expect } from "vitest";
import { withPublicTestAccess } from "./access";
import { STUDIO_PUBLIC_TEST_ACCESS, studioPublicTestAccess } from "./public-access";

describe("withPublicTestAccess — switch OFF (normal gate)", () => {
  it("passes every outcome through unchanged", () => {
    expect(withPublicTestAccess("ok", false)).toBe("ok");
    expect(withPublicTestAccess("not_affiliate", false)).toBe("not_affiliate");
    expect(withPublicTestAccess("inactive", false)).toBe("inactive");
    expect(withPublicTestAccess("membership_required", false)).toBe("membership_required");
  });
});

describe("withPublicTestAccess — switch ON (public test access)", () => {
  it("waives the membership requirement", () => {
    expect(withPublicTestAccess("membership_required", true)).toBe("ok");
  });

  it("admits a provisioned profile (not_affiliate resolved by ensureStudioProfile)", () => {
    expect(withPublicTestAccess("not_affiliate", true)).toBe("ok");
  });

  it("keeps ok as ok", () => {
    expect(withPublicTestAccess("ok", true)).toBe("ok");
  });

  it("never un-suspends a non-active profile", () => {
    expect(withPublicTestAccess("inactive", true)).toBe("inactive");
  });
});

describe("the switch itself", () => {
  it("studioPublicTestAccess reads the constant", () => {
    expect(studioPublicTestAccess()).toBe(STUDIO_PUBLIC_TEST_ACCESS);
  });

  it("ships ON for the owner's temporary test window (flip to false to revert)", () => {
    expect(STUDIO_PUBLIC_TEST_ACCESS).toBe(true);
  });
});
