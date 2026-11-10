import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  caseSession,
  loadReportForRoute,
  notFound,
  serializeVersion,
  serializeVersionSummary,
  signInRequired,
  inputErrorResponse,
} from "@/lib/fraud-radar/reports/route-helpers";
import { getReportStore } from "@/lib/fraud-radar/reports/store";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import {
  createVersionForUser,
  ReportInputError,
  TemplateNotAllowedError,
} from "@/lib/fraud-radar/reports/reports";
import { reportEntitlementsForSession } from "@/lib/fraud-radar/reports/entitlements";
import type { PinRequest } from "@/lib/fraud-radar/reports/pins";
import type { ReportComposition } from "@/lib/fraud-radar/reports/document";

/**
 * Fraud Radar Phase 9 — a report's versions (PHASE9 §5.2).
 * Creation assembles the pin set SERVER-SIDE from identifiers
 * only (§2.1): the body carries case/lead/evidence/
 * verification ids, entity engine+keys, and dataset slugs —
 * never pin data, never snapshot bodies. A client that submits
 * snapshot-shaped fields is refused outright, so a fabricated
 * pin cannot be injected (the Phase 8 §1.3 rule-3 discipline,
 * restated for reports).
 */
export const dynamic = "force-dynamic";

/** Pin DATA is never accepted — only the `pins` object of
 *  identifiers is. These keys are refused at the top level
 *  and inside `pins` alike. */
const FORBIDDEN_BODY_KEYS = [
  "pinSet",
  "snapshot",
  "snapshotSha256",
  "caseSnapshotSha256",
  "capturedSha256",
  "record",
  "contentSha256",
  "manifest",
];

function parseVersionBody(body: Record<string, unknown>): {
  request: PinRequest;
  composition: ReportComposition | null;
} | { error: string } {
  for (const key of FORBIDDEN_BODY_KEYS) {
    if (key in body) {
      return {
        error: `field ${key} is not accepted: pins are captured server-side from identifiers`,
      };
    }
  }
  const pins = (body.pins ?? {}) as Record<string, unknown>;
  if (typeof pins !== "object" || pins === null || Array.isArray(pins)) {
    return { error: "pins must be an object of identifiers" };
  }
  for (const key of FORBIDDEN_BODY_KEYS) {
    if (key in pins) {
      return {
        error: `field pins.${key} is not accepted: pins are captured server-side from identifiers`,
      };
    }
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
  return { request, composition };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id } = await params;
  const report = await loadReportForRoute(session.userId, id);
  if (!report) return notFound();
  const versions = await getReportStore().listVersions(report.id);
  return NextResponse.json({ versions: versions.map(serializeVersionSummary) });
}

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
  const parsed = parseVersionBody(body);
  if ("error" in parsed) return inputErrorResponse([parsed.error]);
  const { entitlements } = reportEntitlementsForSession(session.session);
  try {
    const { version, pinDiff } = await createVersionForUser(
      getReportStore(),
      getCaseStore(),
      {
        reportRow: report,
        actorId: session.userId,
        request: parsed.request,
        composition: parsed.composition,
        entitlements,
      },
    );
    const store = getReportStore();
    const versions = await store.listVersions(report.id);
    const previous = versions.find((v) => v.versionNo === version.versionNo - 1);
    return NextResponse.json(
      {
        version: serializeVersion(version, previous?.pinSet ?? null),
        pinDiff,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof TemplateNotAllowedError) {
      return NextResponse.json(
        {
          error: `template ${err.templateId} is not available on this plan`,
          code: "TEMPLATE_NOT_ALLOWED",
        },
        { status: 403 },
      );
    }
    if (err instanceof ReportInputError) return inputErrorResponse(err.errors);
    throw err;
  }
}
