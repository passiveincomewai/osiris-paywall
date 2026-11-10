/* Clarity insights parser: renders whatever numeric measures the export
   API returns, grouped and labelled; unusable payloads yield no cards
   (the page then shows its empty state instead of inventing numbers). */
import { describe, it, expect } from "vitest";
import { parseClarityInsights } from "./insights";

describe("parseClarityInsights", () => {
  it("flattens metric groups into labelled cards", () => {
    const cards = parseClarityInsights([
      {
        metricName: "Traffic",
        information: [{ totalSessionCount: 1234, distinctUserCount: 987 }],
      },
      {
        metricName: "RageClickCount",
        information: [{ sessionsCount: 12, sessionsInPercentage: 0.97 }],
      },
    ]);
    expect(cards).toContainEqual({ label: "Traffic · Total Session Count", value: "1,234" });
    expect(cards).toContainEqual({ label: "Rage clicks · Sessions Count", value: "12" });
  });

  it("humanises unknown metric and field names", () => {
    const cards = parseClarityInsights([
      { metricName: "SomeNewMetric", information: [{ widgetClicks: 3 }] },
    ]);
    expect(cards).toEqual([{ label: "Some New Metric · Widget Clicks", value: "3" }]);
  });

  it("skips dimension fields and non-numeric values", () => {
    const cards = parseClarityInsights([
      {
        metricName: "Traffic",
        information: [{ url: "https://worldeye.app/", totalSessionCount: 5, note: "x" }],
      },
    ]);
    expect(cards).toEqual([{ label: "Traffic · Total Session Count", value: "5" }]);
  });

  it("returns [] for garbage payloads", () => {
    expect(parseClarityInsights(null)).toEqual([]);
    expect(parseClarityInsights("nope")).toEqual([]);
    expect(parseClarityInsights(42)).toEqual([]);
    expect(parseClarityInsights([null, 7, "x"])).toEqual([]);
  });
});
