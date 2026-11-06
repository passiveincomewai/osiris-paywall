import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const runtime = "nodejs";

/**
 * The signed-in half of the "pick up where you left off" rail
 * (components/ReturnRail.tsx): the caller's own most recent camera_open
 * history, from the PageView rows the analytics ingest stamps with
 * cameraId (camera_open events only — see api/analytics/track).
 *
 * Honesty rules:
 *  - Only the caller's own rows are ever read (userId from the session;
 *    signed-out callers get an empty list, never anyone else's history).
 *  - Only post-instrumentation rows can appear: cameraId is NULL on all
 *    earlier opens because the id was never recorded — there is no
 *    backfill, and this route invents none.
 *  - `name` is the ingest-time snapshot; the rail re-resolves every id
 *    against /api/cctv?id= at render time and drops unresolvable ids,
 *    so this list is a candidate set, not display copy.
 */
export async function GET() {
  try {
    const session = await auth().catch(() => null);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    if (!userId) return NextResponse.json({ cameras: [] });
    const rows = await db.pageView.findMany({
      where: {
        userId,
        cameraId: { not: null },
        OR: [{ event: "camera_open" }, { event: { startsWith: "camera_open:" } }],
      },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: { cameraId: true, cameraName: true },
    });
    const seen = new Set<string>();
    const cameras: { id: string; name: string }[] = [];
    for (const row of rows) {
      const id = row.cameraId;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      cameras.push({ id, name: row.cameraName ?? "" });
      if (cameras.length >= 8) break;
    }
    return NextResponse.json({ cameras });
  } catch {
    // Fail soft: the rail falls back to this device's localStorage list.
    return NextResponse.json({ cameras: [] });
  }
}
