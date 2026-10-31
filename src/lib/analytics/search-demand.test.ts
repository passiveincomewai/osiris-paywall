import { describe, expect, it } from "vitest";
import {
  aggregateSearchDemand,
  demandVsInventory,
  matchTokenInventory,
  type TimedEventRow,
} from "./search-demand";

const s = (event: string, sessionId: string | null, createdAt: string): TimedEventRow => ({
  event,
  sessionId,
  createdAt,
});

describe("aggregateSearchDemand", () => {
  const searches = [
    s("search_performed:12_tokyo", "a", "2026-10-26T10:00:00Z"),
    s("search_performed:0_tokyo", "b", "2026-10-27T10:00:00Z"), // a later search for tokyo found nothing (filters)
    s("search_performed:0_jamaica", "a", "2026-10-26T11:00:00Z"),
    s("search_performed:0_jamaica", "c", "2026-11-02T09:00:00Z"),
    s("search_performed:3_eiffel_tower", "d", "2026-11-02T10:00:00Z"),
    s("page_view", "a", "2026-10-26T10:05:00Z"), // not a search — ignored
    s("search_performed:garbage", "a", "2026-10-26T10:06:00Z"), // malformed — ignored
  ];
  const opens = [
    s("camera_open", "a", "2026-10-26T10:30:00Z"), // after a's first search → success
    s("camera_open", "b", "2026-10-27T09:00:00Z"), // before b's search → not a success
    s("camera_open", "zzz", "2026-10-26T10:30:00Z"), // no search in session → ignored
  ];
  const r = aggregateSearchDemand(searches, opens);

  it("counts only well-formed search_performed events", () => {
    expect(r.totalSearches).toBe(5);
    expect(r.zeroResultSearches).toBe(3);
    expect(r.uniqueTokens).toBe(3);
  });

  it("ranks tokens and keeps the pure zero-result list separate", () => {
    expect(r.top.map((t) => t.token)).toEqual(["jamaica", "tokyo", "eiffel_tower"]);
    // tokyo has one zero-result search but also a successful one → not a pure zero
    expect(r.zeroResults.map((t) => t.token)).toEqual(["jamaica"]);
    expect(r.top.find((t) => t.token === "tokyo")?.zeroResultSearches).toBe(1);
  });

  it("buckets by ISO week (UTC Monday)", () => {
    expect(r.weekly).toEqual([
      { weekStart: "2026-10-26", searches: 3, zeroResultSearches: 2 },
      { weekStart: "2026-11-02", searches: 2, zeroResultSearches: 1 },
    ]);
  });

  it("joins camera opens by session at-or-after the first search", () => {
    expect(r.success.searchSessions).toBe(4);
    expect(r.success.sessionsWithCameraOpen).toBe(1);
    expect(r.success.ratePct).toBe(25);
  });

  it("handles the empty case without dividing by zero", () => {
    const empty = aggregateSearchDemand([], []);
    expect(empty.totalSearches).toBe(0);
    expect(empty.success.ratePct).toBeNull();
  });
});

describe("demand vs inventory matching", () => {
  const places = [
    { name: "Tokyo", cameras: 232 },
    { name: "New York", cameras: 900 },
    { name: "York", cameras: 40 },
  ];

  it("matches exact and segment-contained place names, longest key wins", () => {
    expect(matchTokenInventory("tokyo", places)).toEqual({ name: "Tokyo", cameras: 232 });
    expect(matchTokenInventory("tokyo_webcam", places)).toEqual({ name: "Tokyo", cameras: 232 });
    expect(matchTokenInventory("new_york_traffic", places)).toEqual({ name: "New York", cameras: 900 });
    expect(matchTokenInventory("atlantis", places)).toBeNull();
  });

  it("joins the report's top tokens to inventory", () => {
    const r = aggregateSearchDemand(
      [s("search_performed:0_tokyo", "a", "2026-10-26T10:00:00Z"), s("search_performed:0_atlantis", "a", "2026-10-26T10:01:00Z")],
      [],
    );
    const joined = demandVsInventory(r, places);
    expect(joined.find((j) => j.token === "tokyo")?.cameras).toBe(232);
    expect(joined.find((j) => j.token === "atlantis")?.cameras).toBeNull();
  });
});
