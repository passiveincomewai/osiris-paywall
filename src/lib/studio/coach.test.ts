import { describe, expect, it } from "vitest";
import { coachInsights, MIN_CLICKS_FOR_INSIGHT, type CreativeStats } from "./coach";

function c(partial: Partial<CreativeStats>): CreativeStats {
  return {
    creativeId: "v_1",
    title: "T",
    direction: "viral_remake",
    aspect: "9:16",
    clicks: 0,
    signups: 0,
    paid: 0,
    commissionCents: 0,
    ...partial,
  };
}

describe("coachInsights thresholds", () => {
  it("asks for data when empty or below the bar", () => {
    expect(coachInsights([])[0]).toMatch(/No repurposed creatives/);
    const few = coachInsights([c({ clicks: 12 })]);
    expect(few[0]).toMatch(/Not enough data yet/);
    expect(few[0]).toContain("12");
  });

  it("names the best converter with its measured numbers", () => {
    const out = coachInsights([
      c({ creativeId: "a", title: "Winner", clicks: 100, signups: 20, paid: 5, commissionCents: 700 }),
      c({ creativeId: "b", title: "Loser", clicks: 100, signups: 3, paid: 0 }),
    ]);
    expect(out[0]).toContain("Winner");
    expect(out[0]).toContain("100 clicks → 5 paying");
    expect(out[0]).toContain("$7.00");
  });

  it("flags high-click zero-signup creatives as a landing gap", () => {
    const out = coachInsights([c({ title: "Leaky", clicks: MIN_CLICKS_FOR_INSIGHT + 10, signups: 0, paid: 0 })]);
    expect(out.join(" ")).toContain("no signups");
    expect(out.join(" ")).toContain("Leaky");
  });

  it("detects an aspect pattern only with real bases on both sides", () => {
    const out = coachInsights([
      c({ creativeId: "a", aspect: "9:16", clicks: 100, signups: 10, paid: 10 }),
      c({ creativeId: "b", aspect: "16:9", clicks: 100, signups: 2, paid: 2 }),
    ]);
    expect(out.join(" ")).toContain("Format signal");
    expect(out.join(" ")).toContain("9:16");
  });

  it("never invents an insight when volume exists but no pattern clears the bar", () => {
    const out = coachInsights([c({ clicks: 40, signups: 2, paid: 0 })]);
    expect(out.length).toBeGreaterThan(0);
    expect(out.join(" ")).not.toContain("strongest");
  });
});
