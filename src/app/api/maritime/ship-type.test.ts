import { beforeEach, describe, expect, it } from "vitest";
import { getLiveShipsForTracking, getOsirisShipType } from "./route";

/**
 * Pins the AIS type mapping the cruise-ship pages rely on: passenger
 * codes 60–69 used to fall through to 'cargo', so no cruise ship could
 * ever be identified by type in the feed. Also pins the tracking
 * accessor's 10-minute staleness cutoff (drives globalThis cache the
 * same way route.test.ts does).
 */
describe("getOsirisShipType", () => {
  it("maps the IMO AIS ranges", () => {
    expect(getOsirisShipType(60)).toBe("passenger");
    expect(getOsirisShipType(66)).toBe("passenger");
    expect(getOsirisShipType(69)).toBe("passenger");
    expect(getOsirisShipType(70)).toBe("cargo");
    expect(getOsirisShipType(79)).toBe("cargo");
    expect(getOsirisShipType(80)).toBe("tanker");
    expect(getOsirisShipType(89)).toBe("tanker");
    expect(getOsirisShipType(35)).toBe("military");
  });

  it("keeps the cargo default for unknown and missing codes", () => {
    expect(getOsirisShipType(0)).toBe("cargo");
    expect(getOsirisShipType(52)).toBe("cargo");
    expect(getOsirisShipType(31)).toBe("cargo");
  });
});

interface CacheShip {
  id: number;
  mmsi: number;
  timestamp: number;
  [k: string]: unknown;
}

const cache = () =>
  (globalThis as unknown as { shipsCache: Map<number, CacheShip> }).shipsCache;

describe("getLiveShipsForTracking", () => {
  beforeEach(() => {
    cache().clear();
  });

  it("returns fresh ships and drops reports older than 10 minutes", () => {
    const now = Date.now();
    cache().set(1, { id: 1, mmsi: 1, timestamp: now - 60_000 });
    cache().set(2, { id: 2, mmsi: 2, timestamp: now - 11 * 60_000 });
    const ships = getLiveShipsForTracking(now) as CacheShip[];
    expect(ships.map((s) => s.mmsi)).toEqual([1]);
    expect(cache().has(2)).toBe(false);
  });
});
