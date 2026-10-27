import { NextResponse } from "next/server";
import { PRODUCTION_APP_URL } from "@/lib/app-url";
import { publicEmbedCamera } from "@/lib/embed/public";
import { publicEmbedUrl, watchOnWorldEyeUrl } from "@/lib/embed/snippet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* A cold instance may first have to build the camera catalogue in-process. */
export const maxDuration = 60;

/**
 * Public-embed eligibility for one camera, for the camera viewer: the
 * Embed action is offered only when this route says the camera's
 * source is cleared for redistribution AND the camera is playable —
 * the exact verdict the player route enforces (lib/embed/public), so
 * the button can never promise an embed the player would 404. No auth:
 * the answer is a property of the camera, not of the visitor.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cam = await publicEmbedCamera(id, PRODUCTION_APP_URL);
  const headers = { "Cache-Control": "public, max-age=300" };
  if (!cam) {
    return NextResponse.json({ eligible: false }, { headers });
  }
  return NextResponse.json(
    {
      eligible: true,
      id: cam.id,
      name: cam.name,
      city: cam.city,
      country: cam.country,
      attribution: cam.attribution,
      embedUrl: publicEmbedUrl(cam.id),
      watchUrl: watchOnWorldEyeUrl(cam.id),
    },
    { headers },
  );
}
