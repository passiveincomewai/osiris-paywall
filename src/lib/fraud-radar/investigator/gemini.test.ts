import { describe, it, expect } from "vitest";
import type { GenerativeModel } from "@google/generative-ai";
import { ModelProviderError, type ModelStreamEvent } from "./adapter";
import {
  convertSchema,
  createGeminiAdapter,
  geminiApiKeys,
  toFunctionDeclarations,
  toGeminiContents,
} from "./gemini";

/**
 * Phase 7 Payload B — Gemini adapter tests (PHASE7 §4.1, §4.5,
 * design blocker B-1): correct behaviour in both worlds — no key
 * configured (the factory is null; the API answers the honest
 * not-configured state) and key configured (function calling over
 * the house plumbing, with provider errors mapped to house
 * codes). The SDK model is faked; no live call is made.
 */

function fakeModel(overrides: Record<string, unknown> = {}): GenerativeModel {
  const model = {
    generateContentStream: async () => ({
      stream: (async function* () {
        yield { text: () => "Published total is " };
        yield { text: () => "on record." };
      })(),
      response: Promise.resolve({
        promptFeedback: undefined,
        candidates: [{ finishReason: "STOP" }],
        usageMetadata: { promptTokenCount: 42, candidatesTokenCount: 7 },
        functionCalls: () => [
          { name: "get_source_registry", args: {} },
        ],
      }),
    }),
    ...overrides,
  };
  return model as unknown as GenerativeModel;
}

async function drain(events: AsyncIterable<ModelStreamEvent>): Promise<ModelStreamEvent[]> {
  const out: ModelStreamEvent[] = [];
  for await (const event of events) out.push(event);
  return out;
}

describe("gemini adapter — model-down world (B-1)", () => {
  it("no Gemini key configured ⇒ the factory returns null", () => {
    expect(createGeminiAdapter({})).toBeNull();
    expect(createGeminiAdapter({ OPENAI_API_KEY: "sk-present" })).toBeNull();
    expect(createGeminiAdapter({ GEMINI_API_KEY_1: "  " })).toBeNull();
  });

  it("collects the key family GEMINI_API_KEY_1…8", () => {
    expect(
      geminiApiKeys({ GEMINI_API_KEY_1: "a", GEMINI_API_KEY_3: "c", GEMINI_API_KEY_9: "z" }),
    ).toEqual(["a", "c"]);
  });
});

