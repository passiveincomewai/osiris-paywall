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

  it("never overstates status: nothing is seeded as already imported", () => {
    for (const s of FRAUD_RADAR_SOURCES) {
      expect(["not_started", "pending_credentials"]).toContain(s.status);
    }
  });
});
