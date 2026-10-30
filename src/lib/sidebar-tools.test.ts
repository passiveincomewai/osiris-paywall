import { describe, expect, it } from "vitest";
import {
  SIDEBAR_TOOL_IDS,
  isSidebarToolId,
  layoutSidebarTools,
  resolveSidebarToolOrder,
  resolveVisibleSidebarTools,
  sanitizeSidebarToolIds,
} from "./sidebar-tools";

describe("sidebar-tools merge logic", () => {
  it("defaults: empty prefs render the canonical order, nothing hidden", () => {
    expect(resolveSidebarToolOrder([])).toEqual([...SIDEBAR_TOOL_IDS]);
    expect(resolveVisibleSidebarTools([], [])).toEqual([...SIDEBAR_TOOL_IDS]);
    const layout = layoutSidebarTools([], []);
    expect(layout.hiddenIds.size).toBe(0);
    SIDEBAR_TOOL_IDS.forEach((id, i) => expect(layout.orderIndex[id]).toBe(i));
  });

  it("applies a saved order and appends never-ordered tools canonically", () => {
    expect(resolveSidebarToolOrder(["arcgis", "oi"])).toEqual([
      "arcgis", "oi", "recon", "space", "alerts", "draw", "search",
    ]);
  });

  it("hidden tools leave the visible list but keep their order slot", () => {
    expect(resolveVisibleSidebarTools(["oi", "recon"], ["recon"])).toEqual([
      "oi", "space", "alerts", "draw", "search", "arcgis",
    ]);
    const layout = layoutSidebarTools(["oi", "recon"], ["recon"]);
    expect(layout.orderIndex.oi).toBe(0);
    expect(layout.orderIndex.recon).toBe(1);
    expect(layout.hiddenIds.has("recon")).toBe(true);
    expect(layout.hiddenIds.has("oi")).toBe(false);
  });

  it("hiding everything is allowed (empty strip, no crash)", () => {
    expect(resolveVisibleSidebarTools([], [...SIDEBAR_TOOL_IDS])).toEqual([]);
  });

  it("corrupted stored values fall back to safe defaults", () => {
    // Not arrays at all.
    expect(sanitizeSidebarToolIds("recon")).toEqual([]);
    expect(sanitizeSidebarToolIds(null)).toEqual([]);
    expect(sanitizeSidebarToolIds(undefined)).toEqual([]);
    expect(sanitizeSidebarToolIds(42)).toEqual([]);
    expect(resolveSidebarToolOrder("junk")).toEqual([...SIDEBAR_TOOL_IDS]);
    // Junk entries, unknown ids, duplicates, non-strings.
    expect(sanitizeSidebarToolIds(["oi", "nope", "oi", 7, null, "draw"])).toEqual(["oi", "draw"]);
    expect(resolveSidebarToolOrder([["nested"], { id: "oi" }, "space"])).toEqual([
      "space", "recon", "alerts", "draw", "oi", "search", "arcgis",
    ]);
    const layout = layoutSidebarTools(null, "everything");
    expect(layout.hiddenIds.size).toBe(0);
    expect(resolveVisibleSidebarTools(undefined, [null, "bogus"])).toEqual([...SIDEBAR_TOOL_IDS]);
  });

  it("isSidebarToolId only accepts canonical ids", () => {
    expect(isSidebarToolId("oi")).toBe(true);
    expect(isSidebarToolId("OI")).toBe(false);
    expect(isSidebarToolId("")).toBe(false);
    expect(isSidebarToolId(null)).toBe(false);
  });
});
