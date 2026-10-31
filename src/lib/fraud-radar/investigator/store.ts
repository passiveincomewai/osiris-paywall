/**
 * Fraud Radar Phase 7 — investigator persistence (PHASE7 §3.5,
 * §4.2, §4.4).
 *
 * One store interface over the three additive models
 * (FrInvestigatorConversation / FrInvestigatorMessage /
 * FrInvestigatorUsageLedger). The production implementation is
 * Prisma; tests use the in-memory implementation exported here,
 * so engine and route behaviour are proven without a database.
 * Turn state is DB-persisted (the assistant message row plus its
 * event log), never an in-memory run store — quota, audit, and
 * validator records must survive the request.
 *
 * Ownership is enforced by callers filtering on userId; the
 * store's conversation reads take the userId explicitly so a
 * foreign id cannot be read through this layer by accident.
 */

import { db } from "@/lib/db";
import type { ToolResult } from "./citations";

export interface TurnEvent {
  seq: number;
  t: string;
  [key: string]: unknown;
}

export interface ConversationRecord {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  toolCalls: ToolResult[] | null;
  model: string | null;
  promptVersion: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  validatorVerdict: string | null;
  /** complete | running | error */
  status: string;
  errorCode: string | null;
  events: TurnEvent[];
  createdAt: Date;
}

export interface LedgerRecord {
  id: string;
  userId: string;
  conversationId: string;
  turnId: string;
  tier: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  toolCallCount: number;
  estimatedCostUsd: number;
  /** charged | refunded | failed_free */
  status: string;
  validatorVerdict: string | null;
  createdAt: Date;
}

export interface NewMessage {
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolResult[] | null;
  model?: string | null;
  promptVersion?: string | null;
  status?: string;
}

export interface InvestigatorStore {
  createConversation(userId: string, title: string): Promise<ConversationRecord>;
  listConversations(userId: string): Promise<ConversationRecord[]>;
  /** Owner-scoped: another user's conversation reads as null. */
  getConversation(userId: string, id: string): Promise<ConversationRecord | null>;
  updateConversationTitle(id: string, title: string): Promise<void>;
  /** Owner-scoped hard delete (messages cascade). */
  deleteConversation(userId: string, id: string): Promise<boolean>;
  listMessages(conversationId: string): Promise<MessageRecord[]>;
  getMessage(id: string): Promise<MessageRecord | null>;
  appendMessage(data: NewMessage): Promise<MessageRecord>;
  updateMessage(id: string, patch: Partial<MessageRecord>): Promise<void>;
  /** Append to the turn's persisted event log; assigns the seq. */
  appendEvent(messageId: string, event: Omit<TurnEvent, "seq">): Promise<TurnEvent>;
  createLedger(data: Omit<LedgerRecord, "id" | "createdAt">): Promise<LedgerRecord>;
  updateLedgerByTurn(turnId: string, patch: Partial<LedgerRecord>): Promise<void>;
  getLedgerByTurn(turnId: string): Promise<LedgerRecord | null>;
  /** Charged ops in [start, end) — the quota source of truth. */
  countChargedOps(userId: string, start: Date, end: Date): Promise<number>;
}

// ---------------------------------------------------------------------------
// Prisma implementation.
// ---------------------------------------------------------------------------

type PrismaMessage = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  toolCalls: unknown;
  model: string | null;
  promptVersion: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  validatorVerdict: string | null;
  status: string;
  errorCode: string | null;
  events: unknown;
  createdAt: Date;
};

function toMessage(row: PrismaMessage): MessageRecord {
  return {
    id: row.id,
    conversationId: row.conversationId,
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    toolCalls: (row.toolCalls as ToolResult[] | null) ?? null,
    model: row.model,
    promptVersion: row.promptVersion,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    validatorVerdict: row.validatorVerdict,
    status: row.status,
    errorCode: row.errorCode,
    events: Array.isArray(row.events) ? (row.events as TurnEvent[]) : [],
    createdAt: row.createdAt,
  };
}

