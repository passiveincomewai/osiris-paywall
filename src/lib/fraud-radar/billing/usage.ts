/**
 * Fraud Radar Phase 11 — usage ledger + quota API (PHASE11
 * §3.3/§3.4, SHV-11 P11-B core).
 *
 * The FrUsageLedger is APPEND-ONLY: this module exposes create
 * + read only — there is no update or delete path. A reversal
 * is a new row whose reversalOfId points at the charge it
 * negates; net usage = charge units − reversal units.
 *
 * Enforcement contract (§3.4): checkQuota runs BEFORE any work;
 * a refused check writes nothing and starts nothing. Only the
 * two highest-cost kinds are wired to live charge points in
 * SHV-11 (investigator_turn, claim_verification); the other
 * kinds exist in the closed set for their phases' payloads.
 *
 * The store seam is injectable for tests; the default store is
 * Prisma over FrUsageLedger only.
 */
import { entitlementsForTier, pooledLimit } from "./entitlements";
import type { FrTierOrNone } from "./plans";
import type { FrEntitlement } from "./tier";

export const FR_USAGE_KINDS = [
  "investigator_turn",
  "claim_verification",
  "evidence_processing",
  "report_generation",
] as const;
export type FrUsageKind = (typeof FR_USAGE_KINDS)[number];

export interface FrUsageRow {
  id: string;
  userId: string;
  teamId: string | null;
  kind: string;
  units: number;
  reversalOfId: string | null;
  tierAtCharge: string;
  createdAt: Date;
}

export interface UsageStore {
  append(row: Omit<FrUsageRow, "id" | "createdAt"> & { refType?: string | null; refId?: string | null; model?: string | null }): Promise<FrUsageRow>;
  listInRange(q: { userId?: string; teamId?: string; kind: string; start: Date; end: Date }): Promise<FrUsageRow[]>;
  findById(id: string): Promise<FrUsageRow | null>;
}

/** In-memory store (tests + the scripted admin path). */
export class InMemoryUsageStore implements UsageStore {
  rows: FrUsageRow[] = [];
  private seq = 0;
  async append(row: Parameters<UsageStore["append"]>[0]): Promise<FrUsageRow> {
    const full: FrUsageRow = {
      id: `mem_${++this.seq}`, userId: row.userId, teamId: row.teamId,
      kind: row.kind, units: row.units, reversalOfId: row.reversalOfId,
      tierAtCharge: row.tierAtCharge, createdAt: new Date(),
    };
    this.rows.push(full);
    return full;
  }
  async listInRange(q: { userId?: string; teamId?: string; kind: string; start: Date; end: Date }) {
    return this.rows.filter((r) =>
      r.kind === q.kind &&
      r.createdAt >= q.start && r.createdAt < q.end &&
      (q.teamId ? r.teamId === q.teamId : r.userId === q.userId && r.teamId === null));
  }
  async findById(id: string) { return this.rows.find((r) => r.id === id) ?? null; }
}

let defaultStore: UsageStore | null = null;
export async function getDefaultUsageStore(): Promise<UsageStore> {
  if (defaultStore) return defaultStore;
  const { db } = await import("@/lib/db");
  defaultStore = {
    async append(row) {
      const r = await db.frUsageLedger.create({
        data: {
          userId: row.userId, teamId: row.teamId, kind: row.kind,
          units: row.units, reversalOfId: row.reversalOfId,
          refType: row.refType ?? null, refId: row.refId ?? null,
          model: row.model ?? null, tierAtCharge: row.tierAtCharge,
        },
      });
      return { id: r.id, userId: r.userId, teamId: r.teamId, kind: r.kind, units: r.units, reversalOfId: r.reversalOfId, tierAtCharge: r.tierAtCharge, createdAt: r.createdAt };
    },
    async listInRange(q) {
      const rows = await db.frUsageLedger.findMany({
        where: {
          kind: q.kind, createdAt: { gte: q.start, lt: q.end },
          ...(q.teamId ? { teamId: q.teamId } : { userId: q.userId, teamId: null }),
        },
      });
      return rows.map((r) => ({ id: r.id, userId: r.userId, teamId: r.teamId, kind: r.kind, units: r.units, reversalOfId: r.reversalOfId, tierAtCharge: r.tierAtCharge, createdAt: r.createdAt }));
    },
    async findById(id) {
      const r = await db.frUsageLedger.findUnique({ where: { id } });
      return r ? { id: r.id, userId: r.userId, teamId: r.teamId, kind: r.kind, units: r.units, reversalOfId: r.reversalOfId, tierAtCharge: r.tierAtCharge, createdAt: r.createdAt } : null;
    },
  };
  return defaultStore;
}

