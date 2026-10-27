import { describe, it, expect } from "vitest";
import { getSkiResort } from "./ski-resorts";
import {
  POPULAR_PAIRS,
  allCompareData,
  buildCompareData,
  buildComparisonRows,
  nextSelection,
  pairSlug,
  parseCompareSelection,
  parsePairSlug,
  popularPairFor,
} from "./ski-compare";

describe("POPULAR_PAIRS", () => {
  it("every pair names two distinct resorts that have pages", () => {
    for (const [a, b] of POPULAR_PAIRS) {
      expect(getSkiResort(a), a).toBeDefined();
      expect(getSkiResort(b), b).toBeDefined();
      expect(a).not.toBe(b);
    }
  });

  it("pair slugs are unique", () => {
    const slugs = POPULAR_PAIRS.map(([a, b]) => pairSlug(a, b));
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("pairSlug / parsePairSlug", () => {
  it("round-trips every popular pair", () => {
    for (const [a, b] of POPULAR_PAIRS) {
      const parsed = parsePairSlug(pairSlug(a, b));
      expect(parsed?.[0].slug).toBe(a);
      expect(parsed?.[1].slug).toBe(b);
    }
  });

  it("parses a reversed pair in the order written", () => {
    const parsed = parsePairSlug("brighton-vs-snowbird");
    expect(parsed?.[0].slug).toBe("brighton");
    expect(parsed?.[1].slug).toBe("snowbird");
  });

  it("rejects unknown resorts, self-pairs and malformed segments", () => {
    expect(parsePairSlug("snowbird-vs-atlantis")).toBeNull();
    expect(parsePairSlug("atlantis-vs-snowbird")).toBeNull();
    expect(parsePairSlug("snowbird-vs-snowbird")).toBeNull();
    expect(parsePairSlug("snowbird")).toBeNull();
    expect(parsePairSlug("snowbird-vs-brighton-vs-vail")).toBeNull();
    expect(parsePairSlug("")).toBeNull();
  });
});

describe("popularPairFor", () => {
  it("finds the pair from either side", () => {
    const fromA = popularPairFor("snowbird");
    expect(fromA?.pair).toBe("snowbird-vs-brighton");
    expect(fromA?.other.slug).toBe("brighton");
    const fromB = popularPairFor("brighton");
    expect(fromB?.pair).toBe("snowbird-vs-brighton");
    expect(fromB?.other.slug).toBe("snowbird");
  });

  it("returns null for a resort in no popular pair", () => {
    expect(popularPairFor("obertauern")).toBeNull();
  });
});

describe("parseCompareSelection", () => {
  it("passes a valid pair through", () => {
    expect(parseCompareSelection("snowbird", "vail")).toEqual({
      a: "snowbird",
      b: "vail",
    });
  });

  it("drops unknown slugs and empty params", () => {
    expect(parseCompareSelection("atlantis", undefined)).toEqual({ a: null, b: null });
    expect(parseCompareSelection(null, "vail")).toEqual({ a: null, b: "vail" });
    expect(parseCompareSelection(undefined, undefined)).toEqual({ a: null, b: null });
  });

  it("never keeps a self-comparison", () => {
    expect(parseCompareSelection("vail", "vail")).toEqual({ a: "vail", b: null });
  });
});

describe("nextSelection", () => {
  it("sets and clears a side", () => {
    expect(nextSelection({ a: null, b: null }, "a", "vail")).toEqual({ a: "vail", b: null });
    expect(nextSelection({ a: "vail", b: null }, "a", null)).toEqual({ a: null, b: null });
  });

  it("swaps instead of producing a self-comparison", () => {
    expect(nextSelection({ a: "vail", b: "snowbird" }, "a", "snowbird")).toEqual({
      a: "snowbird",
      b: "vail",
    });
    expect(nextSelection({ a: "vail", b: "snowbird" }, "b", "vail")).toEqual({
      a: "snowbird",
      b: "vail",
    });
  });
});

describe("buildComparisonRows", () => {
  const snowbird = buildCompareData(getSkiResort("snowbird")!);
  const brighton = buildCompareData(getSkiResort("brighton")!);
  const rows = buildComparisonRows(snowbird, brighton);
  const byKey = Object.fromEntries(rows.map(r => [r.key, r]));

  it("always carries location and camera counts from the resort index", () => {
    expect(byKey.location.a).toContain("Utah");
    expect(byKey.location.b).toContain("Utah");
    expect(byKey.resortCameras.a).toBe(
      snowbird.resortCameraCount.toLocaleString("en-US"),
    );
    expect(byKey.nearbyCameras.b).toBe(
      brighton.nearbyCameraCount.toLocaleString("en-US"),
    );
  });

  it("shows a sourced fact and leaves the unsourced side empty", () => {
    // Snowbird's facts carry the full stat set; Brighton's entry in the
    // facts file is prose-only, so its terrain cells must stay empty —
    // never filled from the other resort or invented.
    expect(byKey.vertical.a).not.toBeNull();
    expect(byKey.vertical.b).toBeNull();
    expect(byKey.runs.a).not.toBeNull();
    expect(byKey.runs.b).toBeNull();
  });

  it("fills terrain rows on both sides when both resorts are sourced", () => {
    const keystone = buildCompareData(getSkiResort("keystone")!);
    const both = Object.fromEntries(
      buildComparisonRows(snowbird, keystone).map(r => [r.key, r]),
    );
    expect(both.vertical.a).not.toBeNull();
    expect(both.vertical.b).not.toBeNull();
    expect(both.terrain.a).not.toBeNull();
    expect(both.terrain.b).not.toBeNull();
  });
});

describe("allCompareData", () => {
  it("covers every resort exactly once", () => {
    const all = allCompareData();
    expect(all.length).toBe(112);
    expect(new Set(all.map(r => r.slug)).size).toBe(112);
  });
});
