import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordingAccess } from "@/lib/recording/access";

export const runtime = "nodejs";

/** List the user's clip metadata (video blobs live in the browser's IndexedDB). */
export async function GET() {
  const a = await recordingAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  const clips = await db.clipMeta.findMany({
    where: { userId: a.userId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const totals = await db.clipMeta.aggregate({
    where: { userId: a.userId },
    _sum: { durationSec: true, sizeBytes: true },
    _count: true,
  });
  return NextResponse.json({
    clips,
    totals: {
      count: totals._count,
      durationSec: totals._sum.durationSec ?? 0,
      sizeBytes: totals._sum.sizeBytes ?? 0,
    },
  });
}

/**
 * Register a finished clip. PRO ONLY — enforced here, not just in the UI.
 * The video blob itself stays in the browser's IndexedDB; this stores metadata.
 */
export async function POST(req: NextRequest) {
  const a = await recordingAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  if (!a.pro) return NextResponse.json({ error: "pro_required" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const cameraName = typeof body.cameraName === "string" ? body.cameraName.slice(0, 120) : "Camera";
  const durationSec = Math.max(1, Math.min(3600, Math.floor(Number(body.durationSec) || 0)));
  const sizeBytes = Math.max(1, Math.min(500_000_000, Math.floor(Number(body.sizeBytes) || 0)));
  const startedAt = body.startedAt ? new Date(body.startedAt) : new Date();
  if (!durationSec || !sizeBytes || isNaN(startedAt.getTime())) {
    return NextResponse.json({ error: "durationSec, sizeBytes, startedAt required" }, { status: 400 });
  }
  let savedCameraId: string | null = null;
  if (typeof body.savedCameraId === "string") {
    const own = await db.savedCamera.findFirst({ where: { id: body.savedCameraId, userId: a.userId } });
    if (own) savedCameraId = own.id;
  }
  const clip = await db.clipMeta.create({
    data: {
      userId: a.userId,
      savedCameraId,
      cameraName,
      startedAt,
      durationSec,
      sizeBytes,
      mimeType: typeof body.mimeType === "string" ? body.mimeType.slice(0, 60) : "video/webm",
    },
  });
  return NextResponse.json({ clip });
}
