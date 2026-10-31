/**
 * Fraud Radar Phase 7 — shared API-route helpers: the signed-in
 * session resolution and the wire serialisation of store records.
 * Route order of checks is fixed by PHASE7 §4.2 and implemented
 * in each route: flag (404) → session (401) → ownership (404) →
 * entitlement + quota (403/429) → work.
 */

import { auth } from "@/auth";
import type { SessionLike } from "./entitlements";
import type { ConversationRecord, MessageRecord } from "./store";

export interface InvestigatorSession {
  userId: string;
  email: string | null;
  session: SessionLike;
}

/** The signed-in user, or null (routes answer 401). Platform-funded
 *  only: there is no bring-your-own-key path (§1.2). */
export async function investigatorSession(): Promise<InvestigatorSession | null> {
  const session = (await auth().catch(() => null)) as SessionLike | null;
  const userId = session?.user?.id ?? null;
  if (!userId) return null;
  return { userId, email: session?.user?.email ?? null, session: session as SessionLike };
}

export function serializeConversation(conv: ConversationRecord) {
  return {
    id: conv.id,
    title: conv.title,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
  };
}

export function serializeMessage(message: MessageRecord) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    toolCalls: message.toolCalls,
    model: message.model,
    promptVersion: message.promptVersion,
    inputTokens: message.inputTokens,
    outputTokens: message.outputTokens,
    validatorVerdict: message.validatorVerdict,
    status: message.status,
    errorCode: message.errorCode,
    createdAt: message.createdAt.toISOString(),
  };
}
