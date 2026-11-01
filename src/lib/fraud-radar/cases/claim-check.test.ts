import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

vi.mock("@/lib/db", () => ({ db: {} }));

import {
  CLAIM_CHECKER_VERSION,
  parseClaim,
  runClaimCheck,
  type ClaimInput,
  type ClaimToolExecutor,
} from "./claim-check";
import { CLAIM_VERDICTS } from "./claim-verdicts";
import { scanBannedVocabulary } from "../investigator/guardrails";
import type { ToolResult } from "../investigator/citations";
import { createInMemoryCaseStore } from "./store";
import { createClaimForUser, runClaimVerification } from "./claims";
import { CASE_ENTITLEMENTS } from "./entitlements";

/**
 * Phase 8 Payload C — the §5.4.4 claim-verdict fixture suite.
 * (statement, fixture tool outputs) → expected verdict, run
 * deterministically against the checker with an injected tool
 * executor: no model calls, no artifact reads. The classes
 * pinned are the design's: exact-figure match, figure
 * conflict, absent entity, unpublished/null cells, measure
 * conflation, period the corpus does not publish,
 * accusation-shaped claims in both directions, the
 * guaranteed-1% programme-terms claim, no-checkable-content
 * statements, listing claims, ALN claims, vintage labelling,
 * and the over-budget honest completion.
 */

const GRANTS_UEI = "TESTAB123456";
const GRANTS_LISTED_UEI = "SAMXAB123456";
const HC_NPI = "1234567890";
const HC_NULL_NPI = "1112223334";
const CARE_NPI = "2223334445";
const ABSENT_UEI = "ZZZZAB999999";
const ABSENT_NPI = "9998887776";

function envelope(
  tool: string,
  dataset: string,
  version: string,
  grainKey: string,
  data: unknown,
): ToolResult {
  return {
    envelope: {
      tool,
      dataset,
      datasetVersion: version,
      grainKey,
      sourceVintages: [{ source: dataset, version }],
      caveats: [],
      truncated: false,
    },
    data,
  };
}

function grantsProfile(uei: string, listedCount: number) {
  return {
    state: "ok",
    found: true,
    uei,
    stub: {
      uei,
      recipientName: "Fixture Recipient",
      awardCount: 12,
      obligatedAwardCumulativeUsd: 2_100_000,
      outlayAwardCumulativeUsd: 1_800_000,
      samExclusionListed: listedCount > 0,
    },
    totals: {
      awardCount: 12,
      obligatedAwardCumulativeUsd: 2_100_000,
      outlayAwardCumulativeUsd: 1_800_000,
      distinctAlns: 3,
      distinctAgencies: 2,
    },
    screening: {
      samExclusionListingCount: listedCount,
      leieCandidateCount: 1,
    },
    identity: { recipientName: "Fixture Recipient" },
  };
}

function healthcareProfile(npi: string, billingPaid: number | null) {
  return {
    state: "ok",
    found: true,
    npi,
    stub: {
      npi,
      billingPaidExclUsd: billingPaid,
      servicingPaidExclUsd: 50_000,
      billingClaimLines: 1_200,
      leieListed: false,
    },
    summary: {
      billing:
        billingPaid === null
          ? null
          : {
              paidExclOutliersUsd: billingPaid,
              totalClaimLines: 1_200,
            },
      servicing: { paidExclOutliersUsd: 50_000, totalClaimLines: 300 },
      leieListed: false,
    },
    identity: { displayName: "Fixture Provider" },
  };
}

function careProfile(npi: string) {
  return {
    state: "ok",
    found: true,
    npi,
    stub: {
      npi,
      pymtDerivedTotalUsd: 300_000,
      servicesTotal: 5_000,
      leieListed: false,
      yearsPresent: [2022, 2023, 2024],
    },
    years: [
      { year: 2022, pymtDerivedUsd: 100_000 },
      { year: 2023, pymtDerivedUsd: 100_000 },
      { year: 2024, pymtDerivedUsd: 100_000 },
    ],
    identity: { displayName: "Fixture Care Provider" },
    leie: null,
  };
}

