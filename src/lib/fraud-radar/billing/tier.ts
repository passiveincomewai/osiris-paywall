/**
 * Fraud Radar Phase 11 — tier resolution (PHASE11 §1.3, P11-A).
 *
 * Two layers, mirroring the house planTier / skiAccess split:
 *  (a) fraudRadarTierOf(session) — pure claim reader, no I/O.
 *      This is the interface Phases 7/8/9 already call (their
 *      investigator module re-exports this implementation).
 *  (b) resolveFraudRadarEntitlement(userId) — the authoritative
 *      DB resolver used by the auth claims pass and every
 *      billing-sensitive server gate. Pure row logic lives in
 *      entitlementFromRow() so the ≥14-case fixture suite pins
 *      it without a database.
 *
 * Resolution order (binding, §1.3): flag off ⇒ none · signed
 * out ⇒ none · comp (active, in period) · paid by status
 * (active/trialing grant; past_due/canceled grant only within
 * the paid period; incomplete/unpaid/paused/expired ⇒ none) ·
 * team grant (DEFERRED with P11-E — no FrTeam tables ship in
 * SHV-11, so teamTier is always "none" here) · admin ⇒
 * pro-equivalent, flag-on only · otherwise free.
 *
 * The DB seam is injectable (TierStore) so tests never touch a
 * real database; the default store reads ONLY the
 * FraudRadarSubscription table — never the house Subscription.
 */
import { fraudRadarEnabled } from "../flag";
import { isFrTier, maxFrTier, type FrTier, type FrTierOrNone } from "./plans";

export interface FrSubscriptionRow {
  id: string;
  plan: string;
  status: string;
  currentPeriodEnd: Date;
  isComp: boolean;
  seatsPurchased: number | null;
}

export interface FrEntitlement {
  tier: FrTierOrNone;
  source: "none" | "free" | "subscription" | "comp" | "team" | "admin";
  subscriptionId: string | null;
  teamId: string | null;
  seats: number;
  periodEnd: Date | null;
  personalTier: FrTierOrNone;
  teamTier: FrTierOrNone;
}

const NONE_ENT: FrEntitlement = {
  tier: "none", source: "none", subscriptionId: null, teamId: null,
  seats: 0, periodEnd: null, personalTier: "none", teamTier: "none",
};

export function freeEntitlement(): FrEntitlement {
  return { ...NONE_ENT, tier: "free", source: "free", personalTier: "free" };
}

/** Does this row grant its plan tier at `now`? (§1.3 steps 2–3) */
export function rowGrants(row: FrSubscriptionRow, now: Date): boolean {
  if (!isFrTier(row.plan) || row.plan === "free") return false;
  if (row.currentPeriodEnd.getTime() <= now.getTime()) return false;
  if (row.isComp) return row.status === "active";
  return row.status === "active" || row.status === "trialing" ||
    row.status === "past_due" || row.status === "canceled";
}

/** Pure entitlement from a (possibly null) subscription row. */
export function entitlementFromRow(
  row: FrSubscriptionRow | null,
  opts: { signedIn: boolean; isAdmin: boolean; now?: Date },
): FrEntitlement {
  if (!opts.signedIn) return NONE_ENT;
  const now = opts.now ?? new Date();
  if (row && rowGrants(row, now)) {
    const tier = row.plan as FrTier;
    return {
      tier, source: row.isComp ? "comp" : "subscription",
      subscriptionId: row.id, teamId: null,
      seats: tier === "teams" ? (row.seatsPurchased ?? 5) : 0,
      periodEnd: row.currentPeriodEnd, personalTier: tier, teamTier: "none",
    };
  }
  if (opts.isAdmin) {
    return {
      ...NONE_ENT, tier: "pro", source: "admin", personalTier: "pro",
    };
  }
  return freeEntitlement();
}

/* ── (a) pure claim reader ─────────────────────────────────────── */
export interface FrSessionLike {
  user?: { id?: string | null; email?: string | null; fraudRadarTier?: unknown } | null;
}

export function adminEmailSet(env: Record<string, string | undefined>): Set<string> {
  return new Set(
    (env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
  );
}

export function fraudRadarTierOf(
  session: FrSessionLike | null | undefined,
  env: Record<string, string | undefined> = process.env,
): FrTierOrNone {
  const user = session?.user;
  if (!user?.id) return "none";
  const claim = user.fraudRadarTier;
  if (typeof claim === "string" && isFrTier(claim)) return claim;
  if (user.email && adminEmailSet(env).has(user.email.toLowerCase())) return "pro";
  return "free";
}

/* ── (b) authoritative resolver ────────────────────────────────── */
export interface TierStore {
  findSubscriptionByUserId(userId: string): Promise<FrSubscriptionRow | null>;
  findUserEmail(userId: string): Promise<string | null>;
}

let defaultStore: TierStore | null = null;
export async function getDefaultTierStore(): Promise<TierStore> {
  if (defaultStore) return defaultStore;
  const { db } = await import("@/lib/db");
  defaultStore = {
    async findSubscriptionByUserId(userId) {
      const r = await db.fraudRadarSubscription.findUnique({ where: { userId } });
      if (!r) return null;
      return {
        id: r.id, plan: r.plan, status: r.status,
        currentPeriodEnd: r.currentPeriodEnd, isComp: r.isComp,
        seatsPurchased: r.seatsPurchased,
      };
    },
    async findUserEmail(userId) {
      const u = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
      return u?.email ?? null;
    },
  };
  return defaultStore;
}

export async function resolveFraudRadarEntitlement(
  userId: string | null,
  opts: {
    env?: Record<string, string | undefined>;
    store?: TierStore;
    now?: Date;
  } = {},
): Promise<FrEntitlement> {
  const env = opts.env ?? process.env;
  // Flag off ⇒ none for every caller, WITHOUT a DB read (§1.3.0).
  if (!fraudRadarEnabled(env)) return NONE_ENT;
  if (!userId) return NONE_ENT;
  const store = opts.store ?? (await getDefaultTierStore());
  const [row, email] = await Promise.all([
    store.findSubscriptionByUserId(userId),
    store.findUserEmail(userId),
  ]);
  const isAdmin = !!email && adminEmailSet(env).has(email.toLowerCase());
  const ent = entitlementFromRow(row, { signedIn: true, isAdmin, now: opts.now });
  // Admin posture never downgrades a real grant; max() keeps both.
  if (isAdmin && ent.source !== "admin") {
    return { ...ent, tier: maxFrTier(ent.tier, "pro") as FrTierOrNone };
  }
  return ent;
}
