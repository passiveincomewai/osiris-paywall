// Affiliate money-path lifecycle test (mocked Prisma).
// Exercises the REAL engine functions end to end:
//   attribution → L1/L2/L3 commissions → idempotent replay → renewal XP →
//   holding release → refund reversal.
// Run: npx vitest run src/lib/affiliate/lifecycle.test.ts
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
    xpTable: {
      join: 100,
      onboarding_complete: 100,
      account_verified: 50,
      first_verified_visit: 25,
      first_paying_referral: 500,
      paying_referral: 150,
      bonus_5_paying: 750,
      bonus_10_paying: 1500,
    },
  }),
}));

// ── In-memory fake Prisma ────────────────────────────────────────────────
type Row = Record<string, any>;

const { store, db } = vi.hoisted(() => {
  const store: Record<string, Row[]> = {
    referralAttribution: [],
    affiliateProfile: [],
    commission: [],
    xPEvent: [],
    affiliateAuditLog: [],
  };
  let seq = 0;
  const nid = (p: string) => `${p}_${++seq}`;

  function uniqueErr(field: string): Error {
    return new Error(`Unique constraint failed on the fields: (\`${field}\`)`);
  }

  function matchWhere(row: Row, where: any): boolean {
    if (!where) return true;
    for (const [k, v] of Object.entries(where)) {
      if (v !== null && typeof v === "object" && !Array.isArray(v)) {
        if ("in" in v && !(v as any).in.includes(row[k])) return false;
        else if ("not" in v && row[k] === (v as any).not) return false;
        else if ("gt" in v && !(row[k] > (v as any).gt)) return false;
        else if ("gte" in v && !(row[k] >= (v as any).gte)) return false;
        else if ("lte" in v && !(row[k] <= (v as any).lte)) return false;
        else if (!("in" in v) && !("not" in v) && !("gt" in v) && !("gte" in v) && !("lte" in v)) {
          if (row[k] !== v) return false;
        }
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

  const db = {
    referralAttribution: {
      findUnique: async ({ where, include }: any) => {
        const r = store.referralAttribution.find((x) => matchWhere(x, where)) ?? null;
        if (r && include?.affiliate) {
          const aff = store.affiliateProfile.find((p) => p.id === r.affiliateProfileId) ?? null;
          return { ...r, affiliate: aff };
        }
        return r;
      },
      create: async ({ data }: any) => {
        if (store.referralAttribution.some((x) => x.referredUserId === data.referredUserId)) throw uniqueErr("referredUserId");
        const r = { id: nid("attr"), createdAt: new Date(), convertedAt: null, ...data };
        store.referralAttribution.push(r);
        return r;
      },
      update: async ({ where, data }: any) => {
        const r = store.referralAttribution.find((x) => matchWhere(x, where));
        if (!r) throw new Error("not found");
        applyData(r, data);
        return r;
      },
    },
    affiliateProfile: {
      findUnique: async ({ where }: any) => store.affiliateProfile.find((x) => matchWhere(x, where)) ?? null,
      findFirst: async ({ where }: any) => store.affiliateProfile.find((x) => matchWhere(x, where)) ?? null,
      update: async ({ where, data }: any) => {
        const r = store.affiliateProfile.find((x) => matchWhere(x, where));
        if (!r) throw new Error("not found");
        applyData(r, data);
        return r;
      },
      updateMany: async ({ where, data }: any) => {
        let n = 0;
        for (const r of store.affiliateProfile) if (matchWhere(r, where)) { applyData(r, data); n++; }
        return { count: n };
      },
    },
    commission: {
      create: async ({ data }: any) => {
        if (store.commission.some((x) => x.idempotencyKey === data.idempotencyKey)) throw uniqueErr("idempotencyKey");
        const r = { id: nid("com"), createdAt: new Date(), updatedAt: new Date(), ...data };
        store.commission.push(r);
        return r;
      },
      findMany: async ({ where, distinct }: any) => {
        let rows = store.commission.filter((x) => matchWhere(x, where));
        if (distinct) {
          const seen = new Set<string>();
          rows = rows.filter((x) => {
            const k = distinct.map((d: string) => String(x[d])).join("|");
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
        }
        return rows;
      },
      updateMany: async ({ where, data }: any) => {
        let n = 0;
        for (const r of store.commission) if (matchWhere(r, where)) { applyData(r, data); n++; }
        return { count: n };
      },
    },
    xPEvent: {
      create: async ({ data }: any) => {
        if (store.xPEvent.some((x) => x.idempotencyKey === data.idempotencyKey)) throw uniqueErr("idempotencyKey");
        const r = { id: nid("xp"), createdAt: new Date(), ...data };
        store.xPEvent.push(r);
        return r;
      },
    },
    affiliateAuditLog: {
      create: async ({ data }: any) => {
        const r = { id: nid("audit"), createdAt: new Date(), ...data };
        store.affiliateAuditLog.push(r);
        return r;
      },
    },
  };
  return { store, db };
});

vi.mock("@/lib/db", () => ({ db }));

// Import AFTER mocks.
import { linkAttribution } from "./attribution";
import { recordCommissionsForInvoice, reverseCommissionsForInvoice, releaseMaturedCommissions } from "./commissions";

function mkProfile(id: string, userId: string, recruitedBy: string | null = null, xp = 0) {
  const p = { id, userId, status: "active", xp, recruitedByProfileId: recruitedBy, referralCode: id, customCode: null };
  store.affiliateProfile.push(p);
  return p;
}

const invoice = (id: string, cents: number) => ({
  stripeInvoiceId: id,
  stripeCustomerId: "cus_test",
  stripeSubscriptionId: "sub_test",
  userId: "user_paying",
  amountCents: cents,
  currency: "usd",
});

beforeEach(() => {
  for (const k of Object.keys(store)) store[k] = [];
  // Chain: L3 (top) <- L2 <- L1 <- user_paying
  mkProfile("profL3", "user_L3");
  mkProfile("profL2", "user_L2", "profL3");
  mkProfile("profL1", "user_L1", "profL2");
});

describe("affiliate money-path lifecycle", () => {
  it("attributes a user once; rejects self-referral and inactive affiliates", async () => {
    const a1 = await linkAttribution("user_paying", "profL1");
    expect(a1).toBeTruthy();
    const a2 = await linkAttribution("user_paying", "profL1");
    expect(a2!.id).toBe(a1!.id); // idempotent

    expect(await linkAttribution("user_L1", "profL1")).toBeNull(); // self-referral

    mkProfile("profDead", "user_dead");
    store.affiliateProfile.find((p) => p.id === "profDead")!.status = "suspended";
    expect(await linkAttribution("user_other", "profDead")).toBeNull();
  });

  it("records L1/L2/L3 commissions with correct math on a $9.99 invoice", async () => {
    await linkAttribution("user_paying", "profL1");
    const total = await recordCommissionsForInvoice(invoice("in_1", 999));
    // Explorer 15%: floor(999*15/100)=149; L2 5%: 49; L3 2%: 19
    expect(total).toBe(149 + 49 + 19);

    const coms = store.commission;
    expect(coms).toHaveLength(3);
    const by = Object.fromEntries(coms.map((c) => [c.level, c]));
    expect(by[1].amountCents).toBe(149);
    expect(by[1].affiliateProfileId).toBe("profL1");
    expect(by[1].status).toBe("pending");
    expect(by[2].amountCents).toBe(49);
    expect(by[2].affiliateProfileId).toBe("profL2");
    expect(by[3].amountCents).toBe(19);
    expect(by[3].affiliateProfileId).toBe("profL3");

    // First-paying-referral XP milestone fired (500), plus join XP is separate.
    const xpActs = store.xPEvent.map((e) => e.activity);
    expect(xpActs).toContain("first_paying_referral");
  });

  it("replays are idempotent — no double commissions, no double XP", async () => {
    await linkAttribution("user_paying", "profL1");
    await recordCommissionsForInvoice(invoice("in_1", 999));
    const again = await recordCommissionsForInvoice(invoice("in_1", 999));
    expect(again).toBe(0);
    expect(store.commission).toHaveLength(3);
    expect(store.xPEvent.filter((e) => e.activity === "first_paying_referral")).toHaveLength(1);
  });

  it("renewals (new invoice) pay fresh commissions and standard referral XP", async () => {
    await linkAttribution("user_paying", "profL1");
    await recordCommissionsForInvoice(invoice("in_1", 999));
    const total = await recordCommissionsForInvoice(invoice("in_2", 999));
    expect(total).toBe(149 + 49 + 19);
    expect(store.commission).toHaveLength(6);
    // first_paying_referral NOT re-awarded; standard paying_referral IS.
    expect(store.xPEvent.filter((e) => e.activity === "first_paying_referral")).toHaveLength(1);
    expect(store.xPEvent.filter((e) => e.activity === "paying_referral")).toHaveLength(1);
  });

  it("ignores $0 invoices (trials) and unattributed users", async () => {
    await linkAttribution("user_paying", "profL1");
    expect(await recordCommissionsForInvoice(invoice("in_trial", 0))).toBe(0);
    expect(await recordCommissionsForInvoice({ ...invoice("in_x", 999), userId: "user_stranger" })).toBe(0);
    expect(store.commission).toHaveLength(0);
  });

  it("releases matured commissions pending → available", async () => {
    await linkAttribution("user_paying", "profL1");
    await recordCommissionsForInvoice(invoice("in_1", 999));
    expect(await releaseMaturedCommissions()).toBe(0); // holding period not elapsed
    for (const c of store.commission) c.availableAt = new Date(Date.now() - 1000);
    expect(await releaseMaturedCommissions()).toBe(3);
    expect(store.commission.every((c) => c.status === "available")).toBe(true);
  });

  it("reverses commissions on refund; paid ones are untouched", async () => {
    await linkAttribution("user_paying", "profL1");
    await recordCommissionsForInvoice(invoice("in_1", 999));
    await recordCommissionsForInvoice(invoice("in_2", 999));
    // Simulate one commission already paid out.
    store.commission[0].status = "paid";
    const n = await reverseCommissionsForInvoice("in_1", "charge.refunded");
    expect(n).toBe(2); // only pending/available/requested reversed
    const in1 = store.commission.filter((c) => c.stripeInvoiceId === "in_1");
    expect(in1.filter((c) => c.status === "reversed")).toHaveLength(2);
    expect(in1.filter((c) => c.status === "paid")).toHaveLength(1);
    // Other invoice untouched.
    expect(store.commission.filter((c) => c.stripeInvoiceId === "in_2" && c.status === "reversed")).toHaveLength(0);
    expect(store.affiliateAuditLog.some((a) => a.action === "commission.reversed")).toBe(true);
  });
});
