// Trialist engagement track tests (conversion lever #1). The trigger
// pins guard the cadence contract: the long track's three touches sit
// in wide disjoint age bands, the pre-charge recap owns (24h, 48h]
// before trial end on BOTH tracks (never the final 24h — the
// transactional trial-reminders email owns that), and the short
// (weekly) track gets the recap only. Template pins guard the honesty
// rules: every number in these emails arrives from the live Stripe
// price / the user's own measured activity — nothing is restated —
// and no copy ever implies the trial needs no card (trials are
// card-required; cancelling before the charge is the stated exit).
import { describe, it, expect } from "vitest";
import {
  trialTrackKind,
  trialDay1RecapDue,
  trialDay2CtaDue,
  trialDay5FeatureDue,
  trialPrechargeRecapDue,
} from "./triggers";

const NOW = new Date(Date.UTC(2026, 10, 6, 18, 0, 0)); // Nov 6 2026, 18:00 UTC
const H = 3600_000;
const D = 24 * H;
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const inMs = (ms: number) => new Date(NOW.getTime() + ms);
const SEC = (d: Date) => Math.floor(d.getTime() / 1000);

describe("trialTrackKind", () => {
  it("classifies the 3-day weekly trial as short and the 10-day trials as long", () => {
    const start = SEC(ago(1 * H));
    expect(trialTrackKind({ trialStartSec: start, trialEndSec: start + 3 * 86400 })).toBe("short");
    expect(trialTrackKind({ trialStartSec: start, trialEndSec: start + 10 * 86400 })).toBe("long");
  });
  it("puts the boundary at exactly 5 days of real span", () => {
    const start = SEC(ago(1 * H));
    expect(trialTrackKind({ trialStartSec: start, trialEndSec: start + 5 * 86400 })).toBe("short");
    expect(trialTrackKind({ trialStartSec: start, trialEndSec: start + 5 * 86400 + 3600 })).toBe("long");
  });
});

describe("trialDay1RecapDue (long track)", () => {
  const base = { stripeStatus: "trialing", track: "long" as const };
  it("is due inside [24h, 4d) of trial age", () => {
    expect(trialDay1RecapDue({ ...base, trialStart: ago(24 * H) }, NOW).due).toBe(true);
    expect(trialDay1RecapDue({ ...base, trialStart: ago(3 * D) }, NOW).due).toBe(true);
  });
  it("waits for the first full day and expires at 4 days", () => {
    expect(trialDay1RecapDue({ ...base, trialStart: ago(12 * H) }, NOW).reason).toBe("too_early");
    expect(trialDay1RecapDue({ ...base, trialStart: ago(4 * D) }, NOW).reason).toBe("too_old");
  });
  it("never fires on the short track or a non-trialing sub", () => {
    expect(
      trialDay1RecapDue({ stripeStatus: "trialing", track: "short", trialStart: ago(30 * H) }, NOW).reason,
    ).toBe("short_track");
    expect(
      trialDay1RecapDue({ stripeStatus: "active", track: "long", trialStart: ago(30 * H) }, NOW).reason,
    ).toBe("not_trialing");
  });
});

describe("trialDay2CtaDue (long track)", () => {
  const base = { stripeStatus: "trialing", track: "long" as const };
  it("is due inside [48h, 6d) of trial age", () => {
    expect(trialDay2CtaDue({ ...base, trialStart: ago(48 * H) }, NOW).due).toBe(true);
    expect(trialDay2CtaDue({ ...base, trialStart: ago(5 * D) }, NOW).due).toBe(true);
  });
  it("is disjoint from the day-1 band edges", () => {
    expect(trialDay2CtaDue({ ...base, trialStart: ago(47 * H) }, NOW).reason).toBe("too_early");
    expect(trialDay2CtaDue({ ...base, trialStart: ago(6 * D) }, NOW).reason).toBe("too_old");
  });
  it("never fires on the short track", () => {
    expect(
      trialDay2CtaDue({ stripeStatus: "trialing", track: "short", trialStart: ago(3 * D) }, NOW).reason,
    ).toBe("short_track");
  });
});

