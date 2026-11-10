import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  caseSession,
  loadReportForRoute,
  notFound,
  serializeVersion,
  serializeExport,
  serializeGenerationJob,
  signInRequired,
} from "@/lib/fraud-radar/reports/route-helpers";
import { getReportStore } from "@/lib/fraud-radar/reports/store";

/**
 * Fraud Radar Phase 9 — one report version (PHASE9 §5.2):
 * the full pin set + composition + manifest (once generated)
 * + job status + export rows. Read-only by design: there is
 * no PATCH/PUT/DELETE for a version — a version, once
 * created, is frozen (§2.3.1), and the generate/download
 * routes land with the worker in P9-C. A version id under a
 * foreign report id fails at both hops (404).
 */
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
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
  const versions = await store.listVersions(report.id);
  const previous = versions.find((v) => v.versionNo === version.versionNo - 1);
  const [exports_, jobs] = await Promise.all([
    store.listExports(report.id, version.id),
    store.listGenerationJobs(report.id, version.id),
  ]);
  return NextResponse.json({
    version: serializeVersion(version, previous?.pinSet ?? null),
    exports: exports_.map(serializeExport),
    jobs: jobs.map(serializeGenerationJob),
  });
}
