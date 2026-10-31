import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { createArtifactLoader } from "../healthcare-data";
import { createCareLoader } from "../care-data";
import { createGrantsLoader } from "../grants-data";
import { createSignalsLoader } from "../signals-data";
import { envelopeComplete, type ToolResult } from "./citations";
import {
  TOOL_REGISTRY,
  ToolError,
  availableTools,
  executeTool,
  isValidUei,
  toolPredicateReport,
  type ToolDeps,
} from "./tools";

/**
 * Phase 7 Payload A — tool adapter contract tests (PHASE7 §5.1):
 *  - every executed tool returns an envelope-complete result
 *    (§2.3: dataset, version, grain key, source vintages incl.
 *    SAM/LEIE extract dates, caveat codes);
 *  - nulls are preserved end-to-end (absence is never zero);
 *  - gated tools (contracts, Phase 5 Payload A not landed) are
 *    absent from the offered registry in EVERY environment;
 *  - arguments are validated server-side: malformed identifiers,
 *    placeholder UEIs, unknown keys and out-of-enum grains are
 *    tool errors, never coerced guesses;
 *  - S-06 candidate pairs never appear in a signals tool result.
 * Fixtures are the Phase 2–6 schema-true mini artifacts.
 */

const HC = fileURLToPath(new URL("../__fixtures__/healthcare", import.meta.url));
const CARE = fileURLToPath(new URL("../__fixtures__/care", import.meta.url));
const GRANTS = fileURLToPath(new URL("../__fixtures__/grants", import.meta.url));
const SIGNALS = fileURLToPath(new URL("../__fixtures__/signals", import.meta.url));

const FIXTURE_ENV = {
  FRAUD_RADAR_ARTIFACT_ROOT: HC,
  FRAUD_RADAR_CARE_ARTIFACT_ROOT: CARE,
  FRAUD_RADAR_GRANTS_ARTIFACT_ROOT: GRANTS,
  FRAUD_RADAR_SIGNALS_ARTIFACT_ROOT: SIGNALS,
};

const deps: ToolDeps = {
  env: FIXTURE_ENV,
  loaders: {
    healthcare: createArtifactLoader({ root: HC, version: "2026-02-09", isHttp: false }),
    care: createCareLoader({ root: CARE, version: "2022-2024", isHttp: false }),
    grants: createGrantsLoader({
      root: GRANTS,
      version: "2026-10-06",
      facVersion: "2026-10-31_ay2026",
      isHttp: false,
    }),
    signals: createSignalsLoader({
      root: SIGNALS,
      version: "2026-02-09+2022-2024+2026-10-06",
      isHttp: false,
    }),
  },
  registryHealth: async () => ({ available: false, sources: [], recentRuns: [] }),
};

function expectEnvelope(result: ToolResult, tool: string) {
  expect(result.envelope.tool).toBe(tool);
  expect(envelopeComplete(result.envelope)).toBe(true);
}

async function expectToolError(
  promise: Promise<unknown>,
  code: ToolError["code"],
) {
  await expect(promise).rejects.toMatchObject({ name: "Error", code });
}

describe("registry — the §2.2 inventory and its §2.5 predicates", () => {
  it("registers exactly the 13 designed tools, in design order", () => {
    expect(TOOL_REGISTRY.map((t) => t.name)).toEqual([
      "search_medicaid_providers",
      "search_medicare_providers",
      "search_grant_recipients",
      "search_contract_vendors",
      "get_medicaid_provider_profile",
      "get_medicare_provider_profile",
      "get_grant_recipient_profile",
      "get_contract_vendor_profile",
      "get_contract_award_history",
      "get_entity_signals",
      "lookup_aggregates",
      "get_fac_auditee",
      "get_source_registry",
    ]);
  });

  it("offers no artifact tool when no artifact root is configured", () => {
    const report = toolPredicateReport({});
    const byName = new Map(report.map((r) => [r.name, r]));
    for (const name of [
      "search_medicaid_providers",
      "search_medicare_providers",
      "search_grant_recipients",
      "get_medicaid_provider_profile",
      "get_medicare_provider_profile",
      "get_grant_recipient_profile",
      "get_entity_signals",
      "get_fac_auditee",
    ]) {
      expect(byName.get(name)?.available, name).toBe(false);
      expect(byName.get(name)?.reason, name).toMatch(/not configured/);
    }
    expect(byName.get("lookup_aggregates")?.available).toBe(true);
    expect(byName.get("get_source_registry")?.available).toBe(true);
    expect(availableTools({}).map((t) => t.name)).toEqual([
      "lookup_aggregates",
      "get_source_registry",
    ]);
  });

  it("keeps the contracts tools gated OFF in every environment (Phase 5 A not landed)", () => {
    for (const env of [{}, FIXTURE_ENV]) {
      const report = toolPredicateReport(env);
      for (const name of [
        "search_contract_vendors",
        "get_contract_vendor_profile",
        "get_contract_award_history",
      ]) {
        const entry = report.find((r) => r.name === name);
        expect(entry?.available, `${name} in env`).toBe(false);
        expect(entry?.reason).toContain("phase5_payload_a_not_landed");
        expect(availableTools(env).map((t) => t.name)).not.toContain(name);
      }
    }
    expect(availableTools(FIXTURE_ENV)).toHaveLength(10);
  });

  it("refuses to execute a gated or unknown tool", async () => {
    await expectToolError(
      executeTool("search_contract_vendors", { query: "ACME" }, deps),
      "tool_unavailable",
    );
    await expectToolError(
      executeTool("get_contract_award_history", { awardKey: "X-1" }, deps),
      "tool_unavailable",
    );
    await expectToolError(executeTool("run_sql", { q: "select 1" }, deps), "unknown_tool");
  });
});

