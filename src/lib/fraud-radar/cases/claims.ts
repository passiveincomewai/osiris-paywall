/**
 * Fraud Radar Phase 8 — claim service (PHASE8 §4.1, §5.3).
 *
 * Creation stores the user's statement verbatim (never
 * rewritten) with its optional subject; a verification run is
 * the metered unit (§5.3): the monthly count is derived from
 * the FrClaimVerification rows themselves, the run goes
 * through the deterministic checker (§4.3), and the result is
 * stored as a NEW append-only verification row plus a
 * claim_verified case event. Re-running a claim never edits a
 * prior row, so a case shows how a verdict moved when the
 * corpus refreshed — with both vintages on record (§4.4).
 */

import type { CaseEntitlements } from "./entitlements";
import { runClaimCheck, type ClaimCheckDeps } from "./claim-check";
import type { CaseStore, ClaimRecord, VerificationRecord } from "./store";

export class VerificationQuotaError extends Error {
  code = "VERIFICATION_LIMIT" as const;
  limit: number;
  resetAt: Date;
  constructor(limit: number, resetAt: Date) {
    super(`claim verification limit reached (${limit} per month)`);
    this.limit = limit;
    this.resetAt = resetAt;
  }
}

export function monthRange(now: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export async function createClaimForUser(
  store: CaseStore,
  args: {
    caseId: string;
    actorId: string;
    statement: string;
    subjectEngine?: string | null;
    subjectEntityKey?: string | null;
  },
): Promise<ClaimRecord> {
  const claim = await store.createClaim({
    caseId: args.caseId,
    statement: args.statement,
    subjectEngine: args.subjectEngine ?? null,
    subjectEntityKey: args.subjectEntityKey ?? null,
    createdById: args.actorId,
  });
  await store.createEvent({
    caseId: args.caseId,
    kind: "claim_added",
    actorId: args.actorId,
    detail: {
      claimId: claim.id,
      subjectEngine: claim.subjectEngine,
      subjectEntityKey: claim.subjectEntityKey,
    },
  });
  return claim;
}

export async function runClaimVerification(
  store: CaseStore,
  args: {
    caseRow: { id: string; ownerId: string };
    claim: ClaimRecord;
    actorId: string;
    entitlements: CaseEntitlements | null;
  },
  checkDeps: ClaimCheckDeps = {},
): Promise<VerificationRecord> {
  if (args.entitlements) {
    const { start, end } = monthRange(new Date());
    const used = await store.countVerificationsInRange(
      args.caseRow.ownerId,
      start,
      end,
    );
    if (used >= args.entitlements.verificationsPerMonth) {
      throw new VerificationQuotaError(
        args.entitlements.verificationsPerMonth,
        end,
      );
    }
  }
  const result = await runClaimCheck(
    {
      statement: args.claim.statement,
      subjectEngine: args.claim.subjectEngine,
      subjectEntityKey: args.claim.subjectEntityKey,
    },
    checkDeps,
  );
  const verification = await store.createVerification({
    claimId: args.claim.id,
    verdict: result.verdict,
    evidence: result.evidence,
    summary: result.summary,
    validatorVerdict: result.validatorVerdict,
    corpusVersions: result.corpusVersions,
    checkerVersion: result.checkerVersion,
    model: result.model,
    promptVersion: result.promptVersion,
    createdById: args.actorId,
  });
  await store.createEvent({
    caseId: args.caseRow.id,
    kind: "claim_verified",
    actorId: args.actorId,
    detail: {
      claimId: args.claim.id,
      verificationId: verification.id,
      verdict: verification.verdict,
      checkerVersion: verification.checkerVersion,
      corpusVersions: verification.corpusVersions,
    },
  });
  return verification;
}
