/**
 * Fraud Radar Phase 8 — case persistence (PHASE8 §1).
 *
 * One store interface over the additive FrCase family. The
 * production implementation is Prisma; tests use the in-memory
 * implementation exported here, so route and capture behaviour
 * are proven without a database (the investigator store
 * precedent).
 *
 * SNAPSHOT IMMUTABILITY IS ENFORCED HERE, in the data-access
 * layer, not by convention (PHASE8 §1.3 rule 1): this interface
 * exposes NO operation that writes a lead's snapshot,
 * snapshotSha256, sourceDataset(Version), ruleCode, engine, or
 * entityKey after creation. The only mutable lead field is the
 * user's own annotation, through updateLeadAnnotation — whose
 * Prisma write names exactly that one column. Removing a pin
 * deletes the row; it never edits it.
 *
 * Child objects are never loaded by their own id alone: every
 * child read/write takes the parent caseId, so a guessed child
 * id under a foreign case id fails at both hops (§1.5).
 */

import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export interface CaseCounts {
  leads: number;
  evidence: number;
  notes: number;
  claims: number;
}

export interface CaseRecord {
  id: string;
  ownerId: string;
  title: string;
  summary: string | null;
  /** open | paused | closed — a user state, not a finding. */
  status: string;
  /** private | team */
  visibility: string;
  teamRef: string | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  counts: CaseCounts;
}

export interface LeadRecord {
  id: string;
  caseId: string;
  /** signal | screening | candidate | entity | investigator */
  kind: string;
  engine: string;
  entityKey: string;
  entityLabel: string;
  /** The verbatim captured snapshot (citation-envelope shaped). */
  snapshot: unknown;
  snapshotSha256: string;
  sourceDataset: string;
  sourceDatasetVersion: string;
  ruleCode: string | null;
  pinnedById: string;
  pinnedAt: Date;
  annotation: string | null;
}

export interface NewLead {
  caseId: string;
  kind: string;
  engine: string;
  entityKey: string;
  entityLabel: string;
  snapshot: unknown;
  snapshotSha256: string;
  sourceDataset: string;
  sourceDatasetVersion: string;
  ruleCode: string | null;
  pinnedById: string;
  annotation?: string | null;
}

export interface NoteRecord {
  id: string;
  caseId: string;
  leadId: string | null;
  evidenceId: string | null;
  claimId: string | null;
  body: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewNote {
  caseId: string;
  leadId?: string | null;
  evidenceId?: string | null;
  claimId?: string | null;
  body: string;
  authorId: string;
}

export interface EvidenceRecord {
  id: string;
  caseId: string;
  /** upload | artifact */
  kind: string;
  title: string;
  description: string | null;
  originalFilename: string | null;
  /** Server-verified content type (§2.3), never client-claimed alone. */
  contentType: string | null;
  sizeBytes: bigint | null;
  sha256: string | null;
  /** Vercel Blob pathname (§2.1). NEVER serialised to clients. */
  blobPathname: string | null;
  /** pending | present | missing_storage | deletion_pending */
  storageState: string;
  artifactEnvelope: unknown;
  artifactSha256: string | null;
  /** not_requested | queued | processing | processed | failed */
  processingStatus: string;
  /** docling | text_extract | none */
  processingPath: string | null;
  processorVersion: string | null;
  extractedTextPathname: string | null;
  pageCount: number | null;
  uploadedById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewEvidence {
  /** Server-minted before upload so the Blob pathname can bind
   *  to the row at token/put time (§2.4). Optional: the DB
   *  default mints one when a caller does not need the id early
   *  (artifact capture). */
  id?: string;
  caseId: string;
  kind: string;
  title: string;
  description?: string | null;
  originalFilename?: string | null;
  contentType?: string | null;
  sizeBytes?: bigint | null;
  sha256?: string | null;
  blobPathname?: string | null;
  storageState?: string;
  artifactEnvelope?: unknown;
  artifactSha256?: string | null;
  uploadedById: string;
}

export interface EvidencePatch {
  title?: string;
  description?: string | null;
  contentType?: string | null;
  sizeBytes?: bigint | null;
  sha256?: string | null;
  blobPathname?: string | null;
  storageState?: string;
  processingStatus?: string;
  processingPath?: string | null;
  processorVersion?: string | null;
  extractedTextPathname?: string | null;
  pageCount?: number | null;
}

export interface ProcessingJobRecord {
  id: string;
  evidenceId: string;
  caseId: string;
  /** queued | processing | succeeded | failed */
  status: string;
  requestedPath: string;
  attempts: number;
  error: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
}

export interface EventRecord {
  id: string;
  caseId: string;
  kind: string;
  actorId: string;
  detail: unknown;
  createdAt: Date;
}

export interface CaseStore {
  // Cases
  createCase(data: {
    ownerId: string;
    title: string;
    summary?: string | null;
  }): Promise<CaseRecord>;
  listCases(ownerId: string): Promise<CaseRecord[]>;
  getCaseById(id: string): Promise<CaseRecord | null>;
  updateCase(
    id: string,
    patch: Partial<
      Pick<CaseRecord, "title" | "summary" | "status" | "visibility" | "teamRef" | "closedAt">
    >,
  ): Promise<CaseRecord>;
  /** Hard delete (children cascade). */
  deleteCase(id: string): Promise<boolean>;
  countOpenCases(ownerId: string): Promise<number>;

