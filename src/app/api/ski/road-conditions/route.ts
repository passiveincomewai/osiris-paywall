import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveSkiAccess } from "@/lib/ski/access-server";
import { fetchRoadConditions } from "@/lib/ski/road-conditions";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Powder Pass road conditions (keyless v1).
 *
 *   GET /api/ski/road-conditions → { events, coverage, fetchedAt }
 *
 * Session-gated (401 anon) and ski-access gated (403, resolveSkiAccess
 * only — the same resolver every ski API uses). Events are the live
 * state DOT reports normalised by lib/ski/road-conditions: California
 * chain controls + lane closures (Caltrans), Montana road events /
 * restrictions / construction (MDT 511), and Idaho WORK ZONES ONLY
 * (WZDx). The coverage block states per feed whether it is live or
 * unavailable — an unavailable or uncovered state must never be read
 * as "all clear", so it travels with the events, always.
 *
 * There is deliberately no alert/email leg in v1: saved routes live in
 * the browser's localStorage only, so the server has no route to alert
 * on. The brief page matches these events to saved routes client-side.
 */
export async function GET() {
  const session = await auth().catch(() => null);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json(
      {
        error: "signin_required",
        message: "Sign in to see road conditions for your saved routes.",
      },
      { status: 401 },
    );
  }
  const hasAccess = await resolveSkiAccess(userId).catch(() => false);
  if (!hasAccess) {
    return NextResponse.json(
      {
        error: "powder_pass_required",
        message:
          "Road conditions are a Powder Pass feature — Powder Pass members and VIP Pro annual members can see them.",
      },
      { status: 403 },
    );
  }

  const payload = await fetchRoadConditions();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "private, max-age=120",
    },
  });
}
