import { describe, it, expect } from "vitest";
import {
  ALERT_COOLDOWN_MS,
  CAP_MESSAGE,
  MAX_ACTIVE_ALERT_RULES,
  MAX_ACTIVE_ALERT_RULES_PRO,
  activeCapReached,
  alertCapForTier,
  capMessage,
  decideAfterCheck,
  isRuleDue,
  validateChannels,
  validateCondition,
  type EpisodeState,
} from "./logic";

describe("validateCondition", () => {
  it("accepts and normalises a plain-language condition", () => {
    expect(validateCondition("  snow   on the road ")).toEqual({ ok: true, value: "snow on the road" });
  });
  it("refuses too-short, too-long and non-string conditions", () => {
    expect(validateCondition("no").ok).toBe(false);
    expect(validateCondition("x".repeat(141)).ok).toBe(false);
    expect(validateCondition(42).ok).toBe(false);
    expect(validateCondition(undefined).ok).toBe(false);
  });
});

describe("validateChannels", () => {
  it("defaults both channels on", () => {
    expect(validateChannels({})).toEqual({ ok: true, emailEnabled: true, inAppEnabled: true });
  });
  it("refuses a rule that could never notify", () => {
    expect(validateChannels({ emailEnabled: false, inAppEnabled: false }).ok).toBe(false);
    expect(validateChannels({ emailEnabled: false })).toEqual({
      ok: true,
      emailEnabled: false,
      inAppEnabled: true,
    });
  });
});

describe("the caps", () => {
  it("maps tiers to their active-rule caps: free 0, pro 2, vip 10", () => {
    expect(alertCapForTier("free")).toBe(0);
    expect(alertCapForTier("pro")).toBe(MAX_ACTIVE_ALERT_RULES_PRO);
    expect(alertCapForTier("vip")).toBe(MAX_ACTIVE_ALERT_RULES);
    expect(MAX_ACTIVE_ALERT_RULES_PRO).toBe(2);
    expect(MAX_ACTIVE_ALERT_RULES).toBe(10);
  });
  it("allows up to the cap and refuses the next one (default cap = VIP)", () => {
    expect(activeCapReached(MAX_ACTIVE_ALERT_RULES - 1)).toBe(false);
    expect(activeCapReached(MAX_ACTIVE_ALERT_RULES)).toBe(true);
    expect(activeCapReached(MAX_ACTIVE_ALERT_RULES + 3)).toBe(true);
  });
  it("applies the caller's own cap when one is passed", () => {
    expect(activeCapReached(1, 2)).toBe(false);
    expect(activeCapReached(2, 2)).toBe(true);
    // A downgraded VIP→Pro member holding 5 rules is over the Pro cap:
    // creating/resuming stays refused until they're back under it.
    expect(activeCapReached(5, 2)).toBe(true);
    // Free (cap 0) can never create or resume.
    expect(activeCapReached(0, 0)).toBe(true);
  });
  it("writes one refusal per tier, with the VIP upsell only on Pro", () => {
    expect(capMessage(2, "pro")).toContain("your 2-camera alert limit on Pro");
    expect(capMessage(2, "pro")).toContain("VIP Pro watches up to 10");
    expect(capMessage(10, "vip")).toBe(CAP_MESSAGE);
    expect(capMessage(10, "vip")).not.toContain("VIP Pro watches up to");
    expect(capMessage(0, "free")).toContain("free plan");
  });
});

describe("isRuleDue", () => {
  const now = Date.parse("2026-10-20T12:00:00Z");
  it("never-checked active rules are due; paused rules never are", () => {
    expect(isRuleDue({ active: true, lastCheckedAt: null }, now)).toBe(true);
    expect(isRuleDue({ active: false, lastCheckedAt: null }, now)).toBe(false);
  });
  it("respects the 15-minute window", () => {
    expect(isRuleDue({ active: true, lastCheckedAt: new Date(now - 5 * 60_000) }, now)).toBe(false);
    expect(isRuleDue({ active: true, lastCheckedAt: new Date(now - 16 * 60_000) }, now)).toBe(true);
  });
});

describe("decideAfterCheck — alert on change, with cooldown", () => {
  const t0 = new Date("2026-10-20T12:00:00Z");
  const fresh: EpisodeState = { matchNotified: false, lastAlertedAt: null };

  it("clear → matches alerts and marks the episode notified", () => {
    const d = decideAfterCheck(fresh, "matches", t0);
    expect(d.notify).toBe(true);
    expect(d.matchNotified).toBe(true);
    expect(d.lastAlertedAt).toEqual(t0);
    expect(d.lastVerdict).toBe("matches");
  });

  it("matches → matches does not alert again", () => {
    const d = decideAfterCheck({ matchNotified: true, lastAlertedAt: t0 }, "matches", new Date(t0.getTime() + 15 * 60_000));
    expect(d.notify).toBe(false);
    expect(d.matchNotified).toBe(true);
  });

  it("matches → clear ends the episode", () => {
    const d = decideAfterCheck({ matchNotified: true, lastAlertedAt: t0 }, "clear", t0);
    expect(d.notify).toBe(false);
    expect(d.matchNotified).toBe(false);
    expect(d.lastAlertedAt).toEqual(t0);
  });

  it("match → clear → match inside the cooldown stays quiet but keeps the episode pending", () => {
    const after1h = new Date(t0.getTime() + 3600_000);
    const d = decideAfterCheck({ matchNotified: false, lastAlertedAt: t0 }, "matches", after1h);
    expect(d.notify).toBe(false);
    expect(d.matchNotified).toBe(false); // not swallowed — delivered once the cooldown passes
    expect(d.lastAlertedAt).toEqual(t0);
  });

  it("a still-matching rule alerts once the cooldown has passed", () => {
    const afterCooldown = new Date(t0.getTime() + ALERT_COOLDOWN_MS + 1000);
    const d = decideAfterCheck({ matchNotified: false, lastAlertedAt: t0 }, "matches", afterCooldown);
    expect(d.notify).toBe(true);
    expect(d.lastAlertedAt).toEqual(afterCooldown);
  });

  it("match → clear → match after the cooldown alerts again", () => {
    const later = new Date(t0.getTime() + ALERT_COOLDOWN_MS + 60_000);
    const d = decideAfterCheck({ matchNotified: false, lastAlertedAt: t0 }, "matches", later);
    expect(d.notify).toBe(true);
  });

  it("unknown never alerts and never disturbs the episode", () => {
    const midEpisode: EpisodeState = { matchNotified: true, lastAlertedAt: t0 };
    const d = decideAfterCheck(midEpisode, "unknown", new Date(t0.getTime() + 900_000));
    expect(d).toEqual({ notify: false, matchNotified: true, lastAlertedAt: t0, lastVerdict: "unknown" });
    const d2 = decideAfterCheck(fresh, "unknown", t0);
    expect(d2.notify).toBe(false);
    expect(d2.matchNotified).toBe(false);
  });

  it("clear never alerts", () => {
    expect(decideAfterCheck(fresh, "clear", t0).notify).toBe(false);
  });
});