export function createPrismaStore(): InvestigatorStore {
  return {
    async createConversation(userId, title) {
      const row = await db.frInvestigatorConversation.create({
        data: { userId, title },
      });
      return row;
    },
    async listConversations(userId) {
      return db.frInvestigatorConversation.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
    },
    async getConversation(userId, id) {
      return db.frInvestigatorConversation.findFirst({ where: { id, userId } });
    },
    async updateConversationTitle(id, title) {
      await db.frInvestigatorConversation.update({ where: { id }, data: { title } });
    },
    async deleteConversation(userId, id) {
      const res = await db.frInvestigatorConversation.deleteMany({
        where: { id, userId },
      });
      return res.count > 0;
    },
    async listMessages(conversationId) {
      const rows = await db.frInvestigatorMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(toMessage);
    },
    async getMessage(id) {
      const row = await db.frInvestigatorMessage.findUnique({ where: { id } });
      return row ? toMessage(row) : null;
    },
    async appendMessage(data) {
      const row = await db.frInvestigatorMessage.create({
        data: {
          conversationId: data.conversationId,
          role: data.role,
          content: data.content,
          toolCalls: (data.toolCalls ?? undefined) as never,
          model: data.model ?? null,
          promptVersion: data.promptVersion ?? null,
          status: data.status ?? "complete",
          events: [],
        },
      });
      return toMessage(row);
    },
    async updateMessage(id, patch) {
      const { id: _id, conversationId: _c, createdAt: _t, events: _e, ...rest } =
        patch as Partial<MessageRecord> & Record<string, unknown>;
      void _id; void _c; void _t; void _e;
      await db.frInvestigatorMessage.update({
        where: { id },
        data: rest as never,
      });
    },
    async appendEvent(messageId, event) {
      // Read-modify-write inside a transaction: the event log is
      // append-only and turns are single-writer by construction.
      return db.$transaction(async (tx) => {
        const row = await tx.frInvestigatorMessage.findUnique({
          where: { id: messageId },
        });
        if (!row) throw new Error(`turn message not found: ${messageId}`);
        const events = Array.isArray(row.events)
          ? (row.events as TurnEvent[])
          : [];
        const stamped = { ...event, seq: events.length + 1 } as TurnEvent;
        await tx.frInvestigatorMessage.update({
          where: { id: messageId },
          data: { events: [...events, stamped] as never },
        });
        return stamped;
      });
    },
    async createLedger(data) {
      const row = await db.frInvestigatorUsageLedger.create({
        data: {
          userId: data.userId,
          conversationId: data.conversationId,
          turnId: data.turnId,
          tier: data.tier,
          model: data.model,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          toolCallCount: data.toolCallCount,
          estimatedCostUsd: data.estimatedCostUsd,
          status: data.status,
          validatorVerdict: data.validatorVerdict,
        },
      });
      return { ...row, estimatedCostUsd: Number(row.estimatedCostUsd) };
    },
    async updateLedgerByTurn(turnId, patch) {
      const { id: _id, turnId: _t, createdAt: _c, ...rest } =
        patch as Partial<LedgerRecord> & Record<string, unknown>;
      void _id; void _t; void _c;
      await db.frInvestigatorUsageLedger.update({
        where: { turnId },
        data: rest as never,
      });
    },
    async getLedgerByTurn(turnId) {
      const row = await db.frInvestigatorUsageLedger.findUnique({
        where: { turnId },
      });
      return row ? { ...row, estimatedCostUsd: Number(row.estimatedCostUsd) } : null;
    },
    async countChargedOps(userId, start, end) {
      return db.frInvestigatorUsageLedger.count({
        where: { userId, status: "charged", createdAt: { gte: start, lt: end } },
      });
    },
  };
}

let cached: InvestigatorStore | null = null;

