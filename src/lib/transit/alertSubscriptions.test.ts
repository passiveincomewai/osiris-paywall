import { describe, expect, it } from "vitest";
import {
  FREE_ALERT_EMAIL_LIMIT,
  alertLedgerKey,
  decideAlertSend,
  formatAlertPeriod,
  isAlertEmailable,
  normalizeMbtaAlert,
  pendingAlerts,
  transitAlertSignupUrl,
  transitAlertUnsubscribeUrl,
  transitRouteUrl,
  type NormalizedAlert,
} from "./alertSubscriptions";

const NOW = new Date("2026-10-29T18:00:00Z");

function rawAlert(over: Record<string, unknown> = {}) {
  return {
    id: "12345",
    type: "alert",
    attributes: {
      header: "Orange Line: Delays of up to 10 minutes due to a signal problem.",
      description: "Affected stops:\nPark Street",
      effect: "DELAY",
      severity: 7,
      updated_at: "2026-10-29T17:30:00-04:00",
      active_period: [{ start: "2026-10-29T17:00:00-04:00", end: null }],
      ...over,
    },
  };
}

function norm(over: Record<string, unknown> = {}): NormalizedAlert {
  const a = normalizeMbtaAlert(rawAlert(over));
  if (!a) throw new Error("fixture did not normalize");
  return a;
}

describe("normalizeMbtaAlert", () => {
  it("normalizes a full MBTA v3 resource", () => {
    const a = norm();
    expect(a.id).toBe("12345");
    expect(a.header).toContain("Orange Line");
    expect(a.effect).toBe("DELAY");
    expect(a.severity).toBe(7);
    expect(a.updatedAt.toISOString()).toBe("2026-10-29T21:30:00.000Z");
    expect(a.periods).toHaveLength(1);
    expect(a.periods[0]!.end).toBeNull();
  });

  it("rejects an alert with no header (nothing honest to email)", () => {
    expect(normalizeMbtaAlert(rawAlert({ header: "  " }))).toBeNull();
    expect(normalizeMbtaAlert(rawAlert({ header: undefined }))).toBeNull();
  });

  it("rejects an alert with no usable updated_at (cannot dedupe)", () => {
    expect(normalizeMbtaAlert(rawAlert({ updated_at: undefined }))).toBeNull();
    expect(normalizeMbtaAlert(rawAlert({ updated_at: "not a date" }))).toBeNull();
  });

  it("rejects non-objects", () => {
    expect(normalizeMbtaAlert(null)).toBeNull();
    expect(normalizeMbtaAlert("alert")).toBeNull();
  });
});

describe("isAlertEmailable", () => {
  it("treats an alert with no stated window as active", () => {
    expect(isAlertEmailable(norm({ active_period: [] }), NOW)).toBe(true);
  });

  it("treats an open-ended window as active", () => {
    expect(isAlertEmailable(norm(), NOW)).toBe(true);
  });

  it("treats a window ending in the future as active", () => {
    const a = norm({
      active_period: [
        { start: "2026-10-30T08:00:00-04:00", end: "2026-10-30T20:00:00-04:00" },
      ],
    });
    expect(isAlertEmailable(a, NOW)).toBe(true);
  });

  it("drops a fully expired alert", () => {
    const a = norm({
      active_period: [
        { start: "2026-10-28T08:00:00-04:00", end: "2026-10-28T20:00:00-04:00" },
      ],
    });
    expect(isAlertEmailable(a, NOW)).toBe(false);
  });

  it("keeps an alert when any one window is still open", () => {
    const a = norm({
      active_period: [
        { start: "2026-10-28T08:00:00-04:00", end: "2026-10-28T20:00:00-04:00" },
        { start: "2026-10-29T08:00:00-04:00", end: null },
      ],
    });
    expect(isAlertEmailable(a, NOW)).toBe(true);
  });
});

