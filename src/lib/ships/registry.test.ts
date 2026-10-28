import { describe, expect, it } from "vitest";
import {
  getShip,
  PORT_WALL_KEYS,
  SHIPS,
  shipLines,
  shipsByLine,
} from "./registry";
import { normalizeShipName } from "./match";

/**
 * The registry is the contract the live matching keys on: a wrong MMSI
 * would pin a stranger's position to a famous name, and a fact without a
 * source breaks the site's no-invented-facts rule. These tests pin the
 * registry's integrity so a bad entry fails CI, not a reader.
 */
describe("ship registry integrity", () => {
  it("covers the four fleets with unique slugs and identities", () => {
    expect(SHIPS.length).toBe(14);
    expect(new Set(SHIPS.map((s) => s.slug)).size).toBe(SHIPS.length);
    expect(new Set(SHIPS.map((s) => s.mmsi)).size).toBe(SHIPS.length);
    expect(new Set(SHIPS.map((s) => s.imo)).size).toBe(SHIPS.length);
    expect(shipLines()).toEqual([
      "Royal Caribbean International",
      "Carnival Cruise Line",
      "Norwegian Cruise Line",
      "Disney Cruise Line",
    ]);
    for (const line of shipLines()) {
      expect(shipsByLine(line).length).toBeGreaterThan(0);
    }
  });

  it("every ship carries a plausible, complete identity", () => {
    for (const s of SHIPS) {
      // MMSI: 9 digits; IMO: 7 digits; call sign present.
      expect(String(s.mmsi), s.slug).toMatch(/^\d{9}$/);
      expect(s.imo, s.slug).toMatch(/^\d{7}$/);
      expect(s.callSign.length, s.slug).toBeGreaterThanOrEqual(4);
      // Facts are real numbers in cruise-ship ranges, never placeholders.
      expect(s.grossTonnage, s.slug).toBeGreaterThan(100_000);
      expect(s.lengthM, s.slug).toBeGreaterThan(250);
      expect(s.lengthM, s.slug).toBeLessThan(400);
      expect(s.passengersDouble, s.slug).toBeGreaterThan(2_000);
      if (s.passengersMax !== null) {
        expect(s.passengersMax, s.slug).toBeGreaterThan(s.passengersDouble);
      }
      expect(s.enteredService, s.slug).toMatch(/^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/);
    }
  });

  it("every fact carries a source, and AIS names match the ship", () => {
    for (const s of SHIPS) {
      expect(s.sourceUrl, s.slug).toMatch(/^https:\/\//);
      expect(s.aisNames.length, s.slug).toBeGreaterThan(0);
      const normalized = s.aisNames.map(normalizeShipName);
      expect(normalized, s.slug).toContain(normalizeShipName(s.name));
    }
  });

  it("homeport walls point at walls that exist on /port-webcams", () => {
    for (const s of SHIPS) {
      for (const h of s.homeports) {
        if (h.wallKey !== null) {
          expect(PORT_WALL_KEYS, `${s.slug}:${h.name}`).toContain(h.wallKey);
        }
      }
    }
  });

  it("getShip round-trips and misses cleanly", () => {
    expect(getShip("icon-of-the-seas")?.name).toBe("Icon of the Seas");
    expect(getShip("mardi-gras")?.mmsi).toBe(311001049);
    expect(getShip("queen-mary-2")).toBeUndefined();
  });
});
