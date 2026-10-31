/**
 * Fraud Radar Phase 7 — AI Investigator guardrail copy module
 * (PHASE7 §3). The standing texts the engine and UI render: the
 * research-leads framing, the accusation-pattern response
 * skeleton with the referral block, the WHIP framework stated
 * only as DOJ published it, the gated-scope sentences, and the
 * no-PHI refusal. Single source: no other module writes
 * investigator copy (the Phase 6 "copy is never written
 * per-surface" rule, applied to Phase 7).
 *
 * Binding rules carried by this copy:
 *  - Anomalies are research leads — never declarations about an
 *    entity, never a statement of how likely wrongdoing is,
 *    never a grade of an entity.
 *  - WHIP is described only by DOJ's published framework
 *    ($10,000–$30,000 per distinct tip, paid after charges are
 *    unsealed, DOJ sole discretion). No guaranteed amount of any
 *    kind appears in this module.
 *  - Fraud Radar prepares and organises research; it never
 *    submits a tip on a user's behalf. Tips go through the
 *    official portal.
 */

import {
  RESEARCH_LEAD_FRAMING,
  RESEARCH_LEADS_NOTE,
  SCREENING_RECORDS_NOTE,
} from "../signals-data";

// The Phase 6 framing texts are the single source for signal
// language (signals-data.ts); the investigator re-exports them
// so its surfaces never re-write them.
export { RESEARCH_LEAD_FRAMING, RESEARCH_LEADS_NOTE, SCREENING_RECORDS_NOTE };

/**
 * Banned vocabulary (PHASE6 §2.1, verbatim) plus the Phase 7
 * §3.1 additions. Scanned for in investigator answers by the
 * validator (citations.ts) and over this module's own copy by
 * the test suite. A hit in an answer fails the turn exactly
 * like an untraceable number. Matching is case-insensitive
 * substring, per the Phase 6 publisher precedent (a negating
 * sentence still trips a substring scan — copy is written to
 * avoid the phrases entirely rather than to argue with them).
 * Verbatim source proper nouns in tool-returned data are the
 * Phase 6 source-data exception; this list governs authored
 * copy and model prose, not source records.
 */
export const BANNED_VOCABULARY: readonly string[] = [
  "fraud score",
  "risk score",
  "risk rating",
  "probability of fraud",
  "likelihood of wrongdoing",
  "suspicious",
  "flagged for fraud",
  "fraudster",
  "abuser",
  "guilty",
  "criminal",
  "hot list",
  "worst offenders",
  // PHASE7 §3.1: never applied to an entity in an answer.
  "fraudulent",
  "probability of wrongdoing",
];

/** Case-insensitive substring scan; returns the phrases found. */
export function scanBannedVocabulary(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_VOCABULARY.filter((phrase) => lower.includes(phrase));
}

// ---------------------------------------------------------------------------
// Caveat codes (PHASE6 Appendix A, closed set) resolved to text.
// Envelopes carry the codes; surfaces render this text. The one
// addition beyond Appendix A is NPPES_NBER_MIRROR, the code the
// published rule library added for the §0.8-mandated NBER-mirror
// NPPES label (PHASE6 execution log, D-P6-03) — real envelopes
// carry it, so it must resolve.
// ---------------------------------------------------------------------------

export const CAVEAT_TEXT: Readonly<Record<string, string>> = {
  TIMING_SNAPSHOT:
    "Snapshot-vs-period timing: listing status is as of the named extract or snapshot, not a live status check.",
  DERIVED_DOLLARS:
    "Derived amounts: the source publishes average amounts only; every figure is derived as services × published average and labelled derived.",
  CUMULATIVE_AMOUNTS:
    "Award-cumulative amounts: USAspending snapshot totals for the overall award, not fiscal-year obligations, outlays, or expenditures. The attributed fiscal year is the winning snapshot's archive fiscal year.",
  CEILINGS_NOT_OBLIGATIONS:
    "Ceiling fields are contract ceilings, not obligations.",
  SUPPRESSED_ROWS_ABSENT:
    "Source suppression floors apply: cells below the floor are absent from the source itself. Absence is missing data, never zero.",
  PATIENTS_REPORTED_NOT_UNIQUE:
    "Reported patient/beneficiary volumes are summed over published rows; they are not unique-person counts.",
  EXTRACT_DATED:
    "Extract-dated: SAM/LEIE facts carry the version and date of the extract they were read from, and are never presented as live status.",
  PERIODS_MAY_DIFFER:
    "Accounting periods may differ between the compared records (for example FAC and Form 990 periods).",
  SUBAWARD_REPORTING_INCOMPLETE:
    "Subaward reporting (FSRS) is incomplete by nature; reported subawards are the published files only.",
  ENUMERATION_NOT_OPENING:
    "An NPPES enumeration date is when the NPI was issued, not when a practice opened.",
  NPPES_NBER_MIRROR:
    "Identity data is from the NBER mirror of CMS NPPES, labelled with that vintage — never claimed as a CMS download.",
};

export const CAVEAT_CODES = Object.keys(CAVEAT_TEXT);

