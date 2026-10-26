import { describe, it, expect } from "vitest";
import { aircraftTypeName } from "./type-names";

describe("aircraftTypeName", () => {
  it("expands the designators that dominate live traffic", () => {
    expect(aircraftTypeName("B738")).toBe("Boeing 737-800");
    expect(aircraftTypeName("B38M")).toBe("Boeing 737 MAX 8");
    expect(aircraftTypeName("A21N")).toBe("Airbus A321neo");
    expect(aircraftTypeName("C172")).toBe("Cessna 172 Skyhawk");
    expect(aircraftTypeName("CRJ9")).toBe("Bombardier CRJ-900");
    expect(aircraftTypeName("H60")).toContain("H-60");
  });
  it("is case-insensitive and trims", () => {
    expect(aircraftTypeName(" b738 ")).toBe("Boeing 737-800");
  });
  it("returns null for unknown, empty and placeholder codes", () => {
    expect(aircraftTypeName("ZZZZ")).toBeNull();
    expect(aircraftTypeName("Unknown")).toBeNull();
    expect(aircraftTypeName("GND")).toBeNull();
    expect(aircraftTypeName("")).toBeNull();
    expect(aircraftTypeName(null)).toBeNull();
    expect(aircraftTypeName(undefined)).toBeNull();
  });
});