  // Leads — create/read/delete + annotation only. No snapshot update exists.
  createLead(data: NewLead): Promise<LeadRecord>;
  listLeads(caseId: string): Promise<LeadRecord[]>;
  getLead(caseId: string, leadId: string): Promise<LeadRecord | null>;
  findLeadByCoalesceKey(
    caseId: string,
    entityKey: string,
    ruleCode: string | null,
    snapshotSha256: string,
  ): Promise<LeadRecord | null>;
  updateLeadAnnotation(
    caseId: string,
    leadId: string,
    annotation: string | null,
  ): Promise<LeadRecord | null>;
  deleteLead(caseId: string, leadId: string): Promise<boolean>;

  // Notes (freely editable user content, unlike snapshots)
  createNote(data: NewNote): Promise<NoteRecord>;
  listNotes(caseId: string): Promise<NoteRecord[]>;
  getNote(caseId: string, noteId: string): Promise<NoteRecord | null>;
  updateNote(caseId: string, noteId: string, body: string): Promise<NoteRecord | null>;
  deleteNote(caseId: string, noteId: string): Promise<boolean>;

  // Evidence (the vault, §2) — always through the parent case.
  createEvidence(data: NewEvidence): Promise<EvidenceRecord>;
  listEvidence(caseId: string): Promise<EvidenceRecord[]>;
  getEvidence(caseId: string, evidenceId: string): Promise<EvidenceRecord | null>;
  updateEvidence(
    caseId: string,
    evidenceId: string,
    patch: EvidencePatch,
  ): Promise<EvidenceRecord | null>;
  deleteEvidence(caseId: string, evidenceId: string): Promise<boolean>;
  /** Every evidence row in a state (the deletion-retry sweep). */
  listEvidenceByStorageState(storageState: string): Promise<EvidenceRecord[]>;
  /** Blob pathnames (original + extraction) owned by one case. */
  listEvidencePathnamesForCase(caseId: string): Promise<string[]>;

  // Processing jobs (§3.3) — rows the P8-E worker claims.
  createProcessingJob(data: {
    evidenceId: string;
    caseId: string;
    requestedPath?: string;
  }): Promise<ProcessingJobRecord>;
  listProcessingJobs(caseId: string, evidenceId: string): Promise<ProcessingJobRecord[]>;
  countProcessingJobsInRange(ownerId: string, start: Date, end: Date): Promise<number>;

  // Child existence checks for note anchors (never by id alone)
  evidenceExists(caseId: string, evidenceId: string): Promise<boolean>;
  claimExists(caseId: string, claimId: string): Promise<boolean>;

