import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  serializeClaim,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import { createClaimForUser } from "@/lib/fraud-radar/cases/claims";
import { LEAD_ENGINES } from "@/lib/fraud-radar/cases/leads";

/**
 * Fraud Radar Phase 8 — case claims (PHASE8 §5.2, §4.1 step 1).
 * A claim is the user's own statement, stored verbatim; the
 * system never rewrites it. Claims live only inside cases —
 * there is no free-floating claim checker. Verification runs
 * are POST …/claims/[claimId]/verify; the history is GET
 * …/claims/[claimId]/verifications (append-only).
 */
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id } = await params;
  const found = await loadCaseForRoute(session.userId, id);
  if (!found) return notFound();
  const claims = await getCaseStore().listClaims(id);
  return NextResponse.json({ claims: claims.map(serializeClaim) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const { id } = await params;
  const found = await loadCaseForRoute(session.userId, id, { write: true });
  if (!found) return notFound();
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* validated below */
  }
  const statement = typeof body.statement === "string" ? body.statement : "";
  if (!statement.trim() || statement.length > 10_000) {
    return NextResponse.json(
      { error: "a claim statement of 1–10000 characters is required", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  const subjectEngine =
    typeof body.subjectEngine === "string" ? body.subjectEngine : null;
  if (
    subjectEngine !== null &&
    !(LEAD_ENGINES as readonly string[]).includes(subjectEngine)
  ) {
    return NextResponse.json(
      { error: `unknown subject engine: ${subjectEngine}`, code: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  const subjectEntityKey =
    typeof body.subjectEntityKey === "string" ? body.subjectEntityKey : null;
  if (
    body.subjectEntityKey !== undefined &&
    body.subjectEntityKey !== null &&
    (subjectEntityKey === null || subjectEntityKey.length > 120)
  ) {
    return NextResponse.json(
      { error: "subjectEntityKey must be a short identifier string", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  const claim = await createClaimForUser(getCaseStore(), {
    caseId: id,
    actorId: session.userId,
    statement,
    subjectEngine,
    subjectEntityKey,
  });
  return NextResponse.json({ claim: serializeClaim(claim) }, { status: 201 });
}