/** The process-wide store (routes + engine share one instance). */
export function getInvestigatorStore(): InvestigatorStore {
  if (!cached) cached = createPrismaStore();
  return cached;
}

// ---------------------------------------------------------------------------
// In-memory implementation (tests; also the engine's fixture store).
// ---------------------------------------------------------------------------

export function createInMemoryStore(): InvestigatorStore {
  let counter = 0;
  const nextId = (prefix: string) => `${prefix}_${++counter}`;
  const conversations = new Map<string, ConversationRecord>();
  const messages = new Map<string, MessageRecord>();
  const ledger = new Map<string, LedgerRecord>();
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  const asDates = (m: MessageRecord): MessageRecord => ({
    ...clone(m),
    createdAt: new Date(m.createdAt),
  });

  return {
    async createConversation(userId, title) {
      const now = new Date();
      const row: ConversationRecord = {
        id: nextId("conv"),
        userId,
        title,
        createdAt: now,
        updatedAt: now,
      };
      conversations.set(row.id, row);
      return { ...row };
    },
    async listConversations(userId) {
      return [...conversations.values()]
        .filter((c) => c.userId === userId)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .map((c) => ({ ...c }));
    },
    async getConversation(userId, id) {
      const row = conversations.get(id);
      return row && row.userId === userId ? { ...row } : null;
    },
    async updateConversationTitle(id, title) {
      const row = conversations.get(id);
      if (row) {
        row.title = title;
        row.updatedAt = new Date();
      }
    },
    async deleteConversation(userId, id) {
      const row = conversations.get(id);
      if (!row || row.userId !== userId) return false;
      conversations.delete(id);
      for (const [mid, m] of messages) {
        if (m.conversationId === id) messages.delete(mid);
      }
      return true;
    },
    async listMessages(conversationId) {
      // Map iteration is insertion order — the append order.
      return [...messages.values()]
        .filter((m) => m.conversationId === conversationId)
        .map(asDates);
    },
    async getMessage(id) {
      const row = messages.get(id);
      return row ? asDates(row) : null;
    },
    async appendMessage(data) {
      const row: MessageRecord = {
        id: nextId("msg"),
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        toolCalls: data.toolCalls ? clone(data.toolCalls) : null,
        model: data.model ?? null,
        promptVersion: data.promptVersion ?? null,
        inputTokens: null,
        outputTokens: null,
        validatorVerdict: null,
        status: data.status ?? "complete",
        errorCode: null,
        events: [],
        createdAt: new Date(),
      };
      messages.set(row.id, row);
      const conv = conversations.get(data.conversationId);
      if (conv) conv.updatedAt = new Date();
      return asDates(row);
    },
    async updateMessage(id, patch) {
      const row = messages.get(id);
      if (!row) return;
      const { events: _e, ...rest } = patch;
      void _e;
      Object.assign(row, clone(rest));
    },
    async appendEvent(messageId, event) {
      const row = messages.get(messageId);
      if (!row) throw new Error(`turn message not found: ${messageId}`);
      const stamped = { ...clone(event), seq: row.events.length + 1 } as TurnEvent;
      row.events.push(stamped);
      return { ...stamped };
    },
    async createLedger(data) {
      const row: LedgerRecord = {
        ...clone(data),
        id: nextId("led"),
        createdAt: new Date(),
      };
      ledger.set(row.turnId, row);
      return { ...row };
    },
    async updateLedgerByTurn(turnId, patch) {
      const row = ledger.get(turnId);
      if (row) Object.assign(row, clone(patch));
    },
    async getLedgerByTurn(turnId) {
      const row = ledger.get(turnId);
      return row ? { ...row } : null;
    },
    async countChargedOps(userId, start, end) {
      return [...ledger.values()].filter(
        (r) =>
          r.userId === userId &&
          r.status === "charged" &&
          r.createdAt >= start &&
          r.createdAt < end,
      ).length;
    },
  };
}
