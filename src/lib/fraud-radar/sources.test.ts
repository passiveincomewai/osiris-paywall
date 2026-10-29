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

  it("records FAC honestly: dev via DEMO_KEY, production key pending owner", () => {
    const fac = FRAUD_RADAR_SOURCES.find((s) => s.slug === "fac")!;
    expect(fac.accessType).toBe("api_key_required");
    expect(fac.apiKeyRequirement).toContain("DEMO_KEY");
    expect(fac.status).toBe("pending_credentials");
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

  it("marks exactly the five pipeline-ingested sources as ingested, each with manifest provenance", () => {
    const ingested = FRAUD_RADAR_SOURCES.filter((s) => s.status === "ingested")
      .map((s) => s.slug)
      .sort();
    expect(ingested).toEqual(
      ["leie", "medicaid-hcpcs", "nppes", "sam-entities", "sam-exclusions"].sort(),
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

  it("pins the LEIE ingest to its pipeline manifest (version 2026-10)", () => {
    const leie = FRAUD_RADAR_SOURCES.find((s) => s.slug === "leie")!;
    expect(leie.sourceVersion).toBe("2026-10");
    expect(leie.lastImportedAt).toBe("2026-10-29T03:44:09Z");
    expect(leie.completeness).toContain("84,093");
  });
});
