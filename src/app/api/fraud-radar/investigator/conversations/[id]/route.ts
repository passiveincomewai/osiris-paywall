import { NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  investigatorSession,
  serializeConversation,
  serializeMessage,
} from "@/lib/fraud-radar/investigator/route-helpers";
import { getInvestigatorStore } from "@/lib/fraud-radar/investigator/store";

/**
 * Fraud Radar Phase 7 — one investigator conversation + its
 * messages (PHASE7 §4.2, §3.5). A conversation id belonging to
 * another user returns 404, not 403 — existence is not leaked.
 * DELETE is a hard delete (messages cascade).
 */
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const { id } = await params;
  const store = getInvestigatorStore();
  const conversation = await store.getConversation(session.userId, id);
  if (!conversation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const messages = await store.listMessages(id);
  return NextResponse.json({
    conversation: serializeConversation(conversation),
    messages: messages.map(serializeMessage),
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const { id } = await params;
  const deleted = await getInvestigatorStore().deleteConversation(
    session.userId,
    id,
  );
  if (!deleted) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
