// GET /api/white-label-demo/locations?q=… — location search for the
// White Label demo generator. The index is built ONLY from the
// public-embed eligible camera set (rights-cleared + playable) plus
// the ski-resort dataset, and only offers places where a preview
// would actually show cameras — see src/lib/white-label-demo.
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { publicEmbedCameras } from "@/lib/embed/public";
import { getDemoLocations, searchDemoLocations } from "@/lib/white-label-demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* A cold instance may first have to build the camera catalogue in-process. */
export const maxDuration = 60;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ results: [] });

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "worldeye.app";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const cameras = await publicEmbedCameras(`${proto}://${host}`);
  if (!cameras) {
    return NextResponse.json(
      { error: "The camera catalogue is unavailable right now — try again in a moment." },
      { status: 503 },
    );
  }
  const results = searchDemoLocations(getDemoLocations(cameras), q).map((l) => ({
    id: l.id,
    kind: l.kind,
    label: l.label,
    detail: l.detail,
    cameraCount: l.cameraCount,
  }));
  return NextResponse.json({ results });
}
