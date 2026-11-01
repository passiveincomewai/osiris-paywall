import { describe, it, expect } from "vitest";
import {
  CASE_ENTITLEMENTS,
  MAX_EVIDENCE_FILE_BYTES,
  caseEntitlementsFor,
  caseEntitlementsForSession,
} from "./entitlements";

/**
 * Phase 8 — entitlement interface defaults (PHASE8 §5.3): the
 * Phase 11 interface stub with the design's proposed defaults,
 * in exactly one config object.
 */

describe("case entitlement defaults (§5.3)", () => {
  it("free: 3 open cases, vault closed, 5 verifications, no processing", () => {
    const e = caseEntitlementsFor("free")!;
    expect(e.maxOpenCases).toBe(3);
    expect(e.storage.vaultEnabled).toBe(false);
    expect(e.storage.maxVaultBytes).toBe(BigInt(0));
    expect(e.verificationsPerMonth).toBe(5);
    expect(e.processingJobsPerMonth).toBe(0);
  });

  it("plus: 25 cases, vault open at 500 MB, 50 verifications / processing jobs", () => {
    const e = caseEntitlementsFor("plus")!;
    expect(e.maxOpenCases).toBe(25);
    expect(e.storage.vaultEnabled).toBe(true);
    expect(e.storage.maxVaultBytes).toBe(BigInt(500_000_000));
    expect(e.verificationsPerMonth).toBe(50);
    expect(e.processingJobsPerMonth).toBe(50);
  });

  it("pro and teams: 200 cases, 5 GB vault, 300 verifications / processing jobs", () => {
    for (const tier of ["pro", "teams"] as const) {
      const e = caseEntitlementsFor(tier)!;
      expect(e.maxOpenCases).toBe(200);
      expect(e.storage.vaultEnabled).toBe(true);
      expect(e.storage.maxVaultBytes).toBe(BigInt(5_000_000_000));
      expect(e.verificationsPerMonth).toBe(300);
      expect(e.processingJobsPerMonth).toBe(300);
    }
  });

  it("the per-file ceiling is the §2.2 25 MB at every tier", () => {
    expect(MAX_EVIDENCE_FILE_BYTES).toBe(25_000_000);
    for (const tier of ["free", "plus", "pro", "teams"] as const) {
      expect(CASE_ENTITLEMENTS[tier].storage.maxEvidenceFileBytes).toBe(25_000_000);
    }
  });

  it("tier none (signed out) has no entitlements", () => {
    expect(caseEntitlementsFor("none")).toBeNull();
  });

  it("the session seam resolves through the Phase 7 tier interface", () => {
    const { tier, entitlements } = caseEntitlementsForSession(
      { user: { id: "u1", email: "u1@example.com" } },
      { ADMIN_EMAILS: "admin@example.com" },
    );
    expect(tier).toBe("free");
    expect(entitlements?.maxOpenCases).toBe(3);
    const admin = caseEntitlementsForSession(
      { user: { id: "u2", email: "admin@example.com" } },
      { ADMIN_EMAILS: "admin@example.com" },
    );
    expect(admin.tier).toBe("pro");
    expect(admin.entitlements?.maxOpenCases).toBe(200);
  });
});
