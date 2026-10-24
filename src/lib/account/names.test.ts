import { describe, expect, it } from "vitest";
import { isValidUsername, usernameValidationError } from "./names";

describe("usernameValidationError", () => {
  it("requires a name", () => {
    expect(usernameValidationError("")).toMatch(/required/);
    expect(usernameValidationError("   ")).toMatch(/required/);
    expect(usernameValidationError(null)).toMatch(/required/);
    expect(usernameValidationError(undefined)).toMatch(/required/);
  });

  it("rejects spaces anywhere", () => {
    expect(usernameValidationError("John Smith")).toMatch(/spaces/);
    expect(usernameValidationError("ab cd")).toMatch(/spaces/);
    expect(usernameValidationError("tab\tname")).toMatch(/spaces/);
  });

  it("rejects characters outside letters/numbers/_/-", () => {
    expect(usernameValidationError("a.b")).not.toBeNull();
    expect(usernameValidationError("hey!")).not.toBeNull();
    expect(usernameValidationError("emoji🚀")).not.toBeNull();
  });

  it("enforces the 2–32 length bounds", () => {
    expect(usernameValidationError("a")).toMatch(/at least 2/);
    expect(usernameValidationError("x".repeat(33))).toMatch(/under 32/);
    expect(usernameValidationError("x".repeat(32))).toBeNull();
  });

  it("accepts ordinary usernames", () => {
    for (const ok of ["cosmo", "Sky_Watcher-7", "ab", "A1-_z"]) {
      expect(isValidUsername(ok)).toBe(true);
      expect(usernameValidationError(ok)).toBeNull();
    }
  });
});
