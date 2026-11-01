/**
 * Fraud Radar Phase 8 — case service (PHASE8 §1.2, §5.3, §2.6).
 *
 * The write paths for cases themselves: creation against the
 * entitlement interface, updates (title/summary/status/
 * visibility — the user's own framing, never a finding), and
 * hard deletion. Every mutation writes its FrCaseEvent.
 * Access is NOT decided here — routes resolve it through
 * access.ts first and hand this module an authorised case row.
 */

import type { CaseRecord, CaseStore } from "./store";
import type { CaseEntitlements } from "./entitlements";
import { deleteVaultObjects } from "./vault";

export class CaseQuotaError extends Error {
  code = "CASE_LIMIT" as const;
  limit: number;
  constructor(limit: number) {
    super(`open case limit reached (${limit})`);
    this.limit = limit;
  }
}

export const CASE_STATUSES = ["open", "paused", "closed"] as const;
export const CASE_VISIBILITIES = ["private", "team"] as const;

export async function createCaseForUser(
  store: CaseStore,
  args: {
    ownerId: string;
    title: string;
    summary?: string | null;
    entitlements: CaseEntitlements | null;
  },
): Promise<CaseRecord> {
  if (args.entitlements) {
    const open = await store.countOpenCases(args.ownerId);
    if (open >= args.entitlements.maxOpenCases) {
      throw new CaseQuotaError(args.entitlements.maxOpenCases);
    }
  }
  const created = await store.createCase({
    ownerId: args.ownerId,
    title: args.title,
    summary: args.summary ?? null,
  });
  await store.createEvent({
    caseId: created.id,
    kind: "case_created",
    actorId: args.ownerId,
    detail: { title: created.title },
  });
  return created;
}

export interface CasePatch {
  title?: string;
  summary?: string | null;
  status?: string;
  visibility?: string;
  teamRef?: string | null;
}

export async function updateCaseForUser(
  store: CaseStore,
  args: { caseRow: CaseRecord; actorId: string; patch: CasePatch },
): Promise<CaseRecord> {
  const { caseRow, patch } = args;
  const data: Parameters<CaseStore["updateCase"]>[1] = {};
  if (patch.title !== undefined) data.title = patch.title;
  if (patch.summary !== undefined) data.summary = patch.summary;
  if (patch.visibility !== undefined) data.visibility = patch.visibility;
  if (patch.teamRef !== undefined) data.teamRef = patch.teamRef;
  let eventKind: string | null = null;
  if (patch.status !== undefined && patch.status !== caseRow.status) {
    data.status = patch.status;
    if (patch.status === "closed") {
      data.closedAt = new Date();
      eventKind = "case_closed";
    } else if (caseRow.status === "closed") {
      data.closedAt = null;
      eventKind = "case_reopened";
    }
  }
  const updated = await store.updateCase(caseRow.id, data);
  if (eventKind) {
    await store.createEvent({
      caseId: caseRow.id,
      kind: eventKind,
      actorId: args.actorId,
      detail: { status: updated.status },
    });
  }
  return updated;
}

/**
 * Delete a case (§2.6 rule 2): enumerate THIS case's vault Blob
 * pathnames, delete the objects, then hard-delete the row;
 * children cascade. There is no trash and no soft-delete for
 * cases in v1. Blob deletion is best-effort per object: any
 * pathname that could not be deleted is returned (never
 * silently dropped) so the caller can surface it; the row
 * delete proceeds because the case's access is revoked with
 * it either way.
 */
export async function deleteCaseForUser(
  store: CaseStore,
  args: { caseRow: CaseRecord; actorId: string },
): Promise<{ evidencePathnames: string[]; failedPathnames: string[] }> {
  const pathnames = await store.listEvidencePathnamesForCase(args.caseRow.id);
  const { failed } = await deleteVaultObjects(pathnames);
  await store.deleteCase(args.caseRow.id);
  void args.actorId;
  return { evidencePathnames: pathnames, failedPathnames: failed };
}

/**
 * Account-deletion vault hook (§2.6 rule 3): the enumeration
 * the account-deletion flow calls BEFORE its DB cascade, so no
 * vault bytes are left ownerless. P8-B completes the sweep
 * behind it: `sweepUserVaultObjects` (vault.ts) deletes the
 * enumerated objects, and the account-deletion executor calls
 * it before deleting the user row.
 */
export async function listUserEvidencePathnames(
  store: CaseStore,
  ownerId: string,
): Promise<string[]> {
  return store.listEvidencePathnamesForUser(ownerId);
}
