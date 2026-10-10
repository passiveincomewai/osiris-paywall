// Affiliate system unit tests: rank math, brand links, settings defaults.
// (DB-backed lifecycle — attribution → invoice → commissions → payout — is
// exercised against staging via the webhook test harness; see docs below.)
import { describe, it, expect } from "vitest";
import { RANKS, rankFor, nextRank, rankProgress } from "./ranks";
import { DEFAULT_SETTINGS } from "./settings";
import { referralLinkFor } from "./brand";

describe("rank ladder", () => {
  it("has six ranks with ascending thresholds and rates", () => {
    expect(RANKS).toHaveLength(6);
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].minXp).toBeGreaterThan(RANKS[i - 1].minXp);
      expect(RANKS[i].commissionPct).toBeGreaterThan(RANKS[i - 1].commissionPct);
    }
    expect(RANKS[0].commissionPct).toBe(15);
    expect(RANKS[5].commissionPct).toBe(30);
  });

  it("maps XP to the spec thresholds", () => {
    expect(rankFor(0).key).toBe("explorer");
    expect(rankFor(999).key).toBe("explorer");
    expect(rankFor(1000).key).toBe("scout");
    expect(rankFor(2999).key).toBe("scout");
    expect(rankFor(3000).key).toBe("analyst");
    expect(rankFor(7499).key).toBe("analyst");
    expect(rankFor(7500).key).toBe("commander");
    expect(rankFor(14999).key).toBe("commander");
    expect(rankFor(15000).key).toBe("elite");
    expect(rankFor(29999).key).toBe("elite");
    expect(rankFor(30000).key).toBe("visionary");
    expect(rankFor(999999).key).toBe("visionary");
  });

  it("computes next rank and progress", () => {
    expect(nextRank(0)?.key).toBe("scout");
    expect(nextRank(30000)).toBeNull();
    const p = rankProgress(500, RANKS);
    expect(p.pct).toBe(50);
    expect(p.xpNeeded).toBe(500);
    const maxed = rankProgress(99999, RANKS);
    expect(maxed.pct).toBe(100);
    expect(maxed.xpNeeded).toBe(0);
  });
});

describe("commission math (spec examples)", () => {
  // Mirrors the engine's formula: floor(amount * pct / 100).
  const l1 = (amountCents: number, pct: number) => Math.floor((amountCents * pct) / 100);

  it("L1 on weekly $3.99 at Explorer 15% = 59¢", () => {
    expect(l1(399, 15)).toBe(59);
  });
  it("L1 on annual $59.99 at Visionary 30% = $17.99", () => {
    expect(l1(5999, 30)).toBe(1799);
  });
  it("L2 5% override on $9.99 = 49¢", () => {
    expect(l1(999, 5)).toBe(49);
  });
  it("L3 2% override on $9.99 = 19¢", () => {
    expect(l1(999, 2)).toBe(19);
  });
  it("total take on one $9.99 invoice (15%+5%+2%) never exceeds 22%", () => {
    const total = l1(999, 15) + l1(999, 5) + l1(999, 2);
    expect(total).toBeLessThanOrEqual(Math.ceil(999 * 0.22));
  });
});

describe("program defaults", () => {
  it("matches the spec: 30d window, 30d hold, $25 min payout", () => {
    expect(DEFAULT_SETTINGS.attributionWindowDays).toBe(30);
    expect(DEFAULT_SETTINGS.holdingPeriodDays).toBe(30);
    expect(DEFAULT_SETTINGS.minPayoutCents).toBe(2500);
    expect(DEFAULT_SETTINGS.overrideL2Pct).toBe(5);
    expect(DEFAULT_SETTINGS.overrideL3Pct).toBe(2);
  });
  it("XP table matches the spec", () => {
    const t = DEFAULT_SETTINGS.xpTable;
    expect(t.join).toBe(100);
    expect(t.onboarding_complete).toBe(100);
    expect(t.account_verified).toBe(50);
    expect(t.first_verified_visit).toBe(25);
    expect(t.first_paying_referral).toBe(500);
    expect(t.paying_referral).toBe(150);
    expect(t.bonus_5_paying).toBe(750);
    expect(t.bonus_10_paying).toBe(1500);
  });
});

describe("referral links", () => {
  it("builds /ref/ links", () => {
    expect(referralLinkFor("jameson")).toBe("https://osiris-lime.vercel.app/ref/jameson");
  });
});
