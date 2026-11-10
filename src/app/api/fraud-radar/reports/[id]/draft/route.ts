import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  caseSession,
  loadReportForRoute,
  notFound,
  signInRequired,
  inputErrorResponse,
} from "@/lib/fraud-radar/reports/route-helpers";
import { getReportStore } from "@/lib/fraud-radar/reports/store";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import {
  buildDraft,
  ReportInputError,
} from "@/lib/fraud-radar/reports/reports";
import type { PinRequest } from "@/lib/fraud-radar/reports/pins";
import type { ReportComposition } from "@/lib/fraud-radar/reports/document";

/**
 * Fraud Radar Phase 9 — the builder's draft (PHASE9 §4.2).
 * Assembles the pin set + composition server-side from
 * identifiers only (the same code path version creation
 * uses, so the two cannot drift), runs the furniture /
 * vocabulary pre-check over system copy and author text, and
 * returns the pin-diff against the latest stored version.
 * A draft is a preview artefact: nothing is stored, nothing
 * is exported, and its hash covers the draft INPUTS — the
 * builder shows it so the author can confirm the generated
 * version was assembled from what they previewed.
 */
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id } = await params;
  const report = await loadReportForRoute(session.userId, id);
  if (!report) return notFound();
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* validated below */
  }
  if ("pinSet" in body || "snapshot" in body || "snapshotSha256" in body) {
    return inputErrorResponse([
      "pin data is not accepted: pins are captured server-side from identifiers",
    ]);
  }
  const pins = (body.pins ?? {}) as Record<string, unknown>;
  if ("pinSet" in pins || "snapshot" in pins || "snapshotSha256" in pins) {
    return inputErrorResponse([
      "pin data is not accepted: pins are captured server-side from identifiers",
    ]);
  }
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v ? v : undefined;
  const strList = (v: unknown): string[] | undefined =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined;
  const request: PinRequest = {
    caseId: str(pins.caseId),
    leadIds: strList(pins.leadIds),
    evidenceIds: strList(pins.evidenceIds),
    noteIds: strList(pins.noteIds),
    claimIds: strList(pins.claimIds),
    datasetSlugs: strList(pins.datasetSlugs),
    entityPins: Array.isArray(pins.entityPins)
      ? pins.entityPins
          .filter(
            (e): e is { engine: string; entityKey: string } =>
              !!e &&
              typeof e === "object" &&
              typeof (e as { engine?: unknown }).engine === "string" &&
              typeof (e as { entityKey?: unknown }).entityKey === "string",
          )
          .map((e) => ({ engine: e.engine, entityKey: e.entityKey }))
      : undefined,
    verificationIds: Array.isArray(pins.verificationIds)
      ? pins.verificationIds
          .filter(
            (v): v is { claimId: string; verificationId: string } =>
              !!v &&
              typeof v === "object" &&
              typeof (v as { claimId?: unknown }).claimId === "string" &&
              typeof (v as { verificationId?: unknown }).verificationId === "string",
          )
          .map((v) => ({ claimId: v.claimId, verificationId: v.verificationId }))
      : undefined,
  };
  const composition =
    body.composition && typeof body.composition === "object"
      ? (body.composition as ReportComposition)
      : null;
  const latest = await getReportStore().getLatestVersion(report.id);
  try {
    const draft = await buildDraft(getCaseStore(), {
      reportRow: report,
      request,
      composition,
      previousPinSet: latest?.pinSet ?? null,
    });
    return NextResponse.json({
      templateId: draft.templateId,
      templateVersion: draft.templateVersion,
      pinSetSummary: {
        case: draft.pinSet.case
          ? {
              caseId: draft.pinSet.case.caseId,
              caseSnapshotSha256: draft.pinSet.case.caseSnapshotSha256,
            }
          : null,
        leads: draft.pinSet.leads,
        entities: draft.pinSet.entities.map((e) => ({
          engine: e.engine,
          entityKey: e.entityKey,
          capturedSha256: e.capturedSha256,
          dataset: e.dataset,
          datasetVersion: e.datasetVersion,
        })),
        verifications: draft.pinSet.verifications.map((v) => ({
          verificationId: v.verificationId,
          claimId: v.claimId,
        })),
        evidence: draft.pinSet.evidence,
        datasets: draft.pinSet.datasets,
      },
      composition: draft.composition,
      pinDiff: draft.pinDiff,
      draftSha256: draft.draftSha256,
      preCheck: draft.preCheck,
    });
  } catch (err) {
    if (err instanceof ReportInputError) return inputErrorResponse(err.errors);
    throw err;
  }
}
