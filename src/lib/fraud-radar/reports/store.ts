/**
 * Fraud Radar Phase 9 — report persistence (PHASE9 §2.2).
 *
 * One store interface over the additive FrReport family. The
 * production implementation is Prisma; tests use the
 * in-memory implementation exported here (the Phase 7/8
 * store precedent).
 *
 * VERSION IMMUTABILITY IS ENFORCED HERE, in the data-access
 * layer (§2.3.1): this interface exposes NO operation that
 * writes a version's pinSet, composition, templateVersion,
 * or generatorVersion after creation. The generation fields
 * (documentPathname, contentSha256, manifest,
 * validationVerdict, validationDetail) are written ONCE by
 * completeVersionGeneration — its Prisma write names exactly
 * those columns AND is conditional on contentSha256 still
 * being null, so a second completion is a no-op that returns
 * null. Exports are append-only rows. Report title/status
 * (the caller's own work states) stay editable on the
 * FrReport row itself; a version never changes.
 *
 * Children are never loaded by their own id alone: version
 * and export reads take the parent reportId, so a guessed
 * child id under a foreign report id fails at both hops.
 * Access itself is decided by ownership of the report row
 * (reports.ts / routes) — reports are owner-only even when
 * their case later gains team visibility (§2.2).
 */

import { db } from "@/lib/db";
import type { PinSet } from "./pins";
import type { ReportComposition, ReportManifest } from "./document";

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface ReportRecord {
  id: string;
  ownerId: string;
  caseId: string | null;
  templateId: string;
  title: string;
  /** draft | ready | archived — work states, never findings. */
  status: string;
  versionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportVersionRecord {
  id: string;
  reportId: string;
  versionNo: number;
  templateVersion: string;
  generatorVersion: string;
  pinSet: PinSet;
  composition: ReportComposition;
  documentPathname: string | null;
  contentSha256: string | null;
  manifest: ReportManifest | null;
  /** pass | pass_with_user_text_warnings | failed */
  validationVerdict: string | null;
  validationDetail: unknown;
  createdById: string;
  createdAt: Date;
}

export interface ReportExportRecord {
  id: string;
  versionId: string;
  format: string;
  blobPathname: string;
  sizeBytes: bigint;
  sha256: string;
  contentSha256: string;
  createdAt: Date;
}

export interface ReportGenerationJobRecord {
  id: string;
  versionId: string;
  reportId: string;
  ownerId: string;
  formats: unknown;
  /** queued | processing | succeeded | failed */
  status: string;
  attempts: number;
  error: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
}

/** The one-time generation completion (§2.2 comment): the
 *  worker writes exactly these fields, exactly once. */
export interface VersionGenerationCompletion {
  documentPathname: string;
  contentSha256: string;
  manifest: ReportManifest;
  validationVerdict: string;
  validationDetail?: unknown;
}

export interface ReportStore {
  // Reports
  createReport(data: {
    ownerId: string;
    templateId: string;
    title: string;
    caseId?: string | null;
  }): Promise<ReportRecord>;
  listReports(ownerId: string): Promise<ReportRecord[]>;
  getReportById(id: string): Promise<ReportRecord | null>;
  /** Title/status only — the caller's own work states. */
  updateReport(
    id: string,
    patch: Partial<Pick<ReportRecord, "title" | "status">>,
  ): Promise<ReportRecord>;
  deleteReport(id: string): Promise<boolean>;
  countReports(ownerId: string): Promise<number>;

  // Versions — create/read only, plus the one-time generation
  // completion. No pinSet/composition update exists.
  createVersion(data: {
    reportId: string;
    versionNo: number;
    templateVersion: string;
    generatorVersion: string;
    pinSet: PinSet;
    composition: ReportComposition;
    createdById: string;
  }): Promise<ReportVersionRecord>;
  listVersions(reportId: string): Promise<ReportVersionRecord[]>;
  getVersion(reportId: string, versionId: string): Promise<ReportVersionRecord | null>;
  getLatestVersion(reportId: string): Promise<ReportVersionRecord | null>;
  completeVersionGeneration(
    reportId: string,
    versionId: string,
    completion: VersionGenerationCompletion,
  ): Promise<ReportVersionRecord | null>;

  // Exports — append-only, always through the parent version.
  createExport(data: {
    versionId: string;
    format: string;
    blobPathname: string;
    sizeBytes: bigint;
    sha256: string;
    contentSha256: string;
  }): Promise<ReportExportRecord>;
  listExports(reportId: string, versionId: string): Promise<ReportExportRecord[]>;

  // Generation jobs (the §5.3 monthly ledger) — rows the
  // P9-C worker claims; P9-A creates none, but the read the
  // usage route reconciles against ships with the model.
  listGenerationJobs(reportId: string, versionId: string): Promise<ReportGenerationJobRecord[]>;
  countGenerationJobsInRange(ownerId: string, start: Date, end: Date): Promise<number>;
  sumExportBytesInRange(ownerId: string, start: Date, end: Date): Promise<bigint>;
}

// ---------------------------------------------------------------------------
// Prisma implementation
// ---------------------------------------------------------------------------

type PrismaReportRow = {
  id: string;
  ownerId: string;
  caseId: string | null;
  templateId: string;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: { versions: number };
};

function toReport(row: PrismaReportRow): ReportRecord {
  return {
    id: row.id,
    ownerId: row.ownerId,
    caseId: row.caseId,
    templateId: row.templateId,
    title: row.title,
    status: row.status,
    versionCount: row._count?.versions ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

type PrismaVersionRow = Omit<ReportVersionRecord, "pinSet" | "composition" | "manifest"> & {
  pinSet: unknown;
  composition: unknown;
  manifest: unknown;
};

function toVersion(row: PrismaVersionRow): ReportVersionRecord {
  return {
    ...row,
    pinSet: row.pinSet as PinSet,
    composition: row.composition as ReportComposition,
    manifest: (row.manifest as ReportManifest | null) ?? null,
  };
}

const REPORT_INCLUDE = {
  include: { _count: { select: { versions: true } } },
} as const;

export function createPrismaReportStore(): ReportStore {
  return {
    async createReport(data) {
      const row = await db.frReport.create({
        data: {
          ownerId: data.ownerId,
          templateId: data.templateId,
          title: data.title,
          caseId: data.caseId ?? null,
        },
        ...REPORT_INCLUDE,
      });
      return toReport(row as PrismaReportRow);
    },
    async listReports(ownerId) {
      const rows = await db.frReport.findMany({
        where: { ownerId },
        orderBy: { updatedAt: "desc" },
        ...REPORT_INCLUDE,
      });
      return (rows as PrismaReportRow[]).map(toReport);
    },
    async getReportById(id) {
      const row = await db.frReport.findUnique({ where: { id }, ...REPORT_INCLUDE });
      return row ? toReport(row as PrismaReportRow) : null;
    },
    async updateReport(id, patch) {
      const row = await db.frReport.update({
        where: { id },
        data: {
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
        },
        ...REPORT_INCLUDE,
      });
      return toReport(row as PrismaReportRow);
    },
    async deleteReport(id) {
      const res = await db.frReport.deleteMany({ where: { id } });
      return res.count > 0;
    },
    async countReports(ownerId) {
      return db.frReport.count({ where: { ownerId } });
    },

    async createVersion(data) {
      const row = await db.frReportVersion.create({
        data: {
          reportId: data.reportId,
          versionNo: data.versionNo,
          templateVersion: data.templateVersion,
          generatorVersion: data.generatorVersion,
          pinSet: data.pinSet as never,
          composition: data.composition as never,
          createdById: data.createdById,
        },
      });
      return toVersion(row as PrismaVersionRow);
    },
    async listVersions(reportId) {
      const rows = await db.frReportVersion.findMany({
        where: { reportId },
        orderBy: { versionNo: "asc" },
      });
      return (rows as PrismaVersionRow[]).map(toVersion);
    },
    async getVersion(reportId, versionId) {
      const row = await db.frReportVersion.findFirst({
        where: { id: versionId, reportId },
      });
      return row ? toVersion(row as PrismaVersionRow) : null;
    },
    async getLatestVersion(reportId) {
      const row = await db.frReportVersion.findFirst({
        where: { reportId },
        orderBy: { versionNo: "desc" },
      });
      return row ? toVersion(row as PrismaVersionRow) : null;
    },
    async completeVersionGeneration(reportId, versionId, completion) {
      // Written ONCE (§2.2): the write names only the
      // generation fields and is conditional on the version
      // not already carrying a content hash — a re-run of the
      // worker against a completed version changes nothing.
      const res = await db.frReportVersion.updateMany({
        where: { id: versionId, reportId, contentSha256: null },
        data: {
          documentPathname: completion.documentPathname,
          contentSha256: completion.contentSha256,
          manifest: completion.manifest as never,
          validationVerdict: completion.validationVerdict,
          validationDetail: (completion.validationDetail ?? undefined) as never,
        },
      });
      if (res.count === 0) return null;
      return this.getVersion(reportId, versionId);
    },

    async createExport(data) {
      const row = await db.frReportExport.create({
        data: {
          versionId: data.versionId,
          format: data.format,
          blobPathname: data.blobPathname,
          sizeBytes: data.sizeBytes,
          sha256: data.sha256,
          contentSha256: data.contentSha256,
        },
      });
      return row as ReportExportRecord;
    },
    async listExports(reportId, versionId) {
      const rows = await db.frReportExport.findMany({
        where: { versionId, version: { reportId } },
        orderBy: { createdAt: "asc" },
      });
      return rows as ReportExportRecord[];
    },
    async listGenerationJobs(reportId, versionId) {
      const rows = await db.frReportGenerationJob.findMany({
        where: { versionId, reportId },
        orderBy: { createdAt: "asc" },
      });
      return rows as ReportGenerationJobRecord[];
    },
    async countGenerationJobsInRange(ownerId, start, end) {
      return db.frReportGenerationJob.count({
        where: { ownerId, createdAt: { gte: start, lt: end } },
      });
    },
    async sumExportBytesInRange(ownerId, start, end) {
      const agg = await db.frReportExport.aggregate({
        where: {
          version: { report: { ownerId } },
          createdAt: { gte: start, lt: end },
        },
        _sum: { sizeBytes: true },
      });
      return agg._sum.sizeBytes ?? BigInt(0);
    },
  };
}

let cached: ReportStore | null = null;

/** The process-wide store (routes share one instance). */
export function getReportStore(): ReportStore {
  if (!cached) cached = createPrismaReportStore();
  return cached;
}

// ---------------------------------------------------------------------------
// In-memory implementation (tests)
// ---------------------------------------------------------------------------

export function createInMemoryReportStore(): ReportStore {
  let counter = 0;
  const nextId = (prefix: string) => `${prefix}_${++counter}`;
  const reports = new Map<string, ReportRecord>();
  const versions = new Map<string, ReportVersionRecord>();
  const exports_ = new Map<string, ReportExportRecord & { reportId: string }>();
  const jobs = new Map<string, ReportGenerationJobRecord>();
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  const withDates = (row: ReportVersionRecord): ReportVersionRecord => ({
    ...clone(row),
    createdAt: new Date(row.createdAt),
  });
  const presentReport = (row: ReportRecord): ReportRecord => ({
    ...clone(row),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    versionCount: [...versions.values()].filter((v) => v.reportId === row.id).length,
  });

  return {
    async createReport(data) {
      const now = new Date();
      const row: ReportRecord = {
        id: nextId("report"),
        ownerId: data.ownerId,
        caseId: data.caseId ?? null,
        templateId: data.templateId,
        title: data.title,
        status: "draft",
        versionCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      reports.set(row.id, row);
      return presentReport(row);
    },
    async listReports(ownerId) {
      return [...reports.values()]
        .filter((r) => r.ownerId === ownerId)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .map(presentReport);
    },
    async getReportById(id) {
      const row = reports.get(id);
      return row ? presentReport(row) : null;
    },
    async updateReport(id, patch) {
      const row = reports.get(id);
      if (!row) throw new Error(`report not found: ${id}`);
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.status !== undefined) row.status = patch.status;
      row.updatedAt = new Date();
      return presentReport(row);
    },
    async deleteReport(id) {
      if (!reports.has(id)) return false;
      reports.delete(id);
      for (const [k, v] of versions) {
        if (v.reportId === id) {
          versions.delete(k);
          for (const [ek, ev] of exports_) if (ev.versionId === k) exports_.delete(ek);
          for (const [jk, jv] of jobs) if (jv.versionId === k) jobs.delete(jk);
        }
      }
      return true;
    },
    async countReports(ownerId) {
      return [...reports.values()].filter((r) => r.ownerId === ownerId).length;
    },

    async createVersion(data) {
      const row: ReportVersionRecord = {
        id: nextId("version"),
        reportId: data.reportId,
        versionNo: data.versionNo,
        templateVersion: data.templateVersion,
        generatorVersion: data.generatorVersion,
        pinSet: clone(data.pinSet),
        composition: clone(data.composition),
        documentPathname: null,
        contentSha256: null,
        manifest: null,
        validationVerdict: null,
        validationDetail: null,
        createdById: data.createdById,
        createdAt: new Date(),
      };
      versions.set(row.id, row);
      const report = reports.get(data.reportId);
      if (report) report.updatedAt = new Date();
      return withDates(row);
    },
    async listVersions(reportId) {
      return [...versions.values()]
        .filter((v) => v.reportId === reportId)
        .sort((a, b) => a.versionNo - b.versionNo)
        .map(withDates);
    },
    async getVersion(reportId, versionId) {
      const row = versions.get(versionId);
      if (!row || row.reportId !== reportId) return null;
      return withDates(row);
    },
    async getLatestVersion(reportId) {
      const list = [...versions.values()]
        .filter((v) => v.reportId === reportId)
        .sort((a, b) => b.versionNo - a.versionNo);
      return list[0] ? withDates(list[0]) : null;
    },
    async completeVersionGeneration(reportId, versionId, completion) {
      const row = versions.get(versionId);
      if (!row || row.reportId !== reportId) return null;
      if (row.contentSha256 !== null) return null; // written once
      row.documentPathname = completion.documentPathname;
      row.contentSha256 = completion.contentSha256;
      row.manifest = clone(completion.manifest);
      row.validationVerdict = completion.validationVerdict;
      row.validationDetail = completion.validationDetail ?? null;
      return withDates(row);
    },

    async createExport(data) {
      const version = versions.get(data.versionId);
      const row: ReportExportRecord & { reportId: string } = {
        id: nextId("export"),
        versionId: data.versionId,
        format: data.format,
        blobPathname: data.blobPathname,
        sizeBytes: data.sizeBytes,
        sha256: data.sha256,
        contentSha256: data.contentSha256,
        createdAt: new Date(),
        reportId: version?.reportId ?? "",
      };
      exports_.set(row.id, row);
      return {
        id: row.id,
        versionId: row.versionId,
        format: row.format,
        blobPathname: row.blobPathname,
        sizeBytes: row.sizeBytes,
        sha256: row.sha256,
        contentSha256: row.contentSha256,
        createdAt: row.createdAt,
      };
    },
    async listExports(reportId, versionId) {
      return [...exports_.values()]
        .filter((e) => e.versionId === versionId && e.reportId === reportId)
        .map((e) => ({
          id: e.id,
          versionId: e.versionId,
          format: e.format,
          blobPathname: e.blobPathname,
          sizeBytes: e.sizeBytes,
          sha256: e.sha256,
          contentSha256: e.contentSha256,
          createdAt: e.createdAt,
        }));
    },

    async listGenerationJobs(reportId, versionId) {
      return [...jobs.values()]
        .filter((j) => j.reportId === reportId && j.versionId === versionId)
        .map((j) => ({ ...j }));
    },
    async countGenerationJobsInRange(ownerId, start, end) {
      return [...jobs.values()].filter(
        (j) => j.ownerId === ownerId && j.createdAt >= start && j.createdAt < end,
      ).length;
    },
    async sumExportBytesInRange(ownerId, start, end) {
      let total = BigInt(0);
      for (const e of exports_.values()) {
        const version = versions.get(e.versionId);
        const report = version ? reports.get(version.reportId) : null;
        if (report?.ownerId === ownerId && e.createdAt >= start && e.createdAt < end) {
          total += e.sizeBytes;
        }
      }
      return total;
    },
  };
}
