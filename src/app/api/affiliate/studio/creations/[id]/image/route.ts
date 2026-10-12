// GET /api/affiliate/studio/creations/[id]/image — serve a fulfilled AI
// image result to its OWNER only. Ownership is scoped by the caller's
// profile id (another affiliate's creation id reads as 404, never as a
// leak). The bytes live on the StudioCreation row (Phase 3 capped them
// at ≈2.5MB at fulfillment time), so no blob storage is involved.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudioAccess } from "../../../../_util";

export const runtime = "nodejs";

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }

  const { id } = await params;
  const row = await db.studioCreation.findFirst({
    where: { id, affiliateProfileId: profile.id },
    select: { resultImageBytes: true, resultImageMime: true },
  });
  if (!row?.resultImageBytes || row.resultImageBytes.length === 0) {
    return NextResponse.json({ error: "No image for this creation" }, { status: 404 });
  }

  const mime = row.resultImageMime ?? "application/octet-stream";
  const ext = EXT_BY_MIME[mime] ?? "bin";
  return new NextResponse(Buffer.from(row.resultImageBytes), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(row.resultImageBytes.length),
      "Content-Disposition": `inline; filename="worldeye-ai-creation.${ext}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
