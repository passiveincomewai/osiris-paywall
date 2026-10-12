import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordingAccess } from "@/lib/recording/access";

export const runtime = "nodejs";

/** List the signed-in user's saved cameras. Free users may save (preview). */
export async function GET() {
  const a = await recordingAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  const cams = await db.savedCamera.findMany({
    where: { userId: a.userId },
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ cameras: cams });
}

/** Save a camera (snapshot of the resolved camera object from the viewer). */
export async function POST(req: NextRequest) {
  const a = await recordingAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.slice(0, 120) : null;
  const cameraData = body.cameraData;
  if (!name || !cameraData || typeof cameraData !== "object") {
    return NextResponse.json({ error: "name and cameraData required" }, { status: 400 });
  }
  const group = typeof body.group === "string" && body.group.trim()
    ? body.group.trim().slice(0, 60) : "Ungrouped";
  // Prevent exact duplicates (same stream URL).
  const streamKey: string | null =
    (cameraData.stream_url as string | undefined) ??
    (cameraData.feed_url as string | undefined) ??
    (cameraData.external_url as string | undefined) ?? null;
  if (streamKey) {
    const existing = await db.savedCamera.findMany({
      where: { userId: a.userId },
      select: { id: true, cameraData: true },
    });
    for (const e of existing) {
      const d = e.cameraData as Record<string, unknown>;
      if (d.stream_url === streamKey || d.feed_url === streamKey || d.external_url === streamKey) {
        return NextResponse.json({ camera: { id: e.id, duplicate: true } });
      }
    }
  }
  const count = await db.savedCamera.count({ where: { userId: a.userId } });
  const cam = await db.savedCamera.create({
    data: { userId: a.userId, name, group, cameraData, sortOrder: count },
  });
  return NextResponse.json({ camera: cam });
}