  // Events (append-only activity log)
  createEvent(data: {
    caseId: string;
    kind: string;
    actorId: string;
    detail?: unknown;
  }): Promise<EventRecord>;
  listEvents(caseId: string): Promise<EventRecord[]>;

  // Usage aggregates (ledger-derived; the tables are the counters)
  sumEvidenceBytes(ownerId: string): Promise<bigint>;
  countVerificationsInRange(ownerId: string, start: Date, end: Date): Promise<number>;

  // Account-deletion vault hook (PHASE8 §2.6 rule 3): enumerate a
  // user's vault Blob pathnames BEFORE the DB cascade removes the
  // rows, so the deletion flow (P8-B sweep) can delete the bytes.
  listEvidencePathnamesForUser(ownerId: string): Promise<string[]>;
}

// ---------------------------------------------------------------------------
// Prisma implementation
// ---------------------------------------------------------------------------

type PrismaCaseRow = {
  id: string;
  ownerId: string;
  title: string;
  summary: string | null;
  status: string;
  visibility: string;
  teamRef: string | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { leads: number; evidence: number; notes: number; claims: number };
};

function toCase(row: PrismaCaseRow): CaseRecord {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    summary: row.summary,
    status: row.status,
    visibility: row.visibility,
    teamRef: row.teamRef,
    closedAt: row.closedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    counts: row._count ?? { leads: 0, evidence: 0, notes: 0, claims: 0 },
  };
}

const COUNT_INCLUDE = {
  include: {
    _count: { select: { leads: true, evidence: true, notes: true, claims: true } },
  },
} as const;

export function createPrismaCaseStore(): CaseStore {
  return {
    async createCase(data) {
      const row = await db.frCase.create({
        data: { ownerId: data.ownerId, title: data.title, summary: data.summary ?? null },
        ...COUNT_INCLUDE,
      });
      return toCase(row as PrismaCaseRow);
    },
    async listCases(ownerId) {
      const rows = await db.frCase.findMany({
        where: { ownerId },
        orderBy: { updatedAt: "desc" },
        ...COUNT_INCLUDE,
      });
      return (rows as PrismaCaseRow[]).map(toCase);
    },
    async getCaseById(id) {
      const row = await db.frCase.findUnique({ where: { id }, ...COUNT_INCLUDE });
      return row ? toCase(row as PrismaCaseRow) : null;
    },
    async updateCase(id, patch) {
      const row = await db.frCase.update({
        where: { id },
        data: {
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.visibility !== undefined ? { visibility: patch.visibility } : {}),
          ...(patch.teamRef !== undefined ? { teamRef: patch.teamRef } : {}),
          ...(patch.closedAt !== undefined ? { closedAt: patch.closedAt } : {}),
        },
        ...COUNT_INCLUDE,
      });
      return toCase(row as PrismaCaseRow);
    },
    async deleteCase(id) {
      const res = await db.frCase.deleteMany({ where: { id } });
      return res.count > 0;
    },
    async countOpenCases(ownerId) {
      return db.frCase.count({ where: { ownerId, status: { not: "closed" } } });
    },

    async createLead(data) {
      const row = await db.frCaseLead.create({
        data: {
          caseId: data.caseId,
          kind: data.kind,
          engine: data.engine,
          entityKey: data.entityKey,
          entityLabel: data.entityLabel,
          snapshot: data.snapshot as never,
          snapshotSha256: data.snapshotSha256,
          sourceDataset: data.sourceDataset,
          sourceDatasetVersion: data.sourceDatasetVersion,
          ruleCode: data.ruleCode,
          pinnedById: data.pinnedById,
          annotation: data.annotation ?? null,
        },
      });
      return row as LeadRecord;
    },
    async listLeads(caseId) {
      const rows = await db.frCaseLead.findMany({
        where: { caseId },
        orderBy: { pinnedAt: "asc" },
      });
      return rows as LeadRecord[];
    },
    async getLead(caseId, leadId) {
      const row = await db.frCaseLead.findFirst({ where: { id: leadId, caseId } });
      return (row as LeadRecord | null) ?? null;
    },
    async findLeadByCoalesceKey(caseId, entityKey, ruleCode, snapshotSha256) {
      const row = await db.frCaseLead.findFirst({
        where: { caseId, entityKey, ruleCode, snapshotSha256 },
      });
      return (row as LeadRecord | null) ?? null;
    },
    async updateLeadAnnotation(caseId, leadId, annotation) {
      // The ONLY lead write after creation — the user's own
      // annotation. Snapshot fields are not named here and no
      // other code path writes them (§1.3 rule 1).
      const res = await db.frCaseLead.updateMany({
        where: { id: leadId, caseId },
        data: { annotation },
      });
      if (res.count === 0) return null;
      return this.getLead(caseId, leadId);
    },
    async deleteLead(caseId, leadId) {
      const res = await db.frCaseLead.deleteMany({ where: { id: leadId, caseId } });
      return res.count > 0;
    },

    async createNote(data) {
      const row = await db.frCaseNote.create({
        data: {
          caseId: data.caseId,
          leadId: data.leadId ?? null,
          evidenceId: data.evidenceId ?? null,
          claimId: data.claimId ?? null,
          body: data.body,
          authorId: data.authorId,
        },
      });
      return row as NoteRecord;
    },
    async listNotes(caseId) {
      const rows = await db.frCaseNote.findMany({
        where: { caseId },
        orderBy: { createdAt: "asc" },
      });
      return rows as NoteRecord[];
    },
    async getNote(caseId, noteId) {
      const row = await db.frCaseNote.findFirst({ where: { id: noteId, caseId } });
      return (row as NoteRecord | null) ?? null;
    },
    async updateNote(caseId, noteId, body) {
      const res = await db.frCaseNote.updateMany({
        where: { id: noteId, caseId },
        data: { body },
      });
      if (res.count === 0) return null;
      return this.getNote(caseId, noteId);
    },
    async deleteNote(caseId, noteId) {
      const res = await db.frCaseNote.deleteMany({ where: { id: noteId, caseId } });
      return res.count > 0;
    },

    async createEvidence(data) {
      const row = await db.frCaseEvidence.create({
        data: {
          ...(data.id ? { id: data.id } : {}),
          caseId: data.caseId,
          kind: data.kind,
          title: data.title,
          description: data.description ?? null,
          originalFilename: data.originalFilename ?? null,
          contentType: data.contentType ?? null,
          sizeBytes: data.sizeBytes ?? null,
          sha256: data.sha256 ?? null,
          blobPathname: data.blobPathname ?? null,
          storageState: data.storageState ?? "present",
          artifactEnvelope: (data.artifactEnvelope ?? undefined) as never,
          artifactSha256: data.artifactSha256 ?? null,
          uploadedById: data.uploadedById,
        },
      });
      return row as EvidenceRecord;
    },
    async listEvidence(caseId) {
      const rows = await db.frCaseEvidence.findMany({
        where: { caseId },
        orderBy: { createdAt: "asc" },
      });
      return rows as EvidenceRecord[];
    },
    async getEvidence(caseId, evidenceId) {
      const row = await db.frCaseEvidence.findFirst({
        where: { id: evidenceId, caseId },
      });
      return (row as EvidenceRecord | null) ?? null;
    },
    async updateEvidence(caseId, evidenceId, patch) {
      const res = await db.frCaseEvidence.updateMany({
        where: { id: evidenceId, caseId },
        data: {
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.contentType !== undefined ? { contentType: patch.contentType } : {}),
          ...(patch.sizeBytes !== undefined ? { sizeBytes: patch.sizeBytes } : {}),
          ...(patch.sha256 !== undefined ? { sha256: patch.sha256 } : {}),
          ...(patch.blobPathname !== undefined ? { blobPathname: patch.blobPathname } : {}),
          ...(patch.storageState !== undefined ? { storageState: patch.storageState } : {}),
          ...(patch.processingStatus !== undefined
            ? { processingStatus: patch.processingStatus }
            : {}),
          ...(patch.processingPath !== undefined ? { processingPath: patch.processingPath } : {}),
          ...(patch.processorVersion !== undefined
            ? { processorVersion: patch.processorVersion }
            : {}),
          ...(patch.extractedTextPathname !== undefined
            ? { extractedTextPathname: patch.extractedTextPathname }
            : {}),
          ...(patch.pageCount !== undefined ? { pageCount: patch.pageCount } : {}),
        },
      });
      if (res.count === 0) return null;
      return this.getEvidence(caseId, evidenceId);
    },
    async deleteEvidence(caseId, evidenceId) {
      const res = await db.frCaseEvidence.deleteMany({
        where: { id: evidenceId, caseId },
      });
      return res.count > 0;
    },
    async listEvidenceByStorageState(storageState) {
      const rows = await db.frCaseEvidence.findMany({ where: { storageState } });
      return rows as EvidenceRecord[];
    },
    async listEvidencePathnamesForCase(caseId) {
      const rows = await db.frCaseEvidence.findMany({
        where: { caseId },
        select: { blobPathname: true, extractedTextPathname: true },
      });
      return rows
        .flatMap((r) => [r.blobPathname, r.extractedTextPathname])
        .filter((p): p is string => typeof p === "string" && p.length > 0);
    },

