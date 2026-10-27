import { describe, it, expect } from "vitest";
import {
  normalizeSearchQuery,
  buildSearchPerformedDetail,
  parseSearchPerformedDetail,
  SEARCH_QUERY_TOKEN_MAX,
} from "./search-event";
import { splitEvent } from "./ingest-fields";

describe("normalizeSearchQuery", () => {
  it("lowercases and collapses separator runs to single underscores", () => {
    expect(normalizeSearchQuery("Eiffel Tower")).toBe("eiffel_tower");
    expect(normalizeSearchQuery("  New   York!! ")).toBe("new_york");
    expect(normalizeSearchQuery("Marysville, WA")).toBe("marysville_wa");
    expect(normalizeSearchQuery("10 Downing Street")).toBe("10_downing_street");
  });

  it("folds diacritics so place names stay readable terms", () => {
    expect(normalizeSearchQuery("Kīlauea")).toBe("kilauea");
    expect(normalizeSearchQuery("Zürich")).toBe("zurich");
  });

  it("returns empty for queries with no searchable terms", () => {
    expect(normalizeSearchQuery("")).toBe("");
    expect(normalizeSearchQuery("   ")).toBe("");
    expect(normalizeSearchQuery("!!! ---")).toBe("");
  });

  it("caps the token and never leaves a dangling separator", () => {
    const token = normalizeSearchQuery("a".repeat(200));
    expect(token.length).toBe(SEARCH_QUERY_TOKEN_MAX);
    const cut = normalizeSearchQuery(`${"x".repeat(54)} overflow terms here`);
    expect(cut.length).toBeLessThanOrEqual(SEARCH_QUERY_TOKEN_MAX);
    expect(cut.endsWith("_")).toBe(false);
  });
});

describe("buildSearchPerformedDetail", () => {
  it("builds '<count>_<token>' and marks zero-result by count 0", () => {
    expect(buildSearchPerformedDetail("Jamaica", 0)).toBe("0_jamaica");
    expect(buildSearchPerformedDetail("Eiffel Tower", 12)).toBe("12_eiffel_tower");
  });

  it("clamps and floors the count", () => {
    expect(buildSearchPerformedDetail("paris", -3)).toBe("0_paris");
    expect(buildSearchPerformedDetail("paris", 3.9)).toBe("3_paris");
    expect(buildSearchPerformedDetail("paris", 123456)).toBe("9999_paris");
    expect(buildSearchPerformedDetail("paris", Number.NaN)).toBe("0_paris");
  });

  it("returns null when there is nothing searchable to record", () => {
    expect(buildSearchPerformedDetail("", 0)).toBeNull();
    expect(buildSearchPerformedDetail("   ", 5)).toBeNull();
    expect(buildSearchPerformedDetail("!!!", 0)).toBeNull();
  });

  it("keeps the whole stored event inside the 80-char event-column cap", () => {
    const detail = buildSearchPerformedDetail("a very long place name query ".repeat(10), 9999);
    expect(detail).not.toBeNull();
    expect(`search_performed:${detail}`.length).toBeLessThanOrEqual(80);
  });
});

describe("parseSearchPerformedDetail", () => {
  it("round-trips the builder output, including the zero-result flag", () => {
    expect(parseSearchPerformedDetail(buildSearchPerformedDetail("Jamaica", 0))).toEqual({
      query: "jamaica",
      resultCount: 0,
      zeroResult: true,
    });
    expect(parseSearchPerformedDetail(buildSearchPerformedDetail("10 Downing Street", 3))).toEqual({
      query: "10_downing_street",
      resultCount: 3,
      zeroResult: false,
    });
  });

  it("parses the detail half of a stored event value via splitEvent", () => {
    const { name, detail } = splitEvent("search_performed:0_jamaica");
    expect(name).toBe("search_performed");
    expect(parseSearchPerformedDetail(detail)).toEqual({
      query: "jamaica",
      resultCount: 0,
      zeroResult: true,
    });
  });

  it("rejects malformed details", () => {
    expect(parseSearchPerformedDetail(null)).toBeNull();
    expect(parseSearchPerformedDetail(undefined)).toBeNull();
    expect(parseSearchPerformedDetail("")).toBeNull();
    expect(parseSearchPerformedDetail("jamaica")).toBeNull(); // no count prefix
    expect(parseSearchPerformedDetail("x_jamaica")).toBeNull(); // non-numeric count
    expect(parseSearchPerformedDetail("0_")).toBeNull(); // no query token
    expect(parseSearchPerformedDetail("_jamaica")).toBeNull(); // empty count
  });
});