// ---------------------------------------------------------------------------
// The standing accusation pattern (PHASE7 §3.3, verbatim
// behaviour). For "did X commit fraud?" and every paraphrase,
// the answer follows this shape. The engine assembles it; the
// texts below are the fixed parts.
// ---------------------------------------------------------------------------

/** Step 1 — the direct answer, with the entity name slotted in.
 *  Never a bare refusal: the user gets the substantive record
 *  too (steps 2–4 of the pattern). */
export function accusationOpening(entityName: string): string {
  return `The public records published in Fraud Radar cannot establish whether ${entityName} committed fraud, and nothing in them is a finding of wrongdoing.`;
}

/** The five steps of the pattern, as the engine's checklist. */
export const ACCUSATION_PATTERN_STEPS: readonly string[] = [
  "Answer the question as asked with the standing opening: the published records cannot establish whether the entity committed fraud, and nothing in them is a finding of wrongdoing.",
  "State what the records do show: the cited facts from tool outputs for that entity (payments or awards as published, with their treatments and vintages), each cited.",
  "Present any research signals as research leads, with their full provenance blocks and the standing research-leads note; screening records stay in their own block with their caveats.",
  "Close with the referral block, verbatim: official channels only, portal discipline stated, no promise of any outcome.",
  "State award amounts only if amounts come up, and only in DOJ's published framework (the WHIP framework text).",
];

/** Step 3's standing sentence, rendered alongside any lead. */
export const RESEARCH_LEAD_STANDING_SENTENCE =
  "A research lead is a reason to look closer; most entities above any statistical band have ordinary explanations.";

/**
 * Step 4 — the referral block (verbatim, never paraphrased
 * into a promise). No phone number is asserted: none was
 * verified in the Phase 0 audit; the HHS-OIG hotline is
 * reached from oig.hhs.gov.
 */
export const REFERRAL_BLOCK =
  "Report suspected fraud through the official channels — the federal fraud-reporting portal at america.gov/fraud (fraud.gov), the DOJ Fraud Whistleblower Incentive Program page at justice.gov/fraud/whistleblower, and for health-care programs the HHS-OIG hotline (linked from oig.hhs.gov). Fraud Radar prepares and organises research; tips must go through the official portal, and DOJ may deny an award for a tip that did not.";

/**
 * Step 5 — WHIP amounts, only in the published framework
 * (AUDIT §11, settled text). This is the ONLY statement of
 * award amounts anywhere in investigator copy.
 */
export const WHIP_FRAMEWORK_TEXT =
  "DOJ's published framework is a reward of $10,000–$30,000 per distinct tip, paid after charges are unsealed, at DOJ's sole discretion. An announced 1% commission appears nowhere in DOJ's published programme materials and is not a programme term.";

/** The no-submission rule, stated wherever action is offered. */
export const NO_SUBMISSION_NOTE =
  "Fraud Radar never submits anything to any authority on a user's behalf, and never states that a user will receive an award. Eligibility and any award are DOJ's determination.";

// ---------------------------------------------------------------------------
// Scope sentences for gated-off tools (PHASE7 §2.5): while a
// tool is unavailable the prompt carries the matching sentence,
// so questions in that scope get an honest not-published
// statement instead of improvisation from another engine's data.
// ---------------------------------------------------------------------------

export const CONTRACTS_NOT_PUBLISHED_SENTENCE =
  "Contract vendor detail is not yet published in this deployment; if asked, say so plainly rather than answering from another engine's data.";

export const SIGNALS_NOT_PUBLISHED_SENTENCE =
  "Research signals are not yet published in this deployment; if asked, say so plainly rather than answering from another engine's data.";

/** Generic not-published statement for a named dataset. */
export function datasetNotPublishedSentence(datasetLabel: string): string {
  return `${datasetLabel} is not published in this deployment yet; answers are limited to what the published datasets show.`;
}

// ---------------------------------------------------------------------------
// Named refusals and honest states (PHASE7 §3.4, §4.5).
// ---------------------------------------------------------------------------

/** Patient-level / identifier requests: the platform does not
 *  hold that data, by design, and no tool could fetch it. */
export const PHI_REFUSAL =
  "Fraud Radar does not hold patient-level records, beneficiary lists, claim lines, or an individual's tax identifiers, by design: its sources are published provider- and entity-grain public records, and no tool exists that could fetch them.";

/** The §2.4 validator fallback notice: when a draft answer
 *  fails validation twice, the turn is replaced by a labelled
 *  table of the verified tool results carrying this sentence —
 *  never by quietly shipping the unverified text. Verbatim
 *  from the design; surfaces capitalise at render if needed. */
export const VALIDATOR_FALLBACK_NOTICE =
  "the assistant's draft answer contained figures that could not be verified against the tool results, so the verified results are shown directly";

/** Model unavailable on this deployment (no heuristic fallback
 *  exists for the investigator — §4.5). */
export const INVESTIGATOR_NOT_CONFIGURED_TEXT =
  "The investigator isn't available on this deployment yet.";
