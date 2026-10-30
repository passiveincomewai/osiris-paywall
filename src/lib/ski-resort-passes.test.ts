import { describe, expect, it } from "vitest";
import { SKI_RESORTS } from "@/lib/ski-resorts";
import {
  SKI_PASS_NAMES,
  parseSkiPassParam,
  passesForResort,
  resortCountForPass,
  resortSlugsWithPasses,
} from "./ski-resort-passes";
import passesJson from "@/data/ski-resort-passes.json";

const RESORT_SLUGS = new Set(SKI_RESORTS.map((r) => r.slug));
const RAW = passesJson as Record<string, string[]>;

describe("ski-resort-passes data", () => {
  it("only references real resort slugs", () => {
    for (const slug of Object.keys(RAW)) {
      expect(RESORT_SLUGS.has(slug), slug).toBe(true);
    }
  });

  it("only uses the four known pass names, with no duplicates", () => {
    for (const [slug, list] of Object.entries(RAW)) {
      expect(list.length, slug).toBeGreaterThan(0);
      expect(new Set(list).size, slug).toBe(list.length);
      for (const name of list) {
        expect(SKI_PASS_NAMES, `${slug}: ${name}`).toContain(name);
      }
    }
  });
});

describe("passesForResort", () => {
  it("returns passes in canonical order", () => {
    expect(passesForResort("niseko")).toEqual(["Ikon Pass", "Mountain Collective"]);
    expect(passesForResort("snowbasin")).toEqual(["Ikon Pass", "Mountain Collective"]);
  });

  it("spot-checks documented affiliations", () => {
    expect(passesForResort("vail")).toEqual(["Epic Pass"]);
    expect(passesForResort("whistler-blackcomb")).toEqual(["Epic Pass"]);
    expect(passesForResort("telluride")).toEqual(["Epic Pass"]);
    expect(passesForResort("st-anton-am-arlberg")).toEqual(["Epic Pass"]);
    expect(passesForResort("jay-peak")).toEqual(["Indy Pass"]);
    expect(passesForResort("sugar-bowl")).toEqual(["Mountain Collective"]);
    // Snowbasin left the Epic programme after 2021/22 — must not reappear.
    expect(passesForResort("snowbasin")).not.toContain("Epic Pass");
    // Granite Peak is on Ikon's current published list.
    expect(passesForResort("granite-peak")).toEqual(["Ikon Pass"]);
  });

  it("returns [] for resorts with no documented affiliation", () => {
    expect(passesForResort("bogus-basin")).toEqual([]);
    expect(passesForResort("no-such-resort")).toEqual([]);
  });

  it("covers a substantial share of the directory", () => {
    expect(resortSlugsWithPasses().length).toBeGreaterThanOrEqual(60);
    for (const name of SKI_PASS_NAMES) {
      expect(resortCountForPass(name), name).toBeGreaterThan(0);
    }
  });
});

describe("parseSkiPassParam", () => {
  it("accepts the exact canonical names (the sidebar's own links)", () => {
    for (const name of SKI_PASS_NAMES) {
      expect(parseSkiPassParam(name), name).toBe(name);
    }
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(parseSkiPassParam("ikon pass")).toBe("Ikon Pass");
    expect(parseSkiPassParam("IKON PASS")).toBe("Ikon Pass");
    expect(parseSkiPassParam(" epic pass ")).toBe("Epic Pass");
    expect(parseSkiPassParam("MOUNTAIN COLLECTIVE")).toBe("Mountain Collective");
    expect(parseSkiPassParam("indy pass")).toBe("Indy Pass");
  });

  it("accepts unambiguous short forms", () => {
    expect(parseSkiPassParam("ikon")).toBe("Ikon Pass");
    expect(parseSkiPassParam("Ikon")).toBe("Ikon Pass");
    expect(parseSkiPassParam("epic")).toBe("Epic Pass");
    expect(parseSkiPassParam("EPIC")).toBe("Epic Pass");
    expect(parseSkiPassParam("indy")).toBe("Indy Pass");
    expect(parseSkiPassParam("collective")).toBe("Mountain Collective");
  });

  it("rejects generic or unknown values so the hub stays unfiltered", () => {
    expect(parseSkiPassParam("mountain")).toBeNull();
    expect(parseSkiPassParam("pass")).toBeNull();
    expect(parseSkiPassParam("none")).toBeNull();
    expect(parseSkiPassParam("season pass")).toBeNull();
    expect(parseSkiPassParam("")).toBeNull();
    expect(parseSkiPassParam("   ")).toBeNull();
    expect(parseSkiPassParam(undefined)).toBeNull();
    expect(parseSkiPassParam(null)).toBeNull();
  });
});
