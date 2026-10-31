import { describe, it, expect, vi, beforeEach } from "vitest";
import { fileURLToPath } from "node:url";

vi.mock("@/lib/db", () => ({ db: {} }));

import {
  ModelProviderError,
  type ModelAdapter,
  type ModelCallRequest,
  type ModelFunctionCall,
  type ModelStreamEvent,
} from "./adapter";
import {
  clearToolCache,
  isAccusationQuestion,
  runInvestigatorTurn,
  startInvestigatorTurn,
  type EngineDeps,
} from "./engine";
import { REFERRAL_BLOCK } from "./guardrails";
import { createInMemoryStore, type InvestigatorStore } from "./store";
import { createArtifactLoader } from "../healthcare-data";
import { createCareLoader } from "../care-data";
import { createGrantsLoader } from "../grants-data";
import { createSignalsLoader } from "../signals-data";
import type { ToolDeps } from "./tools";

/**
 * Phase 7 Payload B — engine tests (PHASE7 §4.3–§4.5, §5.2):
 * the tool-call loop and its ceilings, the §2.4 validator
 * integration (invented number → regeneration → labelled table
 * fallback), charge-before / refund-on-failure against the
 * ledger, the honest model-down/provider failure states, and an
 * accusation question routed to the §3.3 skeleton — all against
 * a scripted ModelAdapter, no live model call.
 */

const HC = fileURLToPath(new URL("../__fixtures__/healthcare", import.meta.url));
const CARE = fileURLToPath(new URL("../__fixtures__/care", import.meta.url));
const GRANTS = fileURLToPath(new URL("../__fixtures__/grants", import.meta.url));
const SIGNALS = fileURLToPath(new URL("../__fixtures__/signals", import.meta.url));

const FIXTURE_ENV = {
  FRAUD_RADAR_ARTIFACT_ROOT: HC,
  FRAUD_RADAR_CARE_ARTIFACT_ROOT: CARE,
  FRAUD_RADAR_GRANTS_ARTIFACT_ROOT: GRANTS,
  FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT: SIGNALS,
};

const toolDeps: ToolDeps = {
  env: FIXTURE_ENV,
  loaders: {
    healthcare: createArtifactLoader({ root: HC, version: "2026-02-09", isHttp: false }),
    care: createCareLoader({ root: CARE, version: "2022-2024", isHttp: false }),
    grants: createGrantsLoader({
      root: GRANTS,
      version: "2026-10-06",
      facVersion: "2026-10-31_ay2026",
      isHttp: false,
    }),
    signals: createSignalsLoader({
      root: SIGNALS,
      version: "2026-02-09+2022-2024+2026-10-06",
      isHttp: false,
    }),
  },
};

type Step = (
  | { calls: ModelFunctionCall[]; usage?: [number, number] }
  | { text: string; usage?: [number, number] }
  | { error: ModelProviderError }
) & { delayMs?: number };

function scriptedAdapter(steps: Step[]): ModelAdapter & { requests: ModelCallRequest[] } {
  const requests: ModelCallRequest[] = [];
  const queue = [...steps];
  return {
    model: "gemini-2.0-flash",
    requests,
    async *call(req: ModelCallRequest): AsyncIterable<ModelStreamEvent> {
      requests.push(req);
      const step = queue.shift();
      if (!step) throw new Error("scripted adapter exhausted");
      if ("delayMs" in step && step.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, step.delayMs));
      }
      if ("error" in step) throw step.error;
      if ("calls" in step) {
        const [inputTokens, outputTokens] = step.usage ?? [10, 5];
        yield { type: "usage", inputTokens, outputTokens };
        yield { type: "function_calls", calls: step.calls };
        return;
      }
      const [inputTokens, outputTokens] = step.usage ?? [10, 20];
      yield { type: "text_delta", text: step.text };
      yield { type: "usage", inputTokens, outputTokens };
    },
  };
}

const GRANTS_PROFILE_CALL: ModelFunctionCall = {
  name: "get_grant_recipient_profile",
  args: { uei: "ABC123DEF456" },
};
const TRACED_TEXT =
  "The recipient's published award-cumulative obligated total is $5,000,000.50, as returned by the profile tool.";
const INVENTED_TEXT =
  "The recipient's published award-cumulative obligated total is $9,999,999.";

async function startTurn(
  store: InvestigatorStore,
  adapter: ModelAdapter,
  userText: string,
  extra: Partial<EngineDeps> = {},
): Promise<{ conversationId: string; turnId: string }> {
  const conversation = await store.createConversation("user-a", "New conversation");
  const { turnId } = await startInvestigatorTurn(
    { store, adapter, env: FIXTURE_ENV, toolDeps, ...extra },
    {
      userId: "user-a",
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      userText,
      tier: "free",
    },
  );
  // The engine runs without blocking the start call; wait for settle.
  await vi.waitFor(async () => {
    const message = await store.getMessage(turnId);
    expect(message?.status).not.toBe("running");
  });
  return { conversationId: conversation.id, turnId };
}

