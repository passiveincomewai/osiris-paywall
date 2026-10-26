import { describe, expect, it } from "vitest";
import { matchCityOptions, type CityOption } from "./CountryCitySearch";

/**
 * The country-page city search matcher. The US half pins the derived
 * places behaviour: state-suffixed queries ("ogden utah", "Ogden, UT")
 * must find the bare city, because the US city list now holds real
 * derived places (lib/us-places) rather than feed labels.
 */

const SWISS: CityOption[] = [
  { name: "Zürich", count: 12 },
  { name: "Zug", count: 3 },
  { name: "Genève", count: 8 },
];

const US: CityOption[] = [
  { name: "Salt Lake City", count: 190 },
  { name: "Ogden", count: 71 },
  { name: "North Ogden", count: 12 },
  { name: "South Ogden", count: 9 },
  { name: "Provo", count: 108 },
  { name: "New York", count: 300 },
];
const US_SUFFIXES = ["Utah", "UT", "New York", "NY"];

describe("matchCityOptions — folding and ranking (pre-existing behaviour)", () => {
  it("folds diacritics — zurich finds Zürich", () => {
    expect(matchCityOptions(SWISS, "zurich").map((c) => c.name)).toEqual(["Zürich"]);
  });
  it("ranks prefix matches ahead of substring matches", () => {
    const out = matchCityOptions(SWISS, "z");
    expect(out[0].name).toBe("Zürich");
    expect(out.map((c) => c.name)).toContain("Zug");
  });
  it("returns nothing for an empty query", () => {
    expect(matchCityOptions(SWISS, "   ")).toEqual([]);
    expect(matchCityOptions(SWISS, "")).toEqual([]);
  });
});

describe("matchCityOptions — US state suffixes", () => {
  it("finds the bare city from a state-name-suffixed query", () => {
    const out = matchCityOptions(US, "ogden utah", US_SUFFIXES);
    expect(out[0].name).toBe("Ogden");
  });
  it("finds the bare city from a USPS-suffixed query, comma or not", () => {
    expect(matchCityOptions(US, "ogden, ut", US_SUFFIXES)[0].name).toBe("Ogden");
    expect(matchCityOptions(US, "Ogden UT", US_SUFFIXES)[0].name).toBe("Ogden");
  });
  it("surfaces the whole Ogden family — word-start matches ride along", () => {
    const names = matchCityOptions(US, "ogden", US_SUFFIXES).map((c) => c.name);
    expect(names[0]).toBe("Ogden");
    expect(names).toContain("North Ogden");
    expect(names).toContain("South Ogden");
  });
  it("a multi-word city keeps working with and without its state suffix", () => {
    expect(matchCityOptions(US, "salt lake", US_SUFFIXES)[0].name).toBe("Salt Lake City");
    expect(matchCityOptions(US, "salt lake city utah", US_SUFFIXES)[0].name).toBe("Salt Lake City");
    expect(matchCityOptions(US, "new york", US_SUFFIXES)[0].name).toBe("New York");
    expect(matchCityOptions(US, "new york ny", US_SUFFIXES)[0].name).toBe("New York");
  });
  it("without suffixes, a suffixed query matches nothing (other countries unchanged)", () => {
    expect(matchCityOptions(US, "ogden utah")).toEqual([]);
    expect(matchCityOptions(US, "ogden").map((c) => c.name)).toContain("Ogden");
  });
});