    async createProcessingJob(data) {
      const row = await db.frEvidenceProcessingJob.create({
        data: {
          evidenceId: data.evidenceId,
          caseId: data.caseId,
          requestedPath: data.requestedPath ?? "auto",
        },
      });
      return row as ProcessingJobRecord;
    },
    async listProcessingJobs(caseId, evidenceId) {
      const rows = await db.frEvidenceProcessingJob.findMany({
        where: { caseId, evidenceId },
        orderBy: { createdAt: "asc" },
      });
      return rows as ProcessingJobRecord[];
    },
    async countProcessingJobsInRange(ownerId, start, end) {
      return db.frEvidenceProcessingJob.count({
        where: {
          evidence: { case: { ownerId } },
          createdAt: { gte: start, lt: end },
        },
      });
    },

    async evidenceExists(caseId, evidenceId) {
      const row = await db.frCaseEvidence.findFirst({
        where: { id: evidenceId, caseId },
        select: { id: true },
      });
      return row !== null;
    },
    async claimExists(caseId, claimId) {
      const row = await db.frCaseClaim.findFirst({
        where: { id: claimId, caseId },
        select: { id: true },
      });
      return row !== null;
    },

    async createEvent(data) {
      const row = await db.frCaseEvent.create({
        data: {
          caseId: data.caseId,
          kind: data.kind,
          actorId: data.actorId,
          detail: (data.detail ?? undefined) as never,
        },
      });
      return row as EventRecord;
    },
    async listEvents(caseId) {
      const rows = await db.frCaseEvent.findMany({
        where: { caseId },
        orderBy: { createdAt: "asc" },
      });
      return rows as EventRecord[];
    },

