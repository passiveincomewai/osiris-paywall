// Admin affiliate panel tests (mocked Prisma, real engine functions):
//   - pure helpers (email masking, comp source parsing)
//   - "removed" status gating: Studio gate + attribution creation refuse a
//     removed affiliate while preserving their history rows
//   - admin actions: comp grant/revoke via the admin path (paid subs are
//     untouchable), status set (incl. removed / reactivate), ambassador
//     toggle, discount reset, XP adjust (+ award, − clamped deduction with
//     a consistent ledger)
// Run: npx vitest run src/lib/affiliate/admin-detail.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { RANKS } from "./ranks";

vi.mock("./settings", () => ({
  getSettings: async () => ({
    ranks: RANKS,
    overrideL2Pct: 5,
    overrideL3Pct: 2,
    attributionWindowDays: 30,
    holdingPeriodDays: 30,
    minPayoutCents: 2500,
    xpTable: { admin_award: 0 },
  }),
}));

// ── In-memory fake Prisma ────────────────────────────────────────────────
type Row = Record<string, any>;

const { store, db } = vi.hoisted(() => {
  const store: Record<string, Row[]> = {
    affiliateProfile: [],
    subscription: [],
    xPEvent: [],
    referralAttribution: [],
    affiliateAuditLog: [],
    referralCodeAlias: [],
  };
  let seq = 0;
  const nid = (p: string) => `${p}_${++seq}`;

  function matchWhere(row: Row, where: any): boolean {
    if (!where) return true;
    for (const [k, v] of Object.entries(where)) {
      if (k === "OR") {
        if (!(v as any[]).some((sub) => matchWhere(row, sub))) return false;
        continue;
      }
      if (v !== null && typeof v === "object" && !(v instanceof Date)) {
        if ("in" in v && !(v as any).in.includes(row[k])) return false;
        else if ("not" in v && row[k] === (v as any).not) return false;
        else if ("gt" in v && !(row[k] > (v as any).gt)) return false;
        else if ("gte" in v && !(row[k] >= (v as any).gte)) return false;
        else if (!("in" in v) && !("not" in v) && !("gt" in v) && !("gte" in v)) return false;
      } else if (row[k] !== v) return false;
    }
    return true;
  }

  function applyData(row: Row, data: any) {
    for (const [k, v] of Object.entries(data)) {
      if (v !== null && typeof v === "object" && "increment" in (v as any)) {
        row[k] = (row[k] ?? 0) + (v as any).increment;
      } else {
        row[k] = v;
      }
    }
  }

  const model = (name: string) => ({
    findUnique: async ({ where }: any) => store[name].find((r) => matchWhere(r, where)) ?? null,
    findFirst: async ({ where }: any) => store[name].find((r) => matchWhere(r, where)) ?? null,
    create: async ({ data }: any) => {
      if (name === "xPEvent" && store.xPEvent.some((r) => r.idempotencyKey === data.idempotencyKey)) {
        throw new Error("Unique constraint failed on the fields: (`idempotencyKey`)");
      }
      if (name === "referralAttribution" && store.referralAttribution.some((r) => r.referredUserId === data.referredUserId)) {
        throw new Error("Unique constraint failed on the fields: (`referredUserId`)");
      }
      const row = { id: nid(name), createdAt: new Date(), ...data };
      store[name].push(row);
      return row;
    },
    update: async ({ where, data }: any) => {
      const row = store[name].find((r) => matchWhere(r, where));
      if (!row) throw new Error("Record not found");
      applyData(row, data);
      return row;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const row of store[name]) if (matchWhere(row, where)) { applyData(row, data); count++; }
      return { count };
    },
    upsert: async ({ where, create, update }: any) => {
      const row = store[name].find((r) => matchWhere(r, where));
      if (row) { applyData(row, update); return row; }
      const fresh = { id: nid(name), createdAt: new Date(), ...create };
      store[name].push(fresh);
      return fresh;
    },
    count: async ({ where }: any) => store[name].filter((r) => matchWhere(r, where)).length,
  });

  const db = {
    affiliateProfile: model("affiliateProfile"),
    subscription: model("subscription"),
    xPEvent: model("xPEvent"),
    referralAttribution: model("referralAttribution"),
    affiliateAuditLog: model("affiliateAuditLog"),
    referralCodeAlias: model("referralCodeAlias"),
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  };
  return { store, db };
});

vi.mock("@/lib/db", () => ({ db }));

import {
  maskEmail,
  compSourceOf,
  planNameForPriceId,
  applyAffiliateAdminAction,
  AffiliateActionError,
} from "./admin-detail";
import { compSyntheticId } from "@/lib/pro/comp";
import { evaluateStudioAccess } from "@/lib/studio/access";
import { linkAttribution, findAffiliateByCode } from "./attribution";

