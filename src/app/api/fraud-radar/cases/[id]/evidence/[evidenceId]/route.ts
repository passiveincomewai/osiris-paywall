import { NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  serializeEvidence,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import { deleteVaultObjects } from "@/lib/fraud-radar/cases/vault";

/**
 * Fraud Radar Phase 8 — one evidence item (PHASE8 §5.2, §2.6
 * rule 1). DELETE is a REAL delete: the Blob object (and its
 * extraction, when present) is deleted and the row is removed;
 * the case event log records the fact + title + hash — the
 * proof something was there, never the thing itself. If a Blob
 * deletion fails, the row is marked deletion_pending and
 * access to the file is revoked immediately (downloads 404);
 * the retry sweep in vault.ts completes the delete — the UI
 * shows "deletion pending" honestly rather than claiming a
 * delete that has not happened.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; evidenceId: string }> },
) {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id, evidenceId } = await params;
  const found = await loadCaseForRoute(session.userId, id);
  if (!found) return notFound();
  const row = await getCaseStore().getEvidence(id, evidenceId);
  if (!row) return notFound();
  return NextResponse.json({ evidence: serializeEvidence(row) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; evidenceId: string }> },
) {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id, evidenceId } = await params;
  const found = await loadCaseForRoute(session.userId, id, { write: true });
  if (!found) return notFound();
  const store = getCaseStore();
  const row = await store.getEvidence(id, evidenceId);
  if (!row) return notFound();
  const pathnames = [row.blobPathname, row.extractedTextPathname].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  if (pathnames.length > 0) {
    const { failed } = await deleteVaultObjects(pathnames);
    if (failed.length > 0) {
      await store.updateEvidence(id, evidenceId, { storageState: "deletion_pending" });
      return NextResponse.json({ ok: true, deletionPending: true });
    }
  }
  await store.deleteEvidence(id, evidenceId);
  await store.createEvent({
    caseId: id,
    kind: "evidence_removed",
    actorId: session.userId,
    detail: {
      evidenceId: row.id,
      title: row.title,
      sha256: row.sha256,
      artifactSha256: row.artifactSha256,
    },
  });
  return NextResponse.json({ ok: true });
}
