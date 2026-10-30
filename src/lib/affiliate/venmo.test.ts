// Venmo handle normalization — pins Venmo's own username rules (5–30 chars,
// letters/numbers/underscore/hyphen) and the "@"-stripping storage form.
// Run: npx vitest run src/lib/affiliate/venmo.test.ts
import { describe, it, expect } from "vitest";
import { normalizeVenmoHandle, isValidVenmoHandle, formatVenmoHandle } from "./venmo";

describe("normalizeVenmoHandle", () => {
  it("accepts a bare handle", () => {
    expect(normalizeVenmoHandle("jane_doe")).toBe("jane_doe");
    expect(normalizeVenmoHandle("Jane-Doe99")).toBe("Jane-Doe99");
  });
  it("strips a leading @ and surrounding whitespace", () => {
    expect(normalizeVenmoHandle("  @jane_doe ")).toBe("jane_doe");
    expect(normalizeVenmoHandle("@@jane_doe")).toBe("jane_doe");
  });
  it("enforces the 5–30 character window", () => {
    expect(normalizeVenmoHandle("abcd")).toBeNull();
    expect(normalizeVenmoHandle("a".repeat(30))).toBe("a".repeat(30));
    expect(normalizeVenmoHandle("a".repeat(31))).toBeNull();
  });
  it("rejects illegal characters and non-strings", () => {
    expect(normalizeVenmoHandle("jane doe")).toBeNull();
    expect(normalizeVenmoHandle("jane.doe")).toBeNull();
    expect(normalizeVenmoHandle("-janedoe")).toBeNull();
    expect(normalizeVenmoHandle("")).toBeNull();
    expect(normalizeVenmoHandle(null)).toBeNull();
    expect(normalizeVenmoHandle(42)).toBeNull();
  });
  it("isValidVenmoHandle mirrors normalize", () => {
    expect(isValidVenmoHandle("@ok_handle")).toBe(true);
    expect(isValidVenmoHandle("no")).toBe(false);
  });
  it("formatVenmoHandle renders the display form", () => {
    expect(formatVenmoHandle("jane_doe")).toBe("@jane_doe");
    expect(formatVenmoHandle("@jane_doe")).toBe("@jane_doe");
  });
});
