import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Phase 8 Payload C — claim + verification API route tests
 * (PHASE8 §5.4.1, §4.1): flag-off 404 on every new route, the
 * signed-in gate, tenant isolation per route (another user's
 * claim is 404 everywhere — never 403 — and a claim id reused
 * under a different case fails at both hops), the verify flow
 * end to end (a new append-only FrClaimVerification per run,
 * verdict + definition + corpus vintages on the wire), and
 * the §5.3 monthly verification quota as an honest 429. The
 * store is in-memory; the Phase 7 tool registry's executeTool
 * is replaced by a fixture executor (the real checker runs —
 * its fixture verdicts are proven in claim-check.test.ts).
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

vi.mock("@/lib/fraud-radar/investigator/tools", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/fraud-radar/investigator/tools")>();
  const envelope = (
    tool: string,
    dataset: string,
    version: string,
    grainKey: string,
    data: unknown,
  ) => ({
    envelope: {
      tool,
      dataset,
      datasetVersion: version,
      grainKey,
      sourceVintages: [{ source: dataset, version }],
      caveats: [],
      truncated: false,
    },
    data,
  });
  return {
    ...actual,
    executeTool: async (name: string, args: Record<string, unknown>) => {
      if (name === "get_grant_recipient_profile") {
        const uei = String(args.uei);
        return envelope(name, "grants-aggregates", "2026-10-06", `UEI:${uei}`, {
          state: "ok",
          found: true,
          uei,
          stub: {
            uei,
            awardCount: 12,
            obligatedAwardCumulativeUsd: 2_100_000,
            outlayAwardCumulativeUsd: 1_800_000,
            samExclusionListed: false,
          },
          totals: {
            awardCount: 12,
            obligatedAwardCumulativeUsd: 2_100_000,
            outlayAwardCumulativeUsd: 1_800_000,
          },
          screening: { samExclusionListingCount: 0, leieCandidateCount: 0 },
          identity: { recipientName: "Fixture Recipient" },
        });
      }
      if (name === "get_entity_signals") {
        return envelope(name, "research-signals", "2026-02-09", `UEI:${String(args.entityKey)}`, {
          state: "ok",
          engines: {},
        });
      }
      if (name === "get_source_registry") {
        return envelope(name, "source-registry", "2026-10-31", "slug:all", {
          state: "ok",
          sources: [],
        });
      }
      throw new actual.ToolError("tool_unavailable", `fixture: ${name} unavailable`);
    },
  };
});

import { POST as createCase } from "./route";
import { GET as getUsage } from "./usage/route";
import { GET as listClaims, POST as createClaim } from "./[id]/claims/route";
import { DELETE as deleteClaim } from "./[id]/claims/[claimId]/route";
import { POST as verifyClaim } from "./[id]/claims/[claimId]/verify/route";
import { GET as listVerifications } from "./[id]/claims/[claimId]/verifications/route";
import { POST as createNote } from "./[id]/notes/route";
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
const post = (url: string, body?: unknown) =>
  new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const get = (url: string) => new NextRequest(url);
const idParams = (id: string) => ({ params: Promise.resolve({ id }) });
const claimParams = (id: string, claimId: string) => ({
  params: Promise.resolve({ id, claimId }),
});

const STATEMENT = "The recipient received $2,100,000 in obligated funds.";
const SUBJECT = {
  subjectEngine: "grants",
  subjectEntityKey: "UEI:TESTAB123456",
};

async function createCaseFor(userId: string, title = "Matter"): Promise<string> {
  asUser(userId);
  const res = await createCase(post("http://localhost/api/fraud-radar/cases", { title }));
  expect(res.status).toBe(201);
  return ((await res.json()) as { case: { id: string } }).case.id;
}

async function createClaimFor(caseId: string): Promise<string> {
  const res = await createClaim(
    post("http://localhost/x", { statement: STATEMENT, ...SUBJECT }),
    idParams(caseId),
  );
  expect(res.status).toBe(201);
  return ((await res.json()) as { claim: { id: string } }).claim.id;
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
  it("every claim route 404s with the flag off", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    asUser("user-a");
    const cid = "case-whatever";
    const claimId = "claim-whatever";
    expect((await listClaims(get("http://localhost/x"), idParams(cid))).status).toBe(404);
    expect((await createClaim(post("http://localhost/x", { statement: "s" }), idParams(cid))).status).toBe(404);
    expect((await deleteClaim(get("http://localhost/x"), claimParams(cid, claimId))).status).toBe(404);
    expect((await verifyClaim(post("http://localhost/x"), claimParams(cid, claimId))).status).toBe(404);
    expect((await listVerifications(get("http://localhost/x"), claimParams(cid, claimId))).status).toBe(404);
  });
});

describe("session gate", () => {
  it("signed-out callers get 401 on the claim routes", async () => {
    signedOut();
    expect((await listClaims(get("http://localhost/x"), idParams("c1"))).status).toBe(401);
    expect((await verifyClaim(post("http://localhost/x"), claimParams("c1", "cl1"))).status).toBe(401);
  });
});

