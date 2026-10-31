import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import {
  createGrantsLoader,
  decodeGrantsStubs,
  decodeGrantsNameStubs,
  nameBucket,
  normalizeNameKey,
  searchGrantRecipients,
  getGrantRecipientProfile,
  getGrantsTopRecipients,
  getGrantsDatasetMeta,
  MEASURE_NOTE,
  FAC_NOTE,
  SCREENING_NOTE,
  type GrantsLoader,
} from "./grants-data";

/**
 * Phase 4 data-layer tests (§35): fixtures are schema-true mini
 * artifacts (same wire contract as app-publish/publish_grants.py).
 * Load-bearing spec rules under test:
 *  - absence is never zero: a recipient with no public FAC record
 *    decodes a null FAC block (never a zeroed one), and measures
 *    the source did not publish stay null end-to-end;
 *  - USAspending amounts stay award-cumulative and the fiscal year
 *    is the attributed fiscal year — the caveat text travels with
 *    the layer;
 *  - questioned costs are flag counts only; is_public=false
 *    records appear as a withheld count and nothing else;
 *  - screening decodes as research leads (exact-UEI SAM listings,
 *    LEIE candidates for human review), never as findings.
 */

const FIXTURES = fileURLToPath(new URL("./__fixtures__/grants", import.meta.url));
const loader: GrantsLoader = createGrantsLoader({
  root: FIXTURES,
  version: "2026-10-06",
  facVersion: "2026-10-31_ay2026",
  isHttp: false,
});

describe("grants wire decoders — absence is not zero", () => {
  it("decodes stubs with null measures and flags intact", () => {
    const stubs = decodeGrantsStubs({
      s: [
        ["ABC123DEF456", "ACME CORPORATION", "Ogden", "UT"],
        ["ABC999XYZ000", "BETA FOUNDATION", "Provo", "UT"],
      ],
      n: [
        [12, 5000000.5, 3200000.25, 3, 2, 0, 1],
        [4, 900000, null, 1, 1, 1, null],
      ],
    });
    expect(stubs[0].samExclusionListed).toBe(false);
    expect(stubs[0].facHasPublicRecord).toBe(true);
    expect(stubs[1].outlayAwardCumulativeUsd).toBeNull();
    expect(stubs[1].samExclusionListed).toBe(true);
    expect(stubs[1].facHasPublicRecord).toBeNull();
  });

  it("decodes name stubs with the name key", () => {
    const stubs = decodeGrantsNameStubs({
      s: [["ACME CORPORATION", "ABC123DEF456", "ACME CORPORATION", "Ogden", "UT"]],
      n: [[12, 5000000.5, 0]],
    });
    expect(stubs[0].nameKey).toBe("ACME CORPORATION");
    expect(stubs[0].uei).toBe("ABC123DEF456");
    expect(stubs[0].outlayAwardCumulativeUsd).toBeNull();
  });

  it("matches the publisher's name-bucket rule (padding)", () => {
    expect(nameBucket(normalizeNameKey("ACME"))).toBe("ACM");
    expect(nameBucket(normalizeNameKey("LI"))).toBe("LI_");
    expect(nameBucket(normalizeNameKey("O'BRIEN"))).toBe("OBR");
  });
});

describe("grants search", () => {
  it("rejects queries shorter than 3 key characters", async () => {
    const r = await searchGrantRecipients("AB", {}, loader);
    expect(r.error).toBe("too_short");
    expect(r.results).toEqual([]);
  });

  it("reports unavailable when artifacts are not configured", async () => {
    const r = await searchGrantRecipients("ABC123DEF456", {}, null);
    expect(r.error).toBe("unavailable");
  });

  it("finds recipients by UEI prefix, ranked by obligated (cumulative)", async () => {
    const r = await searchGrantRecipients("ABC1", {}, loader);
    expect(r.mode).toBe("uei");
    expect(r.total).toBe(2);
    expect(r.results[0].uei).toBe("ABC123DEF456");
    expect(r.results[1].uei).toBe("ABC123XYZ000");
    const one = await searchGrantRecipients("ABC123D", {}, loader);
    expect(one.total).toBe(1);
    expect(one.results[0].uei).toBe("ABC123DEF456");
  });

  it("finds recipients by name tokens", async () => {
    const r = await searchGrantRecipients("acme corp", {}, loader);
    expect(r.mode).toBe("name");
    expect(r.total).toBe(1);
    expect(r.results[0].uei).toBe("ABC123DEF456");
  });

  it("returns an honest empty result for an unknown prefix", async () => {
    const r = await searchGrantRecipients("ZZZ9", {}, loader);
    expect(r.total).toBe(0);
    expect(r.error).toBeUndefined();
  });
});

