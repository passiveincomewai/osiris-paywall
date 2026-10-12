// ── Studio credits: accounts, ledger, generation jobs ────────────────────
// The Prisma models (StudioCreditAccount, StudioCreditLedger,
// GenerationJob) are applied separately, so the delegates are accessed
// through a typed local cast on `db` (the Studio home page's dbAny
// pattern). Row shapes are defined locally; once the models are
// generated these delegates are the real Prisma delegates.
//
// Money paths (monthly allowance grant, generation charge, refund) run
// inside a single $transaction so balance + ledger + job never drift.

import { db } from "@/lib/db";
import type { CreditKind, StudioCreditConfig } from "./credits-config";

// ── Row shapes (mirror the planned Prisma models) ────────────────────────

export interface StudioCreditAccountRow {
  id: string;
  profileId: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudioCreditLedgerRow {
  id: string;
  profileId: string;
  delta: number;
  reason: string;
  jobId: string | null;
  createdAt: Date;
}

export interface GenerationJobRow {
  id: string;
  profileId: string;
  kind: string;
  status: string;
  creditCost: number;
  params: unknown;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

// ── Delegate access (models may not be generated yet) ────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbAny = db as any;

type TxClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  studioCreditAccount: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  studioCreditLedger: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generationJob: any;
};

// ── Pure helpers ──────────────────────────────────────────────────────────

/** UTC month key, e.g. "2026-10". */
export function monthKeyOf(d: Date): string {
  const year = String(d.getUTCFullYear()).padStart(4, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function utcMonthIndex(d: Date): number {
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

/**
 * A monthly allowance is due when there is no previous grant, or the
 * latest grant landed in an earlier UTC month than `now`. A grant dated
 * in a future month (clock skew) is not due again.
 */
export function allowanceDue(lastGrantAt: Date | null, now: Date): boolean {
  if (lastGrantAt === null) return true;
  return utcMonthIndex(lastGrantAt) < utcMonthIndex(now);
}

export type PlanChargeResult =
  | { ok: true; balanceAfter: number }
  | { ok: false; error: "insufficient_credits"; cost: number; balance: number };

/** Pure debit plan: succeeds iff the balance covers the full cost. */
export function planCharge(balance: number, cost: number): PlanChargeResult {
  if (balance >= cost) {
    return { ok: true, balanceAfter: balance - cost };
  }
  return { ok: false, error: "insufficient_credits", cost, balance };
}

export type SettleDecision = "settle_done" | "refund" | "noop";

const TERMINAL_JOB_STATUSES = new Set(["done", "failed", "refunded"]);

/**
 * Pure settle decision. Terminal jobs (done / failed / refunded) are a
 * noop — a job can never be settled or refunded twice. Otherwise a "done"
 * outcome settles and a "failed" outcome refunds.
 */
export function evaluateSettle(
  currentStatus: string,
  outcome: "done" | "failed",
): SettleDecision {
  if (TERMINAL_JOB_STATUSES.has(currentStatus)) return "noop";
  return outcome === "done" ? "settle_done" : "refund";
}

// ── Accounts ──────────────────────────────────────────────────────────────

export async function getOrCreateCreditAccount(
  profileId: string,
): Promise<StudioCreditAccountRow> {
  const existing = (await dbAny.studioCreditAccount.findUnique({
    where: { profileId },
  })) as StudioCreditAccountRow | null;
  if (existing) return existing;
  try {
    return (await dbAny.studioCreditAccount.create({
      data: { profileId, balance: 0 },
    })) as StudioCreditAccountRow;
  } catch {
    // Lost a create race — the account exists now; return it.
    const raced = (await dbAny.studioCreditAccount.findUnique({
      where: { profileId },
    })) as StudioCreditAccountRow | null;
    if (raced) return raced;
    throw new Error(`failed to create credit account for profile ${profileId}`);
  }
}

/** Current balance; the only side effect is account creation. */
export async function getCreditBalance(profileId: string): Promise<number> {
  const account = await getOrCreateCreditAccount(profileId);
  return account.balance;
}

// ── Monthly member allowance ──────────────────────────────────────────────

export async function ensureMonthlyAllowance(
  profileId: string,
  isMember: boolean,
  config: StudioCreditConfig,
  now: Date = new Date(),
): Promise<{ granted: number; balance: number }> {
  const account = await getOrCreateCreditAccount(profileId);
  const allowance = config.monthlyAllowance;
  if (!isMember || allowance <= 0) {
    return { granted: 0, balance: account.balance };
  }

  const latest = (await dbAny.studioCreditLedger.findFirst({
    where: { profileId, reason: "monthly_allowance" },
    orderBy: { createdAt: "desc" },
  })) as StudioCreditLedgerRow | null;

  if (!allowanceDue(latest?.createdAt ?? null, now)) {
    return { granted: 0, balance: account.balance };
  }

  const balance = (await dbAny.$transaction(async (tx: TxClient) => {
    const updated = (await tx.studioCreditAccount.update({
      where: { profileId },
      data: { balance: { increment: allowance } },
    })) as StudioCreditAccountRow;
    await tx.studioCreditLedger.create({
      data: { profileId, delta: allowance, reason: "monthly_allowance" },
    });
    return updated.balance;
  })) as number;

  return { granted: allowance, balance };
}

// ── Generation charges ────────────────────────────────────────────────────

export type ChargeForGenerationResult =
  | { ok: true; job: GenerationJobRow; balance: number }
  | { ok: false; error: "insufficient_credits"; cost: number; balance: number };

export async function chargeForGeneration(args: {
  profileId: string;
  kind: CreditKind;
  params?: unknown;
  config: StudioCreditConfig;
}): Promise<ChargeForGenerationResult> {
  const { profileId, kind, config } = args;
  const params = args.params ?? {};
  const cost = config.prices[kind];

  const account = await getOrCreateCreditAccount(profileId);

  // Free kinds still get a tracked job, just no debit and no ledger row.
  if (cost === 0) {
    const job = (await dbAny.generationJob.create({
      data: { profileId, kind, status: "queued", creditCost: 0, params },
    })) as GenerationJobRow;
    return { ok: true, job, balance: account.balance };
  }

  return (await dbAny.$transaction(async (tx: TxClient) => {
    const current = (await tx.studioCreditAccount.findUnique({
      where: { profileId },
    })) as StudioCreditAccountRow | null;
    const balance = current?.balance ?? account.balance;

    const plan = planCharge(balance, cost);
    if (!plan.ok) return plan;

    await tx.studioCreditAccount.update({
      where: { profileId },
      data: { balance: plan.balanceAfter },
    });
    const job = (await tx.generationJob.create({
      data: { profileId, kind, status: "queued", creditCost: cost, params },
    })) as GenerationJobRow;
    await tx.studioCreditLedger.create({
      data: { profileId, delta: -cost, reason: "generation_charge", jobId: job.id },
    });
    return { ok: true as const, job, balance: plan.balanceAfter };
  })) as ChargeForGenerationResult;
}

// ── Settling / refunding ──────────────────────────────────────────────────

export async function settleGenerationJob(args: {
  profileId: string;
  jobId: string;
  outcome: "done" | "failed";
  error?: string;
}): Promise<GenerationJobRow | null> {
  const { profileId, jobId, outcome } = args;

  const job = (await dbAny.generationJob.findFirst({
    where: { id: jobId, profileId },
  })) as GenerationJobRow | null;
  if (!job) return null;

  const decision = evaluateSettle(job.status, outcome);
  if (decision === "noop") return job;

  const now = new Date();

  if (decision === "settle_done") {
    return (await dbAny.generationJob.update({
      where: { id: job.id },
      data: { status: "done", completedAt: now },
    })) as GenerationJobRow;
  }

  // refund — job status, balance credit-back, and ledger row move together.
  return (await dbAny.$transaction(async (tx: TxClient) => {
    const updated = (await tx.generationJob.update({
      where: { id: job.id },
      data: {
        status: "refunded",
        completedAt: now,
        error: args.error ?? job.error ?? null,
      },
    })) as GenerationJobRow;
    if (job.creditCost > 0) {
      await tx.studioCreditAccount.upsert({
        where: { profileId },
        create: { profileId, balance: job.creditCost },
        update: { balance: { increment: job.creditCost } },
      });
      await tx.studioCreditLedger.create({
        data: {
          profileId,
          delta: job.creditCost,
          reason: "generation_refund",
          jobId: job.id,
        },
      });
    }
    return updated;
  })) as GenerationJobRow;
}

// ── Admin usage stats ─────────────────────────────────────────────────────

export interface CreditUsageStats {
  monthKey: string;
  consumedByKind: Record<string, { credits: number; jobs: number }>;
  failedThisMonth: number;
  recentFailed: GenerationJobRow[];
}

export async function getCreditUsageStats(
  now: Date = new Date(),
): Promise<CreditUsageStats> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );

  const monthJobs = (await dbAny.generationJob.findMany({
    where: { createdAt: { gte: monthStart, lt: nextMonthStart } },
  })) as GenerationJobRow[];

  const consumedByKind: Record<string, { credits: number; jobs: number }> = {};
  let failedThisMonth = 0;
  for (const job of monthJobs) {
    if (job.status === "done") {
      const bucket = (consumedByKind[job.kind] ??= { credits: 0, jobs: 0 });
      bucket.credits += job.creditCost;
      bucket.jobs += 1;
    } else if (job.status === "failed" || job.status === "refunded") {
      failedThisMonth += 1;
    }
  }

  const recentFailed = (await dbAny.generationJob.findMany({
    where: { status: { in: ["failed", "refunded"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
  })) as GenerationJobRow[];

  return {
    monthKey: monthKeyOf(now),
    consumedByKind,
    failedThisMonth,
    recentFailed,
  };
}