const fixtureExecutor: ClaimToolExecutor = async (name, args) => {
  switch (name) {
    case "get_grant_recipient_profile": {
      const uei = String(args.uei);
      if (uei === GRANTS_UEI) {
        return envelope(name, "grants-aggregates", "2026-10-06", `UEI:${uei}`, grantsProfile(uei, 0));
      }
      if (uei === GRANTS_LISTED_UEI) {
        return envelope(name, "grants-aggregates", "2026-10-06", `UEI:${uei}`, grantsProfile(uei, 2));
      }
      return envelope(name, "grants-aggregates", "2026-10-06", `UEI:${uei}`, {
        state: "not_in_published_data",
        found: false,
        uei,
      });
    }
    case "get_medicaid_provider_profile": {
      const npi = String(args.npi);
      if (npi === HC_NPI) {
        return envelope(name, "healthcare-aggregates", "2026-02-09", `NPI:${npi}`, healthcareProfile(npi, 450_000));
      }
      if (npi === HC_NULL_NPI) {
        return envelope(name, "healthcare-aggregates", "2026-02-09", `NPI:${npi}`, healthcareProfile(npi, null));
      }
      return envelope(name, "healthcare-aggregates", "2026-02-09", `NPI:${npi}`, {
        state: "not_in_published_data",
        found: false,
        npi,
      });
    }
    case "get_medicare_provider_profile": {
      const npi = String(args.npi);
      if (npi === CARE_NPI) {
        return envelope(name, "care-aggregates", "2022-2024", `NPI:${npi}`, careProfile(npi));
      }
      return envelope(name, "care-aggregates", "2022-2024", `NPI:${npi}`, {
        state: "not_in_published_data",
        found: false,
        npi,
      });
    }
    case "get_entity_signals":
      return envelope(name, "research-signals", "2026-02-09+2022-2024+2026-10-06", `NPI:${String(args.entityKey)}`, {
        state: "ok",
        entityKey: String(args.entityKey),
        engines: {},
      });
    case "get_source_registry":
      return envelope(name, "source-registry", "2026-10-31", "slug:all", {
        state: "ok",
        registryAvailable: true,
        sources: [{ slug: "fac", sourceVersion: "2026-10-31" }],
      });
    case "lookup_aggregates": {
      const key = String(args.key);
      if (key === "93.600") {
        return envelope(name, "grants-aggregates", "2026-10-06", "grain:grants-aln", {
          grain: "grants-aln",
          state: "ok",
          rows: [
            {
              aln: "93.600",
              alnTitle: "Fixture Programme",
              awards: 40,
              obligatedAwardCumulativeUsd: 750_000,
            },
          ],
          total: 1,
        });
      }
      return envelope(name, "grants-aggregates", "2026-10-06", "grain:grants-aln", {
        grain: "grants-aln",
        state: "ok",
        rows: [],
        total: 0,
      });
    }
    case "get_fac_auditee":
      return envelope(name, "fac", "2026-10-31_ay2026", `EIN:${String(args.ueiOrEin)}`, {
        state: "ok",
        keyType: "EIN",
        fac: null,
        coverage: "recipient_not_in_published_data",
      });
    default:
      throw new Error(`fixture executor: unexpected tool ${name}`);
  }
};

const grantsSubject = { subjectEngine: "grants", subjectEntityKey: `UEI:${GRANTS_UEI}` };
const grantsListedSubject = { subjectEngine: "grants", subjectEntityKey: `UEI:${GRANTS_LISTED_UEI}` };
const hcSubject = { subjectEngine: "healthcare", subjectEntityKey: `NPI:${HC_NPI}` };
const careSubject = { subjectEngine: "care", subjectEntityKey: `NPI:${CARE_NPI}` };

interface Fixture {
  name: string;
  input: ClaimInput;
  verdict: (typeof CLAIM_VERDICTS)[number];
}

