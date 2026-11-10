import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  serializeNote,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";

/**
 * Fraud Radar Phase 8 — case notes (PHASE8 §5.2, §1.6). Notes
 * are the user's own words — freely editable, never censored by
 * the system's vocabulary rules (the Phase 7 §3.1 discipline).
 * An anchor (lead/evidence/claim) must belong to THIS case;
 * children are never resolved by their own id alone.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id } = await params;
  const found = await loadCaseForRoute(session.userId, id);
  if (!found) return notFound();
  const notes = await getCaseStore().listNotes(id);
  return NextResponse.json({ notes: notes.map(serializeNote) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id } = await params;
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
  const store = getCaseStore();
  const leadId = typeof body.leadId === "string" ? body.leadId : null;
  const evidenceId = typeof body.evidenceId === "string" ? body.evidenceId : null;
  const claimId = typeof body.claimId === "string" ? body.claimId : null;
  // Anchors resolve through the case — a foreign child's id is
  // an invalid anchor here, never a cross-case reference.
  if (leadId && !(await store.getLead(id, leadId))) {
    return NextResponse.json(
      { error: "lead anchor not found in this case", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  if (evidenceId && !(await store.evidenceExists(id, evidenceId))) {
    return NextResponse.json(
      { error: "evidence anchor not found in this case", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  if (claimId && !(await store.claimExists(id, claimId))) {
    return NextResponse.json(
      { error: "claim anchor not found in this case", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  const note = await store.createNote({
    caseId: id,
    leadId,
    evidenceId,
    claimId,
    body: text,
    authorId: session.userId,
  });
  await store.createEvent({
    caseId: id,
    kind: "note_added",
    actorId: session.userId,
    detail: { noteId: note.id, leadId, evidenceId, claimId },
  });
  return NextResponse.json({ note: serializeNote(note) }, { status: 201 });
}
