import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import {
  createGraphsLoader,
  egoBucket,
  entityKeyFor,
  getEgoNetwork,
  getGraphsDatasetMeta,
  getNetworkSummary,
  searchGraphEntities,
  GRAPH_LEGEND,
  type GraphsConfig,
} from "./graphs-data";

/**
 * Phase 10 graphs data-layer tests: bucket scheme parity with the
 * pipeline, candidate discipline (labelled + excluded from counts),
 * locality-only address decoding, honest unpublished states.
 */
const FIXTURES = fileURLToPath(new URL("./__fixtures__/graphs", import.meta.url));
const config: GraphsConfig = { root: FIXTURES, version: "test", isHttp: false };
const loader = createGraphsLoader(config);

describe("graphs-data", () => {
  it("bucket scheme matches the pipeline md5 % 100 scheme", () => {
    expect(egoBucket("UEI:ABC123DEF456")).toBe("66");
    expect(egoBucket("NPI:1234567890")).toBe("03");
  });

  it("normalises identifiers and refuses names as keys", () => {
    expect(entityKeyFor("grants", "abc123def456")).toBe("UEI:ABC123DEF456");
    expect(entityKeyFor("healthcare", "1234567890")).toBe("NPI:1234567890");
    expect(entityKeyFor("fac", "123456789")).toBe("EIN:123456789");
    expect(entityKeyFor("grants", "SOME COMPANY NAME")).toBeNull();
    expect(entityKeyFor("grants", "ABC123")).toBeNull();
  });

  it("reads an ego with candidate edges labelled and excluded from counts", async () => {
    const ego = await getEgoNetwork("grants", "ABC123DEF456", loader);
    expect(ego).not.toBeNull();
    expect(ego!.legend).toBe(GRAPH_LEGEND);
    const cand = ego!.edges.filter((e) => e.status === "candidate");
    expect(cand).toHaveLength(1);
    expect(cand[0].sentence).toContain("CANDIDATE");
    expect(ego!.edgeCountExcludingCandidates).toBe(2);
    expect(ego!.candidateEdgesExcludedFromMetrics).toBe(1);
    const summary = await getNetworkSummary("grants", "ABC123DEF456", loader);
    expect(summary!.countsByType.order_under_vehicle).toBeUndefined();
    // Truncation record raises the published count to its total.
    expect(summary!.countsByType.recipient_of_award).toBe(61);
  });

  it("address nodes decode locality-only (no street fields survive)", async () => {
    const ego = await getEgoNetwork("grants", "ABC123DEF456", loader);
    const addr = ego!.nodes.find((n) => n.type === "address");
    expect(addr!.label).toBe("Ogden, UT 844xx");
    expect(Object.keys(addr!).sort()).toEqual(["groupSize", "key", "label", "type"]);
  });

  it("missing entity is null (absence), never a zeroed ego", async () => {
    expect(await getEgoNetwork("grants", "ZZZ999YYY888", loader)).toBeNull();
    expect(await getEgoNetwork("grants", "ABC123DEF456", null)).toBeNull();
  });

  it("dataset meta carries the candidate sentence verbatim", async () => {
    const meta = await getGraphsDatasetMeta(loader);
    expect(meta!.candidateSentence).toContain("81.3834%");
    expect(meta!.totals.egos).toBe(3);
  });

  it("search reports index_not_published while no idx tree exists", async () => {
    const r = await searchGraphEntities("ABC", {}, loader);
    expect(r.error).toBe("index_not_published");
    expect(r.results).toEqual([]);
    const short = await searchGraphEntities("AB", {}, loader);
    expect(short.error).toBe("too_short");
  });
});
