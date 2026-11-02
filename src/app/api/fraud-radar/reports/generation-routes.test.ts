import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * Phase 9 Payload P9-C — generate / preview / download route
 * tests (PHASE9 §3.1, §5.2, §5.4, §7.3.5): flag-off 404 on
 * every new route, the signed-in gate, tenant isolation per
 * route (another user's report/version/export is 404
 * everywhere — never 403), the 202 enqueue + job ledger, the
 * generation quota as an honest 429, the storage-unconfigured
 * 503 that creates no job, downloads that stream through the
 * gated route with version-named attachments, and a preview
 * that exists only for a generated, passing version.
 */

const hoisted = vi.hoisted(() => ({
  session: null as null | { user: { id: string; email: string } },
  reportStore: null as unknown,
  storageConfigured: true,
  blobs: new Map<string, Uint8Array>(),
}));

vi.mock("@/lib/db", () => ({ db: {} }));

vi.mock("@/auth", () => ({
  auth: async () => hoisted.session,
}));

vi.mock("@/lib/fraud-radar/reports/store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/fraud-radar/reports/store")>();
  hoisted.reportStore = actual.createInMemoryReportStore();
  return { ...actual, getReportStore: () => hoisted.reportStore };
});

vi.mock("@/lib/fraud-radar/reports/blob", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/fraud-radar/reports/blob")>();
  return {
    ...actual,
    reportStorageConfigured: () => hoisted.storageConfigured,
    openReportStream: async (pathname: string) => {
      const bytes = hoisted.blobs.get(pathname);
      if (!bytes) return null;
      return {
        stream: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        }),
        contentType: null,
        size: bytes.length,
      };
    },
  };
});

import { POST as generate } from "./[id]/versions/[versionId]/generate/route";
import { GET as preview } from "./[id]/versions/[versionId]/preview/route";
import { GET as download } from "./[id]/versions/[versionId]/exports/[exportId]/download/route";
import type {
  ReportStore,
  ReportRecord,
  ReportVersionRecord,
} from "@/lib/fraud-radar/reports/store";
import type { PinSet } from "@/lib/fraud-radar/reports/pins";

const ALICE = {
  user: { id: "user_alice", email: "alice@example.com", fraudRadarTier: "pro" },
};
const BOB = { user: { id: "user_bob", email: "bob@example.com" } };

const PIN_SET: PinSet = {
  leads: [],
  entities: [],
  verifications: [],
  evidence: [],
  datasets: [],
};

function store(): ReportStore {
  return hoisted.reportStore as ReportStore;
}

async function seed(
  ownerId = "user_alice",
): Promise<{ report: ReportRecord; version: ReportVersionRecord }> {
  const report = await store().createReport({
    ownerId,
    templateId: "B",
    title: "Seeded report",
  });
  const version = await store().createVersion({
    reportId: report.id,
    versionNo: 1,
    templateVersion: "1.0.0",
    generatorVersion: "1.0.0",
    pinSet: PIN_SET,
    composition: { sections: [] },
    createdById: ownerId,
  });
  return { report, version };
}

function postReq(body?: unknown) {
  return new NextRequest("http://localhost/api/fraud-radar/reports/x/generate", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  });
}

const ctx = (id: string, versionId: string) => ({
  params: Promise.resolve({ id, versionId }),
});
const dctx = (id: string, versionId: string, exportId: string) => ({
  params: Promise.resolve({ id, versionId, exportId }),
});

