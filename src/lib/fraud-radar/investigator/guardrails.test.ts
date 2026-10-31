import { describe, it, expect } from "vitest";
import {
  ACCUSATION_PATTERN_STEPS,
  BANNED_VOCABULARY,
  CAVEAT_CODES,
  CAVEAT_TEXT,
  CONTRACTS_NOT_PUBLISHED_SENTENCE,
  INVESTIGATOR_NOT_CONFIGURED_TEXT,
  NO_SUBMISSION_NOTE,
  PHI_REFUSAL,
  REFERRAL_BLOCK,
  RESEARCH_LEAD_FRAMING,
  RESEARCH_LEAD_STANDING_SENTENCE,
  RESEARCH_LEADS_NOTE,
  SCREENING_RECORDS_NOTE,
  SIGNALS_NOT_PUBLISHED_SENTENCE,
  VALIDATOR_FALLBACK_NOTICE,
  WHIP_FRAMEWORK_TEXT,
  accusationOpening,
  datasetNotPublishedSentence,
  scanBannedVocabulary,
} from "./guardrails";

/**
 * Phase 7 Payload A — guardrail copy tests (PHASE7 §3). The
 * copy module is the single source of investigator standing
 * texts; every rendered string must itself pass the banned-
 * vocabulary scan (the list constant is the scanner's input,
 * not copy, and is the one export excluded), the referral
 * block must carry the official channels verbatim, and WHIP
 * must be stated only in DOJ's published framework.
 */

const COPY_STRINGS: [string, string][] = [
  ["accusationOpening", accusationOpening("ACME CORPORATION")],
  ["RESEARCH_LEAD_STANDING_SENTENCE", RESEARCH_LEAD_STANDING_SENTENCE],
  ["REFERRAL_BLOCK", REFERRAL_BLOCK],
  ["WHIP_FRAMEWORK_TEXT", WHIP_FRAMEWORK_TEXT],
  ["NO_SUBMISSION_NOTE", NO_SUBMISSION_NOTE],
  ["CONTRACTS_NOT_PUBLISHED_SENTENCE", CONTRACTS_NOT_PUBLISHED_SENTENCE],
  ["SIGNALS_NOT_PUBLISHED_SENTENCE", SIGNALS_NOT_PUBLISHED_SENTENCE],
  ["datasetNotPublishedSentence", datasetNotPublishedSentence("Contract data")],
  ["PHI_REFUSAL", PHI_REFUSAL],
  ["VALIDATOR_FALLBACK_NOTICE", VALIDATOR_FALLBACK_NOTICE],
  ["INVESTIGATOR_NOT_CONFIGURED_TEXT", INVESTIGATOR_NOT_CONFIGURED_TEXT],
  ["RESEARCH_LEAD_FRAMING", RESEARCH_LEAD_FRAMING],
  ["RESEARCH_LEADS_NOTE", RESEARCH_LEADS_NOTE],
  ["SCREENING_RECORDS_NOTE", SCREENING_RECORDS_NOTE],
  ...ACCUSATION_PATTERN_STEPS.map(
    (step, i) => [`ACCUSATION_PATTERN_STEPS[${i}]`, step] as [string, string],
  ),
  ...CAVEAT_CODES.map(
    (code) => [`CAVEAT_TEXT.${code}`, CAVEAT_TEXT[code]] as [string, string],
  ),
];

describe("guardrail copy — banned-vocabulary scan over the module", () => {
  it("no standing text carries a banned phrase", () => {
    for (const [name, text] of COPY_STRINGS) {
      expect(scanBannedVocabulary(text), name).toEqual([]);
    }
  });

  it("the banned list is the Phase 6 §2.1 list plus the §3.1 additions", () => {
    for (const phrase of [
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
      "fraudulent",
    ]) {
      expect(BANNED_VOCABULARY).toContain(phrase);
    }
    expect(scanBannedVocabulary("a SUSPICIOUS pattern")).toEqual(["suspicious"]);
  });
});

describe("the accusation pattern (§3.3)", () => {
  it("opens with the standing sentence, never a bare refusal", () => {
    const opening = accusationOpening("ACME CORPORATION");
    expect(opening).toContain(
      "cannot establish whether ACME CORPORATION committed fraud",
    );
    expect(opening).toContain("nothing in them is a finding of wrongdoing");
  });

  it("carries the referral block with the official channels verbatim", () => {
    expect(REFERRAL_BLOCK).toContain("america.gov/fraud");
    expect(REFERRAL_BLOCK).toContain("fraud.gov");
    expect(REFERRAL_BLOCK).toContain("justice.gov/fraud/whistleblower");
    expect(REFERRAL_BLOCK).toContain("HHS-OIG hotline");
    expect(REFERRAL_BLOCK).toContain("oig.hhs.gov");
    expect(REFERRAL_BLOCK).toContain("tips must go through the official portal");
    expect(ACCUSATION_PATTERN_STEPS).toHaveLength(5);
  });

  it("states WHIP only in DOJ's published framework — no guaranteed amount", () => {
    expect(WHIP_FRAMEWORK_TEXT).toContain("$10,000–$30,000 per distinct tip");
    expect(WHIP_FRAMEWORK_TEXT).toContain("paid after charges are unsealed");
    expect(WHIP_FRAMEWORK_TEXT).toContain("DOJ's sole discretion");
    expect(WHIP_FRAMEWORK_TEXT).toContain(
      "appears nowhere in DOJ's published programme materials",
    );
    expect(WHIP_FRAMEWORK_TEXT.toLowerCase()).not.toContain("guarantee");
    expect(NO_SUBMISSION_NOTE).toContain("never submits anything");
    expect(NO_SUBMISSION_NOTE).toContain("never states that a user will receive an award");
  });
});

describe("caveat codes (PHASE6 Appendix A)", () => {
  it("resolves every Appendix A code to text", () => {
    for (const code of [
      "TIMING_SNAPSHOT",
      "DERIVED_DOLLARS",
      "CUMULATIVE_AMOUNTS",
      "CEILINGS_NOT_OBLIGATIONS",
      "SUPPRESSED_ROWS_ABSENT",
      "PATIENTS_REPORTED_NOT_UNIQUE",
      "EXTRACT_DATED",
      "PERIODS_MAY_DIFFER",
      "SUBAWARD_REPORTING_INCOMPLETE",
      "ENUMERATION_NOT_OPENING",
    ]) {
      expect(CAVEAT_TEXT[code], code).toBeTruthy();
    }
  });

  it("the fallback notice is the design's verbatim sentence", () => {
    expect(VALIDATOR_FALLBACK_NOTICE).toBe(
      "the assistant's draft answer contained figures that could not be verified against the tool results, so the verified results are shown directly",
    );
  });
});