describe("pendingAlerts — dedupe by alert id + updated_at", () => {
  it("returns everything when the ledger is empty", () => {
    expect(pendingAlerts([norm()], new Set(), NOW)).toHaveLength(1);
  });

  it("suppresses the exact version already sent", () => {
    const a = norm();
    const sent = new Set([alertLedgerKey(a)]);
    expect(pendingAlerts([a], sent, NOW)).toHaveLength(0);
  });

  it("re-sends when MBTA updates the same alert id", () => {
    const v1 = norm();
    const v2 = norm({ updated_at: "2026-10-29T17:45:00-04:00" });
    const sent = new Set([alertLedgerKey(v1)]);
    const out = pendingAlerts([v2], sent, NOW);
    expect(out).toHaveLength(1);
    expect(out[0]!.updatedAt.toISOString()).toBe("2026-10-29T21:45:00.000Z");
  });

  it("drops expired alerts even when never sent", () => {
    const a = norm({
      active_period: [
        { start: "2026-10-28T08:00:00-04:00", end: "2026-10-28T20:00:00-04:00" },
      ],
    });
    expect(pendingAlerts([a], new Set(), NOW)).toHaveLength(0);
  });
});

describe("decideAlertSend — the 5-free-alerts cap", () => {
  it("account holders are never capped", () => {
    expect(
      decideAlertSend({ alertsSent: 99, hasAccount: true, conversionEmailSent: true }),
    ).toEqual({ action: "send", finalFree: false });
  });

  it("non-accounts send freely below the cap", () => {
    for (const used of [0, 1, 2, 3]) {
      expect(
        decideAlertSend({ alertsSent: used, hasAccount: false, conversionEmailSent: false }),
      ).toEqual({ action: "send", finalFree: false });
    }
  });

  it("the 5th email is flagged as the final free one", () => {
    expect(
      decideAlertSend({
        alertsSent: FREE_ALERT_EMAIL_LIMIT - 1,
        hasAccount: false,
        conversionEmailSent: false,
      }),
    ).toEqual({ action: "send", finalFree: true });
  });

  it("at the cap, the next event converts — once", () => {
    expect(
      decideAlertSend({
        alertsSent: FREE_ALERT_EMAIL_LIMIT,
        hasAccount: false,
        conversionEmailSent: false,
      }),
    ).toEqual({ action: "convert" });
    expect(
      decideAlertSend({
        alertsSent: FREE_ALERT_EMAIL_LIMIT + 3,
        hasAccount: false,
        conversionEmailSent: false,
      }),
    ).toEqual({ action: "convert" });
  });

  it("after the conversion email, further events stay silent", () => {
    expect(
      decideAlertSend({
        alertsSent: FREE_ALERT_EMAIL_LIMIT,
        hasAccount: false,
        conversionEmailSent: true,
      }),
    ).toEqual({ action: "skip" });
  });
});

describe("urls", () => {
  it("builds the route page url", () => {
    expect(transitRouteUrl("mbta", "orange-orange-line")).toBe(
      "https://worldeye.app/transit/mbta/routes/orange-orange-line",
    );
  });

  it("builds the signup url with email prefill + route callback", () => {
    const u = new URL(
      transitAlertSignupUrl({
        email: "rider+test@example.com",
        agency: "mbta",
        routeSlug: "orange-orange-line",
      }),
    );
    expect(u.pathname).toBe("/signup");
    expect(u.searchParams.get("email")).toBe("rider+test@example.com");
    expect(u.searchParams.get("callbackUrl")).toBe(
      "/transit/mbta/routes/orange-orange-line",
    );
  });

  it("builds the unsubscribe url", () => {
    expect(transitAlertUnsubscribeUrl("tok 123")).toBe(
      "https://worldeye.app/api/transit/alert-subscriptions/unsubscribe?token=tok%20123",
    );
  });
});

describe("formatAlertPeriod", () => {
  it("renders an open-ended window as 'until further notice'", () => {
    const s = formatAlertPeriod(norm());
    expect(s).toContain("Oct 29, 2026");
    expect(s).toContain("until further notice");
  });

  it("renders a bounded window as a range", () => {
    const a = norm({
      active_period: [
        { start: "2026-10-30T08:00:00-04:00", end: "2026-10-30T20:00:00-04:00" },
      ],
    });
    const s = formatAlertPeriod(a);
    expect(s).toContain("Oct 30, 2026");
    expect(s).toContain("–");
    expect(s).not.toContain("further notice");
  });

  it("returns null when no window is stated", () => {
    expect(formatAlertPeriod(norm({ active_period: [] }))).toBeNull();
  });
});