beforeEach(() => {
  clearToolCache();
});

describe("engine — tool execution + validated answer", () => {
  it("executes the tool server-side, persists the citation record, and charges the turn", async () => {
    const store = createInMemoryStore();
    const adapter = scriptedAdapter([
      { calls: [GRANTS_PROFILE_CALL], usage: [100, 10] },
      { text: TRACED_TEXT, usage: [150, 40] },
    ]);
    const { turnId } = await startTurn(store, adapter, "What do we know about this recipient?");
    const message = await store.getMessage(turnId);
    expect(message?.status).toBe("complete");
    expect(message?.content).toBe(TRACED_TEXT);
    expect(message?.validatorVerdict).toBe("pass");
    expect(message?.toolCalls).toHaveLength(1);
    expect(message?.toolCalls?.[0]?.envelope.grainKey).toBe("UEI:ABC123DEF456");
    expect(message?.inputTokens).toBe(250);
    expect(message?.outputTokens).toBe(50);
    const ledger = await store.getLedgerByTurn(turnId);
    expect(ledger?.status).toBe("charged");
    expect(ledger?.toolCallCount).toBe(1);
    expect(ledger?.validatorVerdict).toBe("pass");
    expect(ledger?.estimatedCostUsd).toBeGreaterThan(0);
    const eventTypes = message?.events.map((e) => e.t) ?? [];
    expect(eventTypes).toContain("turn_started");
    expect(eventTypes).toContain("tool_call");
    expect(eventTypes).toContain("tool_result");
    expect(eventTypes).toContain("turn_done");
    // Function declarations were generated from the registry.
    expect(adapter.requests[0]?.tools.map((t) => t.name)).toContain(
      "get_grant_recipient_profile",
    );
    expect(adapter.requests[0]?.tools.map((t) => t.name)).not.toContain(
      "search_contract_vendors",
    );
  });

  it("a tool error is returned to the model as data, not a turn failure", async () => {
    const store = createInMemoryStore();
    const adapter = scriptedAdapter([
      { calls: [{ name: "get_grant_recipient_profile", args: { uei: "BAD" } }] },
      { text: "That identifier is not in the published data." },
    ]);
    const { turnId } = await startTurn(store, adapter, "Look up BAD");
    const message = await store.getMessage(turnId);
    expect(message?.status).toBe("complete");
    const toolResults = adapter.requests[1]?.messages.find((m) => m.kind === "tool_results");
    expect(toolResults?.kind).toBe("tool_results");
    if (toolResults?.kind === "tool_results") {
      expect(toolResults.results[0]?.response.error).toBe("invalid_args");
    }
  });
});

describe("engine — §2.4 validator integration", () => {
  it("an invented number triggers ONE regeneration; a traced rewrite ships as regenerated and stays charged", async () => {
    const store = createInMemoryStore();
    const adapter = scriptedAdapter([
      { calls: [GRANTS_PROFILE_CALL] },
      { text: INVENTED_TEXT },
      { text: TRACED_TEXT },
    ]);
    const { turnId } = await startTurn(store, adapter, "What is the total?");
    const message = await store.getMessage(turnId);
    expect(message?.content).toBe(TRACED_TEXT);
    expect(message?.validatorVerdict).toBe("regenerated");
    expect(adapter.requests).toHaveLength(3);
    // The regeneration instruction names the offending figure.
    const regen = adapter.requests[2];
    expect(regen?.tools).toEqual([]);
    const note = regen?.messages[regen.messages.length - 1];
    expect(note?.kind).toBe("user");
    if (note?.kind === "user") expect(note.text).toContain("9,999,999");
    const ledger = await store.getLedgerByTurn(turnId);
    expect(ledger?.status).toBe("charged");
  });

  it("a second failure falls back to the labelled code-rendered table and refunds", async () => {
    const store = createInMemoryStore();
    const adapter = scriptedAdapter([
      { calls: [GRANTS_PROFILE_CALL] },
      { text: INVENTED_TEXT },
      { text: "Still invented: $8,888,888." },
    ]);
    const { turnId } = await startTurn(store, adapter, "What is the total?");
    const message = await store.getMessage(turnId);
    expect(message?.status).toBe("complete");
    expect(message?.validatorVerdict).toBe("fallback");
    expect(message?.content).toContain(
      "The assistant's draft answer contained figures that could not be verified against the tool results, so the verified results are shown directly.",
    );
    expect(message?.content).toContain("get_grant_recipient_profile");
    expect(message?.content).toContain("grants-aggregates@2026-10-06 · UEI:ABC123DEF456");
    expect(message?.content).not.toContain("9,999,999");
    const ledger = await store.getLedgerByTurn(turnId);
    expect(ledger?.status).toBe("refunded");
  });

  it("a banned-vocabulary draft fails validation the same way", async () => {
    const store = createInMemoryStore();
    const adapter = scriptedAdapter([
      { calls: [GRANTS_PROFILE_CALL] },
      { text: "This recipient looks suspicious." },
      { text: TRACED_TEXT },
    ]);
    const { turnId } = await startTurn(store, adapter, "Tell me about this recipient");
    const message = await store.getMessage(turnId);
    expect(message?.validatorVerdict).toBe("regenerated");
    expect(message?.content).toBe(TRACED_TEXT);
  });
});

