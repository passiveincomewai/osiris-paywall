import { NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  serializeVerification,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";

/**
 * Fraud Radar Phase 8 — verification history (PHASE8 §5.2,
 * §4.1 step 3). Append-only: this list is the whole surface —
 * there is no route that edits or deletes a verification row,
 * so a changed verdict across a corpus refresh shows both
 * runs, oldest first, each with its corpus vintages and
 * checker version. The claim resolves through its case.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; claimId: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id, claimId } = await params;
  const found = await loadCaseForRoute(session.userId, id);
  if (!found) return notFound();
  const store = getCaseStore();
  const claim = await store.getClaim(id, claimId);
  if (!claim) return notFound();
  const verifications = await store.listVerifications(id, claimId);
  return NextResponse.json({
    verifications: verifications.map(serializeVerification),
  });
}
