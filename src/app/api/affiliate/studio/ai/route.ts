// Studio AI (Phase 3) — Cosmo-fulfilled, made to order.
//
// POST /api/affiliate/studio/ai — submit an AI request. Credits are
// charged at submit (Phase 2 invariants); the job waits in Cosmo's
// queue. There is NO instant generation and the UI says so: results
// land in My Creations when Cosmo delivers them, and a job still queued
// after 7 days auto-refunds (expireStaleAiJobs, also run on GET here).
//
// GET — the caller's own AI jobs, newest first, with results inlined.
//
// Budget gates (config): a global monthly AI budget (USD at the credit
// anchor) and a per-user monthly AI cap (credits). The check runs
// before the charge; it is a capacity cap, not a payment, so the
// check-then-charge sequence being non-atomic is acceptable.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/password-auth";
import { buildStudioContext } from "@/lib/studio/context";
import {
  chargeForGeneration,
  ensureMonthlyAllowance,
} from "@/lib/studio/credits";
import { getCreditConfig } from "@/lib/studio/credits-settings";
import { isAiKind } from "@/lib/studio/credits-config";
import {
  buildAiJobParams,
  evaluateAiCharge,
  expireStaleAiJobs,
  getAiMonthUsage,
} from "@/lib/studio/ai";
import { requireStudioAccess } from "../../_util";

export const runtime = "nodejs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbAny = db as any;

export async function GET() {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }

  // Honesty housekeeping: any of the caller's jobs that sat in the queue
  // for over 7 days are refunded before the list is shown.
  await expireStaleAiJobs(profile.id).catch(() => 0);

  const jobs = (await dbAny.generationJob.findMany({
    where: { profileId: profile.id, kind: { in: ["ai_caption", "ai_hooks", "ai_script", "ai_video_ideas", "ai_image", "ai_background"] } },
    orderBy: { createdAt: "desc" },
    take: 50,
  })) as {
    id: string;
    kind: string;
    status: string;
    creditCost: number;
    params: unknown;
    error: string | null;
    resultText: string | null;
    createdAt: Date;
    completedAt: Date | null;
  }[];

  const jobIds = jobs.map((j) => j.id);
  const creations = jobIds.length
    ? ((await dbAny.studioCreation.findMany({
        where: { paidJobId: { in: jobIds } },
        select: { id: true, paidJobId: true, resultImageBytes: true },
      })) as { id: string; paidJobId: string | null; resultImageBytes: Uint8Array | null }[])
    : [];
  const creationByJob = new Map(
    creations.map((c) => [c.paidJobId, { id: c.id, hasImage: !!c.resultImageBytes }]),
  );

  return NextResponse.json({
    jobs: jobs.map((j) => {
      const params = (j.params ?? {}) as { subject?: unknown; platform?: unknown; tone?: unknown };
      const creation = creationByJob.get(j.id);
      return {
        id: j.id,
        kind: j.kind,
        status: j.status,
        creditCost: j.creditCost,
        subject: typeof params.subject === "string" ? params.subject : "",
        platform: typeof params.platform === "string" ? params.platform : "",
        tone: typeof params.tone === "string" ? params.tone : "",
        resultText: j.resultText,
        error: j.error,
        creationId: creation?.id ?? null,
        hasImage: creation?.hasImage ?? false,
        createdAt: j.createdAt.toISOString(),
        completedAt: j.completedAt ? j.completedAt.toISOString() : null,
      };
    }),
  });
}

export async function POST(req: Request) {
  const { profile, userId, error } = await requireStudioAccess();
  if (error || !profile || !userId) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }

  if (isRateLimited(`studio-ai:${userId}`, 30, 3_600_000)) {
    return NextResponse.json(
      { error: "Too many AI requests — try again in a bit" },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    kind?: unknown;
    subject?: unknown;
    platform?: unknown;
    tone?: unknown;
  };

  const kind = typeof body.kind === "string" ? body.kind : "";
  if (!isAiKind(kind)) {
    return NextResponse.json({ error: "Unknown AI request type" }, { status: 400 });
  }

  const config = await getCreditConfig();
  if (!config.providersEnabled[kind]) {
    return NextResponse.json(
      { error: "This AI service is currently paused — please check back soon" },
      { status: 403 },
    );
  }

  const ctx = await buildStudioContext(profile);
  const built = buildAiJobParams(
    kind,
    {
      subject: typeof body.subject === "string" ? body.subject : "",
      platform: typeof body.platform === "string" ? body.platform : "",
      tone: typeof body.tone === "string" ? body.tone : undefined,
    },
    { referralLink: ctx.link, discountCode: ctx.couponCode },
  );
  if (!built.ok) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  // Grant the monthly allowance first (the studio gate already proved
  // membership) so a member's first request of the month sees it.
  await ensureMonthlyAllowance(profile.id, true, config);

  const cost = config.prices[kind];
  const usage = await getAiMonthUsage(profile.id);
  const check = evaluateAiCharge({
    globalMonthCredits: usage.globalCredits,
    userMonthCredits: usage.userCredits,
    cost,
    config,
  });
  if (!check.ok) {
    const message =
      check.error === "ai_budget_exhausted"
        ? "Cosmo's AI budget for this month is fully booked — requests reopen next month."
        : "You've reached your monthly AI request limit — it resets next month.";
    return NextResponse.json({ error: check.error, message }, { status: 402 });
  }

  const charge = await chargeForGeneration({
    profileId: profile.id,
    kind,
    params: built.params,
    config,
  });
  if (!charge.ok) {
    return NextResponse.json(
      { error: "insufficient_credits", cost: charge.cost, balance: charge.balance },
      { status: 402 },
    );
  }

  return NextResponse.json(
    {
      jobId: charge.job.id,
      kind,
      cost: charge.job.creditCost,
      balance: charge.balance,
      status: charge.job.status,
    },
    { status: 201 },
  );
}
