import { describe, expect, it } from "vitest";
import {
  buildRelatedSearches,
  compassDirection,
  type RelatedSearchesInput,
} from "./related-searches";

const base: RelatedSearchesInput = {
  placeName: "Seattle",
  kinds: [],
  areas: [],
  neighbours: [],
  parent: null,
  usedAnchors: [],
};

describe("compassDirection", () => {
  it("names the 8 winds from raw coordinates", () => {
    const from = { lat: 47.6, lng: -122.3 };
    expect(compassDirection(from, { lat: 48.6, lng: -122.3 })).toBe("north");
    expect(compassDirection(from, { lat: 46.6, lng: -122.3 })).toBe("south");
    expect(compassDirection(from, { lat: 47.6, lng: -121.3 })).toBe("east");
    expect(compassDirection(from, { lat: 47.6, lng: -123.3 })).toBe("west");
    expect(compassDirection(from, { lat: 48.6, lng: -121.3 })).toBe("north-east");
    expect(compassDirection(from, { lat: 46.6, lng: -123.3 })).toBe("south-west");
  });
});

describe("buildRelatedSearches", () => {
  it("returns nothing when fewer than three honest suggestions exist", () => {
    const out = buildRelatedSearches({
      ...base,
      parent: { anchor: "All United States cameras", href: "/cameras/countries/united-states", subtext: "x" },
    });
    expect(out).toEqual([]);
  });

  it("applies the ≥8 kind gate — a kind with 7 cameras never fires", () => {
    const out = buildRelatedSearches({
      ...base,
      kinds: [{ kind: "coast", count: 7, wallHref: "/beach-webcams" }],
      areas: [
        { name: "A", href: "/a", count: 10 },
        { name: "B", href: "/b", count: 9 },
      ],
      parent: { anchor: "All United States cameras", href: "/us", subtext: "x" },
    });
    expect(out.map((s) => s.rule)).not.toContain(1);
    expect(out.map((s) => s.rule)).not.toContain(5);
    expect(out).toHaveLength(3);
  });

  it("prefers the place-anchored target over the wall, then offers the wall at rule 5", () => {
    const out = buildRelatedSearches({
      ...base,
      placeName: "Tokyo",
      kinds: [
        {
          kind: "traffic",
          count: 900,
          localHref: "/japan-traffic-cameras",
          localAnchor: "Tokyo's road and river cameras",
          wallHref: "/live-traffic-cameras",
        },
      ],
      areas: [{ name: "Osaka", href: "/city-webcams/osaka", count: 194 }],
      parent: { anchor: "All Japan cameras", href: "/cameras/countries/japan", subtext: "x" },
    });
    expect(out[0]).toMatchObject({ href: "/japan-traffic-cameras", rule: 1, anchor: "Tokyo's road and river cameras" });
    const rule5 = out.find((s) => s.rule === 5);
    expect(rule5).toMatchObject({ href: "/live-traffic-cameras", anchor: "Live traffic cameras worldwide" });
  });

  it("never emits the same href twice — rule 5 yields when rule 1 took the wall", () => {
    const out = buildRelatedSearches({
      ...base,
      kinds: [{ kind: "coast", count: 40, wallHref: "/beach-webcams" }],
      areas: [
        { name: "A", href: "/a", count: 10 },
        { name: "B", href: "/b", count: 9 },
      ],
      parent: { anchor: "All United States cameras", href: "/us", subtext: "x" },
    });
    const hrefs = out.map((s) => s.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(out.filter((s) => s.href === "/beach-webcams")).toHaveLength(1);
    expect(out.find((s) => s.href === "/beach-webcams")?.rule).toBe(1);
  });

  it("drops suggestions whose anchor the page already carries (normalized)", () => {
    const out = buildRelatedSearches({
      ...base,
      neighbours: [
        { name: "Tacoma", href: "/city-webcams/tacoma", distanceKm: 38, direction: "south" },
        { name: "Bellevue", href: "/city-webcams/bellevue", distanceKm: 10, direction: "east" },
      ],
      areas: [{ name: "Downtown", href: "/d", count: 30 }],
      parent: { anchor: "All United States cameras", href: "/us", subtext: "x" },
      usedAnchors: ["  live cameras in TACOMA "],
    });
    expect(out.map((s) => s.anchor)).not.toContain("Live cameras in Tacoma");
    expect(out.map((s) => s.anchor)).toContain("Live cameras in Bellevue");
  });

  it("orders rules by priority, sorts within rules, and caps at six", () => {
    const out = buildRelatedSearches({
      ...base,
      kinds: [
        { kind: "traffic", count: 500, wallHref: "/live-traffic-cameras" },
        { kind: "coast", count: 300, wallHref: "/beach-webcams" },
        { kind: "transport", count: 100, wallHref: "/airport-webcams" },
        { kind: "mountains", count: 50, wallHref: "/ski-webcams" },
      ],
      areas: [
        { name: "Small", href: "/s", count: 5 },
        { name: "Big", href: "/big", count: 900 },
        { name: "Mid", href: "/mid", count: 100 },
      ],
      neighbours: [
        { name: "Far", href: "/far", distanceKm: 300, direction: "north" },
        { name: "Near", href: "/near", distanceKm: 12, direction: "west" },
      ],
      parent: { anchor: "All United States cameras", href: "/us", subtext: "x" },
      extraParent: { anchor: "Washington traffic cameras statewide", href: "/us-traffic-cameras/washington", subtext: "y" },
    });
    expect(out).toHaveLength(6);
    // Rule 1 takes the three biggest kinds, biggest first.
    expect(out.slice(0, 3).map((s) => s.rule)).toEqual([1, 1, 1]);
    expect(out[0].subtext).toContain("500");
    // Areas: largest first, capped at 2 — "Small" (5) never appears.
    const areaAnchors = out.filter((s) => s.rule === 2).map((s) => s.anchor);
    expect(areaAnchors).toEqual(["Cameras in Big", "Cameras in Mid"]);
    // The cap is reached before neighbours/parents — priority is real.
    expect(out.map((s) => s.rule)).toEqual([1, 1, 1, 2, 2, 3]);
    expect(out[5].anchor).toBe("Live cameras in Near");
  });

  it("neighbour subtexts carry the distance and direction facts", () => {
    const out = buildRelatedSearches({
      ...base,
      neighbours: [
        { name: "Tacoma", href: "/city-webcams/tacoma", distanceKm: 38.4, direction: "south" },
        { name: "Bellevue", href: "/city-webcams/bellevue", distanceKm: 9.6, direction: "east" },
        { name: "Everett", href: "/city-webcams/everett", distanceKm: 40, direction: "north" },
      ],
      parent: { anchor: "All United States cameras", href: "/us", subtext: "x" },
    });
    const tacoma = out.find((s) => s.anchor === "Live cameras in Tacoma");
    expect(tacoma?.subtext).toBe("38 km south of Seattle");
    // Nearest first, capped at 2 — Everett (40 km) drops.
    expect(out.filter((s) => s.rule === 3).map((s) => s.anchor)).toEqual([
      "Live cameras in Bellevue",
      "Live cameras in Tacoma",
    ]);
  });
});