describe("trialDay5FeatureDue (long track)", () => {
  const base = { stripeStatus: "trialing", track: "long" as const };
  it("is due inside [5d, 8d) of trial age", () => {
    expect(trialDay5FeatureDue({ ...base, trialStart: ago(5 * D) }, NOW).due).toBe(true);
    expect(trialDay5FeatureDue({ ...base, trialStart: ago(7 * D) }, NOW).due).toBe(true);
  });
  it("stays out of the day-2 band and closes before the pre-charge window", () => {
    expect(trialDay5FeatureDue({ ...base, trialStart: ago(4 * D) }, NOW).reason).toBe("too_early");
    expect(trialDay5FeatureDue({ ...base, trialStart: ago(8 * D) }, NOW).reason).toBe("too_old");
  });
  it("never fires on the short track or a non-trialing sub", () => {
    expect(
      trialDay5FeatureDue({ stripeStatus: "trialing", track: "short", trialStart: ago(6 * D) }, NOW).reason,
    ).toBe("short_track");
    expect(
      trialDay5FeatureDue({ stripeStatus: "canceled", track: "long", trialStart: ago(6 * D) }, NOW).reason,
    ).toBe("not_trialing");
  });
});

describe("trialPrechargeRecapDue (long track)", () => {
  const base = { stripeStatus: "trialing", track: "long" as const, trialStart: ago(8 * D) };
  it("is due when the trial ends in (24h, 48h]", () => {
    expect(trialPrechargeRecapDue({ ...base, trialEnd: inMs(36 * H) }, NOW).due).toBe(true);
    expect(trialPrechargeRecapDue({ ...base, trialEnd: inMs(48 * H) }, NOW).due).toBe(true);
    expect(trialPrechargeRecapDue({ ...base, trialEnd: inMs(25 * H) }, NOW).due).toBe(true);
  });
  it("never enters the final 24h (trial-reminders owns it) and waits before 48h", () => {
    expect(trialPrechargeRecapDue({ ...base, trialEnd: inMs(24 * H) }, NOW).reason).toBe("ending_too_soon");
    expect(trialPrechargeRecapDue({ ...base, trialEnd: inMs(12 * H) }, NOW).reason).toBe("ending_too_soon");
    expect(trialPrechargeRecapDue({ ...base, trialEnd: inMs(72 * H) }, NOW).reason).toBe("too_early");
  });
  it("never fires on a non-trialing sub", () => {
    expect(
      trialPrechargeRecapDue(
        { stripeStatus: "active", track: "long", trialStart: ago(8 * D), trialEnd: inMs(36 * H) },
        NOW,
      ).reason,
    ).toBe("not_trialing");
  });
});

describe("trialPrechargeRecapDue (short track — the only weekly touch)", () => {
  it("is due mid-final-day: age ≥48h with 6–48h of trial left", () => {
    // A 3-day trial at age 50h has 22h left.
    expect(
      trialPrechargeRecapDue(
        { stripeStatus: "trialing", track: "short", trialStart: ago(50 * H), trialEnd: inMs(22 * H) },
        NOW,
      ).due,
    ).toBe(true);
    // Age 65h, 7h left — still inside the gate.
    expect(
      trialPrechargeRecapDue(
        { stripeStatus: "trialing", track: "short", trialStart: ago(65 * H), trialEnd: inMs(7 * H) },
        NOW,
      ).due,
    ).toBe(true);
  });
  it("waits until the trial is 48h old even when the end is near", () => {
    expect(
      trialPrechargeRecapDue(
        { stripeStatus: "trialing", track: "short", trialStart: ago(30 * H), trialEnd: inMs(42 * H) },
        NOW,
      ).reason,
    ).toBe("too_early");
  });
  it("stays out of the last 6 hours", () => {
    expect(
      trialPrechargeRecapDue(
        { stripeStatus: "trialing", track: "short", trialStart: ago(70 * H), trialEnd: inMs(2 * H) },
        NOW,
      ).reason,
    ).toBe("ending_too_soon");
  });
});
