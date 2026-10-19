import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/affiliate/admin";
import { readSyncRequests, recordSyncRequest } from "@/lib/camera-expansion/sync-requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin: record / read a harvest dry-run request.
 *
 * This endpoint deliberately does NOT run the harvest: generation is a
 * tools/ process that runs outside Vercel (see docs/camera-sync.md).
 * POST records a timestamped request in .cache/camera-sync/requests.json;
 * the sync runner (tools/sync-cameras.ts) checks that file before every
 * run and stamps satisfaction back. GET reports the current state,
 * including when the last request was satisfied — the run's outcome
 * itself lands in the committed sync artifacts the dashboard renders.
 */
export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ ok: false }, { status: 403 }); }
  return NextResponse.json({ ok: true, ...readSyncRequests() });
}

export async function POST() {
  let email = "admin";
  try {
    const session = await requireAdmin();
    email = (session as { user?: { email?: string } })?.user?.email ?? "admin";
  } catch { return NextResponse.json({ ok: false }, { status: 403 }); }
  const state = recordSyncRequest(email);
  return NextResponse.json({ ok: true, ...state });
}
