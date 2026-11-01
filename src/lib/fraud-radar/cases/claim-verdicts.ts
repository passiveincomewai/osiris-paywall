/**
 * Fraud Radar Phase 8 — claim-verification verdict copy
 * (PHASE8 §4.2). The CLOSED verdict vocabulary, in exactly one
 * module: rendered definitions travel with the verdict word
 * everywhere (case surfaces now, Phase 9 exports later) so the
 * distinction the definitions carry cannot be stripped by
 * quoting. No other Phase 8 module writes verdict copy.
 *
 * The closed set is a contract: the checker's single write
 * site (claim-check.ts) can only produce these values, the
 * store write re-checks them, and the fixture suite pins a
 * vocabulary scan over this module and the checker. A verdict
 * describes how a claim's checkable figures stand against the
 * published corpus — never a determination about a person.
 */

export const CLAIM_VERDICTS = [
  "supported",
  "contradicted",
  "not-in-corpus",
  "insufficient-data",
] as const;

export type ClaimVerdict = (typeof CLAIM_VERDICTS)[number];

export function isClaimVerdict(value: string): value is ClaimVerdict {
  return (CLAIM_VERDICTS as readonly string[]).includes(value);
}

/** The §4.2 definitions, rendered with the verdict word. */
export const VERDICT_DEFINITIONS: Readonly<Record<ClaimVerdict, string>> = {
  supported:
    "The published corpus contains records that affirm the claim's checkable figures and facts as stated, within the corpus's own grain and vintages. Supported means the checkable figures match the corpus — it is not a determination about any allegation.",
  contradicted:
    "The published corpus contains records that affirmatively conflict with the claim as stated (a different figure, a different period, or an entity present with different facts).",
  "not-in-corpus":
    "The claim's subject and facts do not appear in the published corpus at all. Absence is stated as absence: it can mean the record sits below a reporting or suppression threshold, or outside the corpus's coverage.",
  "insufficient-data":
    "The corpus touches the subject but cannot settle the claim as stated: needed cells are unpublished or carry no value, the claim spans a period or grain the corpus does not publish, the claim's figure would require an unpublished derivation, or the check did not complete.",
};

/**
 * The honest incomplete-run reason (§4.1 step 2): an
 * over-budget check completes with this verdict reason rather
 * than hanging or forcing a verdict the completed checks do
 * not support.
 */
export const CHECK_DID_NOT_COMPLETE_REASON = "check did not complete";

/** The no-checkable-content reason (§4.3 step 1). */
export const NO_CHECKABLE_CONTENT_REASON =
  "the statement contains no figure or record the published corpus can check";

/**
 * The §4.4 standing opening for accusation-shaped claims,
 * reused from the Phase 7 §3.3 pattern via its single source
 * (investigator/guardrails.ts) — never re-drafted here. The
 * checker pairs it with the cited record and the referral
 * block, attached to an insufficient-data verdict: it explains
 * why that verdict, and is not a fifth verdict.
 */
export { accusationOpening } from "../investigator/guardrails";
