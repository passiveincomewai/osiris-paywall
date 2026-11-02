/**
 * Fraud Radar Phase 9 — report API-route helpers: wire
 * serialisation + report loading. Session resolution and the
 * 404/401 shapes are the Phase 8 ones, imported from the
 * cases route-helpers — never re-implemented. Route order of
 * checks is fixed by PHASE9 §5.4: flag (404) → session (401)
 * → ownership (404) → entitlement/quota (429) → work.
 *
 * Reports are OWNER-ONLY (§2.2): access resolves only
 * through the report's ownerId. A report over a team-visible
 * case inherits no broader access, because an export is a
 * disclosure decision.
 */

import { NextResponse } from "next/server";
import {
  caseSession,
  notFound,
  signInRequired,
  type CaseSession,
} from "../cases/route-helpers";
import { getReportStore, type ReportRecord, type ReportVersionRecord, type ReportExportRecord, type ReportGenerationJobRecord } from "./store";
import { diffPinSets, type PinSet } from "./pins";

export { caseSession, notFound, signInRequired };
export type { CaseSession };

/**
 * Load a report through its owner for a route. Null means
 * 404 — foreign and nonexistent reports are
 * indistinguishable.
 */
export async function loadReportForRoute(
  userId: string,
  reportId: string,
): Promise<ReportRecord | null> {
  const report = await getReportStore().getReportById(reportId);
  if (!report || report.ownerId !== userId) return null;
  return report;
}

export function serializeReport(r: ReportRecord) {
  return {
    id: r.id,
    caseId: r.caseId,
    templateId: r.templateId,
    // The author's title, verbatim (§0.1).
    title: r.title,
    status: r.status,
    versionCount: r.versionCount,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/** Version summary for lists: pins summarised by hash, never
 *  the frozen snapshot bodies. */
export function serializeVersionSummary(v: ReportVersionRecord) {
  return {
    id: v.id,
    reportId: v.reportId,
    versionNo: v.versionNo,
    templateVersion: v.templateVersion,
    generatorVersion: v.generatorVersion,
    casePin: v.pinSet.case
      ? {
          caseId: v.pinSet.case.caseId,
          caseSnapshotSha256: v.pinSet.case.caseSnapshotSha256,
        }
      : null,
    leadPins: v.pinSet.leads.map((l) => ({
      leadId: l.leadId,
      kind: l.kind,
      snapshotSha256: l.snapshotSha256,
    })),
    entityPins: v.pinSet.entities.map((e) => ({
      engine: e.engine,
      entityKey: e.entityKey,
      capturedSha256: e.capturedSha256,
      dataset: e.dataset,
      datasetVersion: e.datasetVersion,
    })),
    verificationPins: v.pinSet.verifications.map((x) => ({
      verificationId: x.verificationId,
      claimId: x.claimId,
    })),
    evidencePins: v.pinSet.evidence.map((e) => ({
      evidenceId: e.evidenceId,
      sha256: e.sha256,
    })),
    datasets: v.pinSet.datasets,
    contentSha256: v.contentSha256,
    validationVerdict: v.validationVerdict,
    createdById: v.createdById,
    createdAt: v.createdAt.toISOString(),
  };
}

/** Full version detail: the pin set verbatim (it is the
 *  reproducibility record), the composition, the manifest
 *  once generated, and the pin-diff against the previous
 *  version (§2.3.2). No document pathname is exposed —
 *  clients hold ids, bytes move through gated routes only. */
export function serializeVersion(
  v: ReportVersionRecord,
  previousPinSet: PinSet | null,
) {
  return {
    ...serializeVersionSummary(v),
    pinSet: v.pinSet,
    composition: v.composition,
    manifest: v.manifest,
    validationDetail: v.validationDetail,
    pinDiff: diffPinSets(previousPinSet, v.pinSet),
  };
}

export function serializeExport(e: ReportExportRecord) {
  return {
    id: e.id,
    versionId: e.versionId,
    format: e.format,
    sizeBytes: e.sizeBytes.toString(),
    sha256: e.sha256,
    contentSha256: e.contentSha256,
    createdAt: e.createdAt.toISOString(),
  };
}

export function serializeGenerationJob(j: ReportGenerationJobRecord) {
  return {
    id: j.id,
    versionId: j.versionId,
    reportId: j.reportId,
    formats: j.formats,
    status: j.status,
    attempts: j.attempts,
    error: j.error,
    startedAt: j.startedAt ? j.startedAt.toISOString() : null,
    finishedAt: j.finishedAt ? j.finishedAt.toISOString() : null,
    createdAt: j.createdAt.toISOString(),
  };
}

export function quotaResponse(limit: number, code: string, message: string) {
  return NextResponse.json({ error: message, code, limit }, { status: 429 });
}

export function inputErrorResponse(errors: string[]) {
  return NextResponse.json(
    { error: errors.join("; "), code: "INVALID_INPUT", errors },
    { status: 400 },
  );
}
