// GET /api/internal/demo-studio/queue — the Demo Studio worker's claim
// endpoint. Claims the oldest queued job (atomic conditional update in
// the data layer) and returns it; the job's plan is self-describing so
// the worker needs no other context. Returns { job: null } when the
// queue is empty so the worker can idle politely.
//
// Guard mirrors /api/internal/studio-ai/queue: Authorization: Bearer
// <DEMO_STUDIO_SECRET ?? STUDIO_AI_SECRET>; unconfigured ⇒ 404.
import { NextResponse } from "next/server";
import { demoStudioConfigured, verifyDemoBearer } from "@/lib/demo-studio/config";
import { claimNextDemoJob } from "@/lib/demo-studio/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!demoStudioConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 404 });
  }
  if (!verifyDemoBearer(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const job = await claimNextDemoJob();
  if (!job) return NextResponse.json({ ok: true, job: null });
  return NextResponse.json({
    ok: true,
    job: {
      id: job.id,
      prompt: job.prompt,
      plan: job.plan,
      style: job.style,
      orientation: job.orientation,
      createdAt: job.createdAt.toISOString(),
    },
  });
}
