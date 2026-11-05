// GET /api/admin/content-studio/state — everything the Content
// Studio admin page renders: per-platform control state, the global
// pause flag, the latest engine snapshot per section, and recent
// control events. Admins only (requireAdmin). Read-only: this route
// never changes control state and never publishes anything.
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/affiliate/admin";
import { getControlState, latestSnapshots, listControlEvents } from "@/lib/content-studio/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function forbidden(e: unknown) {
  const status = (e as { status?: number })?.status ?? 403;
  return NextResponse.json({ error: "admin only" }, { status });
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return forbidden(e);
  }
  const [control, snapshots, events] = await Promise.all([
    getControlState(),
    latestSnapshots(),
    listControlEvents(30),
  ]);
  const lastSyncAt =
    Object.values(snapshots)
      .map((s) => s.createdAt)
      .sort()
      .at(-1) ?? null;
  return NextResponse.json({
    ok: true,
    platforms: control.platforms,
    globalPaused: control.globalPaused,
    snapshots,
    lastSyncAt,
    events,
  });
}
