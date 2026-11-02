import { describe, it, expect } from "vitest";
import { FRAUD_RADAR_SOURCES } from "./sources";

/**
 * Registry seed integrity (spec §5 + AUDIT §16). Every field the spec
 * requires must be present and honest for every seeded source; the
 * access facts pinned here are the audit's verified ones — if a fact
 * changes, the audit trail changes with it, never silently.
 */
describe("FRAUD_RADAR_SOURCES — §5 registry seed", () => {
  it("seeds exactly the ten AUDIT §16 sources", () => {
    expect(FRAUD_RADAR_SOURCES.map((s) => s.slug).sort()).toEqual(
      [
        "cms-medicare",
        "fac",
        "irs-990",
        "leie",
        "medicaid-hcpcs",
        "nppes",
        "sam-entities",
        "sam-exclusions",
        "sam-opportunities",
        "usaspending",
      ].sort(),
    );
  });

  it("has unique slugs and every §5 field populated", () => {
    const slugs = FRAUD_RADAR_SOURCES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of FRAUD_RADAR_SOURCES) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.officialUrl).toMatch(/^https:\/\//);
      expect(s.accessUrl).toMatch(/^https:\/\//);
      expect(s.license.length).toBeGreaterThan(0);
      expect(s.commercialUse.length).toBeGreaterThan(0);
      expect(s.dataFields.length).toBeGreaterThan(0);
      expect(s.limitations.length).toBeGreaterThan(20);
      expect(s.cadence.length).toBeGreaterThan(0);
      expect(s.apiKeyRequirement.length).toBeGreaterThan(0);
    }
  });

  it("keeps SAM on public extracts with no API key (locked §17 decision)", () => {
    for (const slug of ["sam-entities", "sam-exclusions", "sam-opportunities"]) {
      const s = FRAUD_RADAR_SOURCES.find((x) => x.slug === slug)!;
      expect(s.accessType).toBe("public_extract");
      expect(s.apiKeyRequirement).toBe("none");
    }
  });

  it("records FAC honestly: bulk CSV production pull, no key required", () => {
    const fac = FRAUD_RADAR_SOURCES.find((s) => s.slug === "fac")!;
    expect(fac.accessType).toBe("public_download");
    expect(fac.accessUrl).toContain("app.fac.gov/dissemination");
    expect(fac.apiKeyRequirement).toContain("none for the production pull");
    expect(fac.apiKeyRequirement).toContain("DEMO_KEY");
    expect(fac.status).toBe("ingested");
  });

  it("carries the Medicaid suppression warning in its limitations", () => {
    const med = FRAUD_RADAR_SOURCES.find((s) => s.slug === "medicaid-hcpcs")!;
    expect(med.limitations.toLowerCase()).toContain("suppress");
    expect(med.coverageStart).toBe("2018-01");
    expect(med.coverageEnd).toBe("2024-12");
  });

  it("labels SAM entity status with its monthly extract vintage", () => {
    const ent = FRAUD_RADAR_SOURCES.find((s) => s.slug === "sam-entities")!;
    expect(ent.limitations.toLowerCase()).toContain("extract date");
  });

  it("marks exactly the nine pipeline-ingested sources as ingested, each with manifest provenance", () => {
    const ingested = FRAUD_RADAR_SOURCES.filter((s) => s.status === "ingested")
      .map((s) => s.slug)
      .sort();
    expect(ingested).toEqual(
      [
        "cms-medicare",
        "fac",
        "irs-990",
        "leie",
        "medicaid-hcpcs",
        "nppes",
        "sam-entities",
        "sam-exclusions",
        "usaspending",
      ].sort(),
    );
    for (const s of FRAUD_RADAR_SOURCES) {
      expect(["not_started", "pending_credentials", "ingested"]).toContain(s.status);
      if (s.status === "ingested") {
        expect(s.sourceVersion).toBeTruthy();
        expect(s.lastImportedAt).toBeTruthy();
        expect(s.lastVerifiedAt).toBeTruthy();
        expect((s.completeness ?? "").length).toBeGreaterThan(20);
      }
    }
  });

  it("pins the Medicaid ingest to its pipeline manifest (version 2026-02-09)", () => {
    const med = FRAUD_RADAR_SOURCES.find((s) => s.slug === "medicaid-hcpcs")!;
    expect(med.sourceVersion).toBe("2026-02-09");
    expect(med.lastPublishedAt).toBe("2026-02-09");
    expect(med.lastImportedAt).toBe("2026-10-29T06:01:11Z");
    expect(med.lastVerifiedAt).toBe("2026-10-29");
    expect(med.dataFields).toEqual([
      "billing_provider_npi_num",
      "servicing_provider_npi_num",
      "hcpcs_code",
      "claim_from_month",
      "total_patients",
      "total_claim_lines",
      "total_paid",
    ]);
    expect(med.completeness).toContain("238,015,729");
  });

  it("pins the Medicare ingest to its pipeline manifests (Phase 3)", () => {
    const cms = FRAUD_RADAR_SOURCES.find((s) => s.slug === "cms-medicare")!;
    expect(cms.sourceVersion).toBe("CY2022-CY2024 + Care Compare 2026-10-refresh");
    expect(cms.lastPublishedAt).toBe("2026-05-21");
    expect(cms.lastImportedAt).toBe("2026-10-29T22:04:50Z");
    expect(cms.lastVerifiedAt).toBe("2026-10-29");
    expect(cms.coverageStart).toBe("2022-01");
    expect(cms.coverageEnd).toBe("2024-12");
    expect(cms.completeness).toContain("29,197,747");
    expect(cms.completeness).toContain("1,393,382");
    // The derived-amounts rule is part of the source's public record:
    expect(cms.limitations).toContain("derived");
    expect(cms.limitations).toContain("Medicare Advantage");
  });

  it("pins the SAM ingests to their manifests, extract dates labelled (§17)", () => {
    const exc = FRAUD_RADAR_SOURCES.find((s) => s.slug === "sam-exclusions")!;
    const ent = FRAUD_RADAR_SOURCES.find((s) => s.slug === "sam-entities")!;
    expect(exc.sourceVersion).toBe("2026-301");
    expect(exc.lastPublishedAt).toBe("2026-10-28");
    expect(exc.completeness).toContain("169,034");
    expect(exc.accessUrl).toContain("sam.gov/data-services/Exclusions");
    expect(ent.sourceVersion).toBe("2026-10-05");
    expect(ent.lastPublishedAt).toBe("2026-10-05");
    expect(ent.completeness).toContain("905,712");
    expect(ent.completeness).toContain("820,322");
    expect(ent.accessUrl).toContain("sam.gov/data-services/Entity");
  });

  it("pins the USAspending ingest to its pipeline manifest (Phase 4, generation 2026-10-06)", () => {
    const usa = FRAUD_RADAR_SOURCES.find((s) => s.slug === "usaspending")!;
    expect(usa.sourceVersion).toBe("2026-10-06");
    expect(usa.lastPublishedAt).toBe("2026-10-06");
    expect(usa.lastImportedAt).toBe("2026-10-31T05:51:44Z");
    expect(usa.lastVerifiedAt).toBe("2026-10-31");
    expect(usa.coverageStart).toBe("2018-01");
    expect(usa.coverageEnd).toBe("2025-12");
    expect(usa.completeness).toContain("30,375,146");
    expect(usa.completeness).toContain("3,585,472");
    // The derived award grain + cumulative semantics are part of the
    // source's public record, as is the no-SAM-API rule:
    expect(usa.notes).toContain("DERIVED");
    expect(usa.notes).toContain("never FY obligations");
    expect(usa.notes).toContain("No SAM.gov API");
    expect(usa.limitations).toContain("award-cumulative");
    // Phase 5 (Payload C): the SAME entry carries the contracts
    // dataset — extended, never duplicated under a second slug.
    expect(usa.dataFields).toContain("piid");
    expect(usa.dataFields).toContain("modification_number");
    expect(usa.dataFields).toContain("naics_psc");
    expect(usa.notes).toContain("usaspending-contracts-2026-10-06");
    expect(usa.notes).toContain("published transaction (modification) grain");
    expect(usa.status).toBe("ingested");
    expect(
      FRAUD_RADAR_SOURCES.filter((s) => s.slug === "usaspending"),
    ).toHaveLength(1);
  });

  it("pins the FAC ingest to its pipeline manifest (Phase 4, vintage 2026-10-31_ay2026)", () => {
    const fac = FRAUD_RADAR_SOURCES.find((s) => s.slug === "fac")!;
    expect(fac.sourceVersion).toBe("2026-10-31_ay2026");
    expect(fac.lastPublishedAt).toBe("2026-10-31");
    expect(fac.lastImportedAt).toBe("2026-10-31T02:27:00Z");
    expect(fac.lastVerifiedAt).toBe("2026-10-31");
    expect(fac.coverageStart).toBe("2016-01");
    expect(fac.coverageEnd).toBe("2026-12");
    expect(fac.completeness).toContain("417,188");
    expect(fac.completeness).toContain("412,280");
    // The bulk-CSV route, the public-subset rule and the
    // questioned-cost flag-only rule are part of the public record:
    expect(fac.notes).toContain("app.fac.gov");
    expect(fac.notes).toContain("NOT needed");
    expect(fac.notes).toContain("4,908");
    expect(fac.notes).toContain("FLAGS only");
    expect(fac.limitations).toContain("is_public=false");
    expect(fac.limitations).toContain("FLAG only");
  });

  it("pins the IRS 990 ingest to its pipeline manifests (Phase 4, D5)", () => {
    const irs = FRAUD_RADAR_SOURCES.find((s) => s.slug === "irs-990")!;
    expect(irs.sourceVersion).toBe("BMF 2026-10-13 + index 2026-10-31 + returns 2024-2026");
    expect(irs.lastPublishedAt).toBe("2026-10-31");
    expect(irs.lastImportedAt).toBe("2026-10-31T14:05:36Z");
    expect(irs.lastVerifiedAt).toBe("2026-10-31");
    expect(irs.coverageStart).toBe("2019-01");
    expect(irs.coverageEnd).toBe("2026-12");
    expect(irs.completeness).toContain("1,888,603");
    expect(irs.completeness).toContain("1,975,975");
    expect(irs.completeness).toContain("4,717,279");
    expect(irs.completeness).toContain("967,614");
    expect(irs.completeness).toContain("61,372");
    // The binding field semantics are part of the source's public
    // record: EZ NULL discipline, PF header/summary only, BMF
    // amounts never mixed with 990 figures, the 7 deterministic
    // IRS source defects, and the validated FAC-990 EIN bridge:
    expect(irs.notes).toContain("NULL for EZ, never 0");
    expect(irs.notes).toContain("header/summary only");
    expect(irs.notes).toContain("never mixed with 990 figures");
    expect(irs.notes).toContain("7 IRS source-defect objects");
    expect(irs.notes).toContain("done_with_failures");
    expect(irs.notes).toContain("47.46%");
    expect(irs.limitations).toContain("NULL for EZ, never 0");
    expect(irs.limitations).toContain("990-T is EXCLUDED");
    expect(irs.limitations).toContain("NOT the tax period");
  });

  it("pins the LEIE ingest to its pipeline manifest (version 2026-10)", () => {
    const leie = FRAUD_RADAR_SOURCES.find((s) => s.slug === "leie")!;
    expect(leie.sourceVersion).toBe("2026-10");
    expect(leie.lastImportedAt).toBe("2026-10-29T03:44:09Z");
    expect(leie.completeness).toContain("84,093");
  });
});
