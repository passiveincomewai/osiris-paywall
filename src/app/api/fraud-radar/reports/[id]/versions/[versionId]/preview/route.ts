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
  openReportStream,
  reportPreviewPathname,
} from "@/lib/fraud-radar/reports/blob";

/**
 * Fraud Radar Phase 9 — generated-report preview (PHASE9
 * §4.3, §5.2). Serves the worker-produced preview HTML for a
 * GENERATED version: the exact HTML the PDF renderer consumes,
 * stored beside the canonical document under the report's
 * Blob prefix. This is a post-generation view, labelled as
 * such in the UI — never a pre-export proof (the SHV-9 cut
 * defers the live preview step, §7.2).
 *
 * Check order (§5.4): flag (404) → session (401) → report
 * ownership (404) → version belongs to the report (404) →
 * version generated with a passing validation (404 — an
 * ungenerated or failed version has no preview) → stream.
 * The HTML is served sandboxed (CSP `sandbox` with no
 * script allowance), `private, no-store`, never as a Blob
 * URL and never framed by third parties (nosniff +
 * frame-ancestors 'none' beyond the owner's own builder
 * iframe, which embeds it same-origin).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  const version = await getReportStore().getVersion(report.id, versionId);
  if (
    !version ||
    !version.contentSha256 ||
    !version.validationVerdict ||
    !version.validationVerdict.startsWith("pass")
  ) {
    return notFound();
  }
  let pathname: string;
  try {
    pathname = reportPreviewPathname(report.ownerId, report.id, version.id);
  } catch {
    return notFound();
  }
  const opened = await openReportStream(pathname);
  if (!opened) return notFound();
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Content-Security-Policy":
      "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'self'",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  if (opened.size !== null) headers.set("Content-Length", String(opened.size));
  return new NextResponse(opened.stream, { status: 200, headers });
}
