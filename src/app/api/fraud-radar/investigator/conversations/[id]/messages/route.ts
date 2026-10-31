import { NextRequest, NextResponse } from "next/server";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  fraudRadarTierOf,
  quotaForTier,
} from "@/lib/fraud-radar/investigator/entitlements";
import { startInvestigatorTurn } from "@/lib/fraud-radar/investigator/engine";
import { createGeminiAdapter } from "@/lib/fraud-radar/investigator/gemini";
import { INVESTIGATOR_NOT_CONFIGURED_TEXT } from "@/lib/fraud-radar/investigator/guardrails";
import { investigatorSession } from "@/lib/fraud-radar/investigator/route-helpers";
import { getInvestigatorStore } from "@/lib/fraud-radar/investigator/store";
import { getUsageSummary } from "@/lib/fraud-radar/investigator/usage";
import { getClientIp, isRateLimited } from "@/lib/ssrf-guard";

/**
 * Fraud Radar Phase 7 — start an investigator turn (PHASE7 §4.2).
 * Check order (§4.2): flag → session → ownership → rate limits →
 * entitlement + quota → model availability → work. The turn runs
 * server-side against the DB-persisted conversation; this route
 * returns its id and the SSE events endpoint follows it. With no
 * model key configured the turn is refused 503 before any charge
 * — the honest unavailable state (§4.5), never a fake answer.
 */
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
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

  // Rate ceilings (§4.3): per-IP 20/window, per-user burst 10/hour.
  if (isRateLimited(getClientIp(req), 20)) {
    return NextResponse.json(
      { error: "Too many requests. Give it a little while.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  if (isRateLimited(`fr:investigator:${session.userId}`, 10, 3_600_000)) {
    return NextResponse.json(
      {
        error: "You have started a lot of investigator turns this hour. Give it a little while.",
        code: "RATE_LIMITED",
      },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  let body: { content?: unknown };
  try {
    body = (await req.json()) as { content?: unknown };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body.", code: "INVALID_BODY" },
      { status: 400 },
    );
  }
  const content =
    typeof body?.content === "string" ? body.content.trim() : "";
  if (content.length === 0 || content.length > 4000) {
    return NextResponse.json(
      { error: "Message content must be 1–4000 characters.", code: "INVALID_CONTENT" },
      { status: 400 },
    );
  }

  const tier = fraudRadarTierOf(session.session);
  const quota = quotaForTier(tier);
  if (!quota) {
    return NextResponse.json(
      { error: "The investigator is not included in your plan.", code: "FR_AI_TIER_REQUIRED" },
      { status: 403 },
    );
  }
  const usage = await getUsageSummary(store, session.userId, tier);
  if (usage.used >= usage.limit) {
    return NextResponse.json(
      {
        error: "Your monthly investigator quota is used up.",
        code: "FR_AI_QUOTA_EXCEEDED",
        resetAt: usage.resetAt,
      },
      { status: 429 },
    );
  }

  const adapter = createGeminiAdapter();
  if (!adapter) {
    return NextResponse.json(
      { error: INVESTIGATOR_NOT_CONFIGURED_TEXT, code: "AI_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const { turnId } = await startInvestigatorTurn(
    { store, adapter },
    {
      userId: session.userId,
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      userText: content,
      tier,
    },
  );
  return NextResponse.json(
    { turnId, conversationId: conversation.id },
    { status: 202 },
  );
}
