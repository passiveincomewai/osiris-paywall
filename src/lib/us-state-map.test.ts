import { describe, it, expect } from "vitest";
import { US_MAP_STATES, US_MAP_VIEWBOX, usMapState } from "@/lib/us-state-map";
import { getUsStatesIndex } from "@/lib/us-states";

/* The map's coverage guard: every state in the generated index gets
   exactly one map shape, and vice versa — if the catalogue adds or
   drops a state, this suite fails until the map follows. */
describe("US_MAP_STATES coverage", () => {
  it("covers exactly the slugs in us-states.json — no missing, no extras", () => {
    const indexSlugs = getUsStatesIndex()
      .states.map((s) => s.slug)
      .sort();
    const mapSlugs = US_MAP_STATES.map((s) => s.slug).sort();
    expect(mapSlugs).toEqual(indexSlugs);
    expect(mapSlugs.length).toBe(51);
  });

  it("gives every state a non-empty path and an in-frame label", () => {
    for (const s of US_MAP_STATES) {
      expect(s.path.length).toBeGreaterThan(10);
      expect(s.path.startsWith("M")).toBe(true);
      expect(s.labelX).toBeGreaterThanOrEqual(0);
      expect(s.labelX).toBeLessThanOrEqual(US_MAP_VIEWBOX.width);
      expect(s.labelY).toBeGreaterThanOrEqual(0);
      expect(s.labelY).toBeLessThanOrEqual(US_MAP_VIEWBOX.height);
      expect(s.usps).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("keeps state shapes geographically sane — Texas left of Florida, Maine top-right", () => {
    const tx = usMapState("texas")!;
    const fl = usMapState("florida")!;
    const me = usMapState("maine")!;
    const ca = usMapState("california")!;
    expect(tx.anchorX).toBeLessThan(fl.anchorX);
    expect(ca.anchorX).toBeLessThan(tx.anchorX);
    expect(me.anchorX).toBeGreaterThan(fl.anchorX);
    expect(me.anchorY).toBeLessThan(fl.anchorY);
  });

  it("insets Alaska below the West Coast and Hawaii below the Southwest", () => {
    const ak = usMapState("alaska")!;
    const hi = usMapState("hawaii")!;
    const wa = usMapState("washington")!;
    expect(ak.anchorY).toBeGreaterThan(wa.anchorY);
    /* Inside its inset box (x 30..275), spanning the coast below
       Washington and Oregon — west of every mainland state anchor
       east of the Rockies. */
    expect(ak.anchorX).toBeGreaterThan(30);
    expect(ak.anchorX).toBeLessThan(275);
    expect(ak.anchorX).toBeLessThan(usMapState("texas")!.anchorX);
    expect(hi.anchorY).toBeGreaterThan(500);
    expect(hi.anchorX).toBeGreaterThan(ak.anchorX);
    /* Hawaii's anchor sits over its largest island inside the inset
       box (x 300..480) — well south of the mainland frame, so it can
       never collide with a mainland state. */
    expect(hi.anchorX).toBeGreaterThan(300);
    expect(hi.anchorX).toBeLessThan(480);
  });

  it("marks DC as a marker with its label led out of the state", () => {
    const dc = usMapState("district-of-columbia")!;
    expect(dc.isMarker).toBe(true);
    expect(Math.abs(dc.labelX - dc.anchorX)).toBeGreaterThan(10);
  });
});
