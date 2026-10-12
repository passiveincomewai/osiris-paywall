// POST /api/internal/studio-ai/[jobId]/fail — Cosmo reports a job it
// cannot fulfill. Body: { error? }. The job settles as failed, which
// auto-refunds the affiliate's credits (Phase 2 settle logic — a job
// can never be refunded twice). Failing an already-terminal job returns
// its current state, so retries are safe.
// Guard: Bearer <STUDIO_AI_SECRET>; 404 when unconfigured.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settleGenerationJob, type GenerationJobRow } from "@/lib/studio/credits";
import { isAiKind } from "@/lib/studio/credits-config";
import { studioAiConfigured, verifyStudioAiBearer } from "@/lib/studio/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dbAny = db as any;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  if (!studioAiConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 404 });
  }
  if (!verifyStudioAiBearer(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { jobId } = await params;
  const job = (await dbAny.generationJob.findUnique({
    where: { id: jobId },
  })) as GenerationJobRow | null;
  if (!job) return NextResponse.json({ error: "job_not_found" }, { status: 404 });
  if (!isAiKind(job.kind)) {
    return NextResponse.json({ error: "not_an_ai_job" }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { error?: unknown };
  const settled = await settleGenerationJob({
    profileId: job.profileId,
    jobId: job.id,
    outcome: "failed",
    error:
      typeof body.error === "string" && body.error.trim()
        ? body.error.slice(0, 500)
        : "Cosmo couldn't fulfill this request — credits refunded.",
  });

  return NextResponse.json({
    ok: true,
    job: { id: job.id, status: settled?.status ?? job.status },
  });
}
