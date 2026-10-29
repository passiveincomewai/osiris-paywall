import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import {
  createCareLoader,
  decodeCareStubs,
  decodeCareNameStubs,
  nameBucket,
  normalizeNameKey,
  searchCareProviders,
  getCareProviderProfile,
  getCareTopProviders,
  getCareDatasetMeta,
  type CareLoader,
} from "./care-data";

/**
 * Phase 3 data-layer tests (§35): fixtures are schema-true mini
 * artifacts (same wire contract as app-publish/publish_care.py).
 * Load-bearing spec rules under test:
 *  - absence is never zero: a year a provider does not appear in is
 *    simply absent from the profile; measures the source did not
 *    publish stay null and are never fabricated as 0;
 *  - every payment figure is a DERIVED figure (services × published
 *    average) and the layer never relabels it;
 *  - a LEIE listing decodes as a research-lead block, and its
 *    after-exclusion-year amount stays null when not computed.
 */

const FIXTURES = fileURLToPath(new URL("./__fixtures__/care", import.meta.url));
const loader: CareLoader = createCareLoader({
  root: FIXTURES,
  version: "2022-2024",
  isHttp: false,
});

describe("care wire decoders — absence is not zero", () => {
  it("decodes stubs with years-mask and null measures intact", () => {
    const stubs = decodeCareStubs({
      s: [
        ["1234567890", "SMITH, JOHN", "I", "UT", "Internal Medicine"],
        ["1239999999", null, "O", "WY", null],
      ],
      n: [
        [1500.25, 120, 0, 5],
        [0, null, 0, 0],
      ],
    });
    expect(stubs[0].yearsPresent).toEqual([2022, 2024]);
    expect(stubs[0].leieListed).toBe(false);
    expect(stubs[1].displayName).toBeNull();
    expect(stubs[1].servicesTotal).toBeNull();
    expect(stubs[1].yearsPresent).toEqual([]);
  });

  it("decodes name stubs with the name key", () => {
    const stubs = decodeCareNameStubs({
      s: [["SMITH JOHN", "1234567890", "SMITH, JOHN", "UT", "Internal Medicine"]],
      n: [[1500.25, 1]],
    });
    expect(stubs[0].nameKey).toBe("SMITH JOHN");
    expect(stubs[0].leieListed).toBe(true);
  });

  it("matches the publisher's name-bucket rule (padding)", () => {
    expect(nameBucket(normalizeNameKey("SMITH"))).toBe("SMI");
    expect(nameBucket(normalizeNameKey("LI"))).toBe("LI_");
    expect(nameBucket(normalizeNameKey("O'BRIEN"))).toBe("OBR");
  });
});

describe("care search", () => {
  it("rejects queries shorter than 3 key characters", async () => {
    const r = await searchCareProviders("12", {}, loader);
    expect(r.error).toBe("too_short");
    expect(r.results).toEqual([]);
  });

  it("reports unavailable when artifacts are not configured", async () => {
    const r = await searchCareProviders("1234567890", {}, null);
    expect(r.error).toBe("unavailable");
  });

  it("finds providers by NPI prefix, ranked by derived payments", async () => {
    const r = await searchCareProviders("1234", {}, loader);
    expect(r.mode).toBe("npi");
    expect(r.total).toBe(2);
    expect(r.results[0].npi).toBe("1234567890");
  });

  it("finds providers by name tokens", async () => {
    const r = await searchCareProviders("smith john", {}, loader);
    expect(r.mode).toBe("name");
    expect(r.total).toBe(1);
    expect(r.results[0].npi).toBe("1234567890");
  });

  it("returns an honest empty result for an unknown prefix", async () => {
    const r = await searchCareProviders("999999", {}, loader);
    expect(r.total).toBe(0);
    expect(r.error).toBeUndefined();
  });
});

describe("care provider profile", () => {
  it("decodes identity, yearly blocks and HCPCS rows", async () => {
    const p = await getCareProviderProfile("1234567890", loader);
    expect(p).not.toBeNull();
    expect(p!.identity.providerType).toBe("Internal Medicine");
    expect(p!.years.map((y) => y.year)).toEqual([2022, 2024]);
    // 2023 is absent — never synthesized as a zero year.
    expect(p!.years.find((y) => y.year === 2023)).toBeUndefined();
    expect(p!.hcpcs[0].pymtDerivedUsd).toBe(1500.25);
    expect(p!.leie).toBeNull();
  });

  it("decodes the LEIE screening block as a research lead", async () => {
    const p = await getCareProviderProfile("1234567899", loader);
    expect(p!.leie).not.toBeNull();
    expect(p!.leie!.excltypes).toBe("MANDATORY");
    expect(p!.leie!.earliestExcldate).toBe("2019-05-01");
    expect(p!.leie!.pymtDerivedAfterExclYearUsd).toBe(250.5);
  });

  it("returns null for unknown or malformed NPIs", async () => {
    expect(await getCareProviderProfile("5555555555", loader)).toBeNull();
    expect(await getCareProviderProfile("123", loader)).toBeNull();
  });
});

describe("care top providers + dataset meta", () => {
  it("decodes top providers for a HCPCS code", async () => {
    const top = await getCareTopProviders("99213", loader);
    expect(top).toHaveLength(2);
    expect(top![0].npi).toBe("1234567890");
    expect(await getCareTopProviders("00000", loader)).toBeNull();
  });

  it("reads dataset meta with provenance", async () => {
    const meta = await getCareDatasetMeta(loader);
    expect(meta!.version).toBe("2022-2024");
    expect(meta!.directories.hospiceProviders).toBe(6669);
    expect(meta!.totalsByYear["2024"].pymtDerivedUsd).toBe(1800.25);
  });
});
