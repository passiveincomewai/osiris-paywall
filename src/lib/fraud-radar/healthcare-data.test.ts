import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import {
  createArtifactLoader,
  decodeStub,
  decodeSummary,
  formatUsd,
  formatCount,
  bucket3,
  bucket4,
  searchProviders,
  getProviderProfile,
  getTopProviders,
  getDatasetMeta,
  TREATMENT,
  type ArtifactLoader,
} from "./healthcare-data";

/**
 * Phase 2 data-layer tests (§35): the fixtures are schema-true mini
 * artifacts (same wire contract as the pipeline publisher). The
 * load-bearing spec rules under test:
 *  - suppression/absence is NEVER zero: a role the provider does not
 *    appear in decodes to a null block, and absent measures stay null;
 *  - a figure the source reported as 0 stays 0 and formats as $0.00,
 *    visibly distinct from the "—" absence marker;
 *  - the headline monetary treatment is excl-outliers.
 */

const FIXTURES = fileURLToPath(new URL("./__fixtures__/healthcare", import.meta.url));
const loader: ArtifactLoader = createArtifactLoader({
  root: FIXTURES,
  version: "2026-02-09",
  isHttp: false,
});

describe("wire decoders — absence is not zero (§35 suppression ≠ zero)", () => {
  it("decodes a servicing-only stub with billing measures null", () => {
    const stub = decodeStub({
      s: ["1234567891", null, null, null, null],
      n: [2, null, 5000.0, null, 900, 0],
    });
    expect(stub.hasBilling).toBe(false);
    expect(stub.hasServicing).toBe(true);
    expect(stub.billingPaidExclUsd).toBeNull();
    expect(stub.billingClaimLines).toBeNull();
    expect(stub.servicingPaidExclUsd).toBe(5000.0);
  });

  it("gives a billing-only provider a null servicing block, not zeros", () => {
    const summary = decodeSummary({
      s: ["2020-01-01", "2024-01-01", null, null, "1120(a)(1)", "2015-06-01", "DOE JANE"],
      n: [1, 10, 10, 25, 100.0, 0, 0.0, 100.0, 3, 2, 12,
        null, null, null, null, null, null, null, null, null, null, 1, 1],
    });
    expect(summary.hasServicing).toBe(false);
    expect(summary.servicing).toBeNull();
    expect(summary.billing?.paidExclOutliersUsd).toBe(100.0);
    expect(summary.leieListed).toBe(true);
  });

  it("keeps a reported zero as zero, distinct from absence", () => {
    const summary = decodeSummary({
      s: ["2018-01-01", "2024-12-01", "2019-03-01", "2024-10-01", null, null, null],
      n: [3, 50, 120, 300, 1200.5, 0, 0.0, 1000.5, 25, 8, 40,
        20, 40, 90, 300.25, 0, 0.0, 250.25, 60, 5, 22, 0, 0],
    });
    expect(summary.billing?.outlierPaidUsd).toBe(0);
    expect(formatUsd(summary.billing?.outlierPaidUsd)).toBe("$0.00");
    expect(formatUsd(null)).toBe("—");
    expect(formatCount(null)).toBe("—");
    expect(formatCount(0)).toBe("0");
  });
});

describe("bucket keys", () => {
  it("derives idx/pro buckets from the key itself", () => {
    expect(bucket3("1234567890")).toBe("123");
    expect(bucket4("1234567890")).toBe("1234");
    expect(bucket3("a367477000")).toBe("A36");
  });
});

describe("searchProviders", () => {
  it("prefix-searches NPIs within the bucket, ranked by reported paid", async () => {
    const res = await searchProviders("123", {}, loader);
    expect(res.mode).toBe("npi");
    expect(res.total).toBe(3);
    expect(res.results.map((r) => r.npi)).toEqual([
      "1234567891", // servicing-only, highest reported paid
      "1234567890",
      "1239999999",
    ]);
  });

  it("paginates without dropping the total", async () => {
    const p1 = await searchProviders("123", { page: 1, pageSize: 2 }, loader);
    const p2 = await searchProviders("123", { page: 2, pageSize: 2 }, loader);
    expect(p1.results).toHaveLength(2);
    expect(p2.results).toHaveLength(1);
    expect(p1.total).toBe(3);
    expect(p2.total).toBe(3);
  });

  it("rejects queries too short to bound a bucket", async () => {
    const res = await searchProviders("12", {}, loader);
    expect(res.error).toBe("too_short");
    expect(res.results).toEqual([]);
  });

  it("finds providers by name tokens when identity exists", async () => {
    const res = await searchProviders("smith john", {}, loader);
    expect(res.mode).toBe("name");
    expect(res.identityAvailable).toBe(true);
    expect(res.results.map((r) => r.npi)).toEqual(["1234567890"]);
  });

  it("returns an honest empty result for an unmatched prefix", async () => {
    const res = await searchProviders("999", {}, loader);
    expect(res.total).toBe(0);
    expect(res.results).toEqual([]);
    expect(res.error).toBeUndefined();
  });
});

describe("getProviderProfile", () => {
  it("assembles summary, identity, HCPCS, and the monthly series", async () => {
    const p = await getProviderProfile("1234567890", loader);
    expect(p).not.toBeNull();
    expect(p?.identity?.displayName).toBe("SMITH JOHN");
    expect(p?.summary.billing?.paidExclOutliersUsd).toBe(1000.5);
    expect(p?.summary.servicing?.paidExclOutliersUsd).toBe(250.25);
    expect(p?.hcpcs.map((h) => h.hcpcsCode)).toEqual(["99213", "99214"]);
    expect(p?.monthly?.months).toEqual([201801, 201802, 201803]);
    expect(p?.monthly?.paidExclOutliersUsd).toEqual([100.25, 200.25, 700.0]);
    expect(p?.leie).toEqual([]);
  });

  it("carries the LEIE screening detail for a listed provider", async () => {
    const p = await getProviderProfile("1239999999", loader);
    expect(p?.summary.leieListed).toBe(true);
    expect(p?.summary.servicing).toBeNull();
    expect(p?.leie).toHaveLength(1);
    expect(p?.leie[0].excltype).toBe("1120(a)(1)");
    expect(p?.leie[0].billingPaidAfterExclUsd).toBe(25.0);
    expect(p?.leie[0].servicingPaidAfterExclUsd).toBeNull();
    expect(p?.monthly).toBeNull();
  });

  it("returns null for an unknown NPI", async () => {
    expect(await getProviderProfile("5555555555", loader)).toBeNull();
  });
});

describe("top providers + dataset meta", () => {
  it("decodes top-provider rows for a code", async () => {
    const rows = await getTopProviders("99213", loader);
    expect(rows).toHaveLength(1);
    expect(rows?.[0].npi).toBe("1234567890");
    expect(rows?.[0].paidExclOutliersUsd).toBe(800.5);
  });

  it("serves provenance with the headline treatment excl-outliers", async () => {
    const meta = await getDatasetMeta(loader);
    expect(meta?.version).toBe("2026-02-09");
    expect(meta?.totals.programPaidExclOutliersUsd).toBe(1104647992692.41);
    expect(meta?.suppression).toContain("NEVER zero");
    expect(TREATMENT.headline).toBe("excl_outliers");
  });
});