/** Returns the store when the ledger table is reachable in this
 *  runtime (post-migration), else null — used by route wiring so
 *  pre-migration/test doubles keep the domain-ledger behaviour. */
export async function tryUsageStore(): Promise<UsageStore | null> {
  try {
    const { db } = await import("@/lib/db");
    const d = db as unknown as Record<string, unknown>;
    if (!d.frUsageLedger) return null;
    return getDefaultUsageStore();
  } catch { return null; }
}

export function monthWindowUtc(now: Date): { start: Date; end: Date; resetAt: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end, resetAt: end };
}

/** Net units: charges minus the units of rows reversing them. */
export function netUnits(rows: FrUsageRow[]): number {
  const reversed = new Set(rows.filter((r) => r.reversalOfId).map((r) => r.reversalOfId as string));
  let net = 0;
  for (const r of rows) {
    if (r.reversalOfId) continue;
    if (!reversed.has(r.id)) net += r.units;
  }
  return net;
}

export function limitForKind(ent: FrEntitlement, kind: FrUsageKind, pool: "personal" | "team"): number {
  const e = entitlementsForTier(ent.tier);
  if (!e) return 0;
  const base = kind === "investigator_turn" ? e.investigatorOpsPerMonth
    : kind === "claim_verification" ? e.claimVerificationsPerMonth
    : kind === "evidence_processing" ? e.processingJobsPerMonth
    : e.reportGenerationsPerMonth;
  return pooledLimit(base, ent, pool);
}

export type QuotaCheck =
  | { ok: true; used: number; limit: number }
  | { ok: false; limit: number; used: number; resetsAt: Date; pool: "personal" | "team"; kind: FrUsageKind; error: "FR_QUOTA_EXCEEDED" };

export async function checkQuota(
  store: UsageStore, ent: FrEntitlement, kind: FrUsageKind,
  ctx: { userId: string; pool?: "personal" | "team"; teamId?: string | null; now?: Date },
): Promise<QuotaCheck> {
  const now = ctx.now ?? new Date();
  const { start, end, resetAt } = monthWindowUtc(now);
  const pool = ctx.pool ?? "personal";
  const limit = limitForKind(ent, kind, pool);
  const rows = await store.listInRange({
    kind, start, end,
    ...(pool === "team" && ctx.teamId ? { teamId: ctx.teamId } : { userId: ctx.userId }),
  });
  const used = netUnits(rows);
  if (used >= limit) return { ok: false, limit, used, resetsAt: resetAt, pool, kind, error: "FR_QUOTA_EXCEEDED" };
  return { ok: true, used, limit };
}

export async function chargeUsage(
  store: UsageStore,
  args: { userId: string; tier: FrTierOrNone; kind: FrUsageKind; teamId?: string | null; units?: number; refType?: string; refId?: string; model?: string },
): Promise<{ ledgerId: string }> {
  const row = await store.append({
    userId: args.userId, teamId: args.teamId ?? null, kind: args.kind,
    units: args.units ?? 1, reversalOfId: null, tierAtCharge: args.tier,
    refType: args.refType ?? null, refId: args.refId ?? null, model: args.model ?? null,
  });
  return { ledgerId: row.id };
}

export async function reverseUsage(store: UsageStore, ledgerId: string, reason: string): Promise<void> {
  void reason; // recorded by callers in domain rows; the ledger row is the reversal itself
  const orig = await store.findById(ledgerId);
  if (!orig || orig.reversalOfId) return;
  await store.append({
    userId: orig.userId, teamId: orig.teamId, kind: orig.kind, units: orig.units,
    reversalOfId: orig.id, tierAtCharge: orig.tierAtCharge,
  });
}

export interface KindUsage { kind: FrUsageKind; used: number; limit: number; remaining: number }
export async function usageSummary(
  store: UsageStore, ent: FrEntitlement, userId: string, now: Date = new Date(),
): Promise<{ tier: FrTierOrNone; resetAt: string; kinds: KindUsage[] }> {
  const { resetAt } = monthWindowUtc(now);
  const kinds: KindUsage[] = [];
  for (const kind of FR_USAGE_KINDS) {
    const c = await checkQuota(store, ent, kind, { userId, now });
    kinds.push({ kind, used: c.used, limit: c.limit, remaining: Math.max(0, c.limit - c.used) });
  }
  return { tier: ent.tier, resetAt: resetAt.toISOString(), kinds };
}
