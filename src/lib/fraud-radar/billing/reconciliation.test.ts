import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { createInMemoryCaseStore } from "../cases/store";
import { createClaimForUser, runClaimVerification, VerificationQuotaError } from "../cases/claims";
import { CASE_ENTITLEMENTS } from "../cases/entitlements";
import { InMemoryUsageStore, usageSummary } from "./usage";
import { freeEntitlement } from "./tier";

/**
 * §7.3.4 reconciliation (SHV-11 core kinds): ledger counts
 * re-derived from FrUsageLedger equal the domain-table counts
 * (FrClaimVerification rows via the case store), and a billing
 * quota refusal happens BEFORE the checker runs (no
 * verification row, no work).
 */
describe("claim-verification reconciliation", () => {
  it("ledger count == domain count after runs; refusal precedes work", async () => {
    const store = createInMemoryCaseStore();
    // Seed a case directly through the store's case creation.
    const caseRow = await store.createCase({ ownerId: "u1", title: "t" });
    const claim = await createClaimForUser(store, { caseId: caseRow.id, actorId: "u1", statement: "The recipient received $2,100,000 in obligated funds.", subjectEngine: "grants", subjectEntityKey: "UEI:ZZZZAB999999" });
    const usage = new InMemoryUsageStore();
    const ent = { ...freeEntitlement(), tier: "free" as const, personalTier: "free" as const };
    let checkerRuns = 0;
    const deps = {
      execute: async (name: string, args: Record<string, unknown>) => {
        checkerRuns++;
        return {
          envelope: {
            tool: name, dataset: "grants-aggregates", datasetVersion: "2026-10-06",
            grainKey: `UEI:${String(args.uei ?? "")}`,
            sourceVintages: [{ source: "grants-aggregates", version: "2026-10-06" }],
            caveats: [], truncated: false,
          },
          data: { state: "not_in_published_data", found: false, uei: String(args.uei ?? "") },
        } as never;
      },
    };
    const args = {
      caseRow: { id: caseRow.id, ownerId: "u1" }, claim, actorId: "u1",
      entitlements: CASE_ENTITLEMENTS.free,
      billing: { usageStore: usage, entitlement: ent },
    };
    for (let i = 0; i < 5; i++) await runClaimVerification(store, args, deps);
    const { start, end } = { start: new Date(Date.UTC(2020, 0, 1)), end: new Date(Date.UTC(2100, 0, 1)) };
    void start; void end;
    const domainCount = await store.countVerificationsInRange("u1", new Date(Date.UTC(2020, 0, 1)), new Date(Date.UTC(2100, 0, 1)));
    const sum = await usageSummary(usage, ent, "u1");
    const ledgerUsed = sum.kinds.find((k) => k.kind === "claim_verification")?.used;
    expect(domainCount).toBe(5);
    expect(ledgerUsed).toBe(domainCount);
    // 6th run: refused by BOTH ledgers before the checker runs.
    await expect(runClaimVerification(store, args, deps)).rejects.toBeInstanceOf(VerificationQuotaError);
    expect(checkerRuns).toBe(5);
  });
});
