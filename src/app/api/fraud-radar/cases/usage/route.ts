import { NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  caseSession,
  notFound,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import { caseEntitlementsForSession } from "@/lib/fraud-radar/cases/entitlements";

/**
 * Fraud Radar Phase 8 — the caller's case entitlement posture
 * (PHASE8 §5.2, §5.3). Every figure is derived from the tables
 * (the cases/evidence/verification rows are the counters),
 * never client-counted.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const store = getCaseStore();
  const { tier, entitlements } = caseEntitlementsForSession(session.session);
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const [openCases, storageBytes, verifications] = await Promise.all([
    store.countOpenCases(session.userId),
    store.sumEvidenceBytes(session.userId),
    store.countVerificationsInRange(session.userId, monthStart, nextMonth),
  ]);
  return NextResponse.json({
    tier,
    openCases,
    maxOpenCases: entitlements?.maxOpenCases ?? null,
    vaultEnabled: entitlements?.storage.vaultEnabled ?? false,
    storageBytesUsed: storageBytes.toString(),
    maxVaultBytes: entitlements ? entitlements.storage.maxVaultBytes.toString() : null,
    verificationsThisMonth: verifications,
    verificationsPerMonth: entitlements?.verificationsPerMonth ?? null,
    resetAt: nextMonth.toISOString(),
  });
}
