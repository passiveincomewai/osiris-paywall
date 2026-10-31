/**
 * Fraud Radar Phase 7 — the ModelAdapter interface (PHASE7 §4.1).
 *
 * The engine depends on this narrow interface only, never on a
 * provider: `gemini.ts` is the v1 implementation (house Gemini
 * plumbing); a future OpenAI tool-loop adapter (P7-E) slots in
 * behind the same shape. Tests drive the engine with scripted
 * adapters implementing this interface.
 *
 * One `call` is one model invocation: the adapter streams text
 * deltas as they arrive, then emits the call's usage and any
 * function calls as terminal events. Provider failures throw
 * ModelProviderError with a house error code — the engine turns
 * those into the honest failure states of §4.5 and refunds.
 */

export type AdapterMessage =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool_calls"; calls: ModelFunctionCall[] }
  | {
      kind: "tool_results";
      results: { name: string; response: Record<string, unknown> }[];
    };

export interface ModelFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ModelToolSchema {
  name: string;
  description: string;
  /** JSON-schema parameters (additionalProperties: false). */
  parameters: Record<string, unknown>;
}

export interface ModelCallRequest {
  system: string;
  messages: AdapterMessage[];
  /** Tools offered this call; empty disables tool use. */
  tools: ModelToolSchema[];
  maxOutputTokens: number;
  /** Extra standing instructions for this call (engine directives,
   *  e.g. the accusation pattern or a regeneration instruction). */
  directives: string[];
}

export type ModelStreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | { type: "function_calls"; calls: ModelFunctionCall[] };

export type ModelErrorCode =
  | "AI_NOT_CONFIGURED"
  | "INVALID_KEY"
  | "QUOTA_EXHAUSTED"
  | "SAFETY_BLOCKED"
  | "PROVIDER_UNAVAILABLE";

export class ModelProviderError extends Error {
  code: ModelErrorCode;
  constructor(code: ModelErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export interface ModelAdapter {
  /** The model id recorded on messages and ledger rows. */
  model: string;
  call(req: ModelCallRequest): AsyncIterable<ModelStreamEvent>;
}
