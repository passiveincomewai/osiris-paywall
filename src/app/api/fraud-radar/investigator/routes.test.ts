import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Phase 7 Payload B — investigator API route tests (PHASE7 §4.2,
 * §3.5, §5.4): the flag-off 404 on every route (isolation), the
 * signed-in gate, tenant isolation per route (another user's
 * conversation is 404 everywhere — never 403), quota exhaustion
 * from the ledger, the honest model-down 503 (no charge taken),
 * and the SSE replay contract. The store is the in-memory
 * implementation and the model is a scripted adapter — the real
 * engine runs end to end; no database or live model is touched.
 */

const hoisted = vi.hoisted(() => ({
  session: null as null | { user: { id: string; email: string } },
  store: null as unknown,
  script: [] as unknown[],
  modelDown: false,
}));

vi.mock("@/lib/db", () => ({ db: {} }));

vi.mock("@/auth", () => ({
  auth: async () => hoisted.session,
}));

vi.mock("@/lib/fraud-radar/investigator/store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/fraud-radar/investigator/store")>();
  hoisted.store = actual.createInMemoryStore();
  return { ...actual, getInvestigatorStore: () => hoisted.store };
});

vi.mock("@/lib/fraud-radar/investigator/gemini", () => ({
  createGeminiAdapter: () => {
    if (hoisted.modelDown) return null;
    return {
      model: "gemini-2.0-flash",
      async *call() {
        const step = hoisted.script.shift() as
          | { calls?: { name: string; args: Record<string, unknown> }[]; text?: string }
          | undefined;
        if (!step) throw new Error("script exhausted");
        if (step.calls) {
          yield { type: "usage", inputTokens: 10, outputTokens: 5 };
          yield { type: "function_calls", calls: step.calls };
          return;
        }
        yield { type: "text_delta", text: step.text ?? "" };
        yield { type: "usage", inputTokens: 10, outputTokens: 5 };
      },
    };
  },
}));

import { GET as listConversations, POST as createConversation } from "./conversations/route";
import { GET as getConversation, DELETE as deleteConversation } from "./conversations/[id]/route";
import { POST as postMessage } from "./conversations/[id]/messages/route";
import { GET as getEvents } from "./conversations/[id]/turns/[turnId]/events/route";
import { GET as getUsage } from "./usage/route";
import { chargeTurn } from "@/lib/fraud-radar/investigator/usage";
import {
  createInMemoryStore,
  type InvestigatorStore,
} from "@/lib/fraud-radar/investigator/store";

const store = () => hoisted.store as InvestigatorStore;
const asUser = (id: string) => {
  hoisted.session = { user: { id, email: `${id}@example.com` } };
};
const signedOut = () => {
  hoisted.session = null;
};

const post = (url: string, body: unknown) =>
  new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const get = (url: string) => new NextRequest(url);
const idParams = (id: string) => ({ params: Promise.resolve({ id }) });
const turnParams = (id: string, turnId: string) => ({
  params: Promise.resolve({ id, turnId }),
});

async function createConversationFor(userId: string): Promise<string> {
  asUser(userId);
  const res = await createConversation(post("http://localhost/api/fraud-radar/investigator/conversations", {}));
  expect(res.status).toBe(201);
  const body = await res.json();
  return body.conversation.id as string;
}

async function runTurn(conversationId: string): Promise<string> {
  hoisted.script = [
    { calls: [{ name: "get_source_registry", args: {} }] },
    { text: "The registry lists the published sources for this deployment." },
  ];
  const res = await postMessage(
    post(`http://localhost/api/fraud-radar/investigator/conversations/${conversationId}/messages`, {
      content: "How fresh is the data?",
    }),
    idParams(conversationId),
  );
  expect(res.status).toBe(202);
  const body = await res.json();
  const turnId = body.turnId as string;
  await vi.waitFor(async () => {
    const message = await store().getMessage(turnId);
    expect(message?.status).toBe("complete");
  });
  return turnId;
}

