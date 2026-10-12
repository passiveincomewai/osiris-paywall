// POST /api/affiliate/studio/jobs/[id]/settle — settle a GenerationJob
// previously charged via POST /api/affiliate/studio/jobs. "done" keeps
// the charge; "failed" refunds it (handled inside settleGenerationJob).
// Scoping by the caller's profile id happens inside settleGenerationJob:
// another affiliate's job id settles nothing and reads as 404.
import { NextResponse } from "next/server";
import { getCreditBalance, settleGenerationJob } from "@/lib/studio/credits";
import { requireStudioAccess } from "../../../../_util";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    outcome?: unknown;
    error?: unknown;
  };

  const outcome = body.outcome;
  if (outcome !== "done" && outcome !== "failed") {
    return NextResponse.json({ error: 'outcome must be "done" or "failed"' }, { status: 400 });
  }

  const { id } = await params;
  const job = await settleGenerationJob({
    profileId: profile.id,
    jobId: id,
    outcome,
    error: typeof body.error === "string" ? body.error.slice(0, 500) : undefined,
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  return NextResponse.json({
    job: { id: job.id, status: job.status, creditCost: job.creditCost },
    balance: await getCreditBalance(profile.id),
  });
}
