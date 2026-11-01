// /api/admin/demo-studio — the admin Demo Studio's data + actions.
// GET returns everything the page renders (jobs, library, placements,
// slot registry, whether the worker channel is configured). POST runs
// one admin action per call: createJob | updateVideo | createPlacement
// | deletePlacement. Admins only (requireAdmin), every action audited.
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, audit } from "@/lib/affiliate/admin";
import { demoStudioConfigured } from "@/lib/demo-studio/config";
import { planForPrompt, SUPPORTED_ORIENTATIONS, SUPPORTED_STYLES } from "@/lib/demo-studio/plan";
import { DEMO_SLOTS, isValidSlot } from "@/lib/demo-studio/pages";
import {
  createDemoJob,
  createDemoPlacement,
  deleteDemoPlacement,
  listDemoJobs,
  listDemoVideos,
  updateDemoVideo,
} from "@/lib/demo-studio/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function forbidden(e: unknown) {
  const status = (e as { status?: number })?.status ?? 403;
  return NextResponse.json({ error: "admin only" }, { status });
}

export async function GET() {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return forbidden(e);
  }
  void session;
  const [jobs, videos] = await Promise.all([listDemoJobs(30), listDemoVideos(60)]);
  return NextResponse.json({
    ok: true,
    workerConfigured: demoStudioConfigured(),
    slots: DEMO_SLOTS,
    jobs: jobs.map((j) => ({
      id: j.id,
      prompt: j.prompt,
      style: j.style,
      orientation: j.orientation,
      status: j.status,
      progress: j.progress,
      error: j.error,
      videoId: j.videoId,
      videoTitle: j.video?.title ?? null,
      createdAt: j.createdAt.toISOString(),
      completedAt: j.completedAt?.toISOString() ?? null,
    })),
    videos: videos.map((v) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      features: v.features,
      style: v.style,
      orientation: v.orientation,
      durationSec: v.durationSec,
      videoUrl: v.videoUrl,
      rawUrl: v.rawUrl,
      posterUrl: v.posterUrl,
      status: v.status,
      affiliateShared: v.affiliateShared,
      outdated: v.outdated,
      createdAt: v.createdAt.toISOString(),
      placements: v.placements.map((p) => ({ id: p.id, page: p.page, slot: p.slot, active: p.active })),
    })),
  });
}

interface ActionBody {
  action?: string;
  prompt?: string;
  style?: string;
  orientation?: string;
  videoId?: string;
  patch?: { status?: string; affiliateShared?: boolean; outdated?: boolean; title?: string; description?: string };
  page?: string;
  slot?: string;
  placementId?: string;
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return forbidden(e);
  }
  const body = (await req.json().catch(() => null)) as ActionBody | null;
  if (!body?.action) return NextResponse.json({ error: "action required" }, { status: 400 });
  const actor = session.user?.email ?? undefined;

  if (body.action === "createJob") {
    const prompt = (body.prompt ?? "").trim();
    if (prompt.length < 8) {
      return NextResponse.json({ error: "Describe the demonstration you want (a sentence or two)." }, { status: 400 });
    }
    const plan = planForPrompt(prompt);
    if (!plan) {
      return NextResponse.json(
        {
          error:
            "No verified demonstration template matches that prompt yet. Phase 1 templates cover a Tokyo globe tour and a live-cameras tour; free-form planning arrives in Phase 2. Nothing was queued.",
        },
        { status: 422 },
      );
    }
    const style = SUPPORTED_STYLES.includes(body.style as (typeof SUPPORTED_STYLES)[number]) ? body.style! : "cinematic";
    const orientation = SUPPORTED_ORIENTATIONS.includes(body.orientation as (typeof SUPPORTED_ORIENTATIONS)[number])
      ? body.orientation!
      : "landscape";
    const job = await createDemoJob({ prompt, plan, style, orientation, createdBy: actor });
    await audit("demo-studio.job.create", { actorUserId: undefined, targetType: "DemoJob", targetId: job.id, details: { template: plan.template } });
    return NextResponse.json({ ok: true, jobId: job.id, plan });
  }

  if (body.action === "updateVideo" && body.videoId && body.patch) {
    const patch: ActionBody["patch"] = {};
    if (body.patch.status === "draft" || body.patch.status === "approved") patch.status = body.patch.status;
    if (typeof body.patch.affiliateShared === "boolean") patch.affiliateShared = body.patch.affiliateShared;
    if (typeof body.patch.outdated === "boolean") patch.outdated = body.patch.outdated;
    if (typeof body.patch.title === "string") patch.title = body.patch.title.slice(0, 200);
    if (typeof body.patch.description === "string") patch.description = body.patch.description.slice(0, 2000);
    const video = await updateDemoVideo(body.videoId, patch).catch(() => null);
    if (!video) return NextResponse.json({ error: "video not found" }, { status: 404 });
    await audit("demo-studio.video.update", { targetType: "DemoVideo", targetId: body.videoId, details: { ...patch } });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "createPlacement" && body.videoId && body.page && body.slot) {
    if (!isValidSlot(body.page, body.slot)) {
      return NextResponse.json({ error: "That page/slot is not in the placement registry." }, { status: 400 });
    }
    const video = await updateDemoVideo(body.videoId, {}).catch(() => null);
    if (!video) return NextResponse.json({ error: "video not found" }, { status: 404 });
    if (video.status !== "approved") {
      return NextResponse.json({ error: "Approve the video before placing it on the website." }, { status: 400 });
    }
    const placement = await createDemoPlacement(body.videoId, body.page, body.slot);
    await audit("demo-studio.placement.create", { targetType: "DemoPlacement", targetId: placement.id, details: { page: body.page, slot: body.slot } });
    return NextResponse.json({ ok: true, placementId: placement.id });
  }

  if (body.action === "deletePlacement" && body.placementId) {
    await deleteDemoPlacement(body.placementId);
    await audit("demo-studio.placement.delete", { targetType: "DemoPlacement", targetId: body.placementId });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