beforeEach(() => {
  vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
  hoisted.modelDown = false;
  hoisted.script = [];
  hoisted.store = createInMemoryStore();
  signedOut();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("flag gate (§4.2 — 404 while off, indistinguishable from non-existence)", () => {
  it("every investigator route 404s with the flag off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    asUser("user-a");
    const conversationId = "conv-whatever";
    expect((await listConversations()).status).toBe(404);
    expect(
      (await createConversation(post("http://localhost/x", {}))).status,
    ).toBe(404);
    expect(
      (await getConversation(get("http://localhost/x"), idParams(conversationId))).status,
    ).toBe(404);
    expect(
      (await deleteConversation(get("http://localhost/x"), idParams(conversationId))).status,
    ).toBe(404);
    expect(
      (await postMessage(post("http://localhost/x", { content: "hi" }), idParams(conversationId))).status,
    ).toBe(404);
    expect(
      (await getEvents(get("http://localhost/x"), turnParams(conversationId, "t1"))).status,
    ).toBe(404);
    expect((await getUsage()).status).toBe(404);
  });
});

describe("session gate", () => {
  it("signed-out callers get 401 SIGN_IN_REQUIRED, never a turn", async () => {
    signedOut();
    const list = await listConversations();
    expect(list.status).toBe(401);
    expect((await list.json()).code).toBe("SIGN_IN_REQUIRED");
    expect((await getUsage()).status).toBe(401);
  });
});

describe("conversations + tenant isolation (§3.5 — 404, not 403)", () => {
  it("a user sees only their own conversations, in every route", async () => {
    const conversationId = await createConversationFor("user-a");
    const turnId = await runTurn(conversationId);

    // The owner reads it back with both messages.
    asUser("user-a");
    const own = await getConversation(get("http://localhost/x"), idParams(conversationId));
    expect(own.status).toBe(200);
    const ownBody = await own.json();
    expect(ownBody.messages).toHaveLength(2);
    expect(ownBody.messages[1].status).toBe("complete");

    // Another user's list is empty; every direct route 404s.
    asUser("user-b");
    const list = await listConversations();
    expect((await list.json()).conversations).toHaveLength(0);
    expect(
      (await getConversation(get("http://localhost/x"), idParams(conversationId))).status,
    ).toBe(404);
    expect(
      (await postMessage(post("http://localhost/x", { content: "hi" }), idParams(conversationId))).status,
    ).toBe(404);
    expect(
      (await getEvents(get("http://localhost/x?after=0"), turnParams(conversationId, turnId))).status,
    ).toBe(404);
    expect(
      (await deleteConversation(get("http://localhost/x"), idParams(conversationId))).status,
    ).toBe(404);

    // The owner's conversation is untouched by the attempts.
    asUser("user-a");
    expect(
      (await getConversation(get("http://localhost/x"), idParams(conversationId))).status,
    ).toBe(200);
  });

  it("the owner can hard-delete; afterwards it is gone", async () => {
    const conversationId = await createConversationFor("user-a");
    asUser("user-a");
    const res = await deleteConversation(get("http://localhost/x"), idParams(conversationId));
    expect(res.status).toBe(200);
    expect(
      (await getConversation(get("http://localhost/x"), idParams(conversationId))).status,
    ).toBe(404);
  });
});

describe("SSE events — replay-then-live (§4.2)", () => {
  it("replays the persisted event log after the seq cursor", async () => {
    const conversationId = await createConversationFor("user-a");
    const turnId = await runTurn(conversationId);
    asUser("user-a");
    const res = await getEvents(
      get("http://localhost/x?after=0"),
      turnParams(conversationId, turnId),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const text = await res.text();
    expect(text).toContain("turn_started");
    expect(text).toContain("tool_result");
    expect(text).toContain("turn_done");
    // A cursor past the first events replays only the tail.
    const tail = await getEvents(
      get("http://localhost/x?after=3"),
      turnParams(conversationId, turnId),
    );
    const tailText = await tail.text();
    expect(tailText).not.toContain("turn_started");
    expect(tailText).toContain("turn_done");
  });

  it("an unknown turn id 404s even for the owner", async () => {
    const conversationId = await createConversationFor("user-a");
    asUser("user-a");
    const res = await getEvents(
      get("http://localhost/x"),
      turnParams(conversationId, "nope"),
    );
    expect(res.status).toBe(404);
  });
});

describe("quota + usage (§4.4)", () => {
  it("usage reports the caller's tier, ledger-counted ops, and reset date", async () => {
    const conversationId = await createConversationFor("user-a");
    await runTurn(conversationId);
    asUser("user-a");
    const res = await getUsage();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tier).toBe("free");
    expect(body.used).toBe(1);
    expect(body.limit).toBe(5);
    expect(body.remaining).toBe(4);
    expect(typeof body.resetAt).toBe("string");
  });

  it("quota exhaustion is an honest 429 with the reset date and charges nothing further", async () => {
    const conversationId = await createConversationFor("user-c");
    // Seed the ledger to the Free ceiling with charged rows.
    for (let i = 0; i < 5; i++) {
      await chargeTurn(store(), {
        userId: "user-c",
        conversationId,
        turnId: `seed-${i}`,
        tier: "free",
        model: "gemini-2.0-flash",
      });
    }
    asUser("user-c");
    hoisted.script = [{ text: "unused" }];
    const res = await postMessage(
      post("http://localhost/x", { content: "One more question" }),
      idParams(conversationId),
    );
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe("FR_AI_QUOTA_EXCEEDED");
    expect(typeof body.resetAt).toBe("string");
    const usage = await (await getUsage()).json();
    expect(usage.used).toBe(5);
  });
});

describe("model-down (§4.5 / B-1)", () => {
  it("no model key ⇒ 503 AI_NOT_CONFIGURED with the fallback notice, and no ledger charge", async () => {
    const conversationId = await createConversationFor("user-a");
    hoisted.modelDown = true;
    asUser("user-a");
    const res = await postMessage(
      post("http://localhost/x", { content: "How fresh is the data?" }),
      idParams(conversationId),
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("AI_NOT_CONFIGURED");
    expect(body.error).toBe("The investigator isn't available on this deployment yet.");
    const usage = await (await getUsage()).json();
    expect(usage.used).toBe(0);
  });
});
