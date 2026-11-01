import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {} }));
import {
  entitlementFromRow, fraudRadarTierOf, resolveFraudRadarEntitlement,
  type FrSubscriptionRow, type TierStore,
} from "./tier";

const NOW = new Date("2026-11-01T00:00:00Z");
const FUTURE = new Date("2026-12-01T00:00:00Z");
const PAST = new Date("2026-10-01T00:00:00Z");
function row(p: Partial<FrSubscriptionRow>): FrSubscriptionRow {
  return { id: "sub1", plan: "plus", status: "active", currentPeriodEnd: FUTURE, isComp: false, seatsPurchased: null, ...p };
}
const base = { signedIn: true, isAdmin: false, now: NOW };

describe("tier resolution fixtures (§7.3.2, ≥14 cases)", () => {
  it("1 signed-out ⇒ none", () => {
    expect(entitlementFromRow(row({}), { ...base, signedIn: false }).tier).toBe("none");
    expect(fraudRadarTierOf(null)).toBe("none");
    expect(fraudRadarTierOf({ user: null })).toBe("none");
  });
  it("2 signed-in, no row ⇒ free", () => {
    const e = entitlementFromRow(null, base);
    expect(e.tier).toBe("free"); expect(e.source).toBe("free");
  });
  it("3 plus active ⇒ plus/subscription", () => {
    const e = entitlementFromRow(row({ plan: "plus" }), base);
    expect(e.tier).toBe("plus"); expect(e.source).toBe("subscription");
  });
  it("4 pro trialing ⇒ pro", () => {
    expect(entitlementFromRow(row({ plan: "pro", status: "trialing" }), base).tier).toBe("pro");
  });
  it("5 teams active ⇒ teams + 5 seats", () => {
    const e = entitlementFromRow(row({ plan: "teams", seatsPurchased: 5 }), base);
    expect(e.tier).toBe("teams"); expect(e.seats).toBe(5);
  });
  it("6 past_due within period ⇒ tier retained", () => {
    expect(entitlementFromRow(row({ status: "past_due" }), base).tier).toBe("plus");
  });
  it("7 past_due past period ⇒ free", () => {
    expect(entitlementFromRow(row({ status: "past_due", currentPeriodEnd: PAST }), base).tier).toBe("free");
  });
  it("8 canceled within period ⇒ tier until period end", () => {
    expect(entitlementFromRow(row({ plan: "pro", status: "canceled" }), base).tier).toBe("pro");
  });
  it("9 canceled past period ⇒ free", () => {
    expect(entitlementFromRow(row({ status: "canceled", currentPeriodEnd: PAST }), base).tier).toBe("free");
  });
  it("10 incomplete ⇒ free", () => {
    expect(entitlementFromRow(row({ status: "incomplete" }), base).tier).toBe("free");
  });
  it("11 unpaid / paused / incomplete_expired ⇒ free", () => {
    for (const status of ["unpaid", "paused", "incomplete_expired"]) {
      expect(entitlementFromRow(row({ status }), base).tier).toBe("free");
    }
  });
  it("12 comp active ⇒ tier with source comp", () => {
    const e = entitlementFromRow(row({ plan: "pro", isComp: true }), base);
    expect(e.tier).toBe("pro"); expect(e.source).toBe("comp");
  });
  it("13 expired comp falls through to free", () => {
    expect(entitlementFromRow(row({ isComp: true, currentPeriodEnd: PAST }), base).tier).toBe("free");
  });
  it("14 admin with no row ⇒ pro-equivalent, source admin", () => {
    const e = entitlementFromRow(null, { ...base, isAdmin: true });
    expect(e.tier).toBe("pro"); expect(e.source).toBe("admin");
  });
  it("15 admin with a plus row ⇒ pro (max), source stays subscription", async () => {
    const store: TierStore = {
      findSubscriptionByUserId: async () => row({ plan: "plus" }),
      findUserEmail: async () => "admin@example.com",
    };
    const e = await resolveFraudRadarEntitlement("u1", {
      store, now: NOW, env: { FRAUD_RADAR_ENABLED: "1", ADMIN_EMAILS: "admin@example.com" },
    });
    expect(e.tier).toBe("pro"); expect(e.personalTier).toBe("plus");
  });
  it("16 flag off ⇒ none incl. admin, without any store read", async () => {
    let reads = 0;
    const store: TierStore = {
      findSubscriptionByUserId: async () => { reads++; return row({}); },
      findUserEmail: async () => { reads++; return "admin@example.com"; },
    };
    const e = await resolveFraudRadarEntitlement("u1", {
      store, env: { FRAUD_RADAR_ENABLED: "", ADMIN_EMAILS: "admin@example.com" },
    });
    expect(e.tier).toBe("none"); expect(reads).toBe(0);
  });
  it("17 claim reader: claim wins, bogus claim falls to free, admin email ⇒ pro", () => {
    expect(fraudRadarTierOf({ user: { id: "u", fraudRadarTier: "teams" } })).toBe("teams");
    expect(fraudRadarTierOf({ user: { id: "u", fraudRadarTier: "bogus" } })).toBe("free");
    expect(fraudRadarTierOf({ user: { id: "u", email: "a@x.com" } }, { ADMIN_EMAILS: "a@x.com" })).toBe("pro");
  });
  it("18 teamTier is none in SHV-11 (P11-E deferred — no team tables)", () => {
    const e = entitlementFromRow(row({ plan: "pro" }), base);
    expect(e.teamTier).toBe("none"); expect(e.teamId).toBeNull();
  });
});
