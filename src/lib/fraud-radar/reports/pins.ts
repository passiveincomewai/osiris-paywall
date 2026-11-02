/**
 * Fraud Radar Phase 9 — the pin set: server-side capture of
 * the exact inputs a report version is generated from
 * (PHASE9 §2.1, §0 rule 2).
 *
 * Discipline, mirroring Phase 8 §1.3 rule 3: the client
 * submits ONLY identifiers (case id, lead ids, evidence ids,
 * claim/verification ids, entity engine+key, dataset slugs).
 * This module captures through the Phase 8 store and the
 * data layers, and freezes what it captured:
 *
 *  - A CASE pin snapshots the case row + the in-scope leads,
 *    claims (+ their verification runs), selected notes,
 *    selected evidence index entries, and the event log into
 *    a frozen snapshot whose canonical SHA-256 is the pin.
 *    Case edits after pinning never reach an existing
 *    version; they are visible only to a new version.
 *  - LEAD / VERIFICATION / EVIDENCE pins cite Phase 8's
 *    already-immutable records by their stored hashes,
 *    verbatim — Phase 9 never re-hashes a lead snapshot into
 *    a different value; it cites (leadId, snapshotSha256) /
 *    (evidenceId, sha256) exactly as Phase 8 recorded them.
 *  - An ENTITY pin captures the published profile record at
 *    pin time through the same capture the case leads use
 *    (captureLead, entity kind) and freezes the record in
 *    the pin itself.
 *  - GENERATION AGAINST UNPINNED OR MUTATED INPUTS IS
 *    IMPOSSIBLE in this layer: createVersion (reports.ts)
 *    accepts only a PinSet produced here, and
 *    verifyPinSetIntegrity() re-loads every cited record and
 *    re-checks its hash before any later stage may use the
 *    pin set — a mutated snapshot, a re-hashed evidence row,
 *    or a foreign id fails closed with pin_integrity_failed
 *    / pin_not_found.
 */

import { createHash } from "node:crypto";
import {
  canonicalJson,
  snapshotSha256,
  captureLead,
  LeadCaptureError,
  type CapturedLead,
} from "../cases/leads";
import type { CaseStore } from "../cases/store";
import { FRAUD_RADAR_SOURCES } from "../sources";
import { SIGNALS_DATASET } from "../signals-data";
import {
  checkTemplatePins,
  type PinKind,
  type ReportTemplateDef,
} from "./templates";

// ---------------------------------------------------------------------------
// Pin set shape (§2.1)
// ---------------------------------------------------------------------------

export interface CasePin {
  caseId: string;
  caseSnapshotSha256: string;
  /** The frozen snapshot itself (case row + in-scope
   *  children, as captured). Rendering reads this, never
   *  the live case tables. */
  snapshot: unknown;
}

export interface LeadPin {
  leadId: string;
  caseId: string;
  /** Phase 8 lead kind, verbatim (signal | screening |
   *  candidate | entity | investigator). */
  kind: string;
  snapshotSha256: string;
}

export interface EntityPin {
  engine: string;
  entityKey: string;
  capturedSha256: string;
  dataset: string;
  datasetVersion: string;
  /** The frozen captured record (citation-envelope shaped). */
  record: unknown;
}

export interface VerificationPin {
  verificationId: string;
  claimId: string;
  caseId: string;
  /** The run's stored corpus versions, verbatim. */
  corpusVersions: unknown;
}

export interface EvidencePin {
  evidenceId: string;
  caseId: string;
  sha256: string;
}

export interface DatasetPin {
  slug: string;
  version: string;
  extractDate?: string;
}

export interface PinSet {
  case?: CasePin;
  leads: LeadPin[];
  entities: EntityPin[];
  verifications: VerificationPin[];
  evidence: EvidencePin[];
  datasets: DatasetPin[];
  ruleLibraryVersion?: string;
  signalsVersion?: string;
}

export function emptyPinSet(): PinSet {
  return { leads: [], entities: [], verifications: [], evidence: [], datasets: [] };
}

