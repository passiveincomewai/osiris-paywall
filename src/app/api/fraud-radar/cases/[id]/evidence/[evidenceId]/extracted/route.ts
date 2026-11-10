import { NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import { openVaultStream } from "@/lib/fraud-radar/cases/vault";

/**
 * Fraud Radar Phase 8 — extracted-text download (PHASE8 §2.5,
 * §3.5). The §3 extraction JSON inherits the evidence item's
 * access control in full: same check order, same gated
 * streaming, same no-URL discipline as the download route. An
 * item with no extraction returns 404 — an honest absence,
 * never an empty fabricated document.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; evidenceId: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id, evidenceId } = await params;
  const found = await loadCaseForRoute(session.userId, id);
  if (!found) return notFound();
  const row = await getCaseStore().getEvidence(id, evidenceId);
  if (!row || row.storageState !== "present" || !row.extractedTextPathname) {
    return notFound();
  }
  const opened = await openVaultStream(row.extractedTextPathname);
  if (!opened) return notFound();
  const headers = new Headers({
    "Content-Type": "application/json",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  if (opened.size !== null) headers.set("Content-Length", String(opened.size));
  return new NextResponse(opened.stream, { status: 200, headers });
}
