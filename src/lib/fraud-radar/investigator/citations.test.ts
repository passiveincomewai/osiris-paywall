import { describe, it, expect } from "vitest";
import {
  buildTraceCorpus,
  envelopeComplete,
  extractNumericTokens,
  formatCitation,
  validateAnswer,
  type ToolResult,
} from "./citations";

/**
 * Phase 7 Payload A — citation validator fixtures (PHASE7 §2.4).
 * The contract: every number in an answer traces verbatim to a
 * tool output from the same turn (formatting may differ; the
 * value may not), identifiers trace exactly, quoted names
 * appear as returned, and banned vocabulary fails the turn.
 * Numbers inside citations themselves (dataset version, SAM
 * extract dates) trace to the envelope's own fields.
 */

const grantsProfile: ToolResult = {
  envelope: {
    tool: "get_grant_recipient_profile",
    dataset: "grants-aggregates",
    datasetVersion: "2026-10-06",
    grainKey: "UEI:ABC123DEF456",
    sourceVintages: [
      { source: "usaspending", version: "2026-10-06" },
      { source: "sam-entities", version: "2026-10-05", extractDate: "2026-10-05" },
      { source: "sam-exclusions", version: "2026-301", extractDate: "2026-10-28" },
      { source: "fac", version: "2026-10-31_ay2026" },
    ],
    caveats: ["CUMULATIVE_AMOUNTS", "EXTRACT_DATED"],
    truncated: false,
  },
  data: {
    uei: "ABC123DEF456",
    identity: { recipientName: "ACME CORPORATION", samLegalBusinessName: "ACME CORP" },
    totals: { awardCount: 12, obligatedAwardCumulativeUsd: 5000000.5 },
    fac: { auditCount: 3, findingsCount: 4, questionedCostFlagCount: 2 },
    screening: { samExclusionListingCount: 0 },
    absentMeasure: null,
  },
};

describe("envelope completeness (§2.3)", () => {
  it("accepts a complete envelope and renders its citation", () => {
    expect(envelopeComplete(grantsProfile.envelope)).toBe(true);
    expect(formatCitation(grantsProfile.envelope)).toBe(
      "grants-aggregates@2026-10-06 · UEI:ABC123DEF456",
    );
  });

  it("rejects envelopes missing any required part", () => {
    const base = grantsProfile.envelope;
    expect(envelopeComplete({ ...base, datasetVersion: "" })).toBe(false);
    expect(envelopeComplete({ ...base, grainKey: "" })).toBe(false);
    expect(envelopeComplete({ ...base, sourceVintages: [] })).toBe(false);
    expect(
      envelopeComplete({ ...base, sourceVintages: [{ source: "fac", version: "" }] }),
    ).toBe(false);
  });

  it("a turn whose corpus contains an incomplete envelope fails closed", () => {
    const broken: ToolResult = {
      envelope: { ...grantsProfile.envelope, datasetVersion: "" },
      data: grantsProfile.data,
    };
    const verdict = validateAnswer("ACME CORPORATION has 12 awards.", [broken]);
    expect(verdict.verdict).toBe("fail");
  });
});

