/**
 * Fraud Radar Phase 7 — the investigator conversation engine
 * (PHASE7 §4.2–§4.6).
 *
 * The tool-call loop over the P7-A registry, behind the narrow
 * ModelAdapter interface. Per turn:
 *   assemble context (last 20 messages; citations never cross
 *   turns — a follow-up re-calls the tool) → model calls with
 *   function declarations generated from the registry → tools
 *   execute server-side → the draft is checked by the §2.4
 *   validator → on failure, ONE regeneration naming the offending
 *   tokens → on a second failure, the labelled code-rendered
 *   results table (never unverified prose).
 * The turn's conversation rows, messages, tool outputs (the
 * citation record), event log, and usage-ledger settlement are
 * persisted through the store as the turn runs; the ledger is
 * charged before the turn starts and refunded on any failure
 * (§4.4). Hard ceilings (§4.3) are enforced here in code.
 *
 * Failure behaviour is §4.5: honest states only. There is no
 * heuristic fallback answer anywhere in this module.
 */

import {
  ModelProviderError,
  type AdapterMessage,
  type ModelAdapter,
  type ModelFunctionCall,
  type ModelStreamEvent,
} from "./adapter";
import {
  envelopeComplete,
  formatCitation,
  validateAnswer,
  type ToolResult,
} from "./citations";
import { quotaForTier, type FraudRadarTier } from "./entitlements";
import {
  REFERRAL_BLOCK,
  VALIDATOR_FALLBACK_NOTICE,
  accusationOpening,
} from "./guardrails";
import { PROMPT_VERSION, buildInvestigatorSystemPrompt } from "./prompt";
import type { InvestigatorStore, TurnEvent } from "./store";
import { chargeTurn, refundTurn, settleTurn } from "./usage";
import {
  ToolError,
  availableTools,
  executeTool,
  type ToolDeps,
} from "./tools";

export const TURN_DEADLINE_MS = 90_000;
export const MAX_OUTPUT_TOKENS = 3_000;
export const CONTEXT_MESSAGES = 20;

export type TurnErrorCode =
  | "AI_NOT_CONFIGURED"
  | "INVALID_KEY"
  | "QUOTA_EXHAUSTED"
  | "SAFETY_BLOCKED"
  | "PROVIDER_UNAVAILABLE"
  | "DEADLINE";

export interface TurnOutcome {
  status: "done" | "error";
  turnId: string;
  validatorVerdict: string | null;
  errorCode: TurnErrorCode | null;
}

export interface EngineDeps {
  store: InvestigatorStore;
  adapter: ModelAdapter;
  env?: Record<string, string | undefined>;
  toolDeps?: ToolDeps;
  /** Injectable clock (tests pin the deadline). */
  now?: () => number;
  deadlineMs?: number;
  /** Live-event sink in addition to the persisted event log. */
  onEvent?: (event: TurnEvent) => void;
}

// ---------------------------------------------------------------------------
// Accusation routing (§3.3): questions asking whether an entity
// did wrongdoing, for a probability of wrongdoing, for a ranking
// of wrongdoers, or for a guaranteed award are routed to the
// standing skeleton — a directive to the model for this turn,
// plus code-side assembly guarantees (opening + referral block)
// on the final text.
// ---------------------------------------------------------------------------

const ACCUSATION_PATTERNS: readonly RegExp[] = [
  /\bcommit(?:ted|ting|s)?\s+(?:\w+\s+)?fraud\b/i,
  /\bdefraud/i,
  /\bis\s+.+\s+fraudulent\b/i,
  /\bprobability\b[^.?!]*\b(?:fraud|wrongdoing|cheat)/i,
  /\bchances?\b[^.?!]*\b(?:fraud|caught|wrongdoing)/i,
  /\bworst\s+(?:fraud|offender)/i,
  /\brank\b[^.?!]*\bfraud/i,
  /\b(?:steal|stole|stolen)\b[^.?!]*\btaxpayer/i,
  /\billegally\s+billing\b/i,
  /\bhow much\b[^.?!]*\b(?:1\s?%|reward|award|do i get)\b/i,
  /\bguarantee\b[^.?!]*\b(?:reward|award|paid|get)\b/i,
];

export function isAccusationQuestion(text: string): boolean {
  return ACCUSATION_PATTERNS.some((re) => re.test(text));
}

/** Best-effort entity slot for the standing opening: the span
 *  between the question's auxiliary and its wrongdoing verb.
 *  Falls back to a neutral slot — the opening's substance (the
 *  records cannot establish wrongdoing) never depends on it. */
