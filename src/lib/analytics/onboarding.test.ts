import { describe, it, expect } from "vitest";
import { buildOnboardingReport, type PvRow, type SubRow } from "./onboarding";
import { COMP_PRICE_ID } from "@/lib/pro/comp";
import type { OnboardingFilters } from "./onboarding-types";

const T0 = new Date("2026-10-13T12:00:00.000Z").getTime();
const at = (sec: number, dayOffset = 0) => new Date(T0 + dayOffset * 86400_000 + sec * 1000);

let seq = 0;
function pv(partial: Partial<PvRow> & { sessionId: string }): PvRow {
  seq += 1;
  return {
    userId: null,
    path: "/",
    event: null,
    durationSec: null,
    utmSource: null,
    variant: null,
    device: null,
    createdAt: at(seq),
    ...partial,
  };
}
function ev(sessionId: string, event: string, sec: number, extra: Partial<PvRow> = {}): PvRow {
  return pv({ sessionId, event, createdAt: at(sec), ...extra });
}

const FILTERS: OnboardingFilters = {
  from: "2026-10-12T00:00:00.000Z",
  to: "2026-10-15T00:00:00.000Z",
  preset: "custom",
  source: null,
  landing: null,
  device: null,
};

function fixtureRows(): PvRow[] {
  seq = 0;
  return [
    // ── b-complete: full tour, camera, globe, pricing. user u-buyer. ──
    pv({ sessionId: "b-complete", userId: "u-buyer", variant: "B", device: "mobile", utmSource: "ig", durationSec: 120, createdAt: at(0) }),
    ev("b-complete", "globe_reached", 5),
    ev("b-complete", "onboarding_impression", 10),
    ev("b-complete", "onboarding_start", 20),
    ev("b-complete", "onboarding_step_complete:1", 40),
    ev("b-complete", "onboarding_step_complete:2", 60),
    ev("b-complete", "camera_open", 65),
    ev("b-complete", "onboarding_step_complete:3", 90),
    ev("b-complete", "onboarding_step_complete:4", 120),
    ev("b-complete", "onboarding_step_complete:5", 150),
    ev("b-complete", "onboarding_step_complete:6", 180),
    ev("b-complete", "onboarding_complete", 260),
    pv({ sessionId: "b-complete", userId: "u-buyer", path: "/pricing", durationSec: 30, createdAt: at(300) }),

    // ── b-drop: starts, completes steps 1–2, drops off at step 3.
    //    Variant stamped ONLY on the start event row. ──
    pv({ sessionId: "b-drop", device: "desktop", utmSource: "ig", durationSec: 60, createdAt: at(0) }),
    ev("b-drop", "onboarding_impression", 5),
    ev("b-drop", "onboarding_start", 10, { variant: "B" }),
    ev("b-drop", "onboarding_step_complete:1", 30),
    ev("b-drop", "onboarding_step_complete:2", 50),
    ev("b-drop", "onboarding_dropoff:3", 100),

    // ── b-skip: skips step 1, dismisses. ──
    pv({ sessionId: "b-skip", variant: "B", device: "mobile", durationSec: 20, createdAt: at(0) }),
    ev("b-skip", "onboarding_impression", 5),
    ev("b-skip", "onboarding_start", 10),
    ev("b-skip", "onboarding_step_skip:1", 20),
    ev("b-skip", "onboarding_dismiss", 55),

    // ── b-imp: impression only. ──
    pv({ sessionId: "b-imp", variant: "B", device: "tablet", durationSec: 10, createdAt: at(0) }),
    ev("b-imp", "onboarding_impression", 5),

    // ── a-plain: group A power user, no onboarding events. ──
    pv({ sessionId: "a-plain", variant: "A", device: "desktop", utmSource: "ig", durationSec: 200, createdAt: at(0) }),
    ev("a-plain", "globe_reached", 10),
    ev("a-plain", "camera_open", 20),
    ev("a-plain", "feature_first_use:flight", 30),
    pv({ sessionId: "a-plain", path: "/pricing", durationSec: 0, createdAt: at(400) }),

    // ── a-ret: same signed-in user on two different days. ──
    pv({ sessionId: "a-ret-d1", userId: "u-ret", variant: "A", device: "mobile", durationSec: 15, createdAt: at(0) }),
    pv({ sessionId: "a-ret-d2", userId: "u-ret", variant: "A", device: "mobile", durationSec: 25, createdAt: at(0, 1) }),

    // ── legacy: pre-column row, everything null. ──
    pv({ sessionId: "legacy", durationSec: 5, createdAt: at(0) }),
  ];
}

