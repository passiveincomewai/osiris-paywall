import { describe, it, expect } from "vitest";
import { tleForNorad } from "./feeds";

const BLOCK = [
  "ISS (ZARYA)",
  "1 25544U 98067A   26300.50000000  .00016717  00000-0  10270-3 0  9000",
  "2 25544  51.6400 100.0000 0005000  90.0000 270.0000 15.50000000000000",
  "CSS (TIANHE)",
  "1 48274U 21034A   26300.50000000  .00010000  00000-0  10000-3 0  9000",
  "2 48274  41.4700 100.0000 0005000  90.0000 270.0000 15.60000000000000",
].join("\n");

describe("tleForNorad", () => {
  it("finds the ISS entry by NORAD id", () => {
    const tle = tleForNorad(BLOCK, "25544");
    expect(tle?.line1).toContain("25544");
    expect(tle?.line2).toContain("51.6400");
  });
  it("returns null for a missing satellite or garbage input", () => {
    expect(tleForNorad(BLOCK, "99999")).toBeNull();
    expect(tleForNorad("hello world", "25544")).toBeNull();
    expect(tleForNorad("", "25544")).toBeNull();
  });
});