function seedProfile(over: Partial<Row> = {}): Row {
  const p: Row = {
    id: "prof1",
    userId: "user1",
    referralCode: "jameson",
    customCode: null,
    status: "active",
    xp: 500,
    isAmbassador: false,
    discountCode: "JAMESON5",
    discountPct: 5,
    stripePromotionCodeId: "promo_123",
    discountSyncedAt: new Date(),
    recruitedByProfileId: null,
    ...over,
  };
  store.affiliateProfile.push(p);
  return p;
}

beforeEach(() => {
  for (const k of Object.keys(store)) store[k] = [];
  delete process.env.STRIPE_SECRET_KEY;
});

// ── Pure helpers ─────────────────────────────────────────────────────────

describe("maskEmail", () => {
  it("masks the local part, keeps the domain", () => {
    expect(maskEmail("jameson@example.com")).toBe("ja***@example.com");
    expect(maskEmail("ab@x.io")).toBe("ab***@x.io");
    expect(maskEmail(null)).toBe("—");
    expect(maskEmail("not-an-email")).toBe("***");
  });
});

describe("compSourceOf / plan names", () => {
  it("parses the source out of synthetic comp ids, incl. admin grants", () => {
    expect(compSyntheticId("admin", "u1")).toBe("comp_admin_u1");
    expect(compSourceOf("comp_admin_u1")).toBe("admin");
    expect(compSourceOf("comp_creator_u1")).toBe("creator");
    expect(compSourceOf("sub_real123")).toBeNull();
    expect(compSourceOf(null)).toBeNull();
  });
  it("names the comp price as Free Pro", () => {
    expect(planNameForPriceId("comp_free_pro")).toBe("Free Pro (comp)");
  });
});

// ── Status gating for "removed" ──────────────────────────────────────────

describe("removed-affiliate gating", () => {
  it("studio gate: removed (and suspended/banned) affiliates are inactive", () => {
    expect(evaluateStudioAccess({ status: "removed" }, true)).toBe("inactive");
    expect(evaluateStudioAccess({ status: "suspended" }, true)).toBe("inactive");
    expect(evaluateStudioAccess({ status: "active" }, true)).toBe("ok");
  });

  it("referral-code lookup ignores removed affiliates", async () => {
    seedProfile({ status: "removed" });
    expect(await findAffiliateByCode("jameson")).toBeNull();
  });

  it("no new attribution is created for a removed affiliate, history untouched", async () => {
    const p = seedProfile({ status: "removed" });
    store.referralAttribution.push({
      id: "old1", affiliateProfileId: p.id, referredUserId: "someone-else",
      expiresAt: new Date(Date.now() + 86400_000), convertedAt: null, createdAt: new Date(),
    });
    const out = await linkAttribution("newuser", p.id);
    expect(out).toBeNull();
    expect(store.referralAttribution).toHaveLength(1); // only the historical row
  });

  it("reactivating restores attribution eligibility", async () => {
    const p = seedProfile({ status: "removed" });
    await applyAffiliateAdminAction(p.id, "boss@example.com", { action: "set_status", status: "active" });
    const out = await linkAttribution("newuser", p.id);
    expect(out?.affiliateProfileId).toBe(p.id);
  });
});

// ── Admin actions ────────────────────────────────────────────────────────