describe("engine — §4.3 ceilings", () => {
  it("the round cap forces a final no-tools answer call", async () => {
    const store = createInMemoryStore();
    const registryCall: ModelFunctionCall = { name: "get_source_registry", args: {} };
    const adapter = scriptedAdapter([
      { calls: [registryCall] },
      { calls: [registryCall] },
      { calls: [registryCall] },
      { calls: [registryCall] },
      { calls: [registryCall] },
      { calls: [registryCall] },
      { text: "The registry lists the published sources for this deployment." },
    ]);
    const { turnId } = await startTurn(store, adapter, "How fresh is the data?");
    const message = await store.getMessage(turnId);
    expect(message?.status).toBe("complete");
    expect(adapter.requests).toHaveLength(7);
    const finalRequest = adapter.requests[6];
    expect(finalRequest?.tools).toEqual([]);
    expect(finalRequest?.directives.join(" ")).toContain("Tool rounds are exhausted");
    // Identical repeat calls are memoised (§4.6): one real execution.
    const ledger = await store.getLedgerByTurn(turnId);
    expect(ledger?.toolCallCount).toBe(1);
  });

  it("the per-round cap executes at most 4 calls and notes the drop", async () => {
    const store = createInMemoryStore();
    const queries = ["aaa", "bbb", "ccc", "ddd", "eee", "fff"];
    const adapter = scriptedAdapter([
      {
        calls: queries.map((query) => ({
          name: "search_medicaid_providers",
          args: { query },
        })),
      },
      { text: "Search results are listed in the data layer's published order." },
    ]);
    const { turnId } = await startTurn(store, adapter, "Find providers");
    const message = await store.getMessage(turnId);
    expect(message?.status).toBe("complete");
    expect(message?.toolCalls).toHaveLength(4);
    const toolResults = adapter.requests[1]?.messages.find((m) => m.kind === "tool_results");
    if (toolResults?.kind === "tool_results") {
      const noted = toolResults.results.some(
        (r) => r.response.error === "round_call_cap",
      );
      expect(noted).toBe(true);
    } else {
      throw new Error("expected tool_results in the second request");
    }
  });

  it("the 12-call ceiling stops further executions mid-turn", async () => {
    const store = createInMemoryStore();
    const letters = ["aaa", "bbb", "ccc", "ddd", "eee", "fff", "ggg", "hhh", "iii", "jjj", "kkk", "lll", "mmm", "nnn", "ooo", "ppp"];
    const rounds = [0, 1, 2, 3].map((round) => ({
      calls: letters.slice(round * 4, round * 4 + 4).map((query) => ({
        name: "search_medicaid_providers",
        args: { query },
      })),
    }));
    const adapter = scriptedAdapter([
      ...rounds,
      { text: "Search results are listed in the data layer's published order." },
    ]);
    const { turnId } = await startTurn(store, adapter, "Find providers");
    const ledger = await store.getLedgerByTurn(turnId);
    expect(ledger?.toolCallCount).toBe(12);
    const message = await store.getMessage(turnId);
    expect(message?.toolCalls).toHaveLength(12);
  });

  it("the deadline persists the gathered results by code and refunds", async () => {
    const store = createInMemoryStore();
    const adapter = scriptedAdapter([
      { calls: [GRANTS_PROFILE_CALL], delayMs: 60 },
      { calls: [GRANTS_PROFILE_CALL], delayMs: 60 },
      { text: TRACED_TEXT },
    ]);
    const conversation = await store.createConversation("user-a", "New conversation");
    const { turnId } = await startInvestigatorTurn(
      { store, adapter, env: FIXTURE_ENV, toolDeps, deadlineMs: 30 },
      {
        userId: "user-a",
        conversationId: conversation.id,
        conversationTitle: conversation.title,
        userText: "What is the total?",
        tier: "free",
      },
    );
    await vi.waitFor(async () => {
      const message = await store.getMessage(turnId);
      expect(message?.status).not.toBe("running");
    });
    const message = await store.getMessage(turnId);
    expect(message?.validatorVerdict).toBe("fallback");
    expect(message?.content).toContain("ran past its time limit");
    expect(message?.content).toContain("UEI:ABC123DEF456");
    const ledger = await store.getLedgerByTurn(turnId);
    expect(ledger?.status).toBe("refunded");
  });
});