const FIXTURES: Fixture[] = [
  {
    name: "grants exact obligated figure matches",
    input: { statement: "The recipient received $2,100,000 in obligated funds.", ...grantsSubject },
    verdict: "supported",
  },
  {
    name: "grants figure plus award count both match",
    input: { statement: "The recipient received $2,100,000 obligated across 12 awards.", ...grantsSubject },
    verdict: "supported",
  },
  {
    name: "grants abbreviated figure matches within its precision",
    input: { statement: "The recipient received $2.1M in obligated funds.", ...grantsSubject },
    verdict: "supported",
  },
  {
    name: "grants outlay figure matches the outlay measure",
    input: { statement: "The recipient's outlay total was $1,800,000.", ...grantsSubject },
    verdict: "supported",
  },
  {
    name: "grants figure conflict",
    input: { statement: "The recipient received $5,000,000 in obligated funds.", ...grantsSubject },
    verdict: "contradicted",
  },
  {
    name: "grants award-count conflict (figure itself matches)",
    input: { statement: "The recipient received $2,100,000 obligated across 9 awards.", ...grantsSubject },
    verdict: "contradicted",
  },
  {
    name: "grants absent entity is not-in-corpus, honestly",
    input: {
      statement: "The recipient received $1,000,000 in obligated funds.",
      subjectEngine: "grants",
      subjectEntityKey: `UEI:${ABSENT_UEI}`,
    },
    verdict: "not-in-corpus",
  },
  {
    name: "healthcare exact billing figure matches",
    input: { statement: "The provider was paid $450,000 in billing payments.", ...hcSubject },
    verdict: "supported",
  },
  {
    name: "healthcare figure conflict",
    input: { statement: "The provider was paid $900,000 in billing payments.", ...hcSubject },
    verdict: "contradicted",
  },
  {
    name: "healthcare claim-lines count matches",
    input: { statement: "The provider was paid $450,000 across 1200 claim lines.", ...hcSubject },
    verdict: "supported",
  },
  {
    name: "healthcare absent provider is not-in-corpus",
    input: {
      statement: `Provider ${ABSENT_NPI} was paid $10,000.`,
    },
    verdict: "not-in-corpus",
  },
  {
    name: "unpublished (null) billing figure cannot settle a claim",
    input: {
      statement: "The provider was paid $450,000 in billing payments.",
      subjectEngine: "healthcare",
      subjectEntityKey: `NPI:${HC_NULL_NPI}`,
    },
    verdict: "insufficient-data",
  },
  {
    name: "care derived total matches",
    input: { statement: "The provider's derived Medicare payments totalled $300,000.", ...careSubject },
    verdict: "supported",
  },
  {
    name: "care claim for a period the corpus does not publish",
    input: { statement: "In 2019 the provider's derived Medicare payments were $100,000.", ...careSubject },
    verdict: "insufficient-data",
  },
  {
    name: "obligations-versus-expenditures conflation cannot be settled",
    input: { statement: "The recipient spent $2,100,000 in expenditures.", ...grantsSubject },
    verdict: "insufficient-data",
  },
  {
    name: "accusation-shaped claim (affirmative)",
    input: { statement: `Provider ${HC_NPI} committed Medicare fraud.`, ...hcSubject },
    verdict: "insufficient-data",
  },
  {
    name: "accusation-shaped claim (negated — same verdict, same shape)",
    input: { statement: `Provider ${HC_NPI} did not commit Medicare fraud.`, ...hcSubject },
    verdict: "insufficient-data",
  },
  {
    name: "accusation-shaped claim (defrauded wording)",
    input: { statement: "The recipient defrauded the government programme.", ...grantsSubject },
    verdict: "insufficient-data",
  },
  {
    name: "accusation-shaped claim (corrupt wording)",
    input: { statement: "The recipient is corrupt.", ...grantsSubject },
    verdict: "insufficient-data",
  },
  {
    name: "guaranteed 1% whistleblower claim conflicts with the published framework",
    input: { statement: "Whistleblowers are guaranteed a 1% commission for every tip they submit." },
    verdict: "contradicted",
  },
  {
    name: "no checkable content at all",
    input: { statement: "The weather was pleasant that year." },
    verdict: "insufficient-data",
  },
  {
    name: "subject attached but no checkable figure",
    input: { statement: "The recipient's main office is in Ohio.", ...grantsSubject },
    verdict: "insufficient-data",
  },
  {
    name: "ALN absent from the corpus is not-in-corpus",
    input: { statement: "ALN 11.111 programmes received $3,000,000 obligated." },
    verdict: "not-in-corpus",
  },
  {
    name: "ALN exact figure matches",
    input: { statement: "ALN 93.600 programmes received $750,000 obligated." },
    verdict: "supported",
  },
  {
    name: "ALN figure conflict",
    input: { statement: "ALN 93.600 programmes received $900,000 obligated." },
    verdict: "contradicted",
  },
  {
    name: "SAM listing claim matches a listed recipient",
    input: { statement: "The recipient is listed in the SAM exclusions extract.", ...grantsListedSubject },
    verdict: "supported",
  },
  {
    name: "SAM non-listing claim conflicts with a listed recipient",
    input: { statement: "The recipient is not listed in the SAM exclusions extract.", ...grantsListedSubject },
    verdict: "contradicted",
  },
  {
    name: "SAM non-listing claim matches an unlisted recipient",
    input: { statement: "The recipient is not listed in the SAM exclusions extract.", ...grantsSubject },
    verdict: "supported",
  },
  {
    name: "LEIE listing claim for a grants recipient cannot be settled from name candidates",
    input: { statement: "The recipient is listed in LEIE.", ...grantsSubject },
    verdict: "insufficient-data",
  },
  {
    name: "LEIE non-listing claim matches the healthcare screening record",
    input: { statement: "The provider is not listed in LEIE.", ...hcSubject },
    verdict: "supported",
  },
  {
    name: "LEIE listing claim conflicts with the healthcare screening record",
    input: { statement: "The provider is listed in LEIE.", ...hcSubject },
    verdict: "contradicted",
  },
  {
    name: "cross-engine NPI resolves through the care engine when Medicaid has no record",
    input: { statement: `Provider ${CARE_NPI} had derived Medicare payments of $300,000.` },
    verdict: "supported",
  },
  {
    name: "EIN subject with no published FAC record is not-in-corpus",
    input: { statement: "The auditee with EIN 123456789 had $50,000 in findings costs." },
    verdict: "not-in-corpus",
  },
];

