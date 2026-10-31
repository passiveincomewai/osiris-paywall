/**
 * Fraud Radar Phase 7 — Gemini ModelAdapter (PHASE7 §4.1).
 *
 * The v1 adapter over the house Gemini plumbing in
 * src/lib/ai-engine.ts (createGeminiClient + rotateApiKey over
 * GEMINI_API_KEY_1…8; model gemini-2.0-flash unless
 * FRAUD_RADAR_INVESTIGATOR_MODEL overrides). Function calling is
 * new to the codebase but is a capability of the pinned house
 * SDK (@google/generative-ai 0.24.1) and the house model — no
 * new dependency, vendor, or key.
 *
 * Availability is honest (§4.5, design blocker B-1): with no
 * Gemini key configured the factory returns null and the API
 * answers 503 AI_NOT_CONFIGURED. The OpenAI house key does NOT
 * substitute — its wrapper is a single-turn, tool-less chat call
 * and cannot run a tool loop; there is no silent degradation to
 * a chat that would have to invent its facts.
 */

import {
  SchemaType,
  type Content,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
  type GenerativeModel,
} from "@google/generative-ai";
import { createGeminiClient, rotateApiKey } from "@/lib/ai-engine";
import {
  ModelProviderError,
  type AdapterMessage,
  type ModelAdapter,
  type ModelCallRequest,
  type ModelStreamEvent,
  type ModelToolSchema,
} from "./adapter";
import { investigatorModel } from "./entitlements";

type Env = Record<string, string | undefined>;

/** The house Gemini key family, GEMINI_API_KEY_1…8 (ai routes precedent). */
export function geminiApiKeys(env: Env = process.env): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 8; i++) {
    const key = env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim().length > 0) keys.push(key.trim());
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Schema conversion: the registry's JSON schemas → Gemini's
// FunctionDeclarationSchema subset. Server-side validation in
// tools.ts still enforces everything the provider schema drops
// (patterns, lengths) — conversion never weakens the §2.1 gate.
// ---------------------------------------------------------------------------

const TYPE_MAP: Record<string, SchemaType> = {
  string: SchemaType.STRING,
  number: SchemaType.NUMBER,
  integer: SchemaType.INTEGER,
  boolean: SchemaType.BOOLEAN,
  array: SchemaType.ARRAY,
  object: SchemaType.OBJECT,
};

export function convertSchema(schema: Record<string, unknown>): FunctionDeclarationSchema {
  const type = TYPE_MAP[String(schema.type ?? "object")] ?? SchemaType.OBJECT;
  const out: Record<string, unknown> = { type };
  if (typeof schema.description === "string") out.description = schema.description;
  if (Array.isArray(schema.enum)) out.enum = schema.enum.map(String);
  if (schema.properties && typeof schema.properties === "object") {
    const props: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(
      schema.properties as Record<string, Record<string, unknown>>,
    )) {
      props[key] = convertSchema(value);
    }
    out.properties = props;
  }
  if (Array.isArray(schema.required)) out.required = schema.required.map(String);
  if (schema.items && typeof schema.items === "object") {
    out.items = convertSchema(schema.items as Record<string, unknown>);
  }
  return out as unknown as FunctionDeclarationSchema;
}

export function toFunctionDeclarations(
  tools: ModelToolSchema[],
): FunctionDeclaration[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: convertSchema(tool.parameters),
  }));
}

// ---------------------------------------------------------------------------
// Message conversion: the adapter-neutral transcript → Gemini
// Content[]. Tool results travel in the function-response role,
// serialised as JSON data blocks (§3.6 structural mitigation).
// ---------------------------------------------------------------------------

export function toGeminiContents(messages: AdapterMessage[]): Content[] {
  return messages.map((message) => {
    switch (message.kind) {
      case "user":
        return { role: "user", parts: [{ text: message.text }] };
      case "assistant":
        return { role: "model", parts: [{ text: message.text }] };
      case "tool_calls":
        return {
          role: "model",
          parts: message.calls.map((call) => ({
            functionCall: { name: call.name, args: call.args },
          })),
        };
      case "tool_results":
        return {
          role: "user",
          parts: message.results.map((result) => ({
            functionResponse: { name: result.name, response: result.response },
          })),
        };
    }
  });
}