describe("argument validation (§2.1 — invalid is an error, never a guess)", () => {
  it("rejects malformed NPIs, UEIs, EINs and placeholder keys", async () => {
    await expectToolError(
      executeTool("get_medicaid_provider_profile", { npi: "123" }, deps),
      "invalid_args",
    );
    await expectToolError(
      executeTool("get_medicare_provider_profile", { npi: "12345678901" }, deps),
      "invalid_args",
    );
    await expectToolError(
      executeTool("get_grant_recipient_profile", { uei: "GSA_MIGRATION" }, deps),
      "invalid_args",
    );
    await expectToolError(
      executeTool("get_grant_recipient_profile", { uei: "AAAAAAAAAAAA" }, deps),
      "invalid_args",
    );
    await expectToolError(
      executeTool("get_fac_auditee", { ueiOrEin: "12345" }, deps),
      "invalid_args",
    );
    expect(isValidUei("ABC123DEF456")).toBe(true);
    expect(isValidUei("GSA_MIGRATION")).toBe(false);
    expect(isValidUei("AAAAAAAAAAAA")).toBe(false);
  });

  it("rejects unknown arguments and out-of-enum grains", async () => {
    await expectToolError(
      executeTool("search_medicaid_providers", { query: "SMITH", page: 2 }, deps),
      "invalid_args",
    );
    await expectToolError(
      executeTool("lookup_aggregates", { grain: "contracts-naics" }, deps),
      "invalid_args",
    );
    await expectToolError(
      executeTool("lookup_aggregates", { grain: "hcpcs", key: "9921" }, deps),
      "invalid_args",
    );
    await expectToolError(
      executeTool("lookup_aggregates", { grain: "grants-aln", key: "93.49" }, deps),
      "invalid_args",
    );
    await expectToolError(
      executeTool("get_source_registry", { slug: "not-a-source" }, deps),
      "invalid_args",
    );
  });
});

describe("healthcare adapters (tools 1 + 5)", () => {
  it("search returns envelope-complete stubs with extract-dated vintages and nulls intact", async () => {
    const result = await executeTool("search_medicaid_providers", { query: "123" }, deps);
    expectEnvelope(result, "search_medicaid_providers");
    expect(result.envelope.dataset).toBe("medicaid-provider-aggregates");
    expect(result.envelope.datasetVersion).toBe("2026-02-09");
    const sam = result.envelope.sourceVintages.find((v) => v.source === "sam-exclusions");
    expect(sam?.version).toBe("2026-301");
    expect(sam?.extractDate).toBe("2026-10-28");
    expect(result.envelope.caveats).toContain("SUPPRESSED_ROWS_ABSENT");
    const data = result.data as { total: number; results: { npi: string; billingPaidExclUsd: number | null }[] };
    expect(data.total).toBe(3);
    expect(data.results).toHaveLength(3);
    const servicingOnly = data.results.find((r) => r.npi === "1234567891");
    expect(servicingOnly?.billingPaidExclUsd).toBeNull();
  });

  it("profile wraps the full published record with capped lists and totals", async () => {
    const result = await executeTool(
      "get_medicaid_provider_profile",
      { npi: "1234567890" },
      deps,
    );
    expectEnvelope(result, "get_medicaid_provider_profile");
    expect(result.envelope.grainKey).toBe("NPI:1234567890");
    const data = result.data as {
      found: boolean;
      summary: { billing: { paidExclOutliersUsd: number | null } | null };
      identity: { displayName: string | null } | null;
      hcpcs: { hcpcsCode: string }[];
      hcpcsTotal: number;
    };
    expect(data.found).toBe(true);
    expect(data.summary.billing?.paidExclOutliersUsd).toBe(1000.5);
    expect(data.identity?.displayName).toBe("SMITH JOHN");
    expect(data.hcpcs.map((h) => h.hcpcsCode)).toEqual(["99213", "99214"]);
    expect(data.hcpcsTotal).toBe(2);
  });

  it("an absent provider is a labelled state, not an error and not zeros", async () => {
    const result = await executeTool(
      "get_medicaid_provider_profile",
      { npi: "5555555555" },
      deps,
    );
    expectEnvelope(result, "get_medicaid_provider_profile");
    expect(result.data).toMatchObject({ state: "not_in_published_data", found: false });
  });
});

