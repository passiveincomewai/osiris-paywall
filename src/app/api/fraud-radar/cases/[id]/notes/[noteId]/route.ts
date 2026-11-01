import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  serializeNote,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";

/**
 * Fraud Radar Phase 8 — one case note (PHASE8 §5.2). Loaded
 * through its case (caseId + noteId), never by its own id
 * alone; a foreign case or a note from another case is 404.
 * Notes ARE editable (unlike snapshots) — the body is the only
 * mutable field.
 */
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id, noteId } = await params;
  const found = await loadCaseForRoute(session.userId, id, { write: true });
  if (!found) return notFound();
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* validated below */
  }
  const text = typeof body.body === "string" ? body.body : "";
  if (!text.trim() || text.length > 20_000) {
    return NextResponse.json(
      { error: "a note body of 1–20000 characters is required", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  const updated = await getCaseStore().updateNote(id, noteId, text);
  if (!updated) return notFound();
  return NextResponse.json({ note: serializeNote(updated) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id, noteId } = await params;
  const found = await loadCaseForRoute(session.userId, id, { write: true });
  if (!found) return notFound();
  const deleted = await getCaseStore().deleteNote(id, noteId);
  if (!deleted) return notFound();
  return NextResponse.json({ ok: true });
}
