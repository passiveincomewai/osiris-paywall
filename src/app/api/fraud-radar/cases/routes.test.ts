import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Phase 8 Payload A — cases API route tests (PHASE8 §5.4.1):
 * the flag-off 404 on every route, the signed-in gate, tenant
 * isolation per route (another user's case/lead/note is 404
 * everywhere — never 403 — and children are never resolved by
 * their own id alone, so cross-case id reuse fails too),
 * snapshot immutability at the HTTP surface, S-06 confinement,
 * and the case-limit 429. The store is the in-memory
 * implementation; the capture functions are fixture versions of
 * the leads module (the real capture is proven in leads.test.ts
 * against fixture data layers).
 */

const hoisted = vi.hoisted(() => ({
  session: null as null | { user: { id: string; email: string } },
  store: null as unknown,
}));

vi.mock("@/lib/db", () => ({ db: {} }));

vi.mock("@/auth", () => ({
  auth: async () => hoisted.session,
}));

vi.mock("@/lib/fraud-radar/cases/store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/fraud-radar/cases/store")>();
  hoisted.store = actual.createInMemoryCaseStore();
  return { ...actual, getCaseStore: () => hoisted.store };
});

vi.mock("@/lib/fraud-radar/cases/leads", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/fraud-radar/cases/leads")>();
  type Store = ReturnType<
    typeof import("@/lib/fraud-radar/cases/store").createInMemoryCaseStore
  >;
  const storeCaptured = async (
    store: Store,
    caseId: string,
    pinnedById: string,
    captured: {
      kind: string;
      engine: string;
      entityKey: string;
      ruleCode: string | null;
      status?: string;
    },
  ) => {
    const snapshot = {
      tool: "case_lead_capture",
      dataset: "research-signals",
      datasetVersion: "v-fixture",
      grainKey: captured.entityKey,
      sourceVintages: [{ source: "research-signals", version: "v-fixture" }],
      caveats: [],
      truncated: false,
      data: { fixture: true, ruleCode: captured.ruleCode, status: captured.status ?? "lead" },
    };
    const sha = actual.snapshotSha256(snapshot);
    const existing = await store.findLeadByCoalesceKey(
      caseId,
      captured.entityKey,
      captured.ruleCode,
      sha,
    );
    if (existing) return { lead: existing, created: false };
    const lead = await store.createLead({
      caseId,
      kind: captured.kind,
      engine: captured.engine,
      entityKey: captured.entityKey,
      entityLabel: captured.entityKey,
      snapshot,
      snapshotSha256: sha,
      sourceDataset: "research-signals",
      sourceDatasetVersion: "v-fixture",
      ruleCode: captured.ruleCode,
      pinnedById,
    });
    await store.createEvent({ caseId, kind: "lead_pinned", actorId: pinnedById, detail: { leadId: lead.id } });
    return { lead, created: true };
  };
  return {
    ...actual,
    pinLead: async (
      store: Store,
      args: {
        caseId: string;
        pinnedById: string;
        input: { kind: string; engine: string; entityKey: string; ruleCode?: string | null };
        annotation?: string | null;
      },
    ) => {
      if (args.input.kind === "candidate") {
        throw new actual.LeadCaptureError(
          "candidate_admin_only",
          "candidate pairs can only be pinned from the admin review queue",
        );
      }
      return storeCaptured(store, args.caseId, args.pinnedById, {
        kind: args.input.kind,
        engine: args.input.engine,
        entityKey: args.input.entityKey,
        ruleCode: args.input.ruleCode ?? null,
      });
    },
    pinCandidateLeadAsAdmin: async (
      store: Store,
      args: { caseId: string; pinnedById: string; isAdmin: boolean; engine: string; entityKey: string },
    ) => {
      if (!args.isAdmin) {
        throw new actual.LeadCaptureError(
          "candidate_admin_only",
          "candidate pairs can only be pinned from the admin review queue",
        );
      }
      return storeCaptured(store, args.caseId, args.pinnedById, {
        kind: "candidate",
        engine: args.engine,
        entityKey: args.entityKey,
        ruleCode: "S-06",
        status: "candidate — human review",
      });
    },
    pinInvestigatorLead: async (
      store: Store,
      args: { caseId: string; pinnedById: string; conversationId: string; messageId: string },
    ) => {
      if (args.messageId !== "msg-1") {
        throw new actual.LeadCaptureError("lead_not_found", "investigator message not found");
      }
      return storeCaptured(store, args.caseId, args.pinnedById, {
        kind: "investigator",
        engine: "cross",
        entityKey: `MSG:${args.messageId}`,
        ruleCode: null,
      });
    },
  };
});