export function accusationEntitySlot(text: string): string {
  const match = text.match(
    /\b(?:did|does|has|is|was)\s+(.+?)\s+(?:commit|committing|defraud|defrauding|engage|steal|stole|illegally)\b/i,
  );
  const slot = match?.[1]?.trim().replace(/^the\s+/i, "");
  return slot && slot.length <= 80 ? slot : "the entity you asked about";
}

const ACCUSATION_DIRECTIVE = [
  "Standing pattern applies to this turn: the user is asking whether an entity did wrongdoing, or for a chance or an amount connected to reporting. Follow the accusation pattern in your instructions exactly: open with the standing opening sentence for the entity asked about, then the cited facts the tools return, then any research leads with their full provenance blocks and the standing sentence, then the referral block verbatim. Amounts appear only in the published framework text. Do not confirm, deny, or grade any wrongdoing.",
].join(" ");

// ---------------------------------------------------------------------------
// Code-rendered results (the ONLY code-composed turn output the
// design permits — §2.4 fallback and §4.5 deadline state: a
// labelled table of verified tool results, presented as results,
// not as prose).
// ---------------------------------------------------------------------------

export function renderResultsTable(results: ToolResult[], notice: string): string {
  const lines: string[] = [notice, ""];
  if (results.length === 0) {
    lines.push("No tool results were gathered in this turn.");
    return lines.join("\n");
  }
  for (const result of results) {
    lines.push(`### ${result.envelope.tool} — ${formatCitation(result.envelope)}`);
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(result.data, null, 2).slice(0, 4000));
    lines.push("```");
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

function fallbackNotice(): string {
  const notice = VALIDATOR_FALLBACK_NOTICE;
  return `${notice.charAt(0).toUpperCase()}${notice.slice(1)}.`;
}

const DEADLINE_NOTICE =
  "This turn ran past its time limit before a verified answer could be composed, so the verified results gathered are shown directly.";

// ---------------------------------------------------------------------------
// Tool-result cache (§4.6): memoised on tool + canonical args +
// dataset version. Artifact data is immutable per dataset
// version, so the version in the key invalidates by construction
// and no TTL is used. Bounded in-process LRU, shared across turns.
// ---------------------------------------------------------------------------

const toolCache = new Map<string, ToolResult>();
const TOOL_CACHE_MAX = 200;

function canonicalArgs(args: Record<string, unknown>): string {
  const sorted = Object.fromEntries(
    Object.entries(args).sort(([a], [b]) => a.localeCompare(b)),
  );
  return JSON.stringify(sorted);
}

export function clearToolCache(): void {
  toolCache.clear();
}

async function executeToolCached(
  call: ModelFunctionCall,
  deps: EngineDeps,
  turnCache: Map<string, ToolResult>,
): Promise<{ result: ToolResult; cached: boolean }> {
  const baseKey = `${call.name}:${canonicalArgs(call.args)}`;
  const local = turnCache.get(baseKey);
  if (local) return { result: local, cached: true };
  const result = await executeTool(call.name, call.args, deps.toolDeps ?? {});
  const versionedKey = `${baseKey}@${result.envelope.datasetVersion}`;
  const shared = toolCache.get(versionedKey);
  if (shared) {
    turnCache.set(baseKey, shared);
    return { result: shared, cached: true };
  }
  turnCache.set(baseKey, result);
  toolCache.set(versionedKey, result);
  if (toolCache.size > TOOL_CACHE_MAX) {
    const oldest = toolCache.keys().next().value;
    if (oldest) toolCache.delete(oldest);
  }
  return { result, cached: false };
}

// ---------------------------------------------------------------------------
// One model call, drained: text deltas are forwarded as turn
// events; the terminal function-calls event (if any) wins over
// any text the call also produced.
// ---------------------------------------------------------------------------

interface DrainedCall {
  text: string;
  calls: ModelFunctionCall[] | null;
  inputTokens: number;
  outputTokens: number;
}

async function drainCall(
  adapter: ModelAdapter,
  req: Parameters<ModelAdapter["call"]>[0],
  emit: (event: Omit<TurnEvent, "seq">) => Promise<void>,
): Promise<DrainedCall> {
  let text = "";
  let calls: ModelFunctionCall[] | null = null;
  let inputTokens = 0;
  let outputTokens = 0;
  const iterable: AsyncIterable<ModelStreamEvent> = adapter.call(req);
  for await (const event of iterable) {
    if (event.type === "text_delta") {
      text += event.text;
      await emit({ t: "text_delta", text: event.text });
    } else if (event.type === "usage") {
      inputTokens += event.inputTokens;
      outputTokens += event.outputTokens;
    } else if (event.type === "function_calls") {
      calls = event.calls;
    }
  }
  return { text, calls, inputTokens, outputTokens };
}

// ---------------------------------------------------------------------------
// The turn.
// ---------------------------------------------------------------------------

export async function runInvestigatorTurn(
  deps: EngineDeps,
  params: {
    userId: string;
    conversationId: string;
    /** The assistant message row created (and charged) at start. */
    turnId: string;
    userText: string;
    tier: FraudRadarTier;
  },
): Promise<TurnOutcome> {
  const { store, adapter } = deps;
  const env = deps.env ?? process.env;
  const now = deps.now ?? (() => Date.now());
  const deadline = now() + (deps.deadlineMs ?? TURN_DEADLINE_MS);
  const quota = quotaForTier(params.tier) ?? {
    maxRounds: 6,
    maxCallsPerTurn: 12,
    maxCallsPerRound: 4,
  };
  const emit = async (event: Omit<TurnEvent, "seq">): Promise<void> => {
    const stamped = await store.appendEvent(params.turnId, event);
    deps.onEvent?.(stamped);
  };

  const results: ToolResult[] = [];
  const turnCache = new Map<string, ToolResult>();
  let inputTokens = 0;
  let outputTokens = 0;
  let toolCallCount = 0;

  const fail = async (
    code: TurnErrorCode,
    message: string,
    verdict: string | null = null,
  ): Promise<TurnOutcome> => {
    await refundTurn(store, params.turnId, {
      inputTokens,
      outputTokens,
      toolCallCount,
      validatorVerdict: verdict,
    });
    await store.updateMessage(params.turnId, {
      status: "error",
      errorCode: code,
      content: "",
      toolCalls: results.length > 0 ? results : null,
      inputTokens,
      outputTokens,
      validatorVerdict: verdict,
    });
    await emit({ t: "turn_error", code, message });
    return { status: "error", turnId: params.turnId, validatorVerdict: verdict, errorCode: code };
  };

  try {
    await emit({ t: "turn_started", turnId: params.turnId });

    // Context: last 20 persisted messages; only this turn's tool
    // outputs are citable, so prior turns contribute their text
    // alone (§4.3 — citations never cross turns).
    const history = await store.listMessages(params.conversationId);
    const context: AdapterMessage[] = history
      .filter((m) => m.id !== params.turnId && m.status !== "error")
      .slice(-CONTEXT_MESSAGES)
      .filter((m) => m.content.trim().length > 0)
      .map((m) =>
        m.role === "user"
          ? { kind: "user" as const, text: m.content }
          : { kind: "assistant" as const, text: m.content },
      );
    // The current user message is already persisted by the start
    // path; if it is not the tail (direct engine calls), append it.
    const tail = context[context.length - 1];
    if (!tail || tail.kind !== "user" || tail.text !== params.userText) {
      context.push({ kind: "user", text: params.userText });
    }

    const accusation = isAccusationQuestion(params.userText);
    const system = buildInvestigatorSystemPrompt(env);
    const offered = availableTools(env).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as Record<string, unknown>,
    }));
    const directives = accusation ? [ACCUSATION_DIRECTIVE] : [];

    let messages: AdapterMessage[] = [...context];
    let draft: string | null = null;
    let rounds = 0;
    let forcedFinalAttempts = 0;

    // The tool-call loop (§4.3 ceilings enforced in code).
    for (;;) {
      if (now() > deadline) {
        const content = renderResultsTable(results, DEADLINE_NOTICE);
        await store.updateMessage(params.turnId, {
          status: "complete",
          content,
          toolCalls: results,
          inputTokens,
          outputTokens,
          validatorVerdict: "fallback",
        });
        await refundTurn(store, params.turnId, {
          inputTokens,
          outputTokens,
          toolCallCount,
          validatorVerdict: "fallback",
        });
        await emit({ t: "validation", verdict: "fallback" });
        await emit({ t: "turn_done", messageId: params.turnId, usage: { inputTokens, outputTokens } });
        return { status: "done", turnId: params.turnId, validatorVerdict: "fallback", errorCode: null };
      }
      const toolsEnabled = rounds < quota.maxRounds;
      const drained = await drainCall(
        adapter,
        {
          system,
          messages,
          tools: toolsEnabled ? offered : [],
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          directives:
            !toolsEnabled && rounds >= quota.maxRounds
              ? [
                  ...directives,
                  "Tool rounds are exhausted. Answer now from the tool results already gathered, or state plainly what you could not check. Do not guess.",
                ]
              : directives,
        },
        emit,
      );
      inputTokens += drained.inputTokens;
      outputTokens += drained.outputTokens;

      if (!drained.calls || drained.calls.length === 0) {
        draft = drained.text;
        break;
      }
      if (!toolsEnabled) {
        // Tools were disabled for this call (round ceiling); a
        // provider that still returns calls gets up to two forced
        // no-tools retries, then the turn fails honestly.
        forcedFinalAttempts += 1;
        if (forcedFinalAttempts > 2) {
          draft = drained.text || null;
          break;
        }
        messages = [
          ...messages,
          { kind: "tool_calls", calls: drained.calls },
          {
            kind: "tool_results",
            results: drained.calls.map((call) => ({
              name: call.name,
              response: {
                error: "tools_disabled",
                message: "Tool rounds are exhausted; answer with text from the results already gathered.",
              },
            })),
          },
        ];
        continue;
      }
      rounds += 1;
      const roundCalls = drained.calls.slice(0, quota.maxCallsPerRound);
      const dropped = drained.calls.length - roundCalls.length;
      messages = [...messages, { kind: "tool_calls", calls: drained.calls }];
      const responses: { name: string; response: Record<string, unknown> }[] = [];
      for (const call of roundCalls) {
        await emit({ t: "tool_call", tool: call.name, argsSummary: call.args });
        if (toolCallCount >= quota.maxCallsPerTurn) {
          responses.push({
            name: call.name,
            response: {
              error: "call_ceiling_reached",
              message: "The per-turn tool-call ceiling is reached; answer from the results already gathered.",
            },
          });
          continue;
        }
        try {
          const { result, cached } = await executeToolCached(call, deps, turnCache);
          if (!cached) toolCallCount += 1;
          if (!results.includes(result)) results.push(result);
          await emit({
            t: "tool_result",
            tool: call.name,
            citation: formatCitationOf(result),
            cached,
          });
          responses.push({
            name: call.name,
            response: { envelope: result.envelope, data: result.data as never },
          });
        } catch (err) {
          const code = err instanceof ToolError ? err.code : "tool_error";
          const message = err instanceof Error ? err.message : String(err);
          await emit({ t: "tool_result", tool: call.name, error: code });
          responses.push({ name: call.name, response: { error: code, message } });
        }
      }
      if (dropped > 0) {
        responses.push({
          name: roundCalls[roundCalls.length - 1]?.name ?? "unknown",
          response: {
            error: "round_call_cap",
            message: `${dropped} further call(s) in this round were dropped at the per-round cap.`,
          },
        });
      }
      messages = [...messages, { kind: "tool_results", results: responses }];
    }

    if (draft === null || draft.trim().length === 0) {
      return fail("PROVIDER_UNAVAILABLE", "the model returned no answer text");
    }

    // §3.3 code-side assembly: the standing opening and the
    // verbatim referral block are guaranteed present on an
    // accusation turn, whoever drafted the middle.
    let answer = draft;
    if (accusation) {
      if (!/cannot establish whether/i.test(answer)) {
        answer = `${accusationOpening(accusationEntitySlot(params.userText))}\n\n${answer}`;
      }
      if (!answer.includes("america.gov/fraud")) {
        answer = `${answer}\n\n${REFERRAL_BLOCK}`;
      }
    }

    // §2.4 validator: pass, one regeneration, or the fallback.
    let verdict = validateAnswer(answer, results);
    let wasRegenerated = false;
    await emit({
      t: "validation",
      verdict: verdict.verdict === "pass" ? "pass" : "fail",
    });
    if (verdict.verdict === "fail") {
      const offenders = [
        ...verdict.untraceableNumbers.map((n) => `number ${n}`),
        ...verdict.untraceableIdentifiers.map((n) => `identifier ${n}`),
        ...verdict.untraceableNames.map((n) => `name "${n}"`),
        ...verdict.bannedHits.map((n) => `prohibited phrase "${n}"`),
      ];
      const regen = await drainCall(
        adapter,
        {
          system,
          messages: [
            ...messages,
            { kind: "assistant", text: answer },
            {
              kind: "user",
              text: `Your draft could not be verified: the following items do not trace to this turn's tool outputs or are prohibited — ${offenders.join(", ")}. Rewrite the answer using only figures, identifiers, and names exactly as the tool outputs returned them, with no prohibited phrasing. Do not call any tool.`,
            },
          ],
          tools: [],
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          directives,
        },
        emit,
      );
      inputTokens += regen.inputTokens;
      outputTokens += regen.outputTokens;
      let regenAnswer = regen.text;
      if (accusation && regenAnswer.trim().length > 0) {
        if (!/cannot establish whether/i.test(regenAnswer)) {
          regenAnswer = `${accusationOpening(accusationEntitySlot(params.userText))}\n\n${regenAnswer}`;
        }
        if (!regenAnswer.includes("america.gov/fraud")) {
          regenAnswer = `${regenAnswer}\n\n${REFERRAL_BLOCK}`;
        }
      }
      const regenVerdict =
        regenAnswer.trim().length > 0
          ? validateAnswer(regenAnswer, results)
          : verdict;
      if (regenVerdict.verdict === "pass") {
        answer = regenAnswer;
        verdict = regenVerdict;
        wasRegenerated = true;
        await emit({ t: "validation", verdict: "pass" });
      } else {
        // Second failure: the labelled code-rendered table, and
        // the turn is refunded (§4.4) — never unverified prose.
        const content = renderResultsTable(results, fallbackNotice());
        await store.updateMessage(params.turnId, {
          status: "complete",
          content,
          toolCalls: results,
          inputTokens,
          outputTokens,
          validatorVerdict: "fallback",
        });
        await refundTurn(store, params.turnId, {
          inputTokens,
          outputTokens,
          toolCallCount,
          validatorVerdict: "fallback",
        });
        await emit({ t: "validation", verdict: "fallback" });
        await emit({ t: "turn_done", messageId: params.turnId, usage: { inputTokens, outputTokens } });
        return { status: "done", turnId: params.turnId, validatorVerdict: "fallback", errorCode: null };
      }
    }

    void verdict;
    const verdictLabel = wasRegenerated ? "regenerated" : "pass";
    await store.updateMessage(params.turnId, {
      status: "complete",
      content: answer,
      toolCalls: results,
      model: adapter.model,
      promptVersion: PROMPT_VERSION,
      inputTokens,
      outputTokens,
      validatorVerdict: verdictLabel,
    });
    await settleTurn(store, params.turnId, {
      inputTokens,
      outputTokens,
      toolCallCount,
      validatorVerdict: verdictLabel,
    });
    await emit({
      t: "turn_done",
      messageId: params.turnId,
      usage: { inputTokens, outputTokens },
    });
    return {
      status: "done",
      turnId: params.turnId,
      validatorVerdict: verdictLabel,
      errorCode: null,
    };
  } catch (err) {
    if (err instanceof ModelProviderError) {
      return fail(err.code, err.message);
    }
    return fail("PROVIDER_UNAVAILABLE", err instanceof Error ? err.message : String(err));
  }
}

