import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import { investigatorSession } from "@/lib/fraud-radar/investigator/route-helpers";
import { getInvestigatorStore } from "@/lib/fraud-radar/investigator/store";

/**
 * Fraud Radar Phase 7 — a turn's SSE event stream (PHASE7 §4.2,
 * the OI replay-then-live contract): replay the persisted events
 * after the `after` seq cursor, then follow the turn live via a
 * short poll of the persisted log until it settles. The persisted
 * turn is the source of truth — a client that never opens this
 * endpoint can poll the conversation instead, and stream and
 * history can never disagree. Owner-scoped like every route.
 */
export const dynamic = "force-dynamic";

const POLL_MS = 200;
const MAX_FOLLOW_MS = 25_000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; turnId: string }> },
) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const session = await investigatorSession();
  if (!session) {
    return NextResponse.json(
      { error: "Sign in to use the investigator.", code: "SIGN_IN_REQUIRED" },
      { status: 401 },
    );
  }
  const { id, turnId } = await params;
  const store = getInvestigatorStore();
  const conversation = await store.getConversation(session.userId, id);
  if (!conversation) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const turn = await store.getMessage(turnId);
  if (!turn || turn.conversationId !== id || turn.role !== "assistant") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const after = Math.max(
    0,
    Number.parseInt(req.nextUrl.searchParams.get("after") ?? "0", 10) || 0,
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let cursor = after;
      const deadline = Date.now() + MAX_FOLLOW_MS;
      try {
        for (;;) {
          const current = await store.getMessage(turnId);
          if (!current) break;
          for (const event of current.events) {
            if (event.seq > cursor) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
              );
              cursor = event.seq;
            }
          }
          if (current.status !== "running") break;
          if (Date.now() > deadline) break;
          await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        }
      } catch {
        // A failed read ends the stream; the persisted turn stays
        // the source of truth and the client can reconnect.
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
