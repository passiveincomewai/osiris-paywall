import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/affiliate/admin";
import { collectCameraDashboard } from "@/lib/camera-expansion/dashboard-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin: Camera Network — catalogue totals, per-source health rollup,
 * the last harvest run's reconciliation, and sync status. The same view
 * model the /admin Camera Network section renders; see
 * lib/camera-expansion/dashboard-server for the (read-only) collection
 * and its scope limits.
 */
export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ ok: false }, { status: 403 }); }
  const data = await collectCameraDashboard();
  return NextResponse.json({ ok: true, data });
}
