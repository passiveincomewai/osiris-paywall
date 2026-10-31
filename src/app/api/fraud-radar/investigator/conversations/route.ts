import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  investigatorSession,
  serializeConversation,
} from "@/lib/fraud-radar/investigator/route-helpers";
import { getInvestigatorStore } from "@/lib/fraud-radar/investigator/store";

/**
 * Fraud Radar Phase 7 — investigator conversations collection
 * (PHASE7 §4.2). Flag-gated like every Fraud Radar route: with
 * FRAUD_RADAR_ENABLED off this is a 404, indistinguishable from
 * the route not existing. Owner-scoped: a caller only ever sees
 * their own conversations (§3.5 tenant isolation).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!fraudRadarEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const session = await investigatorSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in to use the investigator.", code: "SIGN_IN_REQUIRED" },
      { status: 401 },
    );
  }
  const conversations = await getInvestigatorStore().listConversations(
    session.userId,
  );
  return NextResponse.json({
    conversations: conversations.map(serializeConversation),
  });
}

export async function POST(req: NextRequest) {
  if (!fraudRadarEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const session = await investigatorSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in to use the investigator.", code: "SIGN_IN_REQUIRED" },
      { status: 401 },
    );
  }
  let title = "New conversation";
  try {
    const body = (await req.json()) as { title?: unknown };
    if (typeof body?.title === "string" && body.title.trim().length > 0) {
      title = body.title.trim().slice(0, 120);
    }
  } catch {
    // An empty body is fine — the default title applies.
  }
  const conversation = await getInvestigatorStore().createConversation(
    session.userId,
    title,
  );
  return NextResponse.json(
    { conversation: serializeConversation(conversation) },
    { status: 201 },
  );
}
