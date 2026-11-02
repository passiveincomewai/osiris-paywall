import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  caseSession,
  loadReportForRoute,
  notFound,
  serializeReport,
  serializeVersionSummary,
  signInRequired,
  inputErrorResponse,
} from "@/lib/fraud-radar/reports/route-helpers";
import { getReportStore } from "@/lib/fraud-radar/reports/store";
import {
  deleteReportForUser,
  updateReportForUser,
  ReportInputError,
} from "@/lib/fraud-radar/reports/reports";

/**
 * Fraud Radar Phase 9 — one report (PHASE9 §5.2): detail +
 * version summaries, title/status edits (the author's own
 * work states — there is NO route that edits a version), and
 * hard deletion (versions + exports cascade; export Blob
 * objects do not exist until generation lands in P9-C).
 * Owner-only (§2.2): foreign and nonexistent reports are the
 * same 404.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id } = await params;
  const report = await loadReportForRoute(session.userId, id);
  if (!report) return notFound();
  const versions = await getReportStore().listVersions(report.id);
  return NextResponse.json({
    report: serializeReport(report),
    versions: versions.map(serializeVersionSummary),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id } = await params;
  const report = await loadReportForRoute(session.userId, id);
  if (!report) return notFound();
  let body: { title?: unknown; status?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* validated below */
  }
  const patch: { title?: string; status?: string } = {};
  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 200) {
      return inputErrorResponse(["a report title of 1–200 characters is required"]);
    }
    patch.title = title;
  }
  if (body.status !== undefined) {
    if (typeof body.status !== "string") {
      return inputErrorResponse(["status must be a string"]);
    }
    patch.status = body.status;
  }
  try {
    const updated = await updateReportForUser(getReportStore(), {
      reportRow: report,
      patch,
    });
    return NextResponse.json({ report: serializeReport(updated) });
  } catch (err) {
    if (err instanceof ReportInputError) return inputErrorResponse(err.errors);
    throw err;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id } = await params;
  const report = await loadReportForRoute(session.userId, id);
  if (!report) return notFound();
  await deleteReportForUser(getReportStore(), { reportRow: report });
  return NextResponse.json({ deleted: true });
}
