// POST /api/internal/demo-studio/[jobId]/complete — the worker delivers
// a finished demonstration: the edited video (already uploaded to Blob
// via the upload-token route) becomes a DemoVideo in the media library,
// in "draft" status. Nothing goes public from here: an admin must
// approve the video, and separately place it on a page or share it to
// affiliates, from the admin Demo Studio.
import { NextResponse } from "next/server";
import { demoStudioConfigured, verifyDemoBearer } from "@/lib/demo-studio/config";
import { completeDemoJob } from "@/lib/demo-studio/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  if (!demoStudioConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 404 });
  }
  if (!verifyDemoBearer(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { jobId } = await params;
  const body = (await req.json().catch(() => null)) as {
    title?: string;
    description?: string;
    features?: string[];
    durationSec?: number;
    videoUrl?: string;
    rawUrl?: string;
    posterUrl?: string;
  } | null;
  if (!body?.videoUrl || !body.title) {
    return NextResponse.json({ error: "videoUrl and title are required" }, { status: 400 });
  }
  const job = await completeDemoJob(jobId, {
    title: body.title.slice(0, 200),
    description: body.description?.slice(0, 2000),
    features: Array.isArray(body.features) ? body.features.slice(0, 12).map(String) : [],
    style: "",
    orientation: "",
    durationSec: typeof body.durationSec === "number" ? body.durationSec : undefined,
    videoUrl: body.videoUrl,
    rawUrl: body.rawUrl,
    posterUrl: body.posterUrl,
  }).catch(() => null);
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });
  return NextResponse.json({ ok: true, videoId: job.id });
}
