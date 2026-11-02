import { describe, it, expect } from "vitest";
import {
  createInMemoryReportStore,
  type ReportStore,
} from "./store";
import {
  enqueueGeneration,
  validateGenerationFormats,
  GenerationConflictError,
  GenerationInputError,
  GenerationQuotaError,
  TemplateUnavailableError,
} from "./generation";
import { reportEntitlementsFor } from "./entitlements";
import {
  assertReportsCorpusFirewall,
  exportDownloadFilename,
  reportBlobPathname,
  reportPreviewPathname,
  reportStorageConfigured,
  REPORTS_PATH_PREFIX,
} from "./blob";
import type { PinSet } from "./pins";

/**
 * Phase 9 Payload P9-C — generation enqueue + report storage
 * (PHASE9 §3.1, §3.5, §5.2, §5.3): the enqueue validates
 * formats against the registry, refuses templates the cut
 * line marks unavailable, meters generations from the job
 * table itself, never double-queues a version, and never
 * re-generates a version whose validation passed. Storage
 * pathnames are segment-validated and owner-prefixed, and
 * downloads always name the version.
 */

const PIN_SET: PinSet = {
  leads: [],
  entities: [],
  verifications: [],
  evidence: [],
  datasets: [],
};

async function seedVersion(
  store: ReportStore,
  templateId = "B",
  ownerId = "user_alice",
) {
  const report = await store.createReport({
    ownerId,
    templateId,
    title: "Seeded report",
  });
  const version = await store.createVersion({
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

describe("generation enqueue (P9-C)", () => {
  it("creates exactly one queued job with the requested formats", async () => {
    const store = createInMemoryReportStore();
    const { report, version } = await seedVersion(store);
    const job = await enqueueGeneration(store, {
      reportRow: report,
      version,
      formats: ["json", "csv", "zip"],
      entitlements: reportEntitlementsFor("pro"),
    });
    expect(job.status).toBe("queued");
    expect(job.formats).toEqual(["json", "csv", "zip"]);
    expect(job.reportId).toBe(report.id);
    expect(job.ownerId).toBe("user_alice");
    const jobs = await store.listGenerationJobs(report.id, version.id);
    expect(jobs.length).toBe(1);
  });

  it("accepts a PDF request into the job (the worker records it unavailable; nothing is faked at enqueue)", async () => {
    const store = createInMemoryReportStore();
    const { report, version } = await seedVersion(store);
    const job = await enqueueGeneration(store, {
      reportRow: report,
      version,
      formats: ["pdf", "json"],
      entitlements: reportEntitlementsFor("pro"),
    });
    expect(job.formats).toEqual(["pdf", "json"]);
  });

  it("refuses unknown formats, empty lists, and formats the template does not offer", async () => {
    expect(() => validateGenerationFormats("B", [])).toThrow(GenerationInputError);
    expect(() => validateGenerationFormats("B", ["exe"])).toThrow(GenerationInputError);
    expect(() => validateGenerationFormats("B", "json")).toThrow(GenerationInputError);
    expect(validateGenerationFormats("B", ["json", "json", "zip"])).toEqual([
      "json",
      "zip",
    ]);
  });

  it("refuses a template the registry marks unavailable (the §7.2 cut line)", async () => {
    const store = createInMemoryReportStore();
    const { report, version } = await seedVersion(store, "C");
    await expect(
      enqueueGeneration(store, {
        reportRow: report,
        version,
        formats: ["json"],
        entitlements: reportEntitlementsFor("pro"),
      }),
    ).rejects.toBeInstanceOf(TemplateUnavailableError);
  });

  it("meters the monthly quota from the job table (the §5.3 ledger)", async () => {
    const store = createInMemoryReportStore();
    const free = reportEntitlementsFor("free");
    // Five jobs already this month for this owner (any reports).
    for (let i = 0; i < 5; i++) {
      const seeded = await seedVersion(store, "A", "user_bob");
      await store.createGenerationJob({
        versionId: seeded.version.id,
        reportId: seeded.report.id,
        ownerId: "user_bob",
        formats: ["json"],
      });
    }
    const { report, version } = await seedVersion(store, "A", "user_bob");
    await expect(
      enqueueGeneration(store, {
        reportRow: report,
        version,
        formats: ["json"],
        entitlements: free,
        now: new Date(),
      }),
    ).rejects.toBeInstanceOf(GenerationQuotaError);
  });

  it("never double-queues a version with a job in flight", async () => {
    const store = createInMemoryReportStore();
    const { report, version } = await seedVersion(store);
    await enqueueGeneration(store, {
      reportRow: report,
      version,
      formats: ["json"],
      entitlements: reportEntitlementsFor("pro"),
    });
    await expect(
      enqueueGeneration(store, {
        reportRow: report,
        version,
        formats: ["json"],
        entitlements: reportEntitlementsFor("pro"),
      }),
    ).rejects.toBeInstanceOf(GenerationConflictError);
  });

  it("refuses to re-generate a version whose validation passed; a failed version may be retried", async () => {
    const store = createInMemoryReportStore();
    const { report, version } = await seedVersion(store);
    await store.completeVersionGeneration(report.id, version.id, {
      documentPathname: "fraud-radar-reports/user_alice/x/y/document.json",
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
    const completed = await store.getVersion(report.id, version.id);
    await expect(
      enqueueGeneration(store, {
        reportRow: report,
        version: completed!,
        formats: ["json"],
        entitlements: reportEntitlementsFor("pro"),
      }),
    ).rejects.toBeInstanceOf(GenerationConflictError);
  });

  it("resolves an export through both parents and no fewer", async () => {
    const store = createInMemoryReportStore();
    const { report, version } = await seedVersion(store);
    const other = await seedVersion(store);
    const row = await store.createExport({
      versionId: version.id,
      format: "json",
      blobPathname: "fraud-radar-reports/user_alice/r/v/report.json",
      sizeBytes: BigInt(10),
      sha256: "b".repeat(64),
      contentSha256: "a".repeat(64),
    });
    expect((await store.getExport(report.id, version.id, row.id))?.id).toBe(row.id);
    expect(await store.getExport(other.report.id, version.id, row.id)).toBeNull();
    expect(await store.getExport(report.id, other.version.id, row.id)).toBeNull();
    expect(await store.getExport(report.id, version.id, "nope")).toBeNull();
  });
});

describe("report storage pathnames (P9-C)", () => {
  it("builds owner-prefixed pathnames and refuses unsafe segments", () => {
    expect(REPORTS_PATH_PREFIX).toBe("fraud-radar-reports/");
    expect(reportBlobPathname("u1", "r1", "v1", "report.json")).toBe(
      "fraud-radar-reports/u1/r1/v1/report.json",
    );
    expect(reportPreviewPathname("u1", "r1", "v1")).toBe(
      "fraud-radar-reports/u1/r1/v1/preview.html",
    );
    expect(() => reportBlobPathname("u/1", "r1", "v1", "report.json")).toThrow();
    expect(() => reportBlobPathname("u1", "r1", "v1", "../secret")).toThrow();
    expect(() => reportBlobPathname("u1", "r1", "v1", "a/b.json")).toThrow();
  });

  it("names downloads by version, never 'latest'", () => {
    expect(exportDownloadFilename("pdf", 3)).toBe("fraud-radar-report-v3.pdf");
    expect(exportDownloadFilename("json", 1)).toBe("fraud-radar-report-v1.json");
  });

  it("reports storage configuration honestly", () => {
    expect(reportStorageConfigured({})).toBe(false);
    expect(reportStorageConfigured({ BLOB_READ_WRITE_TOKEN: " x " })).toBe(true);
  });

  it("keeps the reports prefix disjoint from artifact roots (corpus firewall)", () => {
    expect(() => assertReportsCorpusFirewall({})).not.toThrow();
    expect(() =>
      assertReportsCorpusFirewall({
        FRAUD_RADAR_ARTIFACT_ROOT: "fraud-radar-reports/published",
      }),
    ).toThrow();
  });
});
