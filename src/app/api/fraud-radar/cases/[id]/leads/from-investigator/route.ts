import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  caseSession,
  loadCaseForRoute,
  notFound,
  serializeLead,
  signInRequired,
} from "@/lib/fraud-radar/cases/route-helpers";
import { getCaseStore } from "@/lib/fraud-radar/cases/store";
import {
  LeadCaptureError,
  pinInvestigatorLead,
} from "@/lib/fraud-radar/cases/leads";

/**
 * Fraud Radar Phase 8 — pin an investigator finding as a lead
 * (PHASE8 §1.3 rule 5). The client submits ids only; the server
 * reads the persisted message, ownership-checked against the
 * pinning user. Pasted answer text is never accepted. A foreign
 * conversation/message reads as 404, like a foreign case.
 */
export const dynamic = "force-dynamic";

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
  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId : "";
  const messageId = typeof body.messageId === "string" ? body.messageId : "";
  if (!conversationId || !messageId) {
    return NextResponse.json(
      { error: "conversationId and messageId are required", code: "INVALID_INPUT" },
      { status: 400 },
    );
  }
  const annotation =
    typeof body.annotation === "string" ? body.annotation.slice(0, 10_000) : null;
  try {
    const result = await pinInvestigatorLead(getCaseStore(), {
      caseId: id,
      pinnedById: session.userId,
      conversationId,
      messageId,
      annotation,
    });
    return NextResponse.json(
      { lead: serializeLead(result.lead), created: result.created },
      { status: result.created ? 201 : 200 },
    );
  } catch (err) {
    if (err instanceof LeadCaptureError) {
      return NextResponse.json(
        { error: err.message, code: err.code.toUpperCase() },
        { status: 404 },
      );
    }
    throw err;
  }
}
