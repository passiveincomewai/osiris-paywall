// GET /api/internal/studio-ai/queue — Cosmo's fulfillment queue.
// Lists queued Studio AI jobs, oldest first (cap 20). Each job's params
// carry the full fulfillment spec, so the queue is self-describing.
//
// Guard (mirrors /api/growth/analytics): Authorization: Bearer
// <STUDIO_AI_SECRET>. When the secret is not configured the route
// returns 404 — the endpoint effectively does not exist until the owner
// wires it up in Vercel. Job data includes affiliate referral links
// (public by design) but never emails or account data.
import { NextResponse } from "next/server";
import {
  expireStaleAiJobs,
  listQueuedAiJobs,
  studioAiConfigured,
  verifyStudioAiBearer,
} from "@/lib/studio/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!studioAiConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 404 });
  }
  if (!verifyStudioAiBearer(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Housekeeping on every poll: jobs queued >7 days refund themselves.
  const expired = await expireStaleAiJobs(null).catch(() => 0);
  const jobs = await listQueuedAiJobs(20);

  return NextResponse.json({
    ok: true,
    expired,
    jobs: jobs.map((j) => ({
      id: j.id,
      kind: j.kind,
      profileId: j.profileId,
      creditCost: j.creditCost,
      params: j.params,
      createdAt: j.createdAt.toISOString(),
    })),
  });
}