describe("numeric trace validation (§2.4.2)", () => {
  it("passes an answer whose numbers all trace, in formatted renderings", () => {
    const answer =
      "ACME CORPORATION (UEI:ABC123DEF456) has 12 awards with $5,000,000.50 in award-cumulative obligated amounts (grants-aggregates@2026-10-06). Its single audits carry 4 findings and 2 questioned-cost flags. SAM exclusions were read from extract 2026-301, dated 2026-10-28.";
    const verdict = validateAnswer(answer, [grantsProfile]);
    expect(verdict.verdict).toBe("pass");
    expect(verdict.untraceableNumbers).toEqual([]);
  });

  it("flags an invented number with the offending token", () => {
    const verdict = validateAnswer(
      "ACME CORPORATION received $9,999,999 in total funding.",
      [grantsProfile],
    );
    expect(verdict.verdict).toBe("fail");
    expect(verdict.untraceableNumbers).toEqual(["$9,999,999"]);
  });

  it("flags an altered number — a near-miss is still an invention", () => {
    const verdict = validateAnswer(
      "The obligated total was $5,000,000.51 across its awards.",
      [grantsProfile],
    );
    expect(verdict.verdict).toBe("fail");
    expect(verdict.untraceableNumbers).toEqual(["$5,000,000.51"]);
  });

  it("flags model arithmetic: a computed percentage traces to nothing", () => {
    const verdict = validateAnswer(
      "That is a 50% increase over the earlier figure of 12 awards.",
      [grantsProfile],
    );
    expect(verdict.verdict).toBe("fail");
    expect(verdict.untraceableNumbers).toEqual(["50%"]);
  });

  it("a null rendered as a number fails whenever that number is absent from the corpus", () => {
    // absentMeasure is null in this corpus, and the corpus
    // carries no zero at all — so rendering the absence as $0
    // invents a number and fails (the §0.4 / §2.4 null rule,
    // enforced by corpus absence).
    const noZero: ToolResult = {
      envelope: grantsProfile.envelope,
      data: {
        uei: "ABC123DEF456",
        totals: { awardCount: 12, obligatedAwardCumulativeUsd: 5000000.5 },
        absentMeasure: null,
      },
    };
    const verdict = validateAnswer("The absent measure was $0.", [noZero]);
    expect(verdict.verdict).toBe("fail");
    expect(verdict.untraceableNumbers).toEqual(["$0"]);
    // And in the full corpus, where the source DID report a
    // zero (the screening count), 0 is citable — a reported
    // zero is data, absence is not.
    const withZero = validateAnswer(
      "The exclusion listing count was 0.",
      [grantsProfile],
    );
    expect(withZero.verdict).toBe("pass");
  });

  it("does not treat digit runs inside identifiers as numbers", () => {
    const corpus = buildTraceCorpus([grantsProfile]);
    expect(corpus.identifiers.has("ABC123DEF456")).toBe(true);
    expect(corpus.numbers).not.toContain(123);
    expect(corpus.numbers).not.toContain(456);
    const tokens = extractNumericTokens("UEI:ABC123DEF456 has 12 awards");
    expect(tokens.map((t) => t.value)).toContain(12);
  });
});

describe("identifier + name trace validation (§2.4.3)", () => {
  it("flags an identifier that no tool returned", () => {
    const verdict = validateAnswer(
      "The recipient ZZZ999ZZZ999 has 12 awards.",
      [grantsProfile],
    );
    expect(verdict.verdict).toBe("fail");
    expect(verdict.untraceableIdentifiers).toEqual(["ZZZ999ZZZ999"]);
  });

  it("passes quoted names exactly as returned and flags corrected ones", () => {
    const ok = validateAnswer(
      'The recipient "ACME CORPORATION" has 12 awards.',
      [grantsProfile],
    );
    expect(ok.verdict).toBe("pass");
    const corrected = validateAnswer(
      'The recipient "ACME CORPORATION INC" has 12 awards.',
      [grantsProfile],
    );
    expect(corrected.verdict).toBe("fail");
    expect(corrected.untraceableNames).toEqual(["ACME CORPORATION INC"]);
  });
});

describe("banned vocabulary scan (§3.1)", () => {
  it("fails a turn carrying a banned phrase, naming the hit", () => {
    const verdict = validateAnswer(
      "This suspicious provider has 12 awards.",
      [grantsProfile],
    );
    expect(verdict.verdict).toBe("fail");
    expect(verdict.bannedHits).toEqual(["suspicious"]);
  });

  it("passes clean research language", () => {
    const verdict = validateAnswer(
      "ACME CORPORATION has 12 awards totalling $5,000,000.50 in award-cumulative obligated amounts.",
      [grantsProfile],
    );
    expect(verdict).toMatchObject({ verdict: "pass", bannedHits: [] });
  });
});
