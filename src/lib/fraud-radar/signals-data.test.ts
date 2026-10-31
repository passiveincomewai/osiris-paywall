import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import {
  createSignalsLoader,
  signalBucket,
  getSignalsDatasetMeta,
  getSignalsRules,
  getEntitySignals,
  getSignalsQuality,
  getArtifactRuleSummaries,
  listRuleLeads,
  getAdminCandidateQueue,
  decodeSignalRow,
  signalLeadProvenanceComplete,
  contractsPendingState,
  CANDIDATE_STATUS,
  CONTRACTS_PENDING_STATE,
  CONTRACTS_PENDING_NOTE,
  RESEARCH_LEAD_FRAMING,
  RESEARCH_LEADS_NOTE,
  SCREENING_RECORDS_NOTE,
  CANDIDATE_QUEUE_NOTE,
  NOT_COMPUTED_STATES,
  type SignalsLoader,
} from "./signals-data";

/**
 * Phase 6 data-layer tests (§36 acceptance shape): fixtures are
 * schema-true mini artifacts (same wire contract as
 * app-publish/publish_signals.py). Load-bearing rules under test:
 *  - provenance travels with every lead: a lead row missing any
 *    core provenance field (or, where a peer median exists, its
 *    peer definition / rung / n) is incomplete;
 *  - the contracts engine is a typed pending state
 *    (not_computed_input_not_published), never zero leads;
 *  - S-06 candidate pairs are confined to the admin queue: the
 *    public entity loader never returns them, even from a bucket
 *    file that (adversarially) carries one;
 *  - absence stays null: own-history rows carry null peer
 *    statistics by design, and the Neon summary fixture carries
 *    null expectedByConstruction / noiseCaution for them.
 */

const FIXTURES = fileURLToPath(new URL("./__fixtures__/signals", import.meta.url));
const loader: SignalsLoader = createSignalsLoader({
  root: FIXTURES,
  version: "2026-02-09+2022-2024+2026-10-06",
  isHttp: false,
});

describe("signals bucket scheme (publisher contract)", () => {
  it("matches the md5 bucket of a known published entity", () => {
    // 1003213752 was published in sig/healthcare/00.json.
    expect(signalBucket("1003213752")).toBe("00");
    expect(signalBucket("1234567890")).toBe("12");
    expect(signalBucket("ABC123DEF456")).toBe("85");
  });
});

describe("signals dataset meta + engine states", () => {
  it("decodes provenance, language rules and the quality summary", async () => {
    const meta = await getSignalsDatasetMeta(loader);
    expect(meta).not.toBeNull();
    expect(meta!.dataset).toBe("research-signals");
    expect(meta!.version).toBe("2026-02-09+2022-2024+2026-10-06");
    expect(meta!.ruleLibraryVersion).toBe("1.1.0");
    expect(meta!.engines.healthcare.state).toBe("published");
    expect(meta!.engines.healthcare.publication).toBe("2026-02-09");
    expect(meta!.languageRules!.candidateStatusConstant).toBe(CANDIDATE_STATUS);
    expect(meta!.methodsSummary!.notComputedStates).toEqual([...NOT_COMPUTED_STATES]);
    expect(meta!.qualitySummary!.datasetsChecked).toBe(20);
  });

  it("surfaces contracts as a typed pending state, never as zero", async () => {
    const meta = await getSignalsDatasetMeta(loader);
    expect(meta!.engines.contracts.state).toBe(CONTRACTS_PENDING_STATE);
    expect(meta!.engines.contracts.publication).toBeNull();
    const pending = contractsPendingState(meta);
    expect(pending.state).toBe("not_computed_input_not_published");
    expect(pending.ruleCodes).toEqual(["C-01", "C-02", "C-03", "C-04", "C-05", "C-06"]);
    expect(pending.recordCodes).toEqual(["S-02", "X-MULTI-01"]);
    expect(pending.note).toContain("labelled state");
    // No contracts bucket file exists and none is implied.
    expect(await getEntitySignals("contracts", "ABC123DEF456", loader)).toBeNull();
  });

  it("decodes the contracts rules file as pending with empty rules", async () => {
    const rules = await getSignalsRules("contracts", loader);
    expect(rules).not.toBeNull();
    expect(rules!.state).toBe(CONTRACTS_PENDING_STATE);
    expect(rules!.rules).toEqual([]);
    expect(rules!.pending!.pendingRuleCodes).toContain("C-05");
    expect(rules!.pending!.pendingRecordCodes).toEqual(["S-02", "X-MULTI-01"]);
  });
});

describe("signals rule catalog decoding", () => {
  it("decodes a published engine's rules verbatim from the catalog", async () => {
    const rules = await getSignalsRules("healthcare", loader);
    expect(rules!.state).toBe("published");
    expect(rules!.pending).toBeNull();
    expect(rules!.rules).toHaveLength(1);
    const r = rules!.rules[0];
    expect(r.code).toBe("H-MCD-01");
    expect(r.name).toContain("Paid per claim line");
    expect(r.definition).toContain("Research lead");
    expect(r.ratioFloor).toBe(2.0);
    expect(r.floors!.billing_total_claim_lines_min).toBe(1000);
    expect(r.caveatCodes).toEqual(["SUPPRESSED_ROWS_ABSENT", "NPPES_NBER_MIRROR"]);
    expect(r.caveats[1].text).toContain("NBER mirror of CMS NPPES");
    expect(r.inputVersions).toContain("nppes/2026-08");
  });
});

