import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import { FR_PLAN_DEFS, FRAUD_RADAR_TRIAL_DAYS, frPlanDef } from "./plans";
import { frPlanForPriceId, isFraudRadarPriceId } from "./prices";
import { FR_ENTITLEMENTS, entitlementsForTier } from "./entitlements";
import { CASE_ENTITLEMENTS } from "../cases/entitlements";
import { INVESTIGATOR_QUOTAS } from "../investigator/entitlements";
import {
  InMemoryUsageStore, chargeUsage, checkQuota, reverseUsage, usageSummary, netUnits,
} from "./usage";
import { freeEntitlement, type FrEntitlement } from "./tier";
import {
  frCompGrantDecision, frCompRevokeDecision, grantFraudRadarComp,
  revokeFraudRadarComp, type CompStore,
} from "./comp";

describe("plans/prices (P11-A)", () => {
  it("plan family matches spec prices, data only, trials OFF", () => {
    expect(FRAUD_RADAR_TRIAL_DAYS).toBe(0);
    expect(frPlanDef("plus", "month")?.displayPrice).toBe("$29.99");
    expect(frPlanDef("plus", "year")?.displayPrice).toBe("$299");
    expect(frPlanDef("pro", "month")?.displayPrice).toBe("$99");
    expect(frPlanDef("pro", "year")?.displayPrice).toBe("$999");
    expect(frPlanDef("teams", "month")?.displayPrice).toBe("$349");
    expect(frPlanDef("teams", "month")?.seatsIncluded).toBe(5);
    expect(frPlanDef("teams", "year")).toBeNull(); // OD-2 fallback
    for (const d of FR_PLAN_DEFS) expect(d.stripeObjectCreated).toBe(false);
  });
  it("no env ⇒ nothing resolvable/sellable; env maps price→plan; legacy triples resolve", () => {
    expect(frPlanForPriceId("price_x", {})).toBeNull();
    expect(isFraudRadarPriceId("price_x", {})).toBe(false);
    const env = { FRAUD_RADAR_PLUS_PRICE_ID: "price_plus_1" };
    expect(frPlanForPriceId("price_plus_1", env)?.key).toBe("plus");
    const legacy = { FRAUD_RADAR_LEGACY_PRICE_IDS: "price_old:pro:year" };
    expect(frPlanForPriceId("price_old", legacy)?.key).toBe("pro");
    expect(isFraudRadarPriceId("frcomp_pro", {})).toBe(true);
  });
});

describe("entitlement consolidation (§3.1)", () => {
  it("per-phase views are deep-equal to the central matrix slices", () => {
    for (const t of ["free", "plus", "pro", "teams"] as const) {
      const c = FR_ENTITLEMENTS[t];
      expect(INVESTIGATOR_QUOTAS[t].monthlyOps).toBe(c.investigatorOpsPerMonth);
      expect(INVESTIGATOR_QUOTAS[t].perTurnCostCeilingUsd).toBe(c.perTurnCostCeilingUsd);
      expect(CASE_ENTITLEMENTS[t].maxOpenCases).toBe(c.maxOpenCases);
      expect(CASE_ENTITLEMENTS[t].verificationsPerMonth).toBe(c.claimVerificationsPerMonth);
      expect(CASE_ENTITLEMENTS[t].processingJobsPerMonth).toBe(c.processingJobsPerMonth);
      expect(CASE_ENTITLEMENTS[t].storage.maxVaultBytes).toBe(c.maxVaultBytes);
      expect(CASE_ENTITLEMENTS[t].storage.vaultEnabled).toBe(c.vaultEnabled);
    }
    expect(entitlementsForTier("none")).toBeNull();
  });
});

function ent(tier: FrEntitlement["tier"]): FrEntitlement {
  return { ...freeEntitlement(), tier, personalTier: tier === "none" ? "none" : tier };
}

