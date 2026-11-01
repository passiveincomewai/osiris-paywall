import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  caseSession,
  notFound,
  serializeCase,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import { createCaseForUser, CaseQuotaError } from "@/lib/fraud-radar/cases/cases";
import { caseEntitlementsForSession } from "@/lib/fraud-radar/cases/entitlements";

/**
 * Fraud Radar Phase 8 — cases collection (PHASE8 §5.2).
 * Flag-gated like every Fraud Radar route: with
 * FRAUD_RADAR_ENABLED off this is a 404, indistinguishable from
 * the route not existing. Owner-scoped: a caller only ever sees
 * their own cases (§1.5 tenant isolation).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  const cases = await getCaseStore().listCases(session.userId);
  return NextResponse.json({ cases: cases.map(serializeCase) });
}

export async function POST(req: NextRequest) {
  if (!fraudRadarEnabled()) return notFound();
  const session = await caseSession();
  if (!session) return signInRequired();
  let body: { title?: unknown; summary?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    /* validated below */
  }
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 200) {
    return NextResponse.json(
      { error: "a case title of 1–200 characters is required", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  const summary =
    typeof body.summary === "string" ? body.summary.slice(0, 10_000) : null;
  const { entitlements } = caseEntitlementsForSession(session.session);
  try {
    const created = await createCaseForUser(getCaseStore(), {
      ownerId: session.userId,
      title,
      summary,
      entitlements,
    });
    return NextResponse.json({ case: serializeCase(created) }, { status: 201 });
  } catch (err) {
    if (err instanceof CaseQuotaError) {
      return NextResponse.json(
        {
          error: `open case limit reached (${err.limit})`,
          code: "CASE_LIMIT",
          limit: err.limit,
        },
        { status: 429 },
      );
    }
    throw err;
  }
}
