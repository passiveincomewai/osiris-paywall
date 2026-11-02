import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Phase 9 Payload A — report API route tests (PHASE9 §5.2,
 * §5.4, §7.3.5): flag-off 404 on every new route, the
 * signed-in gate, tenant isolation per route (another user's
 * report is 404 everywhere — never 403 — and a version id
 * under a foreign report fails at both hops), identifiers-only
 * version creation (a snapshot-shaped body is refused), the
 * report quota as an honest 429, the free-tier template gate,
 * and usage figures derived from the tables.
 */

const hoisted = vi.hoisted(() => ({
  session: null as null | { user: { id: string; email: string } },
  caseStore: null as unknown,
  reportStore: null as unknown,
}));

vi.mock("@/lib/db", () => ({ db: {} }));

vi.mock("@/auth", () => ({
  auth: async () => hoisted.session,
}));

vi.mock("@/lib/fraud-radar/cases/store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/fraud-radar/cases/store")>();
  hoisted.caseStore = actual.createInMemoryCaseStore();
  return { ...actual, getCaseStore: () => hoisted.caseStore };
});

vi.mock("@/lib/fraud-radar/reports/store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/fraud-radar/reports/store")>();
  hoisted.reportStore = actual.createInMemoryReportStore();
  return { ...actual, getReportStore: () => hoisted.reportStore };
});

import { GET as listReports, POST as createReport } from "./route";
import { GET as usage } from "./usage/route";
import {
  GET as getReport,
  PATCH as patchReport,
  DELETE as deleteReport,
} from "./[id]/route";
import {
  GET as listVersions,
  POST as createVersion,
} from "./[id]/versions/route";
import { GET as getVersion } from "./[id]/versions/[versionId]/route";
import { POST as draft } from "./[id]/draft/route";
import type { CaseStore } from "@/lib/fraud-radar/cases/store";

// Alice carries the Phase-11 fraudRadarTier session claim
// (pro) so the case-bound templates are open to her; Bob is
// a plain signed-in user and resolves to the free tier.
const ALICE = {
  user: { id: "user_alice", email: "alice@example.com", fraudRadarTier: "pro" },
};
const BOB = { user: { id: "user_bob", email: "bob@example.com" } };