describe("gemini adapter — configured world", () => {
  it("streams text deltas, then usage, then the function calls", async () => {
    const adapter = createGeminiAdapter(
      { GEMINI_API_KEY_1: "test-key" },
      { createModel: () => fakeModel() },
    );
    expect(adapter).not.toBeNull();
    if (!adapter) throw new Error("adapter expected");
    expect(adapter.model).toBe("gemini-2.0-flash");
    const events = await drain(
      adapter.call({
        system: "sys",
        messages: [{ kind: "user", text: "hi" }],
        tools: [
          {
            name: "get_source_registry",
            description: "registry",
            parameters: { type: "object", additionalProperties: false, properties: {} },
          },
        ],
        maxOutputTokens: 3000,
        directives: [],
      }),
    );
    expect(events.map((e) => e.type)).toEqual([
      "text_delta",
      "text_delta",
      "usage",
      "function_calls",
    ]);
    const usage = events.find((e) => e.type === "usage");
    expect(usage).toEqual({ type: "usage", inputTokens: 42, outputTokens: 7 });
    const calls = events.find((e) => e.type === "function_calls");
    expect(calls).toEqual({
      type: "function_calls",
      calls: [{ name: "get_source_registry", args: {} }],
    });
  });

  it("maps a rejected key to INVALID_KEY and a provider quota to QUOTA_EXHAUSTED", async () => {
    const badKey = createGeminiAdapter(
      { GEMINI_API_KEY_1: "test-key" },
      {
        createModel: () =>
          fakeModel({
            generateContentStream: async () => {
              throw new Error("API_KEY_INVALID: key rejected");
            },
          }),
      },
    );
    if (!badKey) throw new Error("adapter expected");
    await expect(
      drain(
        badKey.call({
          system: "s",
          messages: [],
          tools: [],
          maxOutputTokens: 100,
          directives: [],
        }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_KEY" });

    const quota = createGeminiAdapter(
      { GEMINI_API_KEY_1: "test-key" },
      {
        createModel: () =>
          fakeModel({
            generateContentStream: async () => {
              throw new Error("429 RESOURCE_EXHAUSTED");
            },
          }),
      },
    );
    if (!quota) throw new Error("adapter expected");
    await expect(
      drain(
        quota.call({
          system: "s",
          messages: [],
          tools: [],
          maxOutputTokens: 100,
          directives: [],
        }),
      ),
    ).rejects.toBeInstanceOf(ModelProviderError);
    await expect(
      drain(
        quota.call({
          system: "s",
          messages: [],
          tools: [],
          maxOutputTokens: 100,
          directives: [],
        }),
      ),
    ).rejects.toMatchObject({ code: "QUOTA_EXHAUSTED" });
  });

  it("a safety block in the response becomes SAFETY_BLOCKED", async () => {
    const adapter = createGeminiAdapter(
      { GEMINI_API_KEY_1: "test-key" },
      {
        createModel: () =>
          fakeModel({
            generateContentStream: async () => ({
              stream: (async function* () {
                // No chunks.
              })(),
              response: Promise.resolve({
                promptFeedback: { blockReason: "SAFETY" },
                candidates: [],
                usageMetadata: undefined,
                functionCalls: () => undefined,
              }),
            }),
          }),
      },
    );
    if (!adapter) throw new Error("adapter expected");
    await expect(
      drain(
        adapter.call({
          system: "s",
          messages: [],
          tools: [],
          maxOutputTokens: 100,
          directives: [],
        }),
      ),
    ).rejects.toMatchObject({ code: "SAFETY_BLOCKED" });
  });
});

describe("gemini adapter — conversions", () => {
  it("function declarations keep the supported subset and drop pattern/length keys (server validation still enforces them)", () => {
    const [decl] = toFunctionDeclarations([
      {
        name: "get_medicaid_provider_profile",
        description: "profile",
        parameters: {
          type: "object",
          additionalProperties: false,
          required: ["npi"],
          properties: {
            npi: { type: "string", pattern: "^[0-9]{10}$", minLength: 10, maxLength: 10 },
          },
        },
      },
    ]);
    expect(decl?.name).toBe("get_medicaid_provider_profile");
    const params = decl?.parameters as unknown as Record<string, unknown>;
    expect(params.type).toBe("object");
    expect(params.required).toEqual(["npi"]);
    const props = params.properties as Record<string, Record<string, unknown>>;
    expect(props.npi?.type).toBe("string");
    expect(props.npi).not.toHaveProperty("pattern");
    expect(props.npi).not.toHaveProperty("minLength");
  });

  it("convertSchema handles enums and nested objects", () => {
    const schema = convertSchema({
      type: "object",
      properties: {
        grain: { type: "string", enum: ["hcpcs", "fac-yearly"] },
        limit: { type: "integer" },
      },
    }) as unknown as Record<string, unknown>;
    const props = schema.properties as Record<string, Record<string, unknown>>;
    expect(props.grain?.enum).toEqual(["hcpcs", "fac-yearly"]);
    expect(props.limit?.type).toBe("integer");
  });

  it("tool results travel in the function-response role as data blocks", () => {
    const contents = toGeminiContents([
      { kind: "user", text: "q" },
      { kind: "tool_calls", calls: [{ name: "get_source_registry", args: {} }] },
      {
        kind: "tool_results",
        results: [
          { name: "get_source_registry", response: { data: { slug: "leie" } } },
        ],
      },
    ]);
    expect(contents[1]?.role).toBe("model");
    expect(contents[1]?.parts[0]).toHaveProperty("functionCall");
    expect(contents[2]?.role).toBe("user");
    expect(contents[2]?.parts[0]).toHaveProperty("functionResponse");
  });
});