describe("grants recipient profile", () => {
  it("decodes identity, totals, ALN mix, top awards, FAC and screening", async () => {
    const p = await getGrantRecipientProfile("ABC123DEF456", loader);
    expect(p).not.toBeNull();
    expect(p!.identity.samLegalBusinessName).toBe("ACME CORP");
    expect(p!.identity.samEntitiesExtractVersion).toBe("2026-10-05");
    expect(p!.totals.awardCount).toBe(12);
    expect(p!.totals.obligatedAwardCumulativeUsd).toBe(5000000.5);
    expect(p!.totals.firstAttributedFiscalYear).toBe(2019);
    expect(p!.alnMix[0].aln).toBe("10.001");
    expect(p!.topAwards[0].attributedFiscalYear).toBe(2024);
    expect(p!.fac).not.toBeNull();
    expect(p!.fac!.questionedCostFlagCount).toBe(2);
    expect(p!.fac!.latestYearTotalExpendedUsd).toBe(4500000);
    // Counted zero in the named extract — a real zero, not absence.
    expect(p!.screening!.samExclusionListingCount).toBe(0);
    expect(p!.screening!.leieCandidateCount).toBe(1);
  });

  it("keeps the FAC block null when there is no public record — never zero findings", async () => {
    const p = await getGrantRecipientProfile("ABC123XYZ000", loader);
    expect(p).not.toBeNull();
    expect(p!.fac).toBeNull();
    expect(p!.screening!.samExclusionListingCount).toBe(2);
    expect(p!.screening!.samExclusionEarliestActiveDate).toBe("2023-06-01");
    // A null outlay in the source stays null in the profile.
    expect(p!.topAwards[0].outlayAwardCumulativeUsd).toBeNull();
  });

  it("returns null for unknown or malformed UEIs", async () => {
    expect(await getGrantRecipientProfile("ZZZ999ZZZ999", loader)).toBeNull();
    expect(await getGrantRecipientProfile("ABC123", loader)).toBeNull();
  });
});

describe("grants top-per-ALN + dataset meta + caveats", () => {
  it("decodes top recipients for an ALN", async () => {
    const top = await getGrantsTopRecipients("93.498", loader);
    expect(top).toHaveLength(2);
    expect(top![0].uei).toBe("ABC123DEF456");
    expect(await getGrantsTopRecipients("00.000", loader)).toBeNull();
  });

  it("reads dataset meta with provenance and the withheld count only", async () => {
    const meta = await getGrantsDatasetMeta(loader);
    expect(meta!.version).toBe("2026-10-06");
    expect(meta!.facVersion).toBe("2026-10-31_ay2026");
    expect(meta!.fac!.withheldCount).toBe(4908);
    expect(meta!.totals.obligatedAwardCumulativeUsd).toBe(5900000.5);
  });

  it("carries the binding honesty caveats verbatim in the layer", () => {
    expect(MEASURE_NOTE).toContain("award-cumulative");
    expect(MEASURE_NOTE).toContain("attributed fiscal year");
    expect(FAC_NOTE).toContain("auditee-reported");
    expect(FAC_NOTE).toContain("flags only");
    expect(FAC_NOTE).toContain("is_public=false");
    expect(FAC_NOTE).toContain("never zero findings");
    expect(SCREENING_NOTE).toContain("research leads");
    expect(SCREENING_NOTE).toContain("extract 2026-301");
  });
});
