import { NextRequest, NextResponse } from "next/server";
import { apiError, publicApiGate, rateHeaders } from "@/lib/developer/http";
import { getCamera } from "@/lib/developer/service";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/v1/cameras/<id>/snapshot — the camera's current still.
 * Answers 302 to WorldEye's own frame route (the URL the detail
 * payload carries as snapshotUrl), so API consumers get a stable,
 * key-checked snapshot address without the API proxying image bytes.
 * Stream-only cameras have no still: 404 with the reason.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await publicApiGate(req);
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const camera = await getCamera(id, new URL(req.url).origin);
  if (!camera) {
    return apiError(404, "camera_not_found", "Camera not found in the public catalogue.");
  }
  if (!camera.snapshotUrl) {
    return apiError(
      404,
      "snapshot_unavailable",
      "This camera is stream-only and has no snapshot. Watch it live on WorldEye via the watchUrl in the camera detail.",
    );
  }
  return NextResponse.redirect(camera.snapshotUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store", ...rateHeaders(gate.auth) },
  });
}