describe("§5.4.4 fixture set — verdict correctness per class", () => {
  it("the fixture set covers at least 20 fixtures and every verdict class", () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(20);
    for (const verdict of CLAIM_VERDICTS) {
      expect(
        FIXTURES.some((f) => f.verdict === verdict),
        `a fixture for ${verdict}`,
      ).toBe(true);
    }
  });

  for (const fixture of FIXTURES) {
    it(fixture.name, async () => {
      const result = await runClaimCheck(fixture.input, { execute: fixtureExecutor });
      expect(result.verdict, fixture.name).toBe(fixture.verdict);
      expect(CLAIM_VERDICTS).toContain(result.verdict);
      expect(result.checkerVersion).toBe(CLAIM_CHECKER_VERSION);
      expect(result.summary.length).toBeGreaterThan(0);
    });
  }
});

describe("accusation-shaped claims — the §4.4 summary shape", () => {
  for (const statement of [
    `Provider ${HC_NPI} committed Medicare fraud.`,
    `Provider ${HC_NPI} did not commit Medicare fraud.`,
  ]) {
    it(`pins the standing summary for: ${statement}`, async () => {
      const result = await runClaimCheck(
        { statement, ...hcSubject },
        { execute: fixtureExecutor },
      );
      expect(result.verdict).toBe("insufficient-data");
      expect(result.summary).toContain("cannot establish whether");
      expect(result.summary).toContain("nothing in them is a finding of wrongdoing");
      expect(result.summary).toContain("america.gov/fraud");
      expect(result.summary).toContain("justice.gov/fraud/whistleblower");
      expect(result.evidence.reason).toContain("accusation-shaped");
      expect(result.evidence.citations.length).toBeGreaterThan(0);
    });
  }
});

describe("the 1% programme-terms claim — contradicted on its checkable core only", () => {
  it("carries the published WHIP framework verbatim and no guaranteed amount", async () => {
    const result = await runClaimCheck(
      { statement: "A tipster always gets a 1 percent reward under the whistleblower programme." },
      { execute: fixtureExecutor },
    );
    expect(result.verdict).toBe("contradicted");
    expect(result.summary).toContain("$10,000–$30,000 per distinct tip");
    expect(result.summary).toContain("after charges are unsealed");
    expect(result.summary).toContain("DOJ's sole discretion");
    expect(result.summary).not.toContain("guaranteed a 1% commission will be paid");
  });
});

describe("provenance — every verdict carries citations and corpus vintages", () => {
  it("a supported grants verdict records the datasets and versions consulted", async () => {
    const result = await runClaimCheck(FIXTURES[0].input, { execute: fixtureExecutor });
    expect(result.evidence.citations).toHaveLength(1);
    const citation = result.evidence.citations[0];
    expect(citation.dataset).toBe("grants-aggregates");
    expect(citation.datasetVersion).toBe("2026-10-06");
    expect(citation.grainKey).toBe(`UEI:${GRANTS_UEI}`);
    expect(result.corpusVersions["grants-aggregates"]).toBe("2026-10-06");
    expect(result.evidence.figures[0]).toMatchObject({
      claimValue: 2_100_000,
      corpusValue: 2_100_000,
      outcome: "match",
    });
  });

  it("a not-in-corpus verdict states absence as absence, with the threshold caveat", async () => {
    const result = await runClaimCheck(FIXTURES[6].input, { execute: fixtureExecutor });
    expect(result.verdict).toBe("not-in-corpus");
    expect(result.summary).toContain("Absence is stated as absence");
    expect(result.summary).toContain("suppression threshold");
  });
});

