// Admin: Repurposing Machine usage + failed-render monitor (spec §15).
// Read-only rollup: project/variation/post counts, repurpose_render
// job outcomes, and the most recent failed renders for support.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/affiliate/admin";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return forbidden(e);
  }

  const [projects, variations, readyVariations, postedVariations, posts, rendersDone, rendersFailed, failedJobs] =
    await Promise.all([
      db.studioProject.count(),
      db.studioVariation.count(),
      db.studioVariation.count({ where: { status: "ready" } }),
      db.studioVariation.count({ where: { status: "posted" } }),
      db.studioPost.count(),
      db.generationJob.count({ where: { kind: "repurpose_render", status: "done" } }),
      db.generationJob.count({ where: { kind: "repurpose_render", status: "failed" } }),
      db.generationJob.findMany({
        where: { kind: "repurpose_render", status: "failed" },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, error: true, createdAt: true, creditCost: true },
      }),
    ]);

  return NextResponse.json({
    projects,
    variations,
    readyVariations,
    postedVariations,
    scheduledPosts: posts,
    rendersDone,
    rendersFailed,
    recentFailures: failedJobs.map((j) => ({
      id: j.id,
      error: j.error,
      creditCost: j.creditCost,
      createdAt: j.createdAt,
    })),
  });
}
