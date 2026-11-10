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

/**
 * Fraud Radar Phase 8 — one case claim (PHASE8 §5.2). The claim
 * is always loaded THROUGH its case, never by its own id alone.
 * DELETE removes the claim (its verification rows cascade with
 * it, per the schema); verification rows themselves have no
 * delete or update route — they are append-only (§1.6).
 */
export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; claimId: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id, claimId } = await params;
  const found = await loadCaseForRoute(session.userId, id, { write: true });
  if (!found) return notFound();
  const store = getCaseStore();
  const claim = await store.getClaim(id, claimId);
  if (!claim) return notFound();
  await store.deleteClaim(id, claimId);
  return NextResponse.json({ ok: true });
}
