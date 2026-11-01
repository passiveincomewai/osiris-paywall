// GET /api/demo-studio/placement?page=<page>&slot=<slot> — public read
// for <DemoVideoSlot/>: returns the approved video an admin placed in
// that slot, or null. Read-only and cacheable for a minute; a slot with
// no placement is a cheap 200 { video: null } and pages render nothing.
import { NextRequest, NextResponse } from "next/server";
import { getPlacedVideo } from "@/lib/demo-studio/jobs";
import { isValidSlot } from "@/lib/demo-studio/pages";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get("page") ?? "";
  const slot = req.nextUrl.searchParams.get("slot") ?? "";
  if (!isValidSlot(page, slot)) {
    return NextResponse.json({ video: null }, { status: 400 });
  }
  const video = await getPlacedVideo(page, slot).catch(() => null);
  return NextResponse.json(
    {
      video: video
        ? {
            title: video.title,
            description: video.description,
            videoUrl: video.videoUrl,
            posterUrl: video.posterUrl,
            orientation: video.orientation,
          }
        : null,
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