describe("care adapters (tools 2 + 6)", () => {
  it("search + profile carry derived-amount caveats and preserve absence", async () => {
    const search = await executeTool("search_medicare_providers", { query: "123" }, deps);
    expectEnvelope(search, "search_medicare_providers");
    expect(search.envelope.caveats).toContain("DERIVED_DOLLARS");
    const sData = search.data as { results: { npi: string; pymtDerivedTotalUsd: number }[] };
    expect(sData.results[0].npi).toBe("1234567890");
    expect(sData.results[0].pymtDerivedTotalUsd).toBe(1500.25);

    const profile = await executeTool(
      "get_medicare_provider_profile",
      { npi: "1234567890" },
      deps,
    );
    expectEnvelope(profile, "get_medicare_provider_profile");
    const pData = profile.data as {
      years: { year: number }[];
      hcpcs: { pymtDerivedUsd: number | null }[];
      leie: unknown;
    };
    // 2023 is absent from the published years — never synthesized.
    expect(pData.years.map((y) => y.year)).toEqual([2022, 2024]);
    expect(pData.hcpcs[0].pymtDerivedUsd).toBe(1500.25);
    expect(pData.leie).toBeNull();
  });
});

describe("grants adapters (tools 3 + 7) + FAC auditee (tool 12)", () => {
  it("profile carries SAM extract dates in the envelope and FAC flags in the data", async () => {
    const result = await executeTool(
      "get_grant_recipient_profile",
      { uei: "ABC123DEF456" },
      deps,
    );
    expectEnvelope(result, "get_grant_recipient_profile");
    expect(result.envelope.grainKey).toBe("UEI:ABC123DEF456");
    expect(result.envelope.caveats).toContain("CUMULATIVE_AMOUNTS");
    expect(result.envelope.caveats).toContain("EXTRACT_DATED");
    const entities = result.envelope.sourceVintages.find((v) => v.source === "sam-entities");
    expect(entities?.extractDate).toBe("2026-10-05");
    const data = result.data as {
      totals: { awardCount: number; obligatedAwardCumulativeUsd: number | null };
      fac: { auditCount: number | null; questionedCostFlagCount: number | null } | null;
      screening: { samExclusionListingCount: number } | null;
    };
    expect(data.totals.awardCount).toBe(12);
    expect(data.totals.obligatedAwardCumulativeUsd).toBe(5000000.5);
    expect(data.fac?.auditCount).toBe(3);
    expect(data.fac?.questionedCostFlagCount).toBe(2);
    // A counted zero in the named extract stays a real zero.
    expect(data.screening?.samExclusionListingCount).toBe(0);
  });

  it("FAC auditee is flags-only: no questioned-cost amount field exists to cite", async () => {
    const result = await executeTool("get_fac_auditee", { ueiOrEin: "ABC123DEF456" }, deps);
    expectEnvelope(result, "get_fac_auditee");
    expect(result.envelope.dataset).toBe("fac");
    expect(result.envelope.grainKey).toBe("UEI:ABC123DEF456");
    const data = result.data as {
      fac: { findingsCount: number | null; questionedCostFlagCount: number | null } | null;
      questionedCostAmounts: string;
      flagsOnly: boolean;
      coverage: string;
    };
    expect(data.fac?.findingsCount).toBe(4);
    expect(data.fac?.questionedCostFlagCount).toBe(2);
    expect(data.questionedCostAmounts).toBe("not_published_by_source");
    expect(data.flagsOnly).toBe(true);
    expect(data.coverage).toBe("published");
    expect(JSON.stringify(result.data)).not.toMatch(/questionedCost[A-Za-z]*Usd/);
  });

  it("FAC auditee by EIN returns the labelled grain state, never an inferred bridge", async () => {
    const result = await executeTool("get_fac_auditee", { ueiOrEin: "123456789" }, deps);
    expectEnvelope(result, "get_fac_auditee");
    expect(result.envelope.grainKey).toBe("EIN:123456789");
    expect(result.data).toMatchObject({
      state: "auditee_grain_detail_not_in_app_layer",
      fac: null,
    });
  });

  it("a recipient with no FAC record carries the null-coverage state", async () => {
    const result = await executeTool("get_fac_auditee", { ueiOrEin: "ABC123XYZ000" }, deps);
    const data = result.data as { fac: unknown; coverage: string };
    expect(data.fac).toBeNull();
    expect(data.coverage).toBe("no_public_fac_record_in_published_vintage");
  });
});

