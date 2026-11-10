import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  serializeLead,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";

/**
 * Fraud Radar Phase 8 — one pinned lead (PHASE8 §5.2, §1.3).
 * The lead is always loaded THROUGH its case (caseId + leadId),
 * never by its own id alone. PATCH touches the annotation only:
 * the snapshot fields are immutable (§1.3 rule 1) and any
 * request naming one is refused. DELETE removes the pin — it
 * deletes the row, it never edits it; the case event log
 * records that a lead was removed, without its snapshot.
 */
export const dynamic = "force-dynamic";

const IMMUTABLE_FIELDS = [
  "snapshot",
  "snapshotSha256",
  "sourceDataset",
  "sourceDatasetVersion",
  "ruleCode",
  "engine",
  "entityKey",
  "kind",
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; leadId: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id, leadId } = await params;
  const found = await loadCaseForRoute(session.userId, id, { write: true });
  if (!found) return notFound();
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* validated below */
  }
  for (const field of IMMUTABLE_FIELDS) {
    if (field in body) {
      return NextResponse.json(
        {
          error: `lead ${field} is immutable — a pinned snapshot is never edited`,
          code: "SNAPSHOT_IMMUTABLE",
        },
        { status: 400 },
      );
    }
  }
  if (body.annotation !== undefined && body.annotation !== null && typeof body.annotation !== "string") {
    return NextResponse.json(
      { error: "annotation must be text or null", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  const annotation =
    typeof body.annotation === "string" ? body.annotation.slice(0, 10_000) : null;
  const updated = await getCaseStore().updateLeadAnnotation(id, leadId, annotation);
  if (!updated) return notFound();
  return NextResponse.json({ lead: serializeLead(updated) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; leadId: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id, leadId } = await params;
  const found = await loadCaseForRoute(session.userId, id, { write: true });
  if (!found) return notFound();
  const store = getCaseStore();
  const lead = await store.getLead(id, leadId);
  if (!lead) return notFound();
  await store.deleteLead(id, leadId);
  await store.createEvent({
    caseId: id,
    kind: "lead_removed",
    actorId: session.userId,
    detail: {
      leadId: lead.id,
      kind: lead.kind,
      engine: lead.engine,
      entityKey: lead.entityKey,
      ruleCode: lead.ruleCode,
      sourceDatasetVersion: lead.sourceDatasetVersion,
    },
  });
  return NextResponse.json({ ok: true });
}
