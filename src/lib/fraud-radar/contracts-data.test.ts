import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import {
  createContractsLoader,
  contractsBucket,
  searchContractVendors,
  getContractVendorProfile,
  getContractAward,
  getContractsTopVendors,
  getContractsDatasetMeta,
  MEASURE_NOTE,
  CEILINGS_NOTE,
  NO_FAC_NOTE,
  SCREENING_NOTE,
  PARENT_LINKAGE_NOTE,
  type ContractsLoader,
} from "./contracts-data";

/**
 * Phase 5 data-layer tests (§35): fixtures are schema-true mini
 * artifacts (same wire contract as app-publish/publish_contracts.py,
 * including the gzip award buckets). Load-bearing spec rules:
 *  - award buckets are gzip JSON and MUST gunzip before parsing;
 *  - absence is never zero (null outlay stays null end-to-end);
 *  - ceilings are labelled ceilings, never obligations;
 *  - FAC does NOT cover contracts — no FAC block exists or is
 *    synthesised anywhere in this layer;
 *  - screening decodes as research leads with extract dates;
 *  - parent linkage renders as published (as-designed value),
 *    with the normalised figure a labelled diagnostic only.
 */

const FIXTURES = fileURLToPath(new URL("./__fixtures__/contracts", import.meta.url));
const loader: ContractsLoader = createContractsLoader({
  root: FIXTURES,
  version: "2026-10-06",
  isHttp: false,
});

describe("contracts bucket scheme — matches the publisher", () => {
  it("buckets vendor keys % 100 and award keys % 1000 (md5)", () => {
    expect(contractsBucket("ABC123DEF456", 100)).toBe("85");
    expect(contractsBucket("CONT_AWD_TEST123_9700", 1000)).toBe("496");
  });
});

describe("contracts search", () => {
  it("rejects queries shorter than 3 key characters", async () => {
    const r = await searchContractVendors("AB", {}, loader);
    expect(r.error).toBe("too_short");
    expect(r.results).toEqual([]);
  });

  it("finds vendors by UEI prefix and by name tokens", async () => {
    const byUei = await searchContractVendors("ABC123", {}, loader);
    expect(byUei.mode).toBe("uei");
    expect(byUei.total).toBe(1);
    expect(byUei.results[0].uei).toBe("ABC123DEF456");
    const byName = await searchContractVendors("acme corp", {}, loader);
    expect(byName.mode).toBe("name");
    expect(byName.total).toBe(1);
  });
});

describe("contracts vendor profile — absence is not zero, no FAC", () => {
  it("decodes identity, totals, SAM and screening blocks", async () => {
    const p = await getContractVendorProfile("ABC123DEF456", loader);
    expect(p).not.toBeNull();
    expect(p!.identity.cageCode).toBe("1ABC2");
    // Null outlay is absence in the published grain — stays null.
    expect(p!.totals.totalOutlayedAmountForOverallAward).toBeNull();
    expect(p!.samRegistration?.extractVersion).toBe("2026-10-05");
    expect(p!.samRegistration?.registrationActiveAsOfExtract).toBe(true);
    // A counted zero in the named extract is a true zero.
    expect(p!.screening?.samExclusions?.listingCount).toBe(0);
    expect(p!.screening?.leieNameCandidates?.candidateStatus).toBe(
      "candidate — human review",
    );
    // NO FAC block exists in the contracts wire or this layer.
    expect(p).not.toHaveProperty("fac");
    expect(JSON.stringify(p)).not.toContain("\"fac\"");
  });

  it("returns null for malformed or unknown UEIs", async () => {
    expect(await getContractVendorProfile("nope", loader)).toBeNull();
    expect(await getContractVendorProfile("ZZZ999YYY888", loader)).toBeNull();
  });
});

describe("contracts award detail — gzip timeline, ceilings labelled", () => {
  it("gunzips the award bucket and returns the full timeline", async () => {
    const a = await getContractAward("CONT_AWD_TEST123_9700", loader);
    expect(a).not.toBeNull();
    expect(a!.timeline).toHaveLength(2);
    expect(a!.timeline[0].modificationNumber).toBe("0");
    expect(a!.timeline[1].federalActionObligation).toBe(500.5);
    // Snapshot money comes from the winning row; ceilings keep
    // their Ceiling names and are never merged into obligated.
    expect(a!.snapshotMoney.totalDollarsObligated).toBe(1500.5);
    expect(a!.snapshotMoney.baseAndAllOptionsValueCeiling).toBe(2000.0);
    expect(a!.modificationBlock?.federalActionObligationSumInWindow).toBe(1500.5);
  });

  it("returns null for unknown award keys", async () => {
    expect(await getContractAward("CONT_AWD_UNKNOWN_0000", loader)).toBeNull();
  });
});

describe("contracts top vendors + dataset meta", () => {
  it("reads per-NAICS top vendors", async () => {
    const top = await getContractsTopVendors("naics", "541511", loader);
    expect(top).toHaveLength(1);
    expect(top![0].uei).toBe("ABC123DEF456");
  });

  it("reads dataset provenance", async () => {
    const meta = await getContractsDatasetMeta(loader);
    expect(meta?.version).toBe("2026-10-06");
    expect(meta?.awards).toBe(2);
  });
});

describe("contracts honesty notes travel with the layer", () => {
  it("states cumulative semantics, ceilings, no-FAC and extract dates", () => {
    expect(MEASURE_NOTE).toContain("award-cumulative");
    expect(CEILINGS_NOTE).toContain("not obligations");
    expect(NO_FAC_NOTE).toContain("does not cover contracts");
    expect(SCREENING_NOTE).toContain("2026-301");
    expect(SCREENING_NOTE).toContain("research leads for human review");
    expect(PARENT_LINKAGE_NOTE).toContain("81.3834%");
    expect(PARENT_LINKAGE_NOTE).toContain("never applied as a join");
  });
});
