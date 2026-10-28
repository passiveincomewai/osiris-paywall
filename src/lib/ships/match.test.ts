import { describe, expect, it } from "vitest";
import { getShip } from "./registry";
import {
  compassPoint,
  formatAge,
  formatCoordinates,
  matchShipToFeed,
  normalizeShipName,
  type FeedShip,
} from "./match";

const icon = getShip("icon-of-the-seas")!;
const NOW = Date.parse("2026-10-26T12:00:00Z");

function feedShip(partial: Partial<FeedShip>): FeedShip {
  return {
    mmsi: icon.mmsi,
    name: "ICON OF THE SEAS",
    lat: 25.7617,
    lng: -80.1918,
    speed: 18.4,
    heading: 90,
    destination: "COZUMEL",
    type: "passenger",
    timestamp: NOW - 60_000,
    ...partial,
  };
}

describe("matchShipToFeed", () => {
  it("matches by MMSI and shapes the live view", () => {
    const view = matchShipToFeed(icon, [feedShip({})], NOW);
    expect(view.status).toBe("live");
    if (view.status !== "live") return;
    expect(view.lat).toBeCloseTo(25.7617);
    expect(view.lng).toBeCloseTo(-80.1918);
    expect(view.speedKnots).toBe(18.4);
    expect(view.headingDeg).toBe(90);
    expect(view.headingPoint).toBe("E");
    expect(view.destination).toBe("COZUMEL");
    expect(view.ageSeconds).toBe(60);
  });

  it("falls back to the broadcast name when the MMSI differs", () => {
    const view = matchShipToFeed(
      icon,
      [feedShip({ mmsi: 999999999, name: "  icon of the seas " })],
      NOW,
    );
    expect(view.status).toBe("live");
  });

  it("a stale report is NOT a live position", () => {
    const stale = feedShip({ timestamp: NOW - 10 * 60 * 1000 - 1 });
    expect(matchShipToFeed(icon, [stale], NOW)).toEqual({
      status: "not-reporting",
    });
  });

  it("a record at exactly the 10-minute cutoff still counts as live", () => {
    const edge = feedShip({ timestamp: NOW - 10 * 60 * 1000 });
    expect(matchShipToFeed(icon, [edge], NOW).status).toBe("live");
  });

  it("no record, or a record without coordinates, is not-reporting", () => {
    expect(matchShipToFeed(icon, [], NOW)).toEqual({ status: "not-reporting" });
    expect(
      matchShipToFeed(icon, [feedShip({ lat: undefined, lng: undefined })], NOW),
    ).toEqual({ status: "not-reporting" });
  });

  it("never borrows another vessel's position by name collision after a stale MMSI hit", () => {
    const staleMine = feedShip({ timestamp: NOW - 60 * 60 * 1000 });
    const freshStranger = feedShip({
      mmsi: 888888888,
      name: "ICON OF THE SEAS",
      lat: 1,
      lng: 2,
    });
    // The MMSI record is the identity; its staleness wins over a fresh
    // name-alike that could be a different vessel entirely.
    expect(matchShipToFeed(icon, [staleMine, freshStranger], NOW)).toEqual({
      status: "not-reporting",
    });
  });

  it("AIS sentinel values become null, not data", () => {
    const view = matchShipToFeed(
      icon,
      [feedShip({ heading: 511, speed: 102.3, destination: "  " })],
      NOW,
    );
    expect(view.status).toBe("live");
    if (view.status !== "live") return;
    expect(view.headingDeg).toBeNull();
    expect(view.headingPoint).toBeNull();
    expect(view.speedKnots).toBeNull();
    expect(view.destination).toBeNull();
  });
});

describe("helpers", () => {
  it("normalizes AIS names canonically", () => {
    expect(normalizeShipName("  Icon   of the Seas ")).toBe("ICON OF THE SEAS");
    expect(normalizeShipName("MARDI GRAS")).toBe("MARDI GRAS");
    expect(normalizeShipName("NORWEGIAN  AQUA")).toBe("NORWEGIAN AQUA");
  });

  it("maps headings to 16-point compass labels", () => {
    expect(compassPoint(0)).toBe("N");
    expect(compassPoint(90)).toBe("E");
    expect(compassPoint(191)).toBe("S");
    expect(compassPoint(359)).toBe("N");
    expect(compassPoint(360)).toBeNull();
    expect(compassPoint(511)).toBeNull();
  });

  it("formats coordinates with hemispheres", () => {
    expect(formatCoordinates(25.7617, -80.1918)).toBe("25.7617° N, 80.1918° W");
    expect(formatCoordinates(-33.8688, 151.2093)).toBe("33.8688° S, 151.2093° E");
  });

  it("formats report age for the live card", () => {
    expect(formatAge(10)).toBe("just now");
    expect(formatAge(60)).toBe("1 min ago");
    expect(formatAge(9 * 60)).toBe("9 min ago");
  });
});
