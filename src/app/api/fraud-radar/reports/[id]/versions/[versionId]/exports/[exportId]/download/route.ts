import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  caseSession,
  loadReportForRoute,
  notFound,
  signInRequired,
} from "@/lib/fraud-radar/reports/route-helpers";
import { getReportStore } from "@/lib/fraud-radar/reports/store";
import {
  EXPORT_CONTENT_TYPES,
  exportDownloadFilename,
  openReportStream,
} from "@/lib/fraud-radar/reports/blob";

/**
 * Fraud Radar Phase 9 — export download (PHASE9 §5.2). The
 * ONLY way export bytes leave storage. Check order (§5.4):
 * flag (404) → session (401) → report ownership (404) →
 * version belongs to the report (404) → export belongs to
 * the version AND the report (404, resolved through both
 * parents in the store) → stream from Blob server-side.
 * Never a redirect, never a Blob URL, never the storage
 * pathname in any header or body. Downloads are attachment +
 * nosniff + `private, no-store`, and the filename names the
 * version (§2.3.3) — there is no "latest" download.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; versionId: string; exportId: string }>;
  },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id, versionId, exportId } = await params;
  const report = await loadReportForRoute(session.userId, id);
  if (!report) return notFound();
  const store = getReportStore();
  const version = await store.getVersion(report.id, versionId);
  if (!version) return notFound();
  const row = await store.getExport(report.id, version.id, exportId);
  if (!row) return notFound();
  const opened = await openReportStream(row.blobPathname);
  if (!opened) return notFound();
  const headers = new Headers({
    "Content-Type":
      EXPORT_CONTENT_TYPES[row.format] ??
      opened.contentType ??
      "application/octet-stream",
    "Content-Disposition": `attachment; filename="${exportDownloadFilename(row.format, version.versionNo)}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  if (opened.size !== null) headers.set("Content-Length", String(opened.size));
  return new NextResponse(opened.stream, { status: 200, headers });
}
