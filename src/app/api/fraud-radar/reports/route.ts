import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  caseSession,
  notFound,
  serializeReport,
  signInRequired,
  inputErrorResponse,
  quotaResponse,
} from "@/lib/fraud-radar/reports/route-helpers";
import { getReportStore } from "@/lib/fraud-radar/reports/store";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import { loadAccessibleCase } from "@/lib/fraud-radar/cases/access";
import {
  createReportForUser,
  ReportInputError,
  ReportQuotaError,
  TemplateNotAllowedError,
} from "@/lib/fraud-radar/reports/reports";
import { reportEntitlementsForSession } from "@/lib/fraud-radar/reports/entitlements";

/**
 * Fraud Radar Phase 9 — reports collection (PHASE9 §5.2).
 * Flag-gated like every Fraud Radar route: with
 * FRAUD_RADAR_ENABLED off this is a 404, indistinguishable
 * from the route not existing. Owner-scoped: a caller only
 * ever sees their own reports (§2.2 — reports are owner-only
 * even over team-visible cases). A home caseId is accepted
 * only when the caller owns that case.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const reports = await getReportStore().listReports(session.userId);
  return NextResponse.json({ reports: reports.map(serializeReport) });
}

export async function POST(req: NextRequest) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  let body: { templateId?: unknown; title?: unknown; caseId?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* validated below */
  }
  const templateId = typeof body.templateId === "string" ? body.templateId : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 200) {
    return NextResponse.json(
      { error: "a report title of 1–200 characters is required", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  let caseId: string | null = null;
  if (body.caseId !== undefined && body.caseId !== null) {
    if (typeof body.caseId !== "string" || !body.caseId) {
      return inputErrorResponse(["caseId must be a case id string"]);
    }
    // The home case must be readable by the caller AND owned
    // by them (reports never inherit team visibility, §2.2).
    const accessible = await loadAccessibleCase(getCaseStore(), {
      userId: session.userId,
      caseId: body.caseId,
    });
    if (!accessible || accessible.caseRow.ownerId !== session.userId) {
      return notFound();
    }
    caseId = body.caseId;
  }
  const { entitlements } = reportEntitlementsForSession(session.session);
  try {
    const created = await createReportForUser(getReportStore(), {
      ownerId: session.userId,
      templateId,
      title,
      caseId,
      entitlements,
    });
    return NextResponse.json({ report: serializeReport(created) }, { status: 201 });
  } catch (err) {
    if (err instanceof ReportQuotaError) {
      return quotaResponse(err.limit, "REPORT_LIMIT", `report limit reached (${err.limit})`);
    }
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
