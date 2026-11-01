import { NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  serializeVerification,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import {
  runClaimVerification,
  VerificationQuotaError,
} from "@/lib/fraud-radar/cases/claims";
import { caseEntitlementsForSession } from "@/lib/fraud-radar/cases/entitlements";

/**
 * Fraud Radar Phase 8 — run claim verification (PHASE8 §5.2,
 * §4.1 step 2). Synchronous v1: the checker runs against the
 * published corpus through the Phase 7 tool registry and the
 * new FrClaimVerification row is the response. An over-budget
 * run still completes — as an insufficient-data verdict with
 * the honest "check did not complete" reason (§4.1) — it never
 * hangs. Verification runs are the metered unit (§5.3): the
 * monthly count is derived from the verification rows.
 * Check order: flag (404) → session (401) → case access (404)
 * → claim through its case (404) → quota (429) → work.
 */
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; claimId: string }> },
) {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id, claimId } = await params;
  const found = await loadCaseForRoute(session.userId, id, { write: true });
  if (!found) return notFound();
  const store = getCaseStore();
  const claim = await store.getClaim(id, claimId);
  if (!claim) return notFound();
  const { entitlements } = caseEntitlementsForSession(session.session);
  try {
    const verification = await runClaimVerification(store, {
      caseRow: found.caseRow,
      claim,
      actorId: session.userId,
      entitlements,
    });
    return NextResponse.json(
      { verification: serializeVerification(verification) },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof VerificationQuotaError) {
      return NextResponse.json(
        {
          error: `claim verification limit reached (${err.limit} per month); it resets ${err.resetAt.toISOString()}`,
          code: "VERIFICATION_LIMIT",
          limit: err.limit,
          resetAt: err.resetAt.toISOString(),
        },
        { status: 429 },
      );
    }
    throw err;
  }
}