describe("signals adapter (tool 10) — provenance intact, S-06 excluded", () => {
  it("returns the entity's leads with provenance, across its engines", async () => {
    const result = await executeTool("get_entity_signals", { entityKey: "1234567890" }, deps);
    expectEnvelope(result, "get_entity_signals");
    expect(result.envelope.dataset).toBe("research-signals");
    expect(result.envelope.datasetVersion).toBe("2026-02-09+2022-2024+2026-10-06");
    expect(result.envelope.grainKey).toBe("NPI:1234567890");
    const data = result.data as {
      engines: { healthcare: { leads: { code: string; inputVersions: string }[] } };
      provenanceComplete: boolean;
      candidatePairsExcluded: boolean;
    };
    expect(data.engines.healthcare.leads.length).toBeGreaterThan(0);
    expect(data.engines.healthcare.leads[0].inputVersions).toContain("nppes/2026-08");
    expect(data.provenanceComplete).toBe(true);
    expect(data.candidatePairsExcluded).toBe(true);
    expect(result.envelope.sourceVintages).toContainEqual({
      source: "rule-library",
      version: "1.1.0",
    });
  });

  it("structurally excludes S-06 candidate pairs (the cross fixture carries one adversarially)", async () => {
    const result = await executeTool("get_entity_signals", { entityKey: "ABC123DEF456" }, deps);
    expectEnvelope(result, "get_entity_signals");
    const serialized = JSON.stringify(result.data);
    expect(serialized).not.toContain("S-06");
    expect(serialized).not.toContain("candidate_pair");
    const data = result.data as {
      engines: { cross: { leads: { code: string }[]; screeningRecords: { code: string }[] } };
    };
    expect(data.engines.cross.leads.map((l) => l.code)).toContain("X-990-01");
    // The S-01 screening record survives in its own block; only
    // the candidate pair is gone.
    expect(data.engines.cross.screeningRecords.map((r) => r.code)).toEqual(["S-01"]);
  });

  it("is not offered while the signals artifact root is unconfigured", async () => {
    const bare: ToolDeps = { env: {}, loaders: deps.loaders };
    await expectToolError(
      executeTool("get_entity_signals", { entityKey: "1234567890" }, bare),
      "tool_unavailable",
    );
  });
});

describe("aggregates + registry (tools 11 + 13)", () => {
  it("aggregates answer with an envelope-complete honest state when the grain is not loaded", async () => {
    const result = await executeTool("lookup_aggregates", { grain: "hcpcs" }, deps);
    expectEnvelope(result, "lookup_aggregates");
    expect(result.envelope.dataset).toBe("medicaid-provider-aggregates");
    // No Neon database is reachable in the test environment: the
    // fail-soft reader yields the labelled not-available state.
    expect(result.data).toMatchObject({ grain: "hcpcs", state: "not_available" });
  });

  it("registry returns seed rows with SAM/LEIE extract info and honours the slug filter", async () => {
    const all = await executeTool("get_source_registry", {}, deps);
    expectEnvelope(all, "get_source_registry");
    const allData = all.data as {
      registryAvailable: boolean;
      sources: { slug: string; extract: { version: string; extractDate: string | null } | null }[];
    };
    expect(allData.registryAvailable).toBe(false);
    const samExclusions = allData.sources.find((s) => s.slug === "sam-exclusions");
    expect(samExclusions?.extract).toEqual({ version: "2026-301", extractDate: "2026-10-28" });
    const leie = allData.sources.find((s) => s.slug === "leie");
    expect(leie?.extract?.version).toBe("2026-10");

    const one = await executeTool("get_source_registry", { slug: "sam-entities" }, deps);
    expectEnvelope(one, "get_source_registry");
    expect(one.envelope.grainKey).toBe("slug:sam-entities");
    const oneData = one.data as { sources: unknown[] };
    expect(oneData.sources).toHaveLength(1);
  });
});
