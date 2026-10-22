// Rights gate pins: only redistribution-cleared sources may reach an
// enterprise payload. Verdicts trace to the Stage A audit
// (worldeye-camera-expansion/AUDIT.md §3.4) and the family licensing
// registry (src/lib/camera-expansion/families.ts). Default is EXCLUDED.
import { describe, it, expect } from "vitest";
import { feedAttribution, feedEligibility, isFeedEligible } from "./rights";

describe("feedEligibility — direct agency sources", () => {
  it("clears US state DOT feeds (audit: open-data posture)", () => {
    for (const source of ["FDOT", "TxDOT", "GDOT", "UDOT", "Caltrans", "NCDOT", "ADOT", "NDOT"]) {
      expect(isFeedEligible({ source }), source).toBe(true);
    }
    expect(feedEligibility({ source: "FDOT" }).upstream).toContain("Florida");
  });

  it("clears US federal and Canadian government sources", () => {
    expect(isFeedEligible({ source: "FAA WeatherCams" })).toBe(true);
    expect(isFeedEligible({ source: "DriveBC" })).toBe(true);
    expect(isFeedEligible({ source: "Quebec 511" })).toBe(true);
    expect(isFeedEligible({ source: "City of Toronto" })).toBe(true);
  });

  it("clears the registry-backed national authorities", () => {
    for (const source of ["TfL", "DGT", "Trafikverket", "Fintraffic", "NZTA", "HK Transport Dept"]) {
      expect(isFeedEligible({ source }), source).toBe(true);
    }
  });

  it("excludes commercial networks and unreviewed scrapes, with reasons", () => {
    for (const source of ["SkylineWebcams", "Public Webcam", "YouTube", "CamStreamer", "APRR"]) {
      const v = feedEligibility({ source });
      expect(v.eligible, source).toBe(false);
      expect(v.basis.length).toBeGreaterThan(10);
    }
  });

  it("excludes unknown sources by default", () => {
    const v = feedEligibility({ source: "Some Random Webcam Host" });
    expect(v.eligible).toBe(false);
    expect(v.basis).toContain("excluded by default");
    expect(isFeedEligible({})).toBe(false);
    expect(isFeedEligible({ source: "" })).toBe(false);
  });
});

describe("feedEligibility — OpenCCTV families ride the licensing registry", () => {
  it("clears registry-clear families", () => {
    expect(isFeedEligible({ source: "OpenCCTV / alberta" })).toBe(true);
    expect(isFeedEligible({ source: "OpenCCTV / state511" })).toBe(true);
    expect(isFeedEligible({ source: "OpenCCTV / tfl" })).toBe(true);
    expect(feedEligibility({ source: "OpenCCTV / alberta" }).upstream).toContain("Alberta");
  });

  it("excludes registry-conditional families (terms unreviewed for redistribution)", () => {
    for (const family of ["twipcam", "ipcamlive", "osm-webcams", "camstreamer"]) {
      const v = feedEligibility({ source: `OpenCCTV / ${family}` });
      expect(v.eligible, family).toBe(false);
      expect(v.basis).toContain("CONDITIONAL");
    }
  });

  it("excludes registry-excluded families and anything Windy, structurally", () => {
    for (const family of ["windy", "windy-providers", "earthcam", "skylinewebcams", "weatherbug", "nexco-japan"]) {
      expect(isFeedEligible({ source: `OpenCCTV / ${family}` }), family).toBe(false);
    }
    expect(isFeedEligible({ source: "Windy Webcams" })).toBe(false);
    expect(feedEligibility({ source: "OpenCCTV / windy" }).basis).toContain("Windy");
  });

  it("excludes unknown families by default", () => {
    const v = feedEligibility({ source: "OpenCCTV / never-reviewed-family" });
    expect(v.eligible).toBe(false);
  });
});

describe("feedAttribution", () => {
  it("credits the operating agency via WorldEye", () => {
    expect(feedAttribution({ source: "FDOT" })).toBe(
      "Florida Department of Transportation via WorldEye",
    );
    expect(feedAttribution({ source: "OpenCCTV / virginia" })).toContain("Virginia DOT");
    expect(feedAttribution({ source: "OpenCCTV / virginia" })).toContain("via WorldEye");
  });
});
