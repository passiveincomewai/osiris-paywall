// POST /api/internal/studio-ai/[jobId]/complete — Cosmo delivers a
// fulfilled AI result. Body: { resultText?, resultImageBase64? }.
// Text kinds require resultText; image kinds require a real image
// (magic-byte sniffed, ≈2.5MB cap — see completeAiJob). On success the
// job is "done" and the result is a StudioCreation in the affiliate's
// My Creations. Completing an already-done job is an idempotent
// success, so deliveries can be retried safely.
// Guard: Bearer <STUDIO_AI_SECRET>; 404 when unconfigured.
import { NextResponse } from "next/server";
import {
  completeAiJob,
  studioAiConfigured,
  verifyStudioAiBearer,
} from "@/lib/studio/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const body = (await req.json().catch(() => ({}))) as {
    resultText?: unknown;
    resultImageBase64?: unknown;
  };

  let resultImage: Buffer | undefined;
  if (typeof body.resultImageBase64 === "string" && body.resultImageBase64.length > 0) {
    // Strip a data-URL prefix if the fulfiller sent one.
    const b64 = body.resultImageBase64.replace(/^data:[^;]+;base64,/, "");
    resultImage = Buffer.from(b64, "base64");
  }

  const { jobId } = await params;
  const result = await completeAiJob({
    jobId,
    resultText: typeof body.resultText === "string" ? body.resultText : undefined,
    resultImage,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  }
  return NextResponse.json({
    ok: true,
    status: result.status,
    creationId: result.creationId,
  });
}