/** The pin kinds a pin set actually carries (for §1.2 checks). */
export function presentPinKinds(pinSet: PinSet): Set<PinKind> {
  const present = new Set<PinKind>();
  if (pinSet.case) present.add("case");
  if (pinSet.leads.length > 0) {
    present.add("lead");
    if (pinSet.leads.some((l) => l.kind === "investigator")) {
      present.add("investigatorFinding");
    }
  }
  if (pinSet.entities.length > 0) present.add("entity");
  if (pinSet.verifications.length > 0) present.add("verification");
  if (pinSet.evidence.length > 0) present.add("evidenceSelection");
  return present;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type PinErrorCode =
  | "invalid_input"
  | "case_required"
  | "pin_not_found"
  | "pin_integrity_failed"
  | "evidence_not_hashed"
  | "dataset_not_found";

export class PinError extends Error {
  code: PinErrorCode;
  constructor(code: PinErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Pin request — identifiers only (§2.1)
// ---------------------------------------------------------------------------

export interface PinRequest {
  caseId?: string;
  /** Leads within the case. Default when a case is pinned:
   *  every lead in the case. */
  leadIds?: string[];
  /** Entities to capture fresh at pin time. */
  entityPins?: { engine: string; entityKey: string }[];
  /** Verification runs within the case's claims. */
  verificationIds?: { claimId: string; verificationId: string }[];
  /** Evidence within the case (index pins; hashes cited). */
  evidenceIds?: string[];
  /** Notes within the case to include in the case snapshot.
   *  Default: none — notes enter a report only when the
   *  author selects them. */
  noteIds?: string[];
  /** Claims within the case to include in the case snapshot.
   *  Default: every claim in the case. */
  claimIds?: string[];
  /** Dataset slugs to pin directly from the Data Source
   *  Registry (Template I's primary input). */
  datasetSlugs?: string[];
}

export interface PinCaptureDeps {
  captureEntity: typeof captureLead;
}

export const defaultPinCaptureDeps: PinCaptureDeps = {
  captureEntity: captureLead,
};

function sha256OfCanonical(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function addDataset(pinSet: PinSet, slug: string, version: string, extractDate?: string) {
  if (!pinSet.datasets.some((d) => d.slug === slug && d.version === version)) {
    pinSet.datasets.push({
      slug,
      version,
      ...(extractDate ? { extractDate } : {}),
    });
  }
}

/** Extract dataset vintages from a verification's stored
 *  corpusVersions value, best-effort over its stored shape
 *  ({slug: version} maps and {source, version} entries). */
function datasetsFromCorpusVersions(pinSet: PinSet, corpusVersions: unknown) {
  if (!corpusVersions || typeof corpusVersions !== "object") return;
  if (Array.isArray(corpusVersions)) {
    for (const entry of corpusVersions) {
      if (entry && typeof entry === "object") {
        const e = entry as Record<string, unknown>;
        const slug = typeof e.source === "string" ? e.source : typeof e.slug === "string" ? e.slug : null;
        const version = typeof e.version === "string" ? e.version : null;
        if (slug && version) addDataset(pinSet, slug, version);
      }
    }
    return;
  }
  for (const [slug, version] of Object.entries(corpusVersions as Record<string, unknown>)) {
    if (typeof version === "string") addDataset(pinSet, slug, version);
    else if (version && typeof version === "object") {
      const v = (version as Record<string, unknown>).version;
      if (typeof v === "string") addDataset(pinSet, slug, v);
    }
  }
}

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

/**
 * Assemble a pin set from identifiers. `caseRowOwnerId` is
 * the report owner's id: a case pin is refused unless the
 * case belongs to the report's owner (reports are owner-only
 * even over team-visible cases, §2.2) — routes resolve case
 * access before calling, and this check is the second lock.
 * Every child is loaded THROUGH its parent case (§1.5
 * discipline), so a foreign child id reads as pin_not_found.
 */
export async function capturePinSet(
  caseStore: CaseStore,
  args: { ownerId: string; request: PinRequest },
  deps: PinCaptureDeps = defaultPinCaptureDeps,
): Promise<PinSet> {
  const { request } = args;
  const pinSet = emptyPinSet();

  const wantsCaseScoped =
    !!request.caseId ||
    (request.leadIds?.length ?? 0) > 0 ||
    (request.evidenceIds?.length ?? 0) > 0 ||
    (request.verificationIds?.length ?? 0) > 0 ||
    (request.noteIds?.length ?? 0) > 0 ||
    (request.claimIds?.length ?? 0) > 0;
  if (
    !request.caseId &&
    ((request.leadIds?.length ?? 0) > 0 ||
      (request.evidenceIds?.length ?? 0) > 0 ||
      (request.verificationIds?.length ?? 0) > 0)
  ) {
    throw new PinError(
      "case_required",
      "lead, evidence, and verification pins require the case they belong to",
    );
  }
  void wantsCaseScoped;

  let caseId: string | null = null;
  if (request.caseId) {
    caseId = request.caseId;
    const caseRow = await caseStore.getCaseById(caseId);
    if (!caseRow || caseRow.ownerId !== args.ownerId) {
      throw new PinError("pin_not_found", "case not found");
    }

    const allLeads = await caseStore.listLeads(caseId);
    const selectedLeads = request.leadIds
      ? allLeads.filter((l) => request.leadIds!.includes(l.id))
      : allLeads;
    if (request.leadIds && selectedLeads.length !== request.leadIds.length) {
      throw new PinError("pin_not_found", "a selected lead does not belong to this case");
    }
    const allClaims = await caseStore.listClaims(caseId);
    const selectedClaims = request.claimIds
      ? allClaims.filter((c) => request.claimIds!.includes(c.id))
      : allClaims;
    if (request.claimIds && selectedClaims.length !== request.claimIds.length) {
      throw new PinError("pin_not_found", "a selected claim does not belong to this case");
    }
    const allNotes = await caseStore.listNotes(caseId);
    const selectedNotes = request.noteIds
      ? allNotes.filter((n) => request.noteIds!.includes(n.id))
      : [];
    if (request.noteIds && selectedNotes.length !== request.noteIds.length) {
      throw new PinError("pin_not_found", "a selected note does not belong to this case");
    }
    const allEvidence = await caseStore.listEvidence(caseId);
    const selectedEvidence = request.evidenceIds
      ? allEvidence.filter((e) => request.evidenceIds!.includes(e.id))
      : [];
    if (request.evidenceIds && selectedEvidence.length !== request.evidenceIds.length) {
      throw new PinError("pin_not_found", "a selected evidence item does not belong to this case");
    }
    const events = await caseStore.listEvents(caseId);

    // Verification runs for the snapshot + the pin list.
    const verificationsByClaim = new Map<string, unknown[]>();
    for (const claim of selectedClaims) {
      const runs = await caseStore.listVerifications(caseId, claim.id);
      verificationsByClaim.set(
        claim.id,
        runs.map((v) => ({
          id: v.id,
          claimId: v.claimId,
          verdict: v.verdict,
          evidence: v.evidence,
          summary: v.summary,
          validatorVerdict: v.validatorVerdict,
          corpusVersions: v.corpusVersions,
          checkerVersion: v.checkerVersion,
          model: v.model,
          promptVersion: v.promptVersion,
          createdById: v.createdById,
          createdAt: v.createdAt.toISOString(),
        })),
      );
    }

    const snapshot = {
      case: {
        id: caseRow.id,
        title: caseRow.title,
        summary: caseRow.summary,
        status: caseRow.status,
        visibility: caseRow.visibility,
        createdAt: caseRow.createdAt.toISOString(),
        updatedAt: caseRow.updatedAt.toISOString(),
        closedAt: caseRow.closedAt ? caseRow.closedAt.toISOString() : null,
      },
      leads: selectedLeads.map((l) => ({
        id: l.id,
        kind: l.kind,
        engine: l.engine,
        entityKey: l.entityKey,
        entityLabel: l.entityLabel,
        snapshot: l.snapshot,
        snapshotSha256: l.snapshotSha256,
        sourceDataset: l.sourceDataset,
        sourceDatasetVersion: l.sourceDatasetVersion,
        ruleCode: l.ruleCode,
        pinnedAt: l.pinnedAt.toISOString(),
        annotation: l.annotation,
      })),
      claims: selectedClaims.map((c) => ({
        id: c.id,
        statement: c.statement,
        subjectEngine: c.subjectEngine,
        subjectEntityKey: c.subjectEntityKey,
        createdById: c.createdById,
        createdAt: c.createdAt.toISOString(),
        verifications: verificationsByClaim.get(c.id) ?? [],
      })),
      notes: selectedNotes.map((n) => ({
        id: n.id,
        leadId: n.leadId,
        evidenceId: n.evidenceId,
        claimId: n.claimId,
        body: n.body,
        authorId: n.authorId,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
      evidenceIndex: selectedEvidence.map((e) => ({
        id: e.id,
        kind: e.kind,
        title: e.title,
        description: e.description,
        originalFilename: e.originalFilename,
        contentType: e.contentType,
        sizeBytes: e.sizeBytes !== null ? e.sizeBytes.toString() : null,
        sha256: e.sha256,
        artifactEnvelope: e.artifactEnvelope,
        artifactSha256: e.artifactSha256,
        processingStatus: e.processingStatus,
        processingPath: e.processingPath,
        processorVersion: e.processorVersion,
        pageCount: e.pageCount,
        uploadedById: e.uploadedById,
        createdAt: e.createdAt.toISOString(),
      })),
      events: events.map((e) => ({
        id: e.id,
        kind: e.kind,
        actorId: e.actorId,
        detail: e.detail,
        createdAt: e.createdAt.toISOString(),
      })),
    };
    pinSet.case = {
      caseId,
      caseSnapshotSha256: sha256OfCanonical(snapshot),
      snapshot,
    };

    for (const lead of selectedLeads) {
      pinSet.leads.push({
        leadId: lead.id,
        caseId,
        kind: lead.kind,
        snapshotSha256: lead.snapshotSha256,
      });
      addDataset(pinSet, lead.sourceDataset, lead.sourceDatasetVersion);
      if (lead.sourceDataset === SIGNALS_DATASET) {
        pinSet.signalsVersion = lead.sourceDatasetVersion;
        pinSet.ruleLibraryVersion = lead.sourceDatasetVersion;
      }
    }
    for (const e of selectedEvidence) {
      const sha = e.sha256 ?? e.artifactSha256;
      if (!sha) {
        throw new PinError(
          "evidence_not_hashed",
          `evidence ${e.id} has no recorded hash and cannot be pinned`,
        );
      }
      pinSet.evidence.push({ evidenceId: e.id, caseId, sha256: sha });
    }
    for (const sel of request.verificationIds ?? []) {
      const runs = await caseStore.listVerifications(caseId, sel.claimId);
      const run = runs.find((v) => v.id === sel.verificationId);
      if (!run) {
        throw new PinError(
          "pin_not_found",
          "a selected verification run does not belong to this case",
        );
      }
      pinSet.verifications.push({
        verificationId: run.id,
        claimId: run.claimId,
        caseId,
        corpusVersions: run.corpusVersions,
      });
      datasetsFromCorpusVersions(pinSet, run.corpusVersions);
    }
  }

  for (const entityPin of request.entityPins ?? []) {
    let captured: CapturedLead;
    try {
      captured = await deps.captureEntity({
        kind: "entity",
        engine: entityPin.engine,
        entityKey: entityPin.entityKey,
      });
    } catch (err) {
      if (err instanceof LeadCaptureError) {
        throw new PinError(
          err.code === "lead_not_found"
            ? "pin_not_found"
            : err.code === "dataset_not_published"
              ? "dataset_not_found"
              : "invalid_input",
          err.message,
        );
      }
      throw err;
    }
    pinSet.entities.push({
      engine: captured.engine,
      entityKey: captured.entityKey,
      capturedSha256: captured.snapshotSha256,
      dataset: captured.sourceDataset,
      datasetVersion: captured.sourceDatasetVersion,
      record: captured.snapshot,
    });
    addDataset(pinSet, captured.sourceDataset, captured.sourceDatasetVersion);
  }

  for (const slug of request.datasetSlugs ?? []) {
    const seed = FRAUD_RADAR_SOURCES.find((s) => s.slug === slug);
    if (!seed) {
      throw new PinError("dataset_not_found", `no registry source with slug: ${slug}`);
    }
    const version = seed.sourceVersion ?? seed.lastPublishedAt ?? null;
    if (!version) {
      throw new PinError(
        "dataset_not_found",
        `registry source ${slug} carries no ingested version to pin`,
      );
    }
    addDataset(pinSet, slug, version);
  }

  return pinSet;
}

// ---------------------------------------------------------------------------
// Template conformance + integrity
// ---------------------------------------------------------------------------

/** Full §1.2 conformance for a captured pin set: the generic
 *  registry check plus the template-specific rules the
 *  generic check cannot express. */
export function validatePinSetForTemplate(
  def: ReportTemplateDef,
  pinSet: PinSet,
): string[] {
  // A case pin transitively pins its leads, claims, and their
  // verification runs (§1.2 Template B inputs): when the
  // template accepts a case pin, those kinds are explained by
  // it and do not trip the not-accepted check (they still
  // satisfy requirements — e.g. Template C's leads may arrive
  // through its context case). Evidence selections are never
  // transitive: they are explicit per-item choices.
  const templateAcceptsCase =
    def.requiredPins.includes("case") ||
    def.optionalPins.includes("case") ||
    (def.requiredPinAlternatives ?? []).some((alt) => alt.includes("case"));
  const transitiveKinds =
    pinSet.case && templateAcceptsCase
      ? new Set<PinKind>(["lead", "verification", "investigatorFinding"])
      : undefined;
  const errors = checkTemplatePins(
    def,
    presentPinKinds(pinSet),
    pinSet.datasets.length,
    { transitiveKinds },
  );
  if (def.id === "D" && !pinSet.leads.some((l) => l.kind === "signal")) {
    errors.push(
      "template D requires at least one lead pin of kind signal (the peer definition lives in its provenance block)",
    );
  }
  if (def.id === "B" || def.id === "F" || def.id === "G") {
    if (!pinSet.case) errors.push(`template ${def.id} requires a case pin`);
  }
  return errors;
}

/**
 * Re-verify a stored pin set against the live Phase 8
 * records before any later stage uses it. Frozen parts
 * (case snapshot, entity records) verify against their own
 * hashes; cited records (leads, evidence, verifications) are
 * re-loaded through their parent case and their CURRENT
 * stored hashes must equal the pins — Phase 8's store has no
 * mutation path for them, so a mismatch means the record was
 * altered outside the store contract and generation must
 * refuse, never silently proceed.
 */
export async function verifyPinSetIntegrity(
  caseStore: CaseStore,
  pinSet: PinSet,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (pinSet.case) {
    if (sha256OfCanonical(pinSet.case.snapshot) !== pinSet.case.caseSnapshotSha256) {
      return { ok: false, reason: "case snapshot hash does not match its pin" };
    }
  }
  for (const entity of pinSet.entities) {
    if (snapshotSha256(entity.record) !== entity.capturedSha256) {
      return {
        ok: false,
        reason: `entity pin ${entity.entityKey} hash does not match its frozen record`,
      };
    }
  }
  for (const leadPin of pinSet.leads) {
    const lead = await caseStore.getLead(leadPin.caseId, leadPin.leadId);
    if (!lead) return { ok: false, reason: `pinned lead ${leadPin.leadId} no longer exists` };
    if (lead.snapshotSha256 !== leadPin.snapshotSha256) {
      return {
        ok: false,
        reason: `pinned lead ${leadPin.leadId} stored hash differs from its pin`,
      };
    }
    if (snapshotSha256(lead.snapshot) !== leadPin.snapshotSha256) {
      return {
        ok: false,
        reason: `pinned lead ${leadPin.leadId} snapshot body no longer hashes to its pin`,
      };
    }
  }
  for (const evidencePin of pinSet.evidence) {
    const evidence = await caseStore.getEvidence(evidencePin.caseId, evidencePin.evidenceId);
    if (!evidence) {
      return { ok: false, reason: `pinned evidence ${evidencePin.evidenceId} no longer exists` };
    }
    const sha = evidence.sha256 ?? evidence.artifactSha256;
    if (sha !== evidencePin.sha256) {
      return {
        ok: false,
        reason: `pinned evidence ${evidencePin.evidenceId} hash differs from its pin`,
      };
    }
  }
  for (const verificationPin of pinSet.verifications) {
    const runs = await caseStore.listVerifications(
      verificationPin.caseId,
      verificationPin.claimId,
    );
    const run = runs.find((v) => v.id === verificationPin.verificationId);
    if (!run) {
      return {
        ok: false,
        reason: `pinned verification ${verificationPin.verificationId} no longer exists`,
      };
    }
    if (canonicalJson(run.corpusVersions) !== canonicalJson(verificationPin.corpusVersions)) {
      return {
        ok: false,
        reason: `pinned verification ${verificationPin.verificationId} corpus versions differ from its pin`,
      };
    }
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Pin diff (§2.3.2: what changed between two pin sets)
// ---------------------------------------------------------------------------

export interface PinDiff {
  caseChanged: boolean;
  leadsAdded: string[];
  leadsRemoved: string[];
  leadsRehashed: string[];
  entitiesAdded: string[];
  entitiesRemoved: string[];
  entitiesRehashed: string[];
  verificationsAdded: string[];
  verificationsRemoved: string[];
  evidenceAdded: string[];
  evidenceRemoved: string[];
  evidenceRehashed: string[];
  datasetVersionChanges: { slug: string; from: string | null; to: string | null }[];
}

export function diffPinSets(prev: PinSet | null, next: PinSet): PinDiff {
  const p: PinSet = prev ?? emptyPinSet();
  const leadById = new Map(p.leads.map((l) => [l.leadId, l]));
  const nextLeadById = new Map(next.leads.map((l) => [l.leadId, l]));
  const entityByKey = new Map(p.entities.map((e) => [e.entityKey, e]));
  const nextEntityByKey = new Map(next.entities.map((e) => [e.entityKey, e]));
  const evById = new Map(p.evidence.map((e) => [e.evidenceId, e]));
  const nextEvById = new Map(next.evidence.map((e) => [e.evidenceId, e]));
  const dsBySlug = new Map(p.datasets.map((d) => [d.slug, d.version]));
  const nextDsBySlug = new Map(next.datasets.map((d) => [d.slug, d.version]));
  const datasetVersionChanges: PinDiff["datasetVersionChanges"] = [];
  for (const slug of new Set([...dsBySlug.keys(), ...nextDsBySlug.keys()])) {
    const from = dsBySlug.get(slug) ?? null;
    const to = nextDsBySlug.get(slug) ?? null;
    if (from !== to) datasetVersionChanges.push({ slug, from, to });
  }
  return {
    caseChanged:
      (p.case?.caseSnapshotSha256 ?? null) !== (next.case?.caseSnapshotSha256 ?? null),
    leadsAdded: next.leads.filter((l) => !leadById.has(l.leadId)).map((l) => l.leadId),
    leadsRemoved: p.leads.filter((l) => !nextLeadById.has(l.leadId)).map((l) => l.leadId),
    leadsRehashed: next.leads
      .filter((l) => leadById.has(l.leadId) && leadById.get(l.leadId)!.snapshotSha256 !== l.snapshotSha256)
      .map((l) => l.leadId),
    entitiesAdded: next.entities.filter((e) => !entityByKey.has(e.entityKey)).map((e) => e.entityKey),
    entitiesRemoved: p.entities.filter((e) => !nextEntityByKey.has(e.entityKey)).map((e) => e.entityKey),
    entitiesRehashed: next.entities
      .filter((e) => entityByKey.has(e.entityKey) && entityByKey.get(e.entityKey)!.capturedSha256 !== e.capturedSha256)
      .map((e) => e.entityKey),
    verificationsAdded: next.verifications
      .filter((v) => !p.verifications.some((x) => x.verificationId === v.verificationId))
      .map((v) => v.verificationId),
    verificationsRemoved: p.verifications
      .filter((v) => !next.verifications.some((x) => x.verificationId === v.verificationId))
      .map((v) => v.verificationId),
    evidenceAdded: next.evidence.filter((e) => !evById.has(e.evidenceId)).map((e) => e.evidenceId),
    evidenceRemoved: p.evidence.filter((e) => !nextEvById.has(e.evidenceId)).map((e) => e.evidenceId),
    evidenceRehashed: next.evidence
      .filter((e) => evById.has(e.evidenceId) && evById.get(e.evidenceId)!.sha256 !== e.sha256)
      .map((e) => e.evidenceId),
    datasetVersionChanges,
  };
}