function mapProviderError(err: unknown): ModelProviderError {
  if (err instanceof ModelProviderError) return err;
  const message = err instanceof Error ? err.message : String(err);
  if (/API_KEY_INVALID|api key not valid|invalid api key/i.test(message)) {
    return new ModelProviderError("INVALID_KEY", "the configured Gemini key was rejected");
  }
  if (/RESOURCE_EXHAUSTED|quota|429/i.test(message)) {
    return new ModelProviderError("QUOTA_EXHAUSTED", "the model provider quota is exhausted");
  }
  if (/SAFETY|blocked/i.test(message)) {
    return new ModelProviderError("SAFETY_BLOCKED", "the model safety filters blocked this turn");
  }
  return new ModelProviderError(
    "PROVIDER_UNAVAILABLE",
    `the model provider could not be reached (${message.slice(0, 120)})`,
  );
}

export interface GeminiAdapterDeps {
  /** Injectable for tests: build the SDK model for a key. */
  createModel?: (apiKey: string, model: string, system: string) => GenerativeModel;
}

/**
 * The v1 adapter, or null when no Gemini key is configured —
 * the §4.5 not-configured state, decided before any charge.
 */
export function createGeminiAdapter(
  env: Env = process.env,
  deps: GeminiAdapterDeps = {},
): ModelAdapter | null {
  const keys = geminiApiKeys(env);
  if (keys.length === 0) return null;
  const model = investigatorModel(env);
  const createModel =
    deps.createModel ??
    ((apiKey: string, modelName: string, system: string) =>
      createGeminiClient(apiKey).getGenerativeModel({
        model: modelName,
        systemInstruction: system,
      }));

  return {
    model,
    async *call(req: ModelCallRequest): AsyncIterable<ModelStreamEvent> {
      const apiKey = rotateApiKey([...keys]);
      const system =
        req.directives.length > 0
          ? `${req.system}\n\n${req.directives.join("\n\n")}`
          : req.system;
      const generativeModel = createModel(apiKey, model, system);
      let streamResult;
      try {
        streamResult = await generativeModel.generateContentStream({
          contents: toGeminiContents(req.messages),
          ...(req.tools.length > 0
            ? { tools: [{ functionDeclarations: toFunctionDeclarations(req.tools) }] }
            : {}),
          generationConfig: { maxOutputTokens: req.maxOutputTokens },
        });
      } catch (err) {
        throw mapProviderError(err);
      }
      try {
        for await (const chunk of streamResult.stream) {
          let text = "";
          try {
            text = chunk.text();
          } catch {
            // A chunk with no text part (e.g. a function-call-only
            // chunk) — text() throws on blocked content; the
            // aggregated response check below decides safety.
            text = "";
          }
          if (text) yield { type: "text_delta", text };
        }
        const response = await streamResult.response;
        if (response.promptFeedback?.blockReason) {
          throw new ModelProviderError(
            "SAFETY_BLOCKED",
            "the model safety filters blocked this turn",
          );
        }
        const finishReason = response.candidates?.[0]?.finishReason;
        if (finishReason === "SAFETY" || finishReason === "RECITATION") {
          throw new ModelProviderError(
            "SAFETY_BLOCKED",
            "the model safety filters blocked this turn",
          );
        }
        if (response.usageMetadata) {
          yield {
            type: "usage",
            inputTokens: response.usageMetadata.promptTokenCount ?? 0,
            outputTokens: response.usageMetadata.candidatesTokenCount ?? 0,
          };
        }
        const calls = response.functionCalls?.() ?? undefined;
        if (calls && calls.length > 0) {
          yield {
            type: "function_calls",
            calls: calls.map((call) => ({
              name: call.name,
              args: (call.args ?? {}) as Record<string, unknown>,
            })),
          };
        }
      } catch (err) {
        throw mapProviderError(err);
      }
    },
  };
}
