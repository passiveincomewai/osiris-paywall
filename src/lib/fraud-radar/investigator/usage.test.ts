import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import {
  estimateCostUsd,
  fraudRadarTierOf,
  quotaForTier,
} from "./entitlements";
import { createInMemoryStore } from "./store";
import {
  chargeTurn,
  getUsageSummary,
  monthWindowUtc,
  refundTurn,
  settleTurn,
} from "./usage";

/**
 * Phase 7 Payload B — entitlement resolver + usage ledger tests
 * (PHASE7 §1.3, §4.4): the Phase-11 interface's v1 behaviour, the
 * quota config's spec-anchored figures, charge-before /
 * refund-on-failure, and the ledger as the monthly quota source
 * of truth (refunded turns do not consume quota).
 */

describe("fraudRadarTierOf — the Phase-11 interface, v1 resolver", () => {
  it("signed out is none", () => {
    expect(fraudRadarTierOf(null)).toBe("none");
    expect(fraudRadarTierOf({})).toBe("none");
    expect(fraudRadarTierOf({ user: null })).toBe("none");
  });

  it("a signed-in user defaults to the Free Explorer allowance", () => {
    expect(fraudRadarTierOf({ user: { id: "u1", email: "a@example.com" } })).toBe("free");
  });

  it("a valid fraudRadarTier session claim wins (the Phase-11 shape)", () => {
    expect(
      fraudRadarTierOf({ user: { id: "u1", fraudRadarTier: "plus" } }),
    ).toBe("plus");
    expect(
      fraudRadarTierOf({ user: { id: "u1", fraudRadarTier: "bogus" } }),
    ).toBe("free");
  });

  it("platform admins resolve to pro in a flag-on context", () => {
    expect(
      fraudRadarTierOf(
        { user: { id: "u1", email: "Boss@Example.com" } },
        { ADMIN_EMAILS: "boss@example.com, other@example.com" },
      ),
    ).toBe("pro");
  });
});

describe("quota config (§1.3 — Plus is the spec-anchored figure)", () => {
  it("carries the designed allowances and ceilings", () => {
    expect(quotaForTier("free")?.monthlyOps).toBe(5);
    expect(quotaForTier("plus")?.monthlyOps).toBe(50);
    expect(quotaForTier("pro")?.monthlyOps).toBe(300);
    expect(quotaForTier("teams")?.monthlyOps).toBe(300);
    expect(quotaForTier("none")).toBeNull();
    expect(quotaForTier("free")?.maxRounds).toBe(6);
    expect(quotaForTier("pro")?.maxRounds).toBe(8);
    expect(quotaForTier("free")?.maxCallsPerTurn).toBe(12);
  });

  it("estimates cost from the recorded per-token rates", () => {
    // gemini-2.0-flash: $0.10 in / $0.40 out per 1M tokens.
    expect(estimateCostUsd("gemini-2.0-flash", 1_000_000, 0)).toBeCloseTo(0.1);
    expect(estimateCostUsd("gemini-2.0-flash", 0, 1_000_000)).toBeCloseTo(0.4);
    expect(estimateCostUsd("gemini-2.0-flash", 0, 0)).toBe(0);
  });
});

describe("usage ledger — charge-before / refund-on-failure (§4.4)", () => {
  it("monthly ops count charged rows only; refunds free the quota", async () => {
    const store = createInMemoryStore();
    const now = new Date();
    const charge = (turnId: string) =>
      chargeTurn(store, {
        userId: "u1",
        conversationId: "c1",
        turnId,
        tier: "free",
        model: "gemini-2.0-flash",
      });
    await charge("t1");
    await charge("t2");
    await charge("t3");
    await refundTurn(store, "t2", {
      inputTokens: 10,
      outputTokens: 5,
      toolCallCount: 0,
      validatorVerdict: null,
    });
    const summary = await getUsageSummary(store, "u1", "free", now);
    expect(summary.used).toBe(2);
    expect(summary.limit).toBe(5);
    expect(summary.remaining).toBe(3);
    expect(summary.tier).toBe("free");
  });

  it("settle records tokens, tool calls, verdict, and the cost estimate on the charged row", async () => {
    const store = createInMemoryStore();
    await chargeTurn(store, {
      userId: "u1",
      conversationId: "c1",
      turnId: "t1",
      tier: "plus",
      model: "gemini-2.0-flash",
    });
    await settleTurn(store, "t1", {
      inputTokens: 1000,
      outputTokens: 500,
      toolCallCount: 3,
      validatorVerdict: "pass",
    });
    const row = await store.getLedgerByTurn("t1");
    expect(row?.status).toBe("charged");
    expect(row?.inputTokens).toBe(1000);
    expect(row?.outputTokens).toBe(500);
    expect(row?.toolCallCount).toBe(3);
    expect(row?.validatorVerdict).toBe("pass");
    expect(row?.estimatedCostUsd).toBeCloseTo(0.0003, 8);
  });

  it("the month window is the UTC calendar month with the reset at its end", () => {
    const { start, end, resetAt } = monthWindowUtc(new Date("2026-10-31T14:52:51Z"));
    expect(start.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(resetAt.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("ops from another user or another month do not consume this quota", async () => {
    const store = createInMemoryStore();
    await chargeTurn(store, {
      userId: "someone-else",
      conversationId: "c9",
      turnId: "tx",
      tier: "free",
      model: "gemini-2.0-flash",
    });
    const summary = await getUsageSummary(store, "u1", "free", new Date());
    expect(summary.used).toBe(0);
  });
});