function fixtureSubs(): SubRow[] {
  return [
    { userId: "u-buyer", status: "trialing", stripePriceId: "price_real_monthly", createdAt: at(1000) },
    { userId: "u-buyer", status: "active", stripePriceId: "price_real_monthly", createdAt: at(1000) },
    { userId: "u-other", status: "active", stripePriceId: "price_real_annual", createdAt: at(1000) },
    { userId: "u-comp", status: "active", stripePriceId: COMP_PRICE_ID, createdAt: at(1000) },
  ];
}

describe("buildOnboardingReport — tour totals", () => {
  const report = buildOnboardingReport({ rows: fixtureRows(), subs: fixtureSubs(), filters: FILTERS });

  it("counts distinct sessions, never raw rows", () => {
    expect(report.totals.sessions).toBe(8);
    expect(report.totals.impressions).toBe(4);
    expect(report.totals.starts).toBe(3);
    expect(report.totals.startRate).toBeCloseTo(3 / 4);
    expect(report.totals.completions).toBe(1);
    expect(report.totals.completionRate).toBeCloseTo(1 / 3);
    expect(report.totals.dismissals).toBe(1);
    expect(report.totals.skipSessions).toBe(1);
    expect(report.totals.skipRate).toBeCloseTo(1 / 3);
    expect(report.hasOnboardingData).toBe(true);
  });

  it("derives time-in-tutorial from event timestamps (start → complete/dismiss/last event)", () => {
    // spans: complete=240s (20→260), drop=90s (10→100), skip=45s (10→55)
    expect(report.totals.timedTutorialSessions).toBe(3);
    expect(report.totals.medianTimeInTutorialSec).toBe(90);
    expect(report.totals.avgTimeInTutorialSec).toBeCloseTo(125);
  });
});

describe("buildOnboardingReport — steps", () => {
  const report = buildOnboardingReport({ rows: fixtureRows(), subs: fixtureSubs(), filters: FILTERS });
  const byStep = Object.fromEntries(report.steps.map((s) => [s.step, s]));

  it("tracks completion / skip / reach per step", () => {
    expect(byStep[1]).toMatchObject({ completed: 2, skipped: 1, reached: 3 });
    expect(byStep[2]).toMatchObject({ completed: 2, skipped: 0, reached: 2 });
    expect(byStep[3]).toMatchObject({ completed: 1, reached: 2 });
    expect(byStep[6]).toMatchObject({ completed: 1, reached: 1 });
  });

  it("attributes drop-off to the explicit dropoff step, else the last touched step", () => {
    expect(byStep[3].droppedOff).toBe(1); // b-drop, explicit onboarding_dropoff:3
    expect(byStep[1].droppedOff).toBe(1); // b-skip, inferred (touched only step 1)
    expect(byStep[2].droppedOff).toBe(0);
  });
});

