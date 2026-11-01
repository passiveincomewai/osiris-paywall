import { NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  serializeJob,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import { caseEntitlementsForSession } from "@/lib/fraud-radar/cases/entitlements";

/**
 * Fraud Radar Phase 8 — enqueue document processing (PHASE8
 * §3.3). The web tier NEVER parses: it creates the
 * FrEvidenceProcessingJob row (queued) and marks the evidence
 * queued, then answers 202. The batch worker (P8-E) claims
 * the job, verifies the file's hash, parses, and writes the
 * extraction back to the vault. Monthly job counts enforce
 * through the §5.3 entitlement interface — the job rows are
 * the ledger.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
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
  if (!row || row.kind !== "upload" || row.storageState !== "present") {
    return notFound();
  }
  const { entitlements } = caseEntitlementsForSession(session.session);
  if (!entitlements || entitlements.processingJobsPerMonth <= 0) {
    return NextResponse.json(
      {
        error: "document processing is not included in this tier",
        code: "PROCESSING_DISABLED",
        limit: entitlements?.processingJobsPerMonth ?? 0,
      },
      { status: 429 },
    );
  }
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const used = await store.countProcessingJobsInRange(session.userId, monthStart, nextMonth);
  if (used >= entitlements.processingJobsPerMonth) {
    return NextResponse.json(
      {
        error: `processing job limit reached (${entitlements.processingJobsPerMonth} this month)`,
        code: "PROCESSING_LIMIT",
        limit: entitlements.processingJobsPerMonth,
        resetAt: nextMonth.toISOString(),
      },
      { status: 429 },
    );
  }
  const job = await store.createProcessingJob({ evidenceId, caseId: id, requestedPath: "auto" });
  await store.updateEvidence(id, evidenceId, { processingStatus: "queued" });
  return NextResponse.json({ job: serializeJob(job) }, { status: 202 });
}
