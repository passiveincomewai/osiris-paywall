// POST /api/internal/demo-studio/[jobId]/progress — worker heartbeat:
// { status: "recording" | "rendering", progress: "human stage label" }.
// Powers the admin Render Queue's live stage display. Bearer-guarded
// like the rest of the internal Demo Studio surface.
import { NextResponse } from "next/server";
import { demoStudioConfigured, verifyDemoBearer } from "@/lib/demo-studio/config";
import { updateDemoJobProgress } from "@/lib/demo-studio/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STAGES = new Set(["recording", "rendering"]);

export async function POST(req: Request, { params }: { params: Promise<{ jobId: string }> }) {
  if (!demoStudioConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 404 });
  }
  if (!verifyDemoBearer(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { jobId } = await params;
  const body = (await req.json().catch(() => null)) as { status?: string; progress?: string } | null;
  if (!body || !STAGES.has(body.status ?? "")) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const updated = await updateDemoJobProgress(jobId, body.status!, String(body.progress ?? body.status).slice(0, 200));
  if (!updated) return NextResponse.json({ error: "job not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
