import { describe, it, expect } from "vitest";
import {
  applyUsStateQuery,
  isUsStateFiltering,
  matchUsStates,
  type UsStateEntry,
} from "@/lib/us-state-browser";
import { getUsStatesIndex } from "@/lib/us-states";

const STATES: UsStateEntry[] = getUsStatesIndex().states.map((s) => ({
  slug: s.slug,
  name: s.name,
  usps: s.usps,
  count: s.count,
}));

describe("matchUsStates", () => {
  it("returns the full list for an empty query", () => {
    expect(matchUsStates(STATES, "")).toHaveLength(51);
    expect(matchUsStates(STATES, "   ")).toHaveLength(51);
  });

  it("matches a full name, case-insensitively", () => {
    const hits = matchUsStates(STATES, "tExAs");
    expect(hits.map((s) => s.slug)).toEqual(["texas"]);
  });

  it("matches the USPS code exactly", () => {
    expect(matchUsStates(STATES, "TX").map((s) => s.slug)).toEqual(["texas"]);
    /* "ca" is California's code AND a substring of the Carolinas —
       the code match ranks first, the substrings follow A–Z. */
    expect(matchUsStates(STATES, "ca").map((s) => s.slug)).toEqual([
      "california",
      "north-carolina",
      "south-carolina",
    ]);
  });

  it("ranks name prefixes ahead of substrings — 'new' finds the four New states first", () => {
    const hits = matchUsStates(STATES, "new");
    expect(hits.slice(0, 4).map((s) => s.slug).sort()).toEqual([
      "new-hampshire",
      "new-jersey",
      "new-mexico",
      "new-york",
    ]);
  });

  it("matches substrings across multi-word names", () => {
    expect(matchUsStates(STATES, "carolina").map((s) => s.slug).sort()).toEqual([
      "north-carolina",
      "south-carolina",
    ]);
    expect(matchUsStates(STATES, "dakota").map((s) => s.slug).sort()).toEqual([
      "north-dakota",
      "south-dakota",
    ]);
  });

  it("finds nothing for a non-state", () => {
    expect(matchUsStates(STATES, "atlantis")).toEqual([]);
  });
});

describe("applyUsStateQuery", () => {
  it("defaults to the full A–Z list", () => {
    const rows = applyUsStateQuery(STATES, { search: "", sort: "name-asc" });
    expect(rows).toHaveLength(51);
    expect(rows[0].slug).toBe("alabama");
    expect(rows[rows.length - 1].slug).toBe("wyoming");
  });

  it("sorts by camera count both ways with name tie-break", () => {
    const desc = applyUsStateQuery(STATES, { search: "", sort: "cameras-desc" });
    expect(desc[0].slug).toBe("florida");
    const asc = applyUsStateQuery(STATES, { search: "", sort: "cameras-asc" });
    expect(asc[0].slug).toBe("rhode-island");
    expect(asc[asc.length - 1].slug).toBe("florida");
  });

  it("keeps search relevance order even under A–Z sort", () => {
    const rows = applyUsStateQuery(STATES, { search: "new", sort: "name-asc" });
    expect(rows.map((s) => s.slug)).toEqual([
      "new-hampshire",
      "new-jersey",
      "new-mexico",
      "new-york",
    ]);
  });

  it("combines search with count sort", () => {
    const rows = applyUsStateQuery(STATES, {
      search: "carolina",
      sort: "cameras-desc",
    });
    expect(rows.map((s) => s.slug)).toEqual(["north-carolina", "south-carolina"]);
  });
});

describe("isUsStateFiltering", () => {
  it("is false only for the untouched default view", () => {
    expect(isUsStateFiltering({ search: "", sort: "name-asc" })).toBe(false);
    expect(isUsStateFiltering({ search: "tx", sort: "name-asc" })).toBe(true);
    expect(isUsStateFiltering({ search: "", sort: "cameras-desc" })).toBe(true);
  });
});
