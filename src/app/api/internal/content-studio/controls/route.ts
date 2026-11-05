// GET /api/internal/content-studio/controls — the content engine's
// control feed. Returns the current control state (global pause +
// per-platform mode/ceiling/paused/connection) and the most recent
// control events from the admin panel; the engine applies the events
// it has not seen yet and reconciles its platform_state to match.
// Application on the engine side is idempotent (it tracks applied
// event ids locally), so returning recent history is safe.
//
// Guard mirrors /api/internal/demo-studio/queue: Authorization:
// Bearer <CONTENT_ENGINE_SECRET ?? STUDIO_AI_SECRET>; unconfigured
// ⇒ 404, bad bearer ⇒ 401.
import { NextResponse } from "next/server";
import { contentEngineConfigured, verifyContentBearer } from "@/lib/content-studio/config";
import { getControlState, listControlEvents } from "@/lib/content-studio/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!contentEngineConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 404 });
  }
  if (!verifyContentBearer(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const [control, events] = await Promise.all([getControlState(), listControlEvents(200)]);
  return NextResponse.json({
    ok: true,
    globalPaused: control.globalPaused,
    platforms: control.platforms,
    events,
  });
}
