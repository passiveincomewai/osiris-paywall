/**
 * Fraud Radar Phase 8 — shared API-route helpers: session
 * resolution + wire serialisation. Route order of checks is
 * fixed by PHASE8 §5.1 and implemented in each route: flag
 * (404) → session (401) → case access (404) → entitlement /
 * quota (429) → work.
 */

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { SessionLike } from "./entitlements";
import {
  getCaseStore,
  type CaseRecord,
  type ClaimRecord,
  type EvidenceRecord,
  type LeadRecord,
  type NoteRecord,
  type ProcessingJobRecord,
  type VerificationRecord,
} from "./store";
import { VERDICT_DEFINITIONS, isClaimVerdict } from "./claim-verdicts";
import { loadAccessibleCase, type CaseAccess } from "./access";

export interface CaseSession {
  userId: string;
  email: string | null;
  session: SessionLike;
}

/** The signed-in user, or null (routes answer 401). */
export async function caseSession(): Promise<CaseSession | null> {
  const session = (await auth().catch(() => null)) as SessionLike | null;
  const userId = session?.user?.id ?? null;
  if (!userId) return null;
  return { userId, email: session?.user?.email ?? null, session: session as SessionLike };
}

/** Platform admin (ADMIN_EMAILS) — used only by the admin
 *  candidate pin path; admins see no case content (§1.5). */
export function isPlatformAdmin(
  email: string | null,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!email) return false;
  const admins = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

export function notFound() {
  return NextResponse.json({ error: "not_found" }, { status: 404 });
}

/** Map a vault validation failure to its honest HTTP state
 *  (§5.2 error shape: { error: CODE }-family bodies). */
export function vaultErrorResponse(err: unknown): NextResponse | null {
  if (!err || typeof err !== "object" || !("code" in err)) return null;
  const code = (err as { code: string }).code;
  const message = err instanceof Error ? err.message : "vault error";
  switch (code) {
    case "storage_unavailable":
      return NextResponse.json(
        { error: "storage_unavailable", code: "STORAGE_UNAVAILABLE" },
        { status: 503 },
      );
    case "file_too_large":
      return NextResponse.json(
        { error: message, code: "FILE_TOO_LARGE" },
        { status: 413 },
      );
    case "unsupported_type":
    case "type_mismatch":
    case "invalid_input":
      return NextResponse.json(
        { error: message, code: code.toUpperCase() },
        { status: 400 },
      );
    default:
      return null;
  }
}

export function signInRequired() {
  return NextResponse.json(
    { error: "Sign in to use cases.", code: "SIGN_IN_REQUIRED" },
    { status: 401 },
  );
}

/**
 * Load a case through resolveCaseAccess for a route. Null means
 * 404 — foreign and nonexistent cases are indistinguishable.
 * Write routes pass write: true (owner-only in v1).
 */
export async function loadCaseForRoute(
  userId: string,
  caseId: string,
  opts?: { write?: boolean },
): Promise<{ caseRow: CaseRecord; access: CaseAccess } | null> {
  return loadAccessibleCase(getCaseStore(), {
    userId,
    caseId,
    write: opts?.write ?? false,
  });
}

export function serializeCase(c: CaseRecord) {
  return {
    id: c.id,
    title: c.title,
    summary: c.summary,
    status: c.status,
    visibility: c.visibility,
    teamRef: c.teamRef,
    closedAt: c.closedAt ? c.closedAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    counts: c.counts,
  };
}

export function serializeLead(l: LeadRecord) {
  return {
    id: l.id,
    caseId: l.caseId,
    kind: l.kind,
    engine: l.engine,
    entityKey: l.entityKey,
    entityLabel: l.entityLabel,
    // Rendered from the snapshot, never from live data (§1.3 rule 2).
    snapshot: l.snapshot,
    snapshotSha256: l.snapshotSha256,
    sourceDataset: l.sourceDataset,
    sourceDatasetVersion: l.sourceDatasetVersion,
    ruleCode: l.ruleCode,
    pinnedById: l.pinnedById,
    pinnedAt: l.pinnedAt.toISOString(),
    annotation: l.annotation,
  };
}

/**
 * Evidence serialisation (§2.1, §2.5): the wire shape carries
 * metadata + hashes only. It NEVER carries a Blob URL and
 * never carries a Blob pathname — clients hold only the
 * evidence id, and bytes move exclusively through the gated
 * download/extracted routes.
 */
export function serializeEvidence(e: EvidenceRecord) {
  return {
    id: e.id,
    caseId: e.caseId,
    kind: e.kind,
    title: e.title,
    description: e.description,
    originalFilename: e.originalFilename,
    contentType: e.contentType,
    sizeBytes: e.sizeBytes !== null ? e.sizeBytes.toString() : null,
    sha256: e.sha256,
    storageState: e.storageState,
    artifactEnvelope: e.artifactEnvelope,
    artifactSha256: e.artifactSha256,
    processingStatus: e.processingStatus,
    processingPath: e.processingPath,
    processorVersion: e.processorVersion,
    pageCount: e.pageCount,
    uploadedById: e.uploadedById,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export function serializeJob(j: ProcessingJobRecord) {
  return {
    id: j.id,
    evidenceId: j.evidenceId,
    caseId: j.caseId,
    status: j.status,
    requestedPath: j.requestedPath,
    attempts: j.attempts,
    error: j.error,
    startedAt: j.startedAt ? j.startedAt.toISOString() : null,
    finishedAt: j.finishedAt ? j.finishedAt.toISOString() : null,
    createdAt: j.createdAt.toISOString(),
  };
}

export function serializeClaim(c: ClaimRecord) {
  return {
    id: c.id,
    caseId: c.caseId,
    // The user's statement, verbatim — never rewritten (§1.6).
    statement: c.statement,
    subjectEngine: c.subjectEngine,
    subjectEntityKey: c.subjectEntityKey,
    createdById: c.createdById,
    createdAt: c.createdAt.toISOString(),
  };
}

export function serializeVerification(v: VerificationRecord) {
  return {
    id: v.id,
    claimId: v.claimId,
    verdict: v.verdict,
    // The §4.2 definition travels with the verdict word.
    verdictDefinition: isClaimVerdict(v.verdict)
      ? VERDICT_DEFINITIONS[v.verdict]
      : null,
    evidence: v.evidence,
    summary: v.summary,
    validatorVerdict: v.validatorVerdict,
    corpusVersions: v.corpusVersions,
    checkerVersion: v.checkerVersion,
    model: v.model,
    promptVersion: v.promptVersion,
    createdById: v.createdById,
    createdAt: v.createdAt.toISOString(),
  };
}

export function serializeNote(n: NoteRecord) {
  return {
    id: n.id,
    caseId: n.caseId,
    leadId: n.leadId,
    evidenceId: n.evidenceId,
    claimId: n.claimId,
    body: n.body,
    authorId: n.authorId,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}