describe("report generation routes (P9-C)", () => {
  beforeEach(() => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "1");
    hoisted.session = null;
    hoisted.storageConfigured = true;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("flag off: every new route 404s", async () => {
    vi.stubEnv("FRAUD_RADAR_ENABLED", "");
    hoisted.session = ALICE;
    const { report, version } = await seed();
    expect(
      (await generate(postReq({ formats: ["json"] }), ctx(report.id, version.id))).status,
    ).toBe(404);
    expect((await preview(postReq(), ctx(report.id, version.id))).status).toBe(404);
    expect(
      (await download(postReq(), dctx(report.id, version.id, "e1"))).status,
    ).toBe(404);
  });

  it("signed out: every new route 401s once the flag is on", async () => {
    const { report, version } = await seed();
    hoisted.session = null;
    expect(
      (await generate(postReq({ formats: ["json"] }), ctx(report.id, version.id))).status,
    ).toBe(401);
    expect((await preview(postReq(), ctx(report.id, version.id))).status).toBe(401);
    expect(
      (await download(postReq(), dctx(report.id, version.id, "e1"))).status,
    ).toBe(401);
  });

  it("generate enqueues one job (202) and refuses a second while it is in flight (409)", async () => {
    const { report, version } = await seed();
    hoisted.session = ALICE;
    const res = await generate(postReq({ formats: ["json", "zip"] }), ctx(report.id, version.id));
    expect(res.status).toBe(202);
    const json = (await res.json()) as { job: { status: string; formats: string[] } };
    expect(json.job.status).toBe("queued");
    expect(json.job.formats).toEqual(["json", "zip"]);
    const again = await generate(postReq({ formats: ["json"] }), ctx(report.id, version.id));
    expect(again.status).toBe(409);
    const jobs = await store().listGenerationJobs(report.id, version.id);
    expect(jobs.length).toBe(1);
  });

  it("generate validates formats (400) and 404s a foreign report", async () => {
    const { report, version } = await seed();
    hoisted.session = ALICE;
    expect(
      (await generate(postReq({ formats: ["exe"] }), ctx(report.id, version.id))).status,
    ).toBe(400);
    expect(
      (await generate(postReq({}), ctx(report.id, version.id))).status,
    ).toBe(400);
    hoisted.session = BOB;
    expect(
      (await generate(postReq({ formats: ["json"] }), ctx(report.id, version.id))).status,
    ).toBe(404);
  });

  it("generate 503s when storage is unconfigured and creates no job", async () => {
    const { report, version } = await seed();
    hoisted.session = ALICE;
    hoisted.storageConfigured = false;
    const res = await generate(postReq({ formats: ["json"] }), ctx(report.id, version.id));
    expect(res.status).toBe(503);
    const json = (await res.json()) as { code: string };
    expect(json.code).toBe("storage_unavailable");
    expect(await store().listGenerationJobs(report.id, version.id)).toEqual([]);
  });

  it("the free tier's monthly generation quota is an honest 429 with limit + reset", async () => {
    // Bob (free, 5/month): five jobs already on the ledger.
    for (let i = 0; i < 5; i++) {
      const seeded = await seed("user_bob");
      await store().createGenerationJob({
        versionId: seeded.version.id,
        reportId: seeded.report.id,
        ownerId: "user_bob",
        formats: ["json"],
      });
    }
    const { report, version } = await seed("user_bob");
    // Bob's seeded reports used template B, which the free
    // tier cannot generate — recreate under Template A.
    const aReport = await store().createReport({
      ownerId: "user_bob",
      templateId: "A",
      title: "Bob A",
    });
    const aVersion = await store().createVersion({
      reportId: aReport.id,
      versionNo: 1,
      templateVersion: "1.0.0",
      generatorVersion: "1.0.0",
      pinSet: PIN_SET,
      composition: { sections: [] },
      createdById: "user_bob",
    });
    void report;
    void version;
    hoisted.session = BOB;
    const res = await generate(
      postReq({ formats: ["json"] }),
      ctx(aReport.id, aVersion.id),
    );
    expect(res.status).toBe(429);
    const json = (await res.json()) as { code: string; limit: number; resetAt: string };
    expect(json.code).toBe("GENERATION_LIMIT");
    expect(json.limit).toBe(5);
    expect(json.resetAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("download streams a generated export with a version-named attachment; preview serves the stored HTML", async () => {
    const { report, version } = await seed();
    const pathname = `fraud-radar-reports/user_alice/${report.id}/${version.id}/report.json`;
    hoisted.blobs.set(pathname, new TextEncoder().encode('{"ok":true}'));
    hoisted.blobs.set(
      `fraud-radar-reports/user_alice/${report.id}/${version.id}/preview.html`,
      new TextEncoder().encode("<html>preview</html>"),
    );
    const row = await store().createExport({
      versionId: version.id,
      format: "json",
      blobPathname: pathname,
      sizeBytes: BigInt(11),
      sha256: "b".repeat(64),
      contentSha256: "a".repeat(64),
    });
    await store().completeVersionGeneration(report.id, version.id, {
      documentPathname: `fraud-radar-reports/user_alice/${report.id}/${version.id}/document.json`,
      contentSha256: "a".repeat(64),
      manifest: {
        reportId: report.id,
        versionNo: 1,
        versionId: version.id,
        template: { id: "B", version: "1.0.0", registryVersion: "1.0.0" },
        generator: { version: "1.0.0", rendererVersions: {} },
        pins: PIN_SET,
        contentSha256: "a".repeat(64),
        validation: {
          verdict: "pass",
          validatorVersion: "1.0.0",
          checkedAt: new Date().toISOString(),
          warnings: [],
        },
        generatedAt: new Date().toISOString(),
        exports: [],
      },
      validationVerdict: "pass",
    });

    hoisted.session = ALICE;
    const dl = await download(postReq(), dctx(report.id, version.id, row.id));
    expect(dl.status).toBe(200);
    expect(dl.headers.get("content-disposition")).toBe(
      'attachment; filename="fraud-radar-report-v1.json"',
    );
    expect(dl.headers.get("cache-control")).toBe("private, no-store");
    expect(await dl.text()).toBe('{"ok":true}');

    const pv = await preview(postReq(), ctx(report.id, version.id));
    expect(pv.status).toBe(200);
    expect(pv.headers.get("content-type")).toContain("text/html");
    expect(await pv.text()).toContain("preview");

    // Bob gets 404 on both — never 403, never bytes.
    hoisted.session = BOB;
    expect(
      (await download(postReq(), dctx(report.id, version.id, row.id))).status,
    ).toBe(404);
    expect((await preview(postReq(), ctx(report.id, version.id))).status).toBe(404);
  });

  it("preview 404s before generation, and download 404s for an export under the wrong version", async () => {
    const { report, version } = await seed();
    const other = await seed();
    const row = await store().createExport({
      versionId: version.id,
      format: "json",
      blobPathname: `fraud-radar-reports/user_alice/${report.id}/${version.id}/report.json`,
      sizeBytes: BigInt(1),
      sha256: "b".repeat(64),
      contentSha256: "a".repeat(64),
    });
    hoisted.session = ALICE;
    expect((await preview(postReq(), ctx(report.id, version.id))).status).toBe(404);
    expect(
      (await download(postReq(), dctx(report.id, other.version.id, row.id))).status,
    ).toBe(404);
    expect(
      (await download(postReq(), dctx(other.report.id, other.version.id, row.id))).status,
    ).toBe(404);
  });
});