describe("applyAffiliateAdminAction", () => {
  it("404s for an unknown profile", async () => {
    await expect(
      applyAffiliateAdminAction("nope", "boss@example.com", { action: "set_ambassador", value: true }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("set_status validates against the status list", async () => {
    const p = seedProfile();
    await expect(
      applyAffiliateAdminAction(p.id, "boss@example.com", { action: "set_status", status: "bogus" }),
    ).rejects.toBeInstanceOf(AffiliateActionError);
    const out = await applyAffiliateAdminAction(p.id, "boss@example.com", { action: "set_status", status: "removed" });
    expect(out.status).toBe("removed");
    expect(store.affiliateProfile[0].status).toBe("removed");
  });

  it("grant_comp creates a comp_admin subscription for a free user", async () => {
    const p = seedProfile();
    const out = await applyAffiliateAdminAction(p.id, "boss@example.com", { action: "grant_comp" });
    expect(out.result).toMatch(/Free Pro granted until/);
    const sub = store.subscription.find((s) => s.userId === "user1");
    expect(sub?.stripeSubscriptionId).toBe("comp_admin_user1");
    expect(sub?.stripePriceId).toBe("comp_free_pro");
    expect(sub?.status).toBe("active");
    expect(sub!.currentPeriodEnd.getTime()).toBeGreaterThan(Date.now());
  });

  it("grant_comp refuses over a real paid subscription and changes nothing", async () => {
    const p = seedProfile();
    store.subscription.push({
      id: "sub1", userId: "user1", stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_real",
      stripePriceId: "price_monthly", status: "active",
      currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400_000),
      cancelAtPeriodEnd: false,
    });
    await expect(
      applyAffiliateAdminAction(p.id, "boss@example.com", { action: "grant_comp" }),
    ).rejects.toMatchObject({ status: 409 });
    const sub = store.subscription.find((s) => s.userId === "user1");
    expect(sub?.stripeSubscriptionId).toBe("sub_real");
    expect(sub?.status).toBe("active");
  });

  it("revoke_comp cancels a comp grant but never a paid subscription", async () => {
    const p = seedProfile();
    await applyAffiliateAdminAction(p.id, "boss@example.com", { action: "grant_comp" });
    const out = await applyAffiliateAdminAction(p.id, "boss@example.com", { action: "revoke_comp" });
    expect(out.result).toBe("Free Pro revoked");
    expect(store.subscription.find((s) => s.userId === "user1")?.status).toBe("canceled");

    // Paid: revoke must 409 and leave the row live.
    store.subscription.length = 0;
    store.subscription.push({
      id: "sub1", userId: "user1", stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_real",
      stripePriceId: "price_monthly", status: "active",
      currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 86400_000),
      cancelAtPeriodEnd: false,
    });
    await expect(
      applyAffiliateAdminAction(p.id, "boss@example.com", { action: "revoke_comp" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(store.subscription[0].status).toBe("active");
  });

  it("set_ambassador flips the flag both ways", async () => {
    const p = seedProfile();
    await applyAffiliateAdminAction(p.id, "boss@example.com", { action: "set_ambassador", value: true });
    expect(store.affiliateProfile[0].isAmbassador).toBe(true);
    await applyAffiliateAdminAction(p.id, "boss@example.com", { action: "set_ambassador", value: false });
    expect(store.affiliateProfile[0].isAmbassador).toBe(false);
  });

  it("reset_discount clears the stored code fields", async () => {
    const p = seedProfile();
    const out = await applyAffiliateAdminAction(p.id, "boss@example.com", { action: "reset_discount" });
    expect(out.result).toMatch(/Discount code reset/);
    const after = store.affiliateProfile[0];
    expect(after.discountCode).toBeNull();
    expect(after.discountPct).toBeNull();
    expect(after.stripePromotionCodeId).toBeNull();
    expect(after.discountSyncedAt).toBeNull();
  });

  it("adjust_xp awards through the XP ledger", async () => {
    const p = seedProfile({ xp: 500 });
    const out = await applyAffiliateAdminAction(p.id, "boss@example.com", { action: "adjust_xp", xp: 250, reason: "goodwill" });
    expect(out.xp).toBe(750);
    expect(store.affiliateProfile[0].xp).toBe(750);
    expect(store.xPEvent).toHaveLength(1);
    expect(store.xPEvent[0].activity).toBe("admin_award");
    expect(store.xPEvent[0].xp).toBe(250);
  });

  it("adjust_xp deducts with clamping and a consistent ledger", async () => {
    const p = seedProfile({ xp: 300 });
    const out = await applyAffiliateAdminAction(p.id, "boss@example.com", { action: "adjust_xp", xp: -1000, reason: "correction" });
    expect(out.xp).toBe(0);
    expect(store.affiliateProfile[0].xp).toBe(0);
    // Ledger records the APPLIED delta (-300), so events sum to the balance.
    expect(store.xPEvent[0].xp).toBe(-300);
    const ledgerSum = store.xPEvent.reduce((a, e) => a + e.xp, 0);
    expect(300 + ledgerSum).toBe(store.affiliateProfile[0].xp);
  });

  it("adjust_xp uses a unique idempotency key per action (repeats both apply)", async () => {
    const p = seedProfile({ xp: 0 });
    await applyAffiliateAdminAction(p.id, "boss@example.com", { action: "adjust_xp", xp: 100 });
    await applyAffiliateAdminAction(p.id, "boss@example.com", { action: "adjust_xp", xp: 100 });
    expect(store.affiliateProfile[0].xp).toBe(200);
    expect(store.xPEvent).toHaveLength(2);
    expect(store.xPEvent[0].idempotencyKey).not.toBe(store.xPEvent[1].idempotencyKey);
  });

  it("adjust_xp rejects zero and out-of-range deltas", async () => {
    const p = seedProfile();
    await expect(applyAffiliateAdminAction(p.id, "boss@example.com", { action: "adjust_xp", xp: 0 })).rejects.toBeInstanceOf(AffiliateActionError);
    await expect(applyAffiliateAdminAction(p.id, "boss@example.com", { action: "adjust_xp", xp: 10001 })).rejects.toBeInstanceOf(AffiliateActionError);
  });
});
