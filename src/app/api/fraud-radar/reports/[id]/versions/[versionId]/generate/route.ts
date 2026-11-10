import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  caseSession,
  loadReportForRoute,
  notFound,
  serializeGenerationJob,
  signInRequired,
  inputErrorResponse,
} from "@/lib/fraud-radar/reports/route-helpers";
import { getReportStore } from "@/lib/fraud-radar/reports/store";
import { reportEntitlementsForSession } from "@/lib/fraud-radar/reports/entitlements";
import {
  enqueueGeneration,
  GenerationConflictError,
  GenerationInputError,
  GenerationQuotaError,
  TemplateUnavailableError,
} from "@/lib/fraud-radar/reports/generation";
import { reportStorageConfigured } from "@/lib/fraud-radar/reports/blob";

/**
 * Fraud Radar Phase 9 — enqueue report generation (PHASE9
 * §3.1, §5.2). Check order (§5.4): flag (404) → session (401)
 * → report ownership (404) → version belongs to the report
 * (404) → storage configured (503) → entitlement/quota (429)
 * → enqueue. The request creates ONE queued
 * FrReportGenerationJob row and returns 202 — rendering never
 * happens in the request; the pipeline worker claims the job,
 * validates the canonical document (§3.4) before any file
 * exists, and writes the exports to Blob. Generation usually
 * takes a few minutes; that is a description, not a promise.
 */
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id, versionId } = await params;
  const report = await loadReportForRoute(session.userId, id);
  if (!report) return notFound();
  const store = getReportStore();
  const version = await store.getVersion(report.id, versionId);
  if (!version) return notFound();
  if (!reportStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "report exports are not configured on this deployment yet; drafts and versions are saved, but generation is unavailable",
        code: "storage_unavailable",
      },
      { status: 503 },
    );
  }
  let body: { formats?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* validated below */
  }
  const { entitlements } = reportEntitlementsForSession(session.session);
  try {
    const job = await enqueueGeneration(store, {
      reportRow: report,
      version,
      formats: body.formats,
      entitlements,
    });
    return NextResponse.json(
      { job: serializeGenerationJob(job), status: "queued" },
      { status: 202 },
    );
  } catch (err) {
    if (err instanceof GenerationQuotaError) {
      return NextResponse.json(
        {
          error: `generation limit reached (${err.limit} per month); the limit resets ${err.resetAt}`,
          code: err.code,
          limit: err.limit,
          resetAt: err.resetAt,
        },
        { status: 429 },
      );
    }
    if (err instanceof TemplateUnavailableError) {
      return NextResponse.json(
        {
          error: `template ${err.templateId} is not yet available in this deployment`,
          code: err.code,
        },
        { status: 422 },
      );
    }
    if (err instanceof GenerationConflictError) {
      return NextResponse.json(
        { error: err.message, code: err.code, reason: err.reason },
        { status: 409 },
      );
    }
    if (err instanceof GenerationInputError) {
      return inputErrorResponse(err.errors);
    }
    throw err;
  }
}