import { GET as listCases, POST as createCase } from "./route";
import { GET as getUsage } from "./usage/route";
import { GET as getCase, PATCH as patchCase, DELETE as deleteCase } from "./[id]/route";
import { GET as listLeads, POST as pinLeadRoute } from "./[id]/leads/route";
import { POST as pinInvestigatorRoute } from "./[id]/leads/from-investigator/route";
import { PATCH as patchLead, DELETE as deleteLead } from "./[id]/leads/[leadId]/route";
import { GET as listNotes, POST as createNote } from "./[id]/notes/route";
import { PATCH as patchNote, DELETE as deleteNote } from "./[id]/notes/[noteId]/route";
import {
  createInMemoryCaseStore,
  type CaseStore,
} from "@/lib/fraud-radar/cases/store";

const store = () => hoisted.store as CaseStore;
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
const patch = (url: string, body: unknown) =>
  new NextRequest(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const get = (url: string) => new NextRequest(url);
const idParams = (id: string) => ({ params: Promise.resolve({ id }) });
const leadParams = (id: string, leadId: string) => ({
  params: Promise.resolve({ id, leadId }),
});
const noteParams = (id: string, noteId: string) => ({
  params: Promise.resolve({ id, noteId }),
});

async function createCaseFor(userId: string, title = "Matter"): Promise<string> {
  asUser(userId);
  const res = await createCase(post("http://localhost/api/fraud-radar/cases", { title }));
  expect(res.status).toBe(201);
  return ((await res.json()) as { case: { id: string } }).case.id;
}

async function pinFor(caseId: string): Promise<string> {
  const res = await pinLeadRoute(
    post(`http://localhost/x`, {
      kind: "signal",
      engine: "healthcare",
      entityKey: "1234567890",
      ruleCode: "H-01",
    }),
    idParams(caseId),
  );
  expect(res.status).toBe(201);
  return ((await res.json()) as { lead: { id: string } }).lead.id;
}

beforeEach(() => {
  vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
  vi.stubEnv("ADMIN_EMAILS", "admin@example.com");
  hoisted.store = createInMemoryCaseStore();
  signedOut();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("flag gate — 404 while off, indistinguishable from non-existence", () => {
  it("every cases route 404s with the flag off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    asUser("user-a");
    const cid = "case-whatever";
    expect((await listCases()).status).toBe(404);
    expect((await createCase(post("http://localhost/x", { title: "T" }))).status).toBe(404);
    expect((await getUsage()).status).toBe(404);
    expect((await getCase(get("http://localhost/x"), idParams(cid))).status).toBe(404);
    expect((await patchCase(patch("http://localhost/x", { title: "T" }), idParams(cid))).status).toBe(404);
    expect((await deleteCase(get("http://localhost/x"), idParams(cid))).status).toBe(404);
    expect((await listLeads(get("http://localhost/x"), idParams(cid))).status).toBe(404);
    expect((await pinLeadRoute(post("http://localhost/x", {}), idParams(cid))).status).toBe(404);
    expect((await pinInvestigatorRoute(post("http://localhost/x", {}), idParams(cid))).status).toBe(404);
    expect((await patchLead(patch("http://localhost/x", {}), leadParams(cid, "l1"))).status).toBe(404);
    expect((await deleteLead(get("http://localhost/x"), leadParams(cid, "l1"))).status).toBe(404);
    expect((await listNotes(get("http://localhost/x"), idParams(cid))).status).toBe(404);
    expect((await createNote(post("http://localhost/x", { body: "n" }), idParams(cid))).status).toBe(404);
    expect((await patchNote(patch("http://localhost/x", { body: "n" }), noteParams(cid, "n1"))).status).toBe(404);
    expect((await deleteNote(get("http://localhost/x"), noteParams(cid, "n1"))).status).toBe(404);
  });
});

describe("session gate", () => {
  it("signed-out callers get 401 SIGN_IN_REQUIRED", async () => {
    signedOut();
    const list = await listCases();
    expect(list.status).toBe(401);
    expect(((await list.json()) as { code: string }).code).toBe("SIGN_IN_REQUIRED");
    expect((await getUsage()).status).toBe(401);
  });
});

describe("cases CRUD + tenant isolation (§5.4.1 — 404, not 403)", () => {
  it("a user sees only their own cases in every route", async () => {
    const caseId = await createCaseFor("user-a");

    asUser("user-a");
    expect(((await (await listCases()).json()) as { cases: unknown[] }).cases).toHaveLength(1);
    expect((await getCase(get("http://localhost/x"), idParams(caseId))).status).toBe(200);

    asUser("user-b");
    expect(((await (await listCases()).json()) as { cases: unknown[] }).cases).toHaveLength(0);
    expect((await getCase(get("http://localhost/x"), idParams(caseId))).status).toBe(404);
    expect((await patchCase(patch("http://localhost/x", { title: "Hijack" }), idParams(caseId))).status).toBe(404);
    expect((await deleteCase(get("http://localhost/x"), idParams(caseId))).status).toBe(404);

    // The case survives, untouched, for its owner.
    asUser("user-a");
    const own = await getCase(get("http://localhost/x"), idParams(caseId));
    expect(own.status).toBe(200);
    expect(((await own.json()) as { case: { title: string } }).case.title).toBe("Matter");
  });

  it("PATCH updates the owner's framing and close/reopen sets closedAt", async () => {
    const caseId = await createCaseFor("user-a");
    asUser("user-a");
    const closed = await patchCase(
      patch("http://localhost/x", { status: "closed", summary: "wrapped" }),
      idParams(caseId),
    );
    expect(closed.status).toBe(200);
    const body = (await closed.json()) as { case: { status: string; closedAt: string | null } };
    expect(body.case.status).toBe("closed");
    expect(body.case.closedAt).not.toBeNull();
  });

  it("the owner can hard-delete their case", async () => {
    const caseId = await createCaseFor("user-a");
    asUser("user-a");
    expect((await deleteCase(get("http://localhost/x"), idParams(caseId))).status).toBe(200);
    expect((await getCase(get("http://localhost/x"), idParams(caseId))).status).toBe(404);
  });

  it("case creation enforces the free-tier open-case limit with an honest 429", async () => {
    await createCaseFor("user-a", "One");
    await createCaseFor("user-a", "Two");
    await createCaseFor("user-a", "Three");
    asUser("user-a");
    const fourth = await createCase(post("http://localhost/x", { title: "Four" }));
    expect(fourth.status).toBe(429);
    const body = (await fourth.json()) as { code: string; limit: number };
    expect(body.code).toBe("CASE_LIMIT");
    expect(body.limit).toBe(3);
  });
});

describe("leads — pin/list/remove + isolation + immutability", () => {
  it("pin, list, and remove are owner-only; foreign access is 404 everywhere", async () => {
    const caseId = await createCaseFor("user-a");
    asUser("user-a");
    const leadId = await pinFor(caseId);
    expect(((await (await listLeads(get("http://localhost/x"), idParams(caseId))).json()) as { leads: unknown[] }).leads).toHaveLength(1);

    asUser("user-b");
    expect((await listLeads(get("http://localhost/x"), idParams(caseId))).status).toBe(404);
    expect(
      (await pinLeadRoute(
        post("http://localhost/x", { kind: "entity", engine: "healthcare", entityKey: "1234567890" }),
        idParams(caseId),
      )).status,
    ).toBe(404);
    expect((await patchLead(patch("http://localhost/x", { annotation: "x" }), leadParams(caseId, leadId))).status).toBe(404);
    expect((await deleteLead(get("http://localhost/x"), leadParams(caseId, leadId))).status).toBe(404);

    asUser("user-a");
    expect(((await (await listLeads(get("http://localhost/x"), idParams(caseId))).json()) as { leads: unknown[] }).leads).toHaveLength(1);
  });

  it("a lead id reused under a DIFFERENT case of the same owner is 404 (children never load by own id alone)", async () => {
    const caseOne = await createCaseFor("user-a", "One");
    const caseTwo = await createCaseFor("user-a", "Two");
    asUser("user-a");
    const leadId = await pinFor(caseOne);
    expect((await patchLead(patch("http://localhost/x", { annotation: "x" }), leadParams(caseTwo, leadId))).status).toBe(404);
    expect((await deleteLead(get("http://localhost/x"), leadParams(caseTwo, leadId))).status).toBe(404);
    // The lead is untouched in its own case.
    expect(((await (await listLeads(get("http://localhost/x"), idParams(caseOne))).json()) as { leads: unknown[] }).leads).toHaveLength(1);
  });

  it("re-pinning the identical lead coalesces (200, no second row)", async () => {
    const caseId = await createCaseFor("user-a");
    asUser("user-a");
    await pinFor(caseId);
    const again = await pinLeadRoute(
      post("http://localhost/x", { kind: "signal", engine: "healthcare", entityKey: "1234567890", ruleCode: "H-01" }),
      idParams(caseId),
    );
    expect(again.status).toBe(200);
    expect(((await again.json()) as { created: boolean }).created).toBe(false);
    expect(await store().listLeads(caseId)).toHaveLength(1);
  });

  it("a client-submitted snapshot body is refused — capture is server-side only", async () => {
    const caseId = await createCaseFor("user-a");
    asUser("user-a");
    const res = await pinLeadRoute(
      post("http://localhost/x", {
        kind: "entity",
        engine: "healthcare",
        entityKey: "1234567890",
        snapshot: { data: { fabricated: true } },
      }),
      idParams(caseId),
    );
    expect(res.status).toBe(400);
    expect(await store().listLeads(caseId)).toHaveLength(0);
  });

  it("PATCH annotation works; PATCH of any snapshot field is refused and the snapshot never changes", async () => {
    const caseId = await createCaseFor("user-a");
    asUser("user-a");
    const leadId = await pinFor(caseId);
    const before = (await store().getLead(caseId, leadId))!;

    const ok = await patchLead(
      patch("http://localhost/x", { annotation: "per the referral" }),
      leadParams(caseId, leadId),
    );
    expect(ok.status).toBe(200);

    for (const field of ["snapshot", "snapshotSha256", "entityKey", "ruleCode", "engine"]) {
      const res = await patchLead(
        patch("http://localhost/x", { [field]: "tampered" }),
        leadParams(caseId, leadId),
      );
      expect(res.status, field).toBe(400);
      expect(((await res.json()) as { code: string }).code).toBe("SNAPSHOT_IMMUTABLE");
    }
    const after = (await store().getLead(caseId, leadId))!;
    expect(after.annotation).toBe("per the referral");
    expect(after.snapshotSha256).toBe(before.snapshotSha256);
    expect(JSON.stringify(after.snapshot)).toBe(JSON.stringify(before.snapshot));
  });

  it("removing a pin deletes the row and logs lead_removed WITHOUT the snapshot", async () => {
    const caseId = await createCaseFor("user-a");
    asUser("user-a");
    const leadId = await pinFor(caseId);
    expect((await deleteLead(get("http://localhost/x"), leadParams(caseId, leadId))).status).toBe(200);
    expect(await store().listLeads(caseId)).toHaveLength(0);
    const detail = await getCase(get("http://localhost/x"), idParams(caseId));
    const events = ((await detail.json()) as { events: { kind: string; detail: unknown }[] }).events;
    const removed = events.find((e) => e.kind === "lead_removed");
    expect(removed).toBeDefined();
    // The event records the fact + ids + vintage — never the
    // snapshot body or its data payload.
    expect(JSON.stringify(removed?.detail)).not.toContain("snapshot");
    expect(JSON.stringify(removed?.detail)).not.toContain('"data"');
  });
});

describe("S-06 confinement at the route (§1.3 rule 4)", () => {
  it("a non-admin cannot pin a candidate pair; a platform admin can, into their own case", async () => {
    const caseId = await createCaseFor("user-a");
    asUser("user-a");
    const refused = await pinLeadRoute(
      post("http://localhost/x", { kind: "candidate", engine: "cross", entityKey: "1234567890" }),
      idParams(caseId),
    );
    expect(refused.status).toBe(400);
    expect(((await refused.json()) as { code: string }).code).toBe("CANDIDATE_ADMIN_ONLY");
    expect(await store().listLeads(caseId)).toHaveLength(0);

    hoisted.session = { user: { id: "admin", email: "admin@example.com" } };
    const adminCase = await createCaseFor("admin", "Admin matter");
    hoisted.session = { user: { id: "admin", email: "admin@example.com" } };
    const ok = await pinLeadRoute(
      post("http://localhost/x", { kind: "candidate", engine: "cross", entityKey: "1234567890" }),
      idParams(adminCase),
    );
    expect(ok.status).toBe(201);
    const leads = await store().listLeads(adminCase);
    expect(leads).toHaveLength(1);
    expect(leads[0].kind).toBe("candidate");
    expect((leads[0].snapshot as { data: { status: string } }).data.status).toBe(
      "candidate — human review",
    );
  });
});

describe("investigator pins at the route (§1.3 rule 5)", () => {
  it("pins into the owner's case; foreign case 404; unknown message 404", async () => {
    const caseId = await createCaseFor("user-a");
    asUser("user-a");
    const ok = await pinInvestigatorRoute(
      post("http://localhost/x", { conversationId: "conv-1", messageId: "msg-1" }),
      idParams(caseId),
    );
    expect(ok.status).toBe(201);
    const missing = await pinInvestigatorRoute(
      post("http://localhost/x", { conversationId: "conv-1", messageId: "msg-nope" }),
      idParams(caseId),
    );
    expect(missing.status).toBe(404);
    asUser("user-b");
    expect(
      (await pinInvestigatorRoute(
        post("http://localhost/x", { conversationId: "conv-1", messageId: "msg-1" }),
        idParams(caseId),
      )).status,
    ).toBe(404);
  });
});

describe("notes CRUD + isolation + anchors", () => {
  it("notes are owner-only in every route, and cross-case note ids are 404", async () => {
    const caseOne = await createCaseFor("user-a", "One");
    const caseTwo = await createCaseFor("user-a", "Two");
    asUser("user-a");
    const created = await createNote(
      post("http://localhost/x", { body: "first note" }),
      idParams(caseOne),
    );
    expect(created.status).toBe(201);
    const noteId = ((await created.json()) as { note: { id: string } }).note.id;

    // Same owner, wrong case: the note does not resolve.
    expect((await patchNote(patch("http://localhost/x", { body: "x" }), noteParams(caseTwo, noteId))).status).toBe(404);
    expect((await deleteNote(get("http://localhost/x"), noteParams(caseTwo, noteId))).status).toBe(404);

    // Another user: list, create, patch, delete all fail closed.
    asUser("user-b");
    expect((await listNotes(get("http://localhost/x"), idParams(caseOne))).status).toBe(404);
    expect((await createNote(post("http://localhost/x", { body: "x" }), idParams(caseOne))).status).toBe(404);
    expect((await patchNote(patch("http://localhost/x", { body: "x" }), noteParams(caseOne, noteId))).status).toBe(404);
    expect((await deleteNote(get("http://localhost/x"), noteParams(caseOne, noteId))).status).toBe(404);

    // Owner flow still works end to end.
    asUser("user-a");
    const patched = await patchNote(
      patch("http://localhost/x", { body: "edited note" }),
      noteParams(caseOne, noteId),
    );
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as { note: { body: string } }).note.body).toBe("edited note");
    expect((await deleteNote(get("http://localhost/x"), noteParams(caseOne, noteId))).status).toBe(200);
    expect(((await (await listNotes(get("http://localhost/x"), idParams(caseOne))).json()) as { notes: unknown[] }).notes).toHaveLength(0);
  });

  it("a note anchor must belong to the same case", async () => {
    const caseOne = await createCaseFor("user-a", "One");
    const caseTwo = await createCaseFor("user-a", "Two");
    asUser("user-a");
    const leadId = await pinFor(caseOne);
    // Anchoring caseTwo's note to caseOne's lead: refused.
    const bad = await createNote(
      post("http://localhost/x", { body: "anchored", leadId }),
      idParams(caseTwo),
    );
    expect(bad.status).toBe(400);
    // Anchoring within the same case: works.
    const good = await createNote(
      post("http://localhost/x", { body: "anchored", leadId }),
      idParams(caseOne),
    );
    expect(good.status).toBe(201);
  });
});

describe("usage (§5.3 interface)", () => {
  it("reports the caller's tier posture, derived from the tables", async () => {
    await createCaseFor("user-a");
    asUser("user-a");
    const res = await getUsage();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      tier: string;
      openCases: number;
      maxOpenCases: number;
      vaultEnabled: boolean;
      storageBytesUsed: string;
    };
    expect(body.tier).toBe("free");
    expect(body.openCases).toBe(1);
    expect(body.maxOpenCases).toBe(3);
    expect(body.vaultEnabled).toBe(false);
    expect(body.storageBytesUsed).toBe("0");
  });
});
