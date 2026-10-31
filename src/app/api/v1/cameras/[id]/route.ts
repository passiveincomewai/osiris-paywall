import { NextRequest } from "next/server";
import { apiError, apiOk, publicApiGate } from "@/lib/developer/http";
import { getCamera } from "@/lib/developer/service";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/v1/cameras/<id> — one camera from the redistribution-cleared
 * catalogue. A camera outside that set (or no longer in the catalogue)
 * is a 404, exactly as if it didn't exist.
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
  return apiOk(
    {
      data: camera,
      attribution: "Camera data via WorldEye. Credit the camera's listed source.",
    },
    gate.auth,
  );
}