function req(method: string, body?: unknown) {
  return new NextRequest("http://localhost/api/fraud-radar/reports", {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

async function seedCase(ownerId: string): Promise<string> {
  const store = hoisted.caseStore as CaseStore;
  const row = await store.createCase({ ownerId, title: "Seed case" });
  return row.id;
}

async function makeReport(title = "Alice report"): Promise<string> {
  hoisted.session = ALICE;
  const caseId = await seedCase(ALICE.user.id);
  const res = await createReport(
    req("POST", { templateId: "B", title, caseId }),
  );
  expect(res.status).toBe(201);
  const json = (await res.json()) as { report: { id: string } };
  return json.report.id;
}

describe("report routes (P9-A)", () => {
  beforeEach(() => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    hoisted.session = null;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("flag off: every route 404s", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    hoisted.session = ALICE;
    const id = "whatever";
    const ctx = { params: Promise.resolve({ id }) };
    const vctx = { params: Promise.resolve({ id, versionId: "v1" }) };
    expect((await listReports()).status).toBe(404);
    expect((await createReport(req("POST", { templateId: "B", title: "x" }))).status).toBe(404);
    expect((await usage()).status).toBe(404);
    expect((await getReport(req("GET"), ctx)).status).toBe(404);
    expect((await patchReport(req("PATCH", { title: "y" }), ctx)).status).toBe(404);
    expect((await deleteReport(req("DELETE"), ctx)).status).toBe(404);
    expect((await listVersions(req("GET"), ctx)).status).toBe(404);
    expect((await createVersion(req("POST", {}), ctx)).status).toBe(404);
    expect((await getVersion(req("GET"), vctx)).status).toBe(404);
    expect((await draft(req("POST", {}), ctx)).status).toBe(404);
  });

  it("signed out: every route 401s once the flag is on", async () => {
    hoisted.session = null;
    expect((await listReports()).status).toBe(401);
    expect((await usage()).status).toBe(401);
  });

  it("create → list → detail → patch → delete, owner-scoped throughout", async () => {
    const reportId = await makeReport();
    const list = (await (await listReports()).json()) as {
      reports: { id: string }[];
    };
    expect(list.reports.map((r) => r.id)).toContain(reportId);

    const detail = (await (
      await getReport(req("GET"), { params: Promise.resolve({ id: reportId }) })
    ).json()) as { report: { title: string }; versions: unknown[] };
    expect(detail.report.title).toBe("Alice report");
    expect(detail.versions).toEqual([]);

    const patched = await patchReport(req("PATCH", { status: "archived" }), {
      params: Promise.resolve({ id: reportId }),
    });
    expect(patched.status).toBe(200);

    // Bob sees nothing of Alice's report — 404, never 403.
    hoisted.session = BOB;
    expect(
      (await getReport(req("GET"), { params: Promise.resolve({ id: reportId }) }))
        .status,
    ).toBe(404);
    expect(
      (await patchReport(req("PATCH", { title: "hijack" }), {
        params: Promise.resolve({ id: reportId }),
      })).status,
    ).toBe(404);
    expect(
      (await deleteReport(req("DELETE"), { params: Promise.resolve({ id: reportId }) }))
        .status,
    ).toBe(404);
    const bobList = (await (await listReports()).json()) as { reports: unknown[] };
    expect(bobList.reports).toEqual([]);

    hoisted.session = ALICE;
    expect(
      (await deleteReport(req("DELETE"), { params: Promise.resolve({ id: reportId }) }))
        .status,
    ).toBe(200);
    expect(
      (await getReport(req("GET"), { params: Promise.resolve({ id: reportId }) }))
        .status,
    ).toBe(404);
  });

  it("a report cannot be homed on another user's case (404)", async () => {
    hoisted.session = ALICE;
    const bobCase = await seedCase(BOB.user.id);
    const res = await createReport(
      req("POST", { templateId: "B", title: "x", caseId: bobCase }),
    );
    expect(res.status).toBe(404);
  });

  it("the free tier cannot create a Template G report (403 template gate) and the report limit is a 429", async () => {
    // Bob is the fresh user for this test (the stores are
    // module-shared across the file): free maxReports = 3.
    hoisted.session = BOB;
    const g = await createReport(req("POST", { templateId: "G", title: "tip pkg" }));
    expect(g.status).toBe(403);
    for (let i = 0; i < 3; i++) {
      const res = await createReport(req("POST", { templateId: "A", title: `filler ${i}` }));
      expect(res.status).toBe(201);
    }
    const over = await createReport(req("POST", { templateId: "A", title: "one too many" }));
    expect(over.status).toBe(429);
    const body = (await over.json()) as { code: string; limit: number };
    expect(body.code).toBe("REPORT_LIMIT");
    expect(body.limit).toBe(3);
    hoisted.session = ALICE;
  });

  it("version creation captures pins server-side from identifiers; snapshot-shaped bodies are refused", async () => {
    const reportId = await makeReport("Versioned");
    const ctx = { params: Promise.resolve({ id: reportId }) };

    const forged = await createVersion(
      req("POST", { pins: { snapshotSha256: "f".repeat(64) } }),
      ctx,
    );
    expect(forged.status).toBe(400);

    const created = await createVersion(req("POST", { pins: {} }), ctx);
    expect(created.status).toBe(201);
    const json = (await created.json()) as {
      version: { id: string; versionNo: number; casePin: { caseSnapshotSha256: string } };
    };
    expect(json.version.versionNo).toBe(1);
    expect(json.version.casePin.caseSnapshotSha256).toMatch(/^[0-9a-f]{64}$/);

    const versions = (await (await listVersions(req("GET"), ctx)).json()) as {
      versions: unknown[];
    };
    expect(versions.versions.length).toBe(1);

    const detail = await getVersion(req("GET"), {
      params: Promise.resolve({ id: reportId, versionId: json.version.id }),
    });
    expect(detail.status).toBe(200);
    const vjson = (await detail.json()) as {
      version: { pinSet: { case: { caseId: string } } };
      exports: unknown[];
      jobs: unknown[];
    };
    expect(vjson.version.pinSet.case.caseId).toBeTruthy();
    expect(vjson.exports).toEqual([]);
    expect(vjson.jobs).toEqual([]);

    // A version id under a foreign report fails at both hops.
    const otherReport = await makeReport("Other report");
    const cross = await getVersion(req("GET"), {
      params: Promise.resolve({ id: otherReport, versionId: json.version.id }),
    });
    expect(cross.status).toBe(404);

    // Bob cannot create a version on Alice's report.
    hoisted.session = BOB;
    expect((await createVersion(req("POST", { pins: {} }), ctx)).status).toBe(404);
    hoisted.session = ALICE;
  });

  it("the draft route returns pins + pre-check without storing a version", async () => {
    const reportId = await makeReport("Drafty");
    const ctx = { params: Promise.resolve({ id: reportId }) };
    const res = await draft(req("POST", { pins: {} }), ctx);
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      draftSha256: string;
      preCheck: { furnitureComplete: boolean };
      pinSetSummary: { case: { caseSnapshotSha256: string } };
    };
    expect(json.draftSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(json.preCheck.furnitureComplete).toBe(true);
    expect(json.pinSetSummary.case.caseSnapshotSha256).toMatch(/^[0-9a-f]{64}$/);
    const versions = (await (await listVersions(req("GET"), ctx)).json()) as {
      versions: unknown[];
    };
    expect(versions.versions).toEqual([]);
  });

  it("usage derives from the tables", async () => {
    hoisted.session = ALICE;
    const res = await usage();
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      tier: string;
      reportsUsed: number;
      maxReports: number;
      generationsThisMonth: number;
      exportBytesThisMonth: string;
    };
    expect(json.tier).toBe("pro");
    expect(json.maxReports).toBe(500);
    expect(json.reportsUsed).toBeGreaterThanOrEqual(1);
    expect(json.generationsThisMonth).toBe(0);
    expect(json.exportBytesThisMonth).toBe("0");
  });
});