function formatCitationOf(result: ToolResult): string {
  if (!envelopeComplete(result.envelope)) return "incomplete envelope";
  return formatCitation(result.envelope);
}

/**
 * Start a turn: persist the user message + the running assistant
 * row, charge the ledger, then run the engine without blocking
 * the caller (the SSE events endpoint follows the persisted
 * turn). The first turn titles the conversation from the
 * question. Returns the turn id (the assistant message id).
 */
export async function startInvestigatorTurn(
  deps: EngineDeps,
  params: {
    userId: string;
    conversationId: string;
    conversationTitle: string;
    userText: string;
    tier: FraudRadarTier;
  },
): Promise<{ turnId: string }> {
  const { store, adapter } = deps;
  await store.appendMessage({
    conversationId: params.conversationId,
    role: "user",
    content: params.userText,
  });
  const assistant = await store.appendMessage({
    conversationId: params.conversationId,
    role: "assistant",
    content: "",
    model: adapter.model,
    promptVersion: PROMPT_VERSION,
    status: "running",
  });
  await chargeTurn(store, {
    userId: params.userId,
    conversationId: params.conversationId,
    turnId: assistant.id,
    tier: params.tier,
    model: adapter.model,
  });
  if (
    params.conversationTitle === "New conversation" ||
    params.conversationTitle.trim().length === 0
  ) {
    await store.updateConversationTitle(
      params.conversationId,
      params.userText.slice(0, 80),
    );
  }
  void runInvestigatorTurn(deps, {
    userId: params.userId,
    conversationId: params.conversationId,
    turnId: assistant.id,
    userText: params.userText,
    tier: params.tier,
  }).catch(async (err: unknown) => {
    // runInvestigatorTurn converts provider failures into turn
    // outcomes itself; this guard covers store-level failures.
    try {
      await store.updateMessage(assistant.id, {
        status: "error",
        errorCode: "PROVIDER_UNAVAILABLE",
        content: "",
      });
      await refundTurn(store, assistant.id, {
        inputTokens: 0,
        outputTokens: 0,
        toolCallCount: 0,
        validatorVerdict: null,
      });
    } catch {
      void err;
    }
  });
  return { turnId: assistant.id };
}