describe("usage ledger + quotas (P11-B, §7.3.4)", () => {
  it("charge → net count; reversal is a NEW row that negates it (append-only)", async () => {
    const s = new InMemoryUsageStore();
    const { ledgerId } = await chargeUsage(s, { userId: "u1", tier: "free", kind: "investigator_turn" });
    expect(netUnits(await s.listInRange({ userId: "u1", kind: "investigator_turn", start: new Date(0), end: new Date("2100-01-01") }))).toBe(1);
    await reverseUsage(s, ledgerId, "provider failure");
    expect(s.rows.length).toBe(2); // original untouched + reversal row
    expect(s.rows[0].reversalOfId).toBeNull();
    const sum = await usageSummary(s, ent("free"), "u1");
    expect(sum.kinds.find((k) => k.kind === "investigator_turn")?.used).toBe(0);
  });
  it("quota refusal happens at the limit and writes nothing extra", async () => {
    const s = new InMemoryUsageStore();
    for (let i = 0; i < 5; i++) await chargeUsage(s, { userId: "u1", tier: "free", kind: "claim_verification" });
    const before = s.rows.length;
    const c = await checkQuota(s, ent("free"), "claim_verification", { userId: "u1" });
    expect(c.ok).toBe(false);
    if (!c.ok) { expect(c.limit).toBe(5); expect(c.used).toBe(5); expect(c.error).toBe("FR_QUOTA_EXCEEDED"); }
    expect(s.rows.length).toBe(before);
  });
  it("plus tier limit is 50 for both core kinds (spec-anchored)", async () => {
    const s = new InMemoryUsageStore();
    const a = await checkQuota(s, ent("plus"), "investigator_turn", { userId: "u" });
    const b = await checkQuota(s, ent("plus"), "claim_verification", { userId: "u" });
    expect(a.limit).toBe(50); expect(b.limit).toBe(50);
  });
});

describe("comp (§3.6 / §7.3.6)", () => {
  function memStore(initial: { stripeSubscriptionId: string; isComp: boolean } | null): CompStore & { row: unknown } {
    const state: { row: unknown } = { row: initial ? { id: "r1", status: "active", ...initial } : null };
    return {
      row: state.row,
      async findByUserId() { return state.row as never; },
      async upsertComp(d) {
        state.row = { id: "r1", stripeSubscriptionId: `frcomp_${d.source}_u`, isComp: true, status: "active" };
        this.row = state.row;
        return { id: "r1", currentPeriodEnd: d.periodEnd };
      },
      async cancelComp() { (state.row as { status: string }).status = "canceled"; this.row = state.row; },
    };
  }
  it("grant decision: paid row blocks, comp/missing proceeds; revoke only touches comps", () => {
    expect(frCompGrantDecision({ stripeSubscriptionId: "sub_real", isComp: false })).toBe("skip_paid");
    expect(frCompGrantDecision({ stripeSubscriptionId: "frcomp_owner_u", isComp: true })).toBe("grant");
    expect(frCompGrantDecision(null)).toBe("grant");
    expect(frCompRevokeDecision({ stripeSubscriptionId: "sub_real", isComp: false })).toBe(false);
    expect(frCompRevokeDecision({ stripeSubscriptionId: "frcomp_owner_u", isComp: true })).toBe(true);
  });
  it("grant against a paid row ⇒ skip_paid; grant + revoke round-trip on comp rows", async () => {
    const paid = memStore({ stripeSubscriptionId: "sub_real", isComp: false });
    expect(await grantFraudRadarComp("u", "pro", "owner", 12, "a@x.com", "staging", paid))
      .toEqual({ granted: false, reason: "paid_subscription_exists" });
    const comp = memStore(null);
    const g = await grantFraudRadarComp("u", "pro", "owner", 12, "a@x.com", "staging", comp);
    expect(g.granted).toBe(true);
    expect(await revokeFraudRadarComp("u", comp)).toEqual({ revoked: true });
    const paid2 = memStore({ stripeSubscriptionId: "sub_real", isComp: false });
    expect(await revokeFraudRadarComp("u", paid2)).toEqual({ revoked: false });
  });
});
