import { describe, it, expect } from "vitest";
import { parseTeaserConfig, getTeaserConfig, TEASER_EVENTS } from "./config";

describe("parseTeaserConfig", () => {
  it("is off when unset or empty", () => {
    expect(parseTeaserConfig(undefined)).toEqual({ enabled: false, enrollPct: 0 });
    expect(parseTeaserConfig(null)).toEqual({ enabled: false, enrollPct: 0 });
    expect(parseTeaserConfig("")).toEqual({ enabled: false, enrollPct: 0 });
    expect(parseTeaserConfig("   ")).toEqual({ enabled: false, enrollPct: 0 });
  });

  it("is off for explicit off values", () => {
    for (const v of ["off", "OFF", "0", "false", "False"]) {
      expect(parseTeaserConfig(v)).toEqual({ enabled: false, enrollPct: 0 });
    }
  });

  it("'on' enrolls everyone", () => {
    expect(parseTeaserConfig("on")).toEqual({ enabled: true, enrollPct: 100 });
    expect(parseTeaserConfig("ON")).toEqual({ enabled: true, enrollPct: 100 });
    expect(parseTeaserConfig("true")).toEqual({ enabled: true, enrollPct: 100 });
    expect(parseTeaserConfig("100")).toEqual({ enabled: true, enrollPct: 100 });
  });

  it("accepts an enrollment percentage", () => {
    expect(parseTeaserConfig("1")).toEqual({ enabled: true, enrollPct: 1 });
    expect(parseTeaserConfig("50")).toEqual({ enabled: true, enrollPct: 50 });
    expect(parseTeaserConfig(" 25 ")).toEqual({ enabled: true, enrollPct: 25 });
  });

  it("fails closed on anything unparseable or out of range", () => {
    for (const v of ["101", "-5", "abc", "50%", "0.5", "yes", "enabled", "1e2"]) {
      expect(parseTeaserConfig(v)).toEqual({ enabled: false, enrollPct: 0 });
    }
  });

  it("defaults off from the environment", () => {
    // The test environment never sets NEXT_PUBLIC_TEASER_TEST.
    expect(getTeaserConfig().enabled).toBe(false);
  });
});

describe("TEASER_EVENTS", () => {
  it("uses ingest-safe event names (detail token rules apply to details, names are snake_case)", () => {
    for (const name of Object.values(TEASER_EVENTS)) {
      expect(name).toMatch(/^[a-z0-9_]+$/);
    }
  });
});
