// POST /api/internal/content-studio/snapshot — the content engine
// pushes one status snapshot per call: { section, payload } with
// section one of overview | queue | errors (the panel renders the
// latest snapshot per section and nothing else — no snapshot, no
// numbers). Stored verbatim; shape contract lives in
// ~/workspace/content-engine (sync_admin.py + ADMIN-PANEL.md).
//
// Guard mirrors /api/internal/demo-studio/queue: Authorization:
// Bearer <CONTENT_ENGINE_SECRET ?? STUDIO_AI_SECRET>; unconfigured
// ⇒ 404, bad bearer ⇒ 401.
import { NextRequest, NextResponse } from "next/server";
import { contentEngineConfigured, verifyContentBearer } from "@/lib/content-studio/config";
import { storeSnapshot } from "@/lib/content-studio/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECTIONS = new Set(["overview", "queue", "errors"]);
const MAX_PAYLOAD_CHARS = 512_000;

export async function POST(req: NextRequest) {
  if (!contentEngineConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 404 });
  }
  if (!verifyContentBearer(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as
    | { section?: unknown; payload?: unknown }
    | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON body required" }, { status: 400 });
  }
  const section = typeof body.section === "string" ? body.section : "overview";
  if (!SECTIONS.has(section)) {
    return NextResponse.json(
      { error: "section must be one of: overview, queue, errors" },
      { status: 400 },
    );
  }
  if (!body.payload || typeof body.payload !== "object" || Array.isArray(body.payload)) {
    return NextResponse.json({ error: "payload must be a JSON object" }, { status: 400 });
  }
  if (JSON.stringify(body.payload).length > MAX_PAYLOAD_CHARS) {
    return NextResponse.json({ error: "snapshot payload too large" }, { status: 413 });
  }
  const row = await storeSnapshot(section, body.payload);
  return NextResponse.json({ ok: true, id: row.id, section, createdAt: row.createdAt.toISOString() });
}