describe("engine — §4.5 failure honesty", () => {
  it("a provider failure refunds and persists an error state with no answer text", async () => {
    const store = createInMemoryStore();
    const adapter = scriptedAdapter([
      { error: new ModelProviderError("QUOTA_EXHAUSTED", "provider quota exhausted") },
    ]);
    const { turnId } = await startTurn(store, adapter, "Anything?");
    const message = await store.getMessage(turnId);
    expect(message?.status).toBe("error");
    expect(message?.errorCode).toBe("QUOTA_EXHAUSTED");
    expect(message?.content).toBe("");
    const ledger = await store.getLedgerByTurn(turnId);
    expect(ledger?.status).toBe("refunded");
    const eventTypes = message?.events.map((e) => e.t) ?? [];
    expect(eventTypes).toContain("turn_error");
    expect(eventTypes).not.toContain("turn_done");
  });

  it("a safety block surfaces as SAFETY_BLOCKED and refunds", async () => {
    const store = createInMemoryStore();
    const adapter = scriptedAdapter([
      { error: new ModelProviderError("SAFETY_BLOCKED", "blocked") },
    ]);
    const { turnId } = await startTurn(store, adapter, "Anything?");
    const message = await store.getMessage(turnId);
    expect(message?.errorCode).toBe("SAFETY_BLOCKED");
    const ledger = await store.getLedgerByTurn(turnId);
    expect(ledger?.status).toBe("refunded");
  });
});

describe("engine — accusation routing (§3.3)", () => {
  it("detects accusation-shaped questions", () => {
    expect(isAccusationQuestion("Did ABC Corp commit fraud?")).toBe(true);
    expect(isAccusationQuestion("Is this provider defrauding Medicare?")).toBe(true);
    expect(isAccusationQuestion("Give me the probability that X is committing fraud.")).toBe(true);
    expect(isAccusationQuestion("What did this provider bill in total?")).toBe(false);
    expect(isAccusationQuestion("How fresh is the Medicare data?")).toBe(false);
  });

  it("routes the turn to the skeleton: directive sent, opening + referral guaranteed in the shipped answer", async () => {
    const store = createInMemoryStore();
    const adapter = scriptedAdapter([
      { calls: [GRANTS_PROFILE_CALL] },
      { text: "The published profile shows the recipient's award activity as returned." },
    ]);
    const { turnId } = await startTurn(store, adapter, "Did ABC Corp commit fraud?");
    const message = await store.getMessage(turnId);
    expect(adapter.requests[0]?.directives.join(" ")).toContain("Standing pattern applies");
    expect(message?.content).toContain(
      "The public records published in Fraud Radar cannot establish whether ABC Corp committed fraud, and nothing in them is a finding of wrongdoing.",
    );
    expect(message?.content).toContain(REFERRAL_BLOCK);
    expect(message?.validatorVerdict).toBe("pass");
    const ledger = await store.getLedgerByTurn(turnId);
    expect(ledger?.status).toBe("charged");
  });
});

describe("engine — direct run (no start path)", () => {
  it("runInvestigatorTurn works when the caller pre-created the turn rows", async () => {
    const store = createInMemoryStore();
    const conversation = await store.createConversation("user-a", "New conversation");
    await store.appendMessage({
      conversationId: conversation.id,
      role: "user",
      content: "How fresh is the data?",
    });
    const assistant = await store.appendMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: "",
      status: "running",
    });
    const { chargeTurn } = await import("./usage");
    await chargeTurn(store, {
      userId: "user-a",
      conversationId: conversation.id,
      turnId: assistant.id,
      tier: "free",
      model: "gemini-2.0-flash",
    });
    const adapter = scriptedAdapter([
      { text: "The registry lists the published sources for this deployment." },
    ]);
    const outcome = await runInvestigatorTurn(
      { store, adapter, env: FIXTURE_ENV, toolDeps },
      {
        userId: "user-a",
        conversationId: conversation.id,
        turnId: assistant.id,
        userText: "How fresh is the data?",
        tier: "free",
      },
    );
    expect(outcome.status).toBe("done");
    expect(outcome.validatorVerdict).toBe("pass");
  });
});