describe("claims CRUD + tenant isolation (§5.4.1 — 404, not 403)", () => {
  it("claims are owner-only in every route; the statement is stored verbatim", async () => {
    const caseId = await createCaseFor("user-a");
    asUser("user-a");
    const claimId = await createClaimFor(caseId);
    const listed = await listClaims(get("http://localhost/x"), idParams(caseId));
    const claims = ((await listed.json()) as { claims: { statement: string }[] }).claims;
    expect(claims).toHaveLength(1);
    expect(claims[0].statement).toBe(STATEMENT);

    asUser("user-b");
    expect((await listClaims(get("http://localhost/x"), idParams(caseId))).status).toBe(404);
    expect(
      (await createClaim(post("http://localhost/x", { statement: "x" }), idParams(caseId))).status,
    ).toBe(404);
    expect((await deleteClaim(get("http://localhost/x"), claimParams(caseId, claimId))).status).toBe(404);
    expect((await verifyClaim(post("http://localhost/x"), claimParams(caseId, claimId))).status).toBe(404);
    expect((await listVerifications(get("http://localhost/x"), claimParams(caseId, claimId))).status).toBe(404);

    asUser("user-a");
    expect(
      ((await (await listClaims(get("http://localhost/x"), idParams(caseId))).json()) as { claims: unknown[] }).claims,
    ).toHaveLength(1);
  });

  it("a claim id reused under a DIFFERENT case of the same owner is 404 at both hops", async () => {
    const caseOne = await createCaseFor("user-a", "One");
    const caseTwo = await createCaseFor("user-a", "Two");
    asUser("user-a");
    const claimId = await createClaimFor(caseOne);
    expect((await verifyClaim(post("http://localhost/x"), claimParams(caseTwo, claimId))).status).toBe(404);
    expect((await listVerifications(get("http://localhost/x"), claimParams(caseTwo, claimId))).status).toBe(404);
    expect((await deleteClaim(get("http://localhost/x"), claimParams(caseTwo, claimId))).status).toBe(404);
    expect(await store().listClaims(caseOne)).toHaveLength(1);
  });

  it("invalid statements and unknown subject engines are refused 400", async () => {
    const caseId = await createCaseFor("user-a");
    asUser("user-a");
    expect(
      (await createClaim(post("http://localhost/x", { statement: "  " }), idParams(caseId))).status,
    ).toBe(400);
    expect(
      (await createClaim(
        post("http://localhost/x", { statement: "Ok.", subjectEngine: "nope" }),
        idParams(caseId),
      )).status,
    ).toBe(400);
    expect(await store().listClaims(caseId)).toHaveLength(0);
  });

  it("the owner can delete a claim; its verifications go with it", async () => {
    const caseId = await createCaseFor("user-a");
    asUser("user-a");
    const claimId = await createClaimFor(caseId);
    expect((await verifyClaim(post("http://localhost/x"), claimParams(caseId, claimId))).status).toBe(201);
    expect((await deleteClaim(get("http://localhost/x"), claimParams(caseId, claimId))).status).toBe(200);
    expect((await listVerifications(get("http://localhost/x"), claimParams(caseId, claimId))).status).toBe(404);
    expect(await store().listClaims(caseId)).toHaveLength(0);
  });

  it("a note can anchor to a claim in its own case (claimExists is real)", async () => {
    const caseId = await createCaseFor("user-a");
    asUser("user-a");
    const claimId = await createClaimFor(caseId);
    const ok = await createNote(
      post("http://localhost/x", { body: "about this claim", claimId }),
      idParams(caseId),
    );
    expect(ok.status).toBe(201);
    const bad = await createNote(
      post("http://localhost/x", { body: "dangling", claimId: "claim-nope" }),
      idParams(caseId),
    );
    expect(bad.status).toBe(400);
  });
});

describe("verification runs — append-only, metered, fully provenanced", () => {
  it("verify returns the verdict with its definition, citations and corpus vintages; re-runs append", async () => {
    const caseId = await createCaseFor("user-a");
    asUser("user-a");
    const claimId = await createClaimFor(caseId);

    const first = await verifyClaim(post("http://localhost/x"), claimParams(caseId, claimId));
    expect(first.status).toBe(201);
    const v1 = ((await first.json()) as { verification: Record<string, unknown> }).verification;
    expect(v1.verdict).toBe("supported");
    expect(String(v1.verdictDefinition)).toContain("checkable figures");
    expect(v1.checkerVersion).toBe("1.0.0");
    expect((v1.corpusVersions as Record<string, string>)["grants-aggregates"]).toBe("2026-10-06");
    const evidence = v1.evidence as { citations: { dataset: string }[] };
    expect(evidence.citations[0].dataset).toBe("grants-aggregates");

    const second = await verifyClaim(post("http://localhost/x"), claimParams(caseId, claimId));
    expect(second.status).toBe(201);
    const v2 = ((await second.json()) as { verification: { id: string } }).verification;
    expect(v2.id).not.toBe(v1.id);

    const history = await listVerifications(get("http://localhost/x"), claimParams(caseId, claimId));
    const rows = ((await history.json()) as { verifications: { id: string }[] }).verifications;
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBe(v1.id);
    expect(rows[1].id).toBe(v2.id);

    // The usage ledger is the verification rows themselves.
    const usage = await getUsage();
    const usageBody = (await usage.json()) as {
      verificationsThisMonth: number;
      verificationsPerMonth: number;
    };
    expect(usageBody.verificationsThisMonth).toBe(2);
    expect(usageBody.verificationsPerMonth).toBe(5);
  });

  it("the free-tier monthly verification quota refuses the 6th run with an honest 429", async () => {
    const caseId = await createCaseFor("user-a");
    asUser("user-a");
    const claimId = await createClaimFor(caseId);
    for (let i = 0; i < 5; i++) {
      expect(
        (await verifyClaim(post("http://localhost/x"), claimParams(caseId, claimId))).status,
      ).toBe(201);
    }
    const sixth = await verifyClaim(post("http://localhost/x"), claimParams(caseId, claimId));
    expect(sixth.status).toBe(429);
    const body = (await sixth.json()) as { code: string; limit: number; resetAt: string };
    expect(body.code).toBe("VERIFICATION_LIMIT");
    expect(body.limit).toBe(5);
    expect(typeof body.resetAt).toBe("string");
    // The refused run wrote nothing.
    expect(await store().listVerifications(caseId, claimId)).toHaveLength(5);
  });
});
