/**
 * Fraud Radar Phase 11 — comp grants (PHASE11 §3.6, SHV-11 core).
 *
 * Mirrors the house lib/pro/comp.ts engine on the FR table ONLY:
 * a comp is a FraudRadarSubscription row with synthetic Stripe
 * ids (frcomp_<source>_<userId>) no real object can collide
 * with. Pure decision functions guarantee a comp NEVER
 * overwrites a real paid row and a revoke ONLY touches comp
 * rows. FR comps and WorldEye comps are fully independent —
 * this module reads/writes FraudRadarSubscription exclusively
 * and never imports the house comp or billing modules.
 *
 * SHV-11 scope: module + scripted admin path only
 * (scripts/fraud-radar-comp.ts). NO admin UI (P11-G full /
 * P11-C deferred).
 */
import { FR_COMP_PRICE_IDS } from "./prices";
import type { FrPlanKey } from "./plans";

export const FR_COMP_ID_PREFIX = "frcomp_";
export const FR_COMP_SOURCES = ["owner", "support", "partner", "press", "internal"] as const;
export type FrCompSource = (typeof FR_COMP_SOURCES)[number];

export interface CompRowLike {
  stripeSubscriptionId: string;
  isComp: boolean;
}

export function isFrCompRow(row: CompRowLike | null | undefined): boolean {
  return !!row && (row.isComp || row.stripeSubscriptionId.startsWith(FR_COMP_ID_PREFIX));
}

export function frCompSyntheticId(source: FrCompSource, userId: string): string {
  return `${FR_COMP_ID_PREFIX}${source}_${userId}`;
}

export function frCompGrantDecision(
  existing: CompRowLike | null | undefined,
): "grant" | "skip_paid" {
  if (!existing) return "grant";
  return isFrCompRow(existing) ? "grant" : "skip_paid";
}

export function frCompRevokeDecision(existing: CompRowLike | null | undefined): boolean {
  return isFrCompRow(existing);
}

export interface CompStore {
  findByUserId(userId: string): Promise<{
    id: string; stripeSubscriptionId: string; isComp: boolean; status: string;
  } | null>;
  upsertComp(data: {
    userId: string; tier: FrPlanKey; source: FrCompSource; grantedBy: string;
    reason: string | null; periodStart: Date; periodEnd: Date;
  }): Promise<{ id: string; currentPeriodEnd: Date }>;
  cancelComp(userId: string, now: Date): Promise<void>;
}

let defaultStore: CompStore | null = null;
async function getCompStore(): Promise<CompStore> {
  if (defaultStore) return defaultStore;
  const { db } = await import("@/lib/db");
  defaultStore = {
    async findByUserId(userId) {
      const r = await db.fraudRadarSubscription.findUnique({ where: { userId } });
      return r ? { id: r.id, stripeSubscriptionId: r.stripeSubscriptionId, isComp: r.isComp, status: r.status } : null;
    },
    async upsertComp(data) {
      const synthetic = frCompSyntheticId(data.source, data.userId);
      const row = {
        stripeCustomerId: synthetic, stripeSubscriptionId: synthetic,
        stripePriceId: FR_COMP_PRICE_IDS[data.tier], plan: data.tier,
        interval: "month", status: "active",
        currentPeriodStart: data.periodStart, currentPeriodEnd: data.periodEnd,
        cancelAtPeriodEnd: false, trialStart: null, trialEnd: null,
        seatsPurchased: data.tier === "teams" ? 5 : null,
        isComp: true, compSource: data.source, compGrantedBy: data.grantedBy,
        compReason: data.reason,
      };
      const r = await db.fraudRadarSubscription.upsert({
        where: { userId: data.userId },
        create: { userId: data.userId, ...row },
        update: row,
      });
      return { id: r.id, currentPeriodEnd: r.currentPeriodEnd };
    },
    async cancelComp(userId, now) {
      await db.fraudRadarSubscription.update({
        where: { userId },
        data: { status: "canceled", currentPeriodEnd: now },
      });
    },
  };
  return defaultStore;
}

export type FrCompGrantResult =
  | { granted: true; currentPeriodEnd: Date }
  | { granted: false; reason: "paid_subscription_exists" };

export async function grantFraudRadarComp(
  userId: string, tier: FrPlanKey, source: FrCompSource,
  months: number, grantedBy: string, reason?: string,
  store?: CompStore, now: Date = new Date(),
): Promise<FrCompGrantResult> {
  const s = store ?? (await getCompStore());
  const existing = await s.findByUserId(userId);
  if (frCompGrantDecision(existing) === "skip_paid") {
    return { granted: false, reason: "paid_subscription_exists" };
  }
  const end = new Date(now);
  end.setMonth(end.getMonth() + months);
  const r = await s.upsertComp({
    userId, tier, source, grantedBy, reason: reason ?? null,
    periodStart: now, periodEnd: end,
  });
  return { granted: true, currentPeriodEnd: r.currentPeriodEnd };
}

export async function revokeFraudRadarComp(
  userId: string, store?: CompStore, now: Date = new Date(),
): Promise<{ revoked: boolean }> {
  const s = store ?? (await getCompStore());
  const existing = await s.findByUserId(userId);
  if (!frCompRevokeDecision(existing)) return { revoked: false };
  await s.cancelComp(userId, now);
  return { revoked: true };
}