describe("over-budget runs complete honestly (§4.1 step 2)", () => {
  it("a run past its wall-clock budget is insufficient-data with the did-not-complete reason", async () => {
    let tick = 0;
    const result = await runClaimCheck(FIXTURES[0].input, {
      execute: fixtureExecutor,
      budgetMs: 5_000,
      now: () => (tick += 10_000),
    });
    expect(result.verdict).toBe("insufficient-data");
    expect(result.evidence.reason).toBe("check did not complete");
  });
});

describe("parse (code, §4.3 step 1)", () => {
  it("extracts identifiers, money with suffix precision, counts, years and ALNs", () => {
    const parsed = parseClaim({
      statement: `Recipient ${GRANTS_UEI} received $2.1M across 12 awards in 2024 under ALN 93.600.`,
    });
    expect(parsed.bareKey).toBe(GRANTS_UEI);
    expect(parsed.keyType).toBe("UEI");
    expect(parsed.money[0].value).toBe(2_100_000);
    expect(parsed.money[0].tolerance).toBe(50_000);
    expect(parsed.counts).toEqual([{ value: 12, unit: "awards" }]);
    expect(parsed.years).toEqual([2024]);
    expect(parsed.aln).toBe("93.600");
  });
});

describe("vocabulary scan — the closed set is the only verdict source (§5.4.4)", () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const modules = ["claim-check.ts", "claim-verdicts.ts", "claims.ts"];

  it("every verdict literal written in the checker is in the closed set", () => {
    const src = readFileSync(path.join(here, "claim-check.ts"), "utf8");
    const literals = [...src.matchAll(/verdict:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(literals.length).toBeGreaterThan(5);
    for (const literal of literals) {
      expect(CLAIM_VERDICTS).toContain(literal);
    }
  });

  it("no banned vocabulary appears in the Phase 8 claim modules' authored copy", () => {
    for (const name of modules) {
      const src = readFileSync(path.join(here, name), "utf8");
      expect(scanBannedVocabulary(src), name).toEqual([]);
    }
  });

  it("the store exposes no verification update or delete (append-only is structural)", () => {
    const src = readFileSync(path.join(here, "store.ts"), "utf8");
    expect(src).not.toContain("updateVerification");
    expect(src).not.toContain("deleteVerification");
    expect(src).toContain("createVerification");
    expect(src).toContain("listVerifications");
  });
});

describe("persistence — verifications are append-only (§1.6)", () => {
  it("re-running a claim creates a second row; the first is never rewritten", async () => {
    const store = createInMemoryCaseStore();
    const caseRow = await store.createCase({ ownerId: "user-a", title: "Matter" });
    const claim = await createClaimForUser(store, {
      caseId: caseRow.id,
      actorId: "user-a",
      statement: "The recipient received $2,100,000 in obligated funds.",
      subjectEngine: "grants",
      subjectEntityKey: `UEI:${GRANTS_UEI}`,
    });
    const args = {
      caseRow,
      claim,
      actorId: "user-a",
      entitlements: CASE_ENTITLEMENTS.plus,
    };
    const first = await runClaimVerification(store, args, { execute: fixtureExecutor });
    expect(first.verdict).toBe("supported");
    const second = await runClaimVerification(store, args, { execute: fixtureExecutor });
    expect(second.id).not.toBe(first.id);
    const history = await store.listVerifications(caseRow.id, claim.id);
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe(first.id);
    expect(history[0].verdict).toBe("supported");
    expect(history[0].summary).toBe(first.summary);
    expect(await store.countVerificationsInRange("user-a", new Date(0), new Date(Date.now() + 60_000))).toBe(2);
    const events = await store.listEvents(caseRow.id);
    expect(events.map((e) => e.kind)).toContain("claim_added");
    expect(events.filter((e) => e.kind === "claim_verified")).toHaveLength(2);
  });

  it("the store refuses a verdict outside the closed vocabulary", async () => {
    const store = createInMemoryCaseStore();
    const caseRow = await store.createCase({ ownerId: "user-a", title: "Matter" });
    const claim = await createClaimForUser(store, {
      caseId: caseRow.id,
      actorId: "user-a",
      statement: "Anything.",
    });
    await expect(
      store.createVerification({
        claimId: claim.id,
        verdict: "confirmed",
        evidence: {},
        summary: "x",
        validatorVerdict: "pass",
        corpusVersions: {},
        checkerVersion: CLAIM_CHECKER_VERSION,
        createdById: "user-a",
      }),
    ).rejects.toThrow(/closed vocabulary/);
  });
});