describe("buildOnboardingReport — funnel, firsts, subscriptions", () => {
  const report = buildOnboardingReport({ rows: fixtureRows(), subs: fixtureSubs(), filters: FILTERS });

  it("builds the funnel in spec order with honest notes on subscription steps", () => {
    const f = Object.fromEntries(report.funnel.map((s) => [s.key, s]));
    expect(f.visitor.count).toBe(8);
    expect(f.tour_started.count).toBe(3);
    expect(f.first_feature.count).toBe(2);
    expect(f.tour_completed.count).toBe(1);
    expect(f.pro_viewed.count).toBe(2);
    expect(f.trial_started.count).toBe(1);
    expect(f.purchased.count).toBe(2);
    expect(f.trial_started.note).toContain("site-wide");
    expect(f.visitor.pctFromPrevious).toBeNull();
    expect(f.tour_started.pctFromPrevious).toBeCloseTo(3 / 8);
  });

  it("counts first-use milestones", () => {
    expect(report.firsts).toEqual({ globe: 2, camera: 2, flight: 1, satellite: 0, layer: 0 });
  });

  it("counts trials/paid site-wide, excludes comp, attributes via signed-in match", () => {
    expect(report.subscriptions.trialsStarted).toBe(1);
    expect(report.subscriptions.trialsAttributed).toBe(1); // u-buyer completed the tour
    expect(report.subscriptions.paidStarted).toBe(2); // comp row excluded
    expect(report.subscriptions.paidAttributed).toBe(1);
  });

  it("splits pricing visits by onboarding status", () => {
    const byKey = Object.fromEntries(report.pricingByStatus.map((p) => [p.key, p.sessions]));
    expect(byKey.completed).toBe(1);
    expect(byKey.never_offered).toBe(1);
    expect(byKey.skipped).toBe(0);
    expect(byKey.exposed).toBe(0);
  });
});

describe("buildOnboardingReport — durations, variants, returns", () => {
  const report = buildOnboardingReport({ rows: fixtureRows(), subs: fixtureSubs(), filters: FILTERS });

  it("computes session duration by status bucket", () => {
    const byKey = Object.fromEntries(report.durationsByStatus.map((d) => [d.key, d]));
    expect(byKey.completed).toMatchObject({ sessions: 1, avgSec: 150, medianSec: 150 });
    expect(byKey.skipped).toMatchObject({ sessions: 1, avgSec: 20 });
    expect(byKey.exposed).toMatchObject({ sessions: 2, avgSec: 35, medianSec: 35 });
    expect(byKey.never_offered).toMatchObject({ sessions: 4, avgSec: 61.25, medianSec: 20 });
  });

  it("resolves variant from any stamped row (even event-only) and flags small samples", () => {
    const v = Object.fromEntries(report.variants.map((r) => [r.variant, r]));
    expect(v.B.sessions).toBe(4); // includes b-drop (variant only on its start event)
    expect(v.A.sessions).toBe(3);
    expect(v.unknown.sessions).toBe(1);
    expect(v.A.activationRate).toBeCloseTo(1 / 3);
    expect(v.B.enoughData).toBe(false);
    expect(v.A.enoughData).toBe(false);
  });

  it("measures return visits for signed-in users across days", () => {
    expect(report.returns.signedInVisitors).toBe(2); // u-buyer, u-ret
    expect(report.returns.returningVisitors).toBe(1); // u-ret (2 days)
    expect(report.returns.rate).toBeCloseTo(0.5);
  });
});

describe("buildOnboardingReport — filters + empty state", () => {
  const rows = fixtureRows();
  const subs = fixtureSubs();

  it("filters sessions by traffic source", () => {
    const r = buildOnboardingReport({ rows, subs, filters: { ...FILTERS, source: "ig" } });
    expect(r.totals.sessions).toBe(3); // b-complete, b-drop, a-plain
    expect(r.availableSources).toEqual(["ig"]); // vocabulary is pre-filter
  });

  it("filters sessions by device class, keeping legacy rows as unknown", () => {
    const r = buildOnboardingReport({ rows, subs, filters: { ...FILTERS, device: "mobile" } });
    expect(r.totals.sessions).toBe(4); // b-complete, b-skip, a-ret-d1, a-ret-d2
    const unk = buildOnboardingReport({ rows, subs, filters: { ...FILTERS, device: "unknown" } });
    expect(unk.totals.sessions).toBe(1); // legacy only
  });

  it("reports an honest empty state before any onboarding events exist", () => {
    const plain = rows.filter((r) => !(r.event ?? "").startsWith("onboarding_"));
    const r = buildOnboardingReport({ rows: plain, subs: [], filters: FILTERS });
    expect(r.hasOnboardingData).toBe(false);
    expect(r.totals.startRate).toBeNull();
    expect(r.totals.completionRate).toBeNull();
    expect(r.totals.medianTimeInTutorialSec).toBeNull();
  });
});