    async sumEvidenceBytes(ownerId) {
      const agg = await db.frCaseEvidence.aggregate({
        where: { case: { ownerId } },
        _sum: { sizeBytes: true },
      });
      return agg._sum.sizeBytes ?? BigInt(0);
    },
    async countVerificationsInRange(ownerId, start, end) {
      return db.frClaimVerification.count({
        where: {
          claim: { case: { ownerId } },
          createdAt: { gte: start, lt: end },
        },
      });
    },

    async listEvidencePathnamesForUser(ownerId) {
      const rows = await db.frCaseEvidence.findMany({
        where: { case: { ownerId } },
        select: { blobPathname: true, extractedTextPathname: true },
      });
      return rows
        .flatMap((r) => [r.blobPathname, r.extractedTextPathname])
        .filter((p): p is string => typeof p === "string" && p.length > 0);
    },
  };
}

let cached: CaseStore | null = null;

/** The process-wide store (routes share one instance). */
export function getCaseStore(): CaseStore {
  if (!cached) cached = createPrismaCaseStore();
  return cached;
}

// ---------------------------------------------------------------------------
// In-memory implementation (tests)
// ---------------------------------------------------------------------------

export function createInMemoryCaseStore(): CaseStore {
  let counter = 0;
  const nextId = (prefix: string) => `${prefix}_${++counter}`;
  const cases = new Map<string, CaseRecord>();
  const leads = new Map<string, LeadRecord>();
  const notes = new Map<string, NoteRecord>();
  const events = new Map<string, EventRecord>();
  const evidence = new Map<string, EvidenceRecord>();
  const jobs = new Map<string, ProcessingJobRecord>();
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  const withDates = <T extends { createdAt: Date; updatedAt?: Date }>(row: T): T => ({
    ...clone(row),
    createdAt: new Date(row.createdAt),
    ...(row.updatedAt ? { updatedAt: new Date(row.updatedAt) } : {}),
  });

  const countsFor = (caseId: string): CaseCounts => ({
    leads: [...leads.values()].filter((l) => l.caseId === caseId).length,
    evidence: [...evidence.values()].filter((e) => e.caseId === caseId).length,
    notes: [...notes.values()].filter((n) => n.caseId === caseId).length,
    claims: 0,
  });
  const present = (row: CaseRecord): CaseRecord => ({
    ...clone(row),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    closedAt: row.closedAt ? new Date(row.closedAt) : null,
    counts: countsFor(row.id),
  });

  return {
    async createCase(data) {
      const now = new Date();
      const row: CaseRecord = {
        id: nextId("case"),
        ownerId: data.ownerId,
        title: data.title,
        summary: data.summary ?? null,
        status: "open",
        visibility: "private",
        teamRef: null,
        closedAt: null,
        createdAt: now,
        updatedAt: now,
        counts: { leads: 0, evidence: 0, notes: 0, claims: 0 },
      };
      cases.set(row.id, row);
      return present(row);
    },
    async listCases(ownerId) {
      return [...cases.values()]
        .filter((c) => c.ownerId === ownerId)
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .map(present);
    },
    async getCaseById(id) {
      const row = cases.get(id);
      return row ? present(row) : null;
    },
    async updateCase(id, patch) {
      const row = cases.get(id);
      if (!row) throw new Error(`case not found: ${id}`);
      Object.assign(row, patch);
      row.updatedAt = new Date();
      return present(row);
    },
    async deleteCase(id) {
      if (!cases.has(id)) return false;
      cases.delete(id);
      for (const [k, v] of leads) if (v.caseId === id) leads.delete(k);
      for (const [k, v] of notes) if (v.caseId === id) notes.delete(k);
      for (const [k, v] of events) if (v.caseId === id) events.delete(k);
      for (const [k, v] of evidence) if (v.caseId === id) evidence.delete(k);
      for (const [k, v] of jobs) if (v.caseId === id) jobs.delete(k);
      return true;
    },
    async countOpenCases(ownerId) {
      return [...cases.values()].filter(
        (c) => c.ownerId === ownerId && c.status !== "closed",
      ).length;
    },

    async createLead(data) {
      const row: LeadRecord = {
        id: nextId("lead"),
        caseId: data.caseId,
        kind: data.kind,
        engine: data.engine,
        entityKey: data.entityKey,
        entityLabel: data.entityLabel,
        snapshot: clone(data.snapshot),
        snapshotSha256: data.snapshotSha256,
        sourceDataset: data.sourceDataset,
        sourceDatasetVersion: data.sourceDatasetVersion,
        ruleCode: data.ruleCode,
        pinnedById: data.pinnedById,
        pinnedAt: new Date(),
        annotation: data.annotation ?? null,
      };
      leads.set(row.id, row);
      return { ...row, snapshot: clone(row.snapshot), pinnedAt: new Date(row.pinnedAt) };
    },
    async listLeads(caseId) {
      return [...leads.values()]
        .filter((l) => l.caseId === caseId)
        .map((l) => ({ ...l, snapshot: clone(l.snapshot), pinnedAt: new Date(l.pinnedAt) }));
    },
    async getLead(caseId, leadId) {
      const row = leads.get(leadId);
      if (!row || row.caseId !== caseId) return null;
      return { ...row, snapshot: clone(row.snapshot), pinnedAt: new Date(row.pinnedAt) };
    },
    async findLeadByCoalesceKey(caseId, entityKey, ruleCode, snapshotSha256) {
      const row = [...leads.values()].find(
        (l) =>
          l.caseId === caseId &&
          l.entityKey === entityKey &&
          l.ruleCode === ruleCode &&
          l.snapshotSha256 === snapshotSha256,
      );
      return row
        ? { ...row, snapshot: clone(row.snapshot), pinnedAt: new Date(row.pinnedAt) }
        : null;
    },
    async updateLeadAnnotation(caseId, leadId, annotation) {
      const row = leads.get(leadId);
      if (!row || row.caseId !== caseId) return null;
      row.annotation = annotation;
      return { ...row, snapshot: clone(row.snapshot), pinnedAt: new Date(row.pinnedAt) };
    },
    async deleteLead(caseId, leadId) {
      const row = leads.get(leadId);
      if (!row || row.caseId !== caseId) return false;
      leads.delete(leadId);
      return true;
    },

    async createNote(data) {
      const now = new Date();
      const row: NoteRecord = {
        id: nextId("note"),
        caseId: data.caseId,
        leadId: data.leadId ?? null,
        evidenceId: data.evidenceId ?? null,
        claimId: data.claimId ?? null,
        body: data.body,
        authorId: data.authorId,
        createdAt: now,
        updatedAt: now,
      };
      notes.set(row.id, row);
      return withDates({ ...row, updatedAt: new Date(row.updatedAt) });
    },
    async listNotes(caseId) {
      return [...notes.values()]
        .filter((n) => n.caseId === caseId)
        .map((n) => withDates({ ...n, updatedAt: new Date(n.updatedAt) }));
    },
    async getNote(caseId, noteId) {
      const row = notes.get(noteId);
      if (!row || row.caseId !== caseId) return null;
      return withDates({ ...row, updatedAt: new Date(row.updatedAt) });
    },
    async updateNote(caseId, noteId, body) {
      const row = notes.get(noteId);
      if (!row || row.caseId !== caseId) return null;
      row.body = body;
      row.updatedAt = new Date();
      return withDates({ ...row, updatedAt: new Date(row.updatedAt) });
    },
    async deleteNote(caseId, noteId) {
      const row = notes.get(noteId);
      if (!row || row.caseId !== caseId) return false;
      notes.delete(noteId);
      return true;
    },

    async createEvidence(data) {
      const now = new Date();
      const row: EvidenceRecord = {
        id: data.id ?? nextId("evidence"),
        caseId: data.caseId,
        kind: data.kind,
        title: data.title,
        description: data.description ?? null,
        originalFilename: data.originalFilename ?? null,
        contentType: data.contentType ?? null,
        sizeBytes: data.sizeBytes ?? null,
        sha256: data.sha256 ?? null,
        blobPathname: data.blobPathname ?? null,
        storageState: data.storageState ?? "present",
        artifactEnvelope: data.artifactEnvelope ? clone(data.artifactEnvelope) : null,
        artifactSha256: data.artifactSha256 ?? null,
        processingStatus: "not_requested",
        processingPath: null,
        processorVersion: null,
        extractedTextPathname: null,
        pageCount: null,
        uploadedById: data.uploadedById,
        createdAt: now,
        updatedAt: now,
      };
      evidence.set(row.id, row);
      return { ...row, artifactEnvelope: clone(row.artifactEnvelope) };
    },
    async listEvidence(caseId) {
      return [...evidence.values()]
        .filter((e) => e.caseId === caseId)
        .map((e) => ({ ...e, artifactEnvelope: clone(e.artifactEnvelope) }));
    },
    async getEvidence(caseId, evidenceId) {
      const row = evidence.get(evidenceId);
      if (!row || row.caseId !== caseId) return null;
      return { ...row, artifactEnvelope: clone(row.artifactEnvelope) };
    },
    async updateEvidence(caseId, evidenceId, patch) {
      const row = evidence.get(evidenceId);
      if (!row || row.caseId !== caseId) return null;
      Object.assign(row, patch);
      row.updatedAt = new Date();
      return { ...row, artifactEnvelope: clone(row.artifactEnvelope) };
    },
    async deleteEvidence(caseId, evidenceId) {
      const row = evidence.get(evidenceId);
      if (!row || row.caseId !== caseId) return false;
      evidence.delete(evidenceId);
      for (const [k, v] of jobs) if (v.evidenceId === evidenceId) jobs.delete(k);
      return true;
    },
    async listEvidenceByStorageState(storageState) {
      return [...evidence.values()]
        .filter((e) => e.storageState === storageState)
        .map((e) => ({ ...e, artifactEnvelope: clone(e.artifactEnvelope) }));
    },
    async listEvidencePathnamesForCase(caseId) {
      return [...evidence.values()]
        .filter((e) => e.caseId === caseId)
        .flatMap((e) => [e.blobPathname, e.extractedTextPathname])
        .filter((p): p is string => typeof p === "string" && p.length > 0);
    },

    async createProcessingJob(data) {
      const row: ProcessingJobRecord = {
        id: nextId("job"),
        evidenceId: data.evidenceId,
        caseId: data.caseId,
        status: "queued",
        requestedPath: data.requestedPath ?? "auto",
        attempts: 0,
        error: null,
        startedAt: null,
        finishedAt: null,
        createdAt: new Date(),
      };
      jobs.set(row.id, row);
      return { ...row };
    },
    async listProcessingJobs(caseId, evidenceId) {
      return [...jobs.values()]
        .filter((j) => j.caseId === caseId && j.evidenceId === evidenceId)
        .map((j) => ({ ...j }));
    },
    async countProcessingJobsInRange(ownerId, start, end) {
      return [...jobs.values()].filter((j) => {
        const owner = cases.get(j.caseId)?.ownerId;
        return owner === ownerId && j.createdAt >= start && j.createdAt < end;
      }).length;
    },

    async evidenceExists(caseId, evidenceId) {
      const row = evidence.get(evidenceId);
      return !!row && row.caseId === caseId;
    },
    async claimExists() {
      return false;
    },

    async createEvent(data) {
      const row: EventRecord = {
        id: nextId("event"),
        caseId: data.caseId,
        kind: data.kind,
        actorId: data.actorId,
        detail: data.detail ?? null,
        createdAt: new Date(),
      };
      events.set(row.id, row);
      return { ...row, createdAt: new Date(row.createdAt) };
    },
    async listEvents(caseId) {
      return [...events.values()]
        .filter((e) => e.caseId === caseId)
        .map((e) => ({ ...e, createdAt: new Date(e.createdAt) }));
    },

    async sumEvidenceBytes(ownerId) {
      let total = BigInt(0);
      for (const e of evidence.values()) {
        if (cases.get(e.caseId)?.ownerId === ownerId && e.sizeBytes) {
          total += e.sizeBytes;
        }
      }
      return total;
    },
    async countVerificationsInRange() {
      return 0;
    },
    async listEvidencePathnamesForUser(ownerId) {
      return [...evidence.values()]
        .filter((e) => cases.get(e.caseId)?.ownerId === ownerId)
        .flatMap((e) => [e.blobPathname, e.extractedTextPathname])
        .filter((p): p is string => typeof p === "string" && p.length > 0);
    },
  };
}
