import { NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  caseSession,
  notFound,
  signInRequired,
} from "@/lib/fraud-radar/reports/route-helpers";
import { getReportStore } from "@/lib/fraud-radar/reports/store";
import { reportEntitlementsForSession } from "@/lib/fraud-radar/reports/entitlements";

/**
 * Fraud Radar Phase 9 — the caller's report entitlement
 * posture (PHASE9 §5.2, §5.3). Every figure is derived from
 * the tables (report rows, generation-job rows, export rows
 * are the counters), never client-counted — the §5.4.6-style
 * reconciliation the acceptance criteria pin.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const store = getReportStore();
  const { tier, entitlements } = reportEntitlementsForSession(session.session);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const [reports, generations, exportBytes] = await Promise.all([
    store.countReports(session.userId),
    store.countGenerationJobsInRange(session.userId, monthStart, nextMonth),
    store.sumExportBytesInRange(session.userId, monthStart, nextMonth),
  ]);
  return NextResponse.json({
    tier,
    reportsUsed: reports,
    maxReports: entitlements?.maxReports ?? null,
    generationsThisMonth: generations,
    generationsPerMonth: entitlements?.generationsPerMonth ?? null,
    exportBytesThisMonth: exportBytes.toString(),
    maxExportBytesPerMonth: entitlements
      ? entitlements.maxExportBytesPerMonth.toString()
      : null,
    templates: entitlements?.templates ?? null,
    zipIncludesEvidence: entitlements?.zipIncludesEvidence ?? false,
    resetAt: nextMonth.toISOString(),
  });
}
