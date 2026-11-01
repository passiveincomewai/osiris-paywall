// GET /api/affiliate/studio/repurpose/library — sources the Machine can
// start from besides an upload: the approved WorldEye promotional
// videos (the video templates' real footage) and the caller's own
// Studio creations. WorldEye-owned library assets carry their rights
// with them; creations are the affiliate's own work.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudioAccess } from "../../../_util";

export const runtime = "nodejs";

export async function GET() {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });

  const now = new Date();
  const [templates, creations] = await Promise.all([
    db.marketingTemplate.findMany({
      where: {
        kind: "video",
        active: true,
        assetUrl: { not: null },
        OR: [{ publishAt: null }, { publishAt: { lte: now } }],
      },
      select: { slug: true, title: true, assetUrl: true, previewUrl: true, width: true, height: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.studioCreation.findMany({
      where: { affiliateProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, kind: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    library: templates.map((t) => ({
      slug: t.slug,
      title: t.title,
      assetUrl: t.assetUrl,
      previewUrl: t.previewUrl,
      width: t.width,
      height: t.height,
    })),
    creations: creations.map((c) => ({ id: c.id, title: c.title, kind: c.kind, createdAt: c.createdAt })),
  });
}
