// POST /api/internal/demo-studio/[jobId]/fail — the worker reports a
// demonstration it could not produce (a requested interaction failed,
// a camera never rendered, the render crashed). The error lands on the
// job verbatim so the admin sees the real reason; a failed demo is
// never replaced with substitute footage.
import { NextResponse } from "next/server";
import { demoStudioConfigured, verifyDemoBearer } from "@/lib/demo-studio/config";
import { failDemoJob } from "@/lib/demo-studio/jobs";

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
  const body = (await req.json().catch(() => null)) as { error?: string } | null;
  const updated = await failDemoJob(jobId, body?.error ?? "worker reported failure");
  if (!updated) return NextResponse.json({ error: "job not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