describe("signals entity reads — provenance completeness", () => {
  it("decodes leads with the full provenance block intact", async () => {
    const sig = await getEntitySignals("healthcare", "1234567890", loader);
    expect(sig).not.toBeNull();
    expect(sig!.leads).toHaveLength(2);
    const peer = sig!.leads[0];
    expect(peer.code).toBe("H-MCD-01");
    expect(peer.codeKind).toBe("rule");
    expect(peer.peerMedian).toBe(120.5);
    expect(peer.peerN).toBe(214);
    expect(peer.peerRung).toBe("L1");
    expect(peer.percentileBand).toBe(">=99");
    expect(peer.ratioToPeerMedian).toBe(4.25);
    expect(peer.inputVersions).toContain("2026-02-09");
    expect(peer.caveatCodes).toContain("NPPES_NBER_MIRROR");
    for (const lead of sig!.leads) {
      expect(signalLeadProvenanceComplete(lead)).toBe(true);
    }
  });

  it("keeps own-history peer statistics null — absence, never zero", async () => {
    const sig = await getEntitySignals("healthcare", "1234567890", loader);
    const own = sig!.leads[1];
    expect(own.code).toBe("H-MCD-05");
    expect(own.peerMedian).toBeNull();
    expect(own.peerN).toBeNull();
    expect(own.ratioToPeerMedian).toBeNull();
    expect(own.peerGroupDefinition).toContain("Own history");
    expect(own.detail!.step_month).toBe("2021-03-01");
  });

  it("flags a lead whose provenance block is incomplete", () => {
    const sig = decodeSignalRow({
      entity_key: "1234567890",
      rule_code: "H-MCD-01",
      rule_library_version: "1.1.0",
      lead: true,
      status: "evaluated",
      measure_name: "billing_paid_excl_outliers_usd / billing_total_claim_lines",
      measure_value: 512.34,
      peer_group_definition: null,
      peer_group_key: null,
      peer_rung: null,
      peer_n: null,
      peer_median: 120.5,
      peer_p90: null,
      peer_p99: null,
      percentile_band: ">=99",
      percentile_within_peer_group: 99.5,
      ratio_to_peer_median: 4.25,
      robust_distance_from_peer_median: null,
      input_versions: "medicaid-provider-aggregates/2026-02-09",
      computed_at: "2026-10-31T18:10:37+00:00",
      caveat_codes: [],
      detail: null,
    });
    // A peer median without its definition / rung / n is a defect.
    expect(signalLeadProvenanceComplete(sig)).toBe(false);
  });

  it("returns null for unknown entities and unconfigured artifacts", async () => {
    expect(await getEntitySignals("healthcare", "9999999999", loader)).toBeNull();
    expect(await getEntitySignals("healthcare", "1234567890", null)).toBeNull();
  });
});

describe("signals cross reads — screening stays in its own block", () => {
  it("decodes cross leads and screening records separately", async () => {
    const sig = await getEntitySignals("cross", "ABC123DEF456", loader);
    expect(sig).not.toBeNull();
    expect(sig!.entityKeyType).toBe("UEI");
    expect(sig!.leads).toHaveLength(1);
    expect(sig!.leads[0].code).toBe("X-990-01");
    expect(sig!.leads[0].codeKind).toBe("record");
    expect(sig!.leads[0].recordClass).toBe("discrepancy_rule");
    expect(sig!.screeningRecords).toHaveLength(1);
    expect(sig!.screeningRecords[0].code).toBe("S-01");
    expect(sig!.screeningRecords[0].lead).toBe(false);
  });
});

describe("S-06 confinement — candidates never reach public entity reads", () => {
  it("filters the adversarial S-06 row out of the public entity file", async () => {
    // The cross fixture bucket deliberately carries an S-06 row in
    // its screeningRecords (the publisher guarantees none exist;
    // the layer must confine them even if one were mis-published).
    const sig = await getEntitySignals("cross", "ABC123DEF456", loader);
    const all = [...sig!.leads, ...sig!.screeningRecords];
    expect(all.some((r) => r.code === "S-06")).toBe(false);
    expect(all.some((r) => r.status === CANDIDATE_STATUS)).toBe(false);
  });

  it("exposes the candidate queue only through the admin loader", async () => {
    const queue = await getAdminCandidateQueue(loader);
    expect(queue).not.toBeNull();
    expect(queue!.recordCode).toBe("S-06");
    expect(queue!.statusConstant).toBe(CANDIDATE_STATUS);
    expect(queue!.count).toBe(2);
    expect(queue!.records).toHaveLength(2);
    for (const rec of queue!.records) {
      expect(rec.code).toBe("S-06");
      expect(rec.status).toBe(CANDIDATE_STATUS);
      expect(rec.lead).toBe(false);
    }
  });
});

describe("signals quality artifact decoding", () => {
  it("decodes per-dataset quality records with counts and defects", async () => {
    const q = await getSignalsQuality(loader);
    expect(q).not.toBeNull();
    expect(q!.runDate).toBe("2026-10-31");
    expect(q!.datasets).toHaveLength(1);
    const d = q!.datasets[0];
    expect(d.datasetSlug).toBe("grants-aggregates");
    expect(d.datasetVersion).toBe("2026-10-06");
    expect(d.verdict).toBe("warn");
    expect(d.checkCounts).toEqual({
      total: 20,
      pass: 19,
      warn: 1,
      fail: 0,
      error: 0,
      notApplicable: 0,
    });
    expect(d.detailPointer).toContain("quality.json#datasets/grants-aggregates@2026-10-06");
  });
});

describe("signals Neon loader contract fixture (signals-neon.json)", () => {
  it("carries nullable by-construction fields for own-history rules", async () => {
    const neon = (await loader("signals-neon.json")) as {
      ruleSummaries: {
        ruleCode: string;
        expectedByConstruction: number | null;
        noiseCaution: boolean | null;
        aboveBandBeforeEffectFloor: number | null;
      }[];
      pendingEngines: { engine: string; state: string }[];
      dataQualityRecords: unknown[];
    };
    const peer = neon.ruleSummaries.find((r) => r.ruleCode === "H-MCD-01")!;
    expect(peer.expectedByConstruction).toBe(3201.78);
    expect(peer.noiseCaution).toBe(true);
    const own = neon.ruleSummaries.find((r) => r.ruleCode === "H-MCD-05")!;
    expect(own.expectedByConstruction).toBeNull();
    expect(own.noiseCaution).toBeNull();
    expect(neon.pendingEngines).toEqual([
      expect.objectContaining({
        engine: "contracts",
        state: "not_computed_input_not_published",
      }),
    ]);
    expect(neon.dataQualityRecords).toHaveLength(1);
  });
});

describe("signals artifact summaries + per-rule lead listing (Payload B1 readers)", () => {
  it("reads the artifact summary file as the Neon grain's fallback shape", async () => {
    const rows = await getArtifactRuleSummaries(loader);
    expect(rows).not.toBeNull();
    expect(rows!.map((r) => r.ruleCode)).toEqual(["H-MCD-01", "H-MCD-05"]);
    expect(rows![0].noiseCaution).toBe(true);
    expect(rows![1].expectedByConstruction).toBeNull();
    expect(rows![1].noiseCaution).toBeNull();
    expect(await getArtifactRuleSummaries(null)).toBeNull();
  });

  it("lists a rule's published leads from the sig buckets, provenance intact", async () => {
    const leads = await listRuleLeads("healthcare", "H-MCD-01", 10, loader);
    expect(leads).toHaveLength(1);
    expect(leads![0].entityKey).toBe("1234567890");
    expect(leads![0].ratioToPeerMedian).toBe(4.25);
    expect(signalLeadProvenanceComplete(leads![0])).toBe(true);
    const own = await listRuleLeads("healthcare", "H-MCD-05", 10, loader);
    expect(own).toHaveLength(1);
    expect(own![0].peerMedian).toBeNull();
  });

  it("lists screening records by code from their own block, and confines S-06", async () => {
    const s01 = await listRuleLeads("cross", "S-01", 10, loader);
    expect(s01).toHaveLength(1);
    expect(s01![0].codeKind).toBe("record");
    // Candidates are never listed publicly, and contracts has no buckets.
    expect(await listRuleLeads("cross", "S-06", 10, loader)).toEqual([]);
    expect(await listRuleLeads("contracts", "C-01", 10, loader)).toBeNull();
    expect(await listRuleLeads("healthcare", "H-MCD-01", 10, null)).toBeNull();
  });
});

describe("signals language constants", () => {
  it("carries the binding language rules verbatim in the layer", () => {
    expect(RESEARCH_LEAD_FRAMING).toContain("Research lead");
    expect(RESEARCH_LEAD_FRAMING).toContain("not a finding about the entity");
    expect(RESEARCH_LEADS_NOTE).toContain("research leads");
    expect(RESEARCH_LEADS_NOTE).toContain("never a grade");
    expect(RESEARCH_LEADS_NOTE).toContain("provenance block");
    expect(RESEARCH_LEADS_NOTE).toContain("never zero");
    expect(SCREENING_RECORDS_NOTE).toContain("never merged with rule leads");
    expect(CANDIDATE_QUEUE_NOTE).toContain("admin review queue");
    expect(CANDIDATE_QUEUE_NOTE).toContain("never identity matches");
    expect(CONTRACTS_PENDING_NOTE).toContain("labelled state");
    expect(CONTRACTS_PENDING_NOTE).toContain("no contracts lead count of zero");
    expect(CANDIDATE_STATUS).toBe("candidate — human review");
  });
});
