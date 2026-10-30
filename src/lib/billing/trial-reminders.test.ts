// Trial-reminder tests: this code decides who gets warned before real
// money moves, and what the warning says the charge will be. The
// selection window, the once-only rule, and every rendered figure are
// pinned here — a regression would either spam subscribers or let a
// first charge land unannounced.
import { describe, it, expect } from "vitest";
import {
  TRIAL_REMINDER_WINDOW_MS,
  TRIAL_REMINDER_METADATA_KEY,
  trialReminderDue,
  planByPriceIdFromEnv,
  formatMoney,
  describeStripePrice,
  formatTrialEnd,
} from "./trial-reminders";
import { trialEndingEmail } from "../email";

const NOW = Date.UTC(2026, 9, 20, 12, 0, 0); // Oct 20 2026, 12:00 UTC
const inHours = (h: number) => Math.floor((NOW + h * 3600_000) / 1000);

describe("trialReminderDue", () => {
  it("is due when a trialing sub ends inside the 24h window", () => {
    expect(
      trialReminderDue({ status: "trialing", trialEnd: inHours(12), metadata: {} }, NOW),
    ).toBe(true);
    expect(
      trialReminderDue({ status: "trialing", trialEnd: inHours(24), metadata: {} }, NOW),
    ).toBe(true);
  });

  it("is not due outside the window or after the trial ended", () => {
    expect(
      trialReminderDue(
        { status: "trialing", trialEnd: inHours(24) + 1, metadata: {} },
        NOW,
      ),
    ).toBe(false);
    expect(
      trialReminderDue({ status: "trialing", trialEnd: inHours(-1), metadata: {} }, NOW),
    ).toBe(false);
    expect(
      trialReminderDue({ status: "trialing", trialEnd: NOW / 1000, metadata: {} }, NOW),
    ).toBe(false);
  });

  it("never reminds twice — the metadata stamp is the once-only rule", () => {
    expect(
      trialReminderDue(
        {
          status: "trialing",
          trialEnd: inHours(6),
          metadata: { [TRIAL_REMINDER_METADATA_KEY]: "2026-10-20T00:00:00.000Z" },
        },
        NOW,
      ),
    ).toBe(false);
  });

  it("ignores non-trialing subs and missing trial ends", () => {
    expect(
      trialReminderDue({ status: "active", trialEnd: inHours(6), metadata: {} }, NOW),
    ).toBe(false);
    expect(
      trialReminderDue({ status: "trialing", trialEnd: null, metadata: {} }, NOW),
    ).toBe(false);
    expect(
      trialReminderDue({ status: "trialing", trialEnd: inHours(6), metadata: null }, NOW),
    ).toBe(true);
  });

  it("the window is exactly 24 hours", () => {
    expect(TRIAL_REMINDER_WINDOW_MS).toBe(24 * 3600_000);
  });
});

describe("formatMoney", () => {
  it("formats smallest-unit amounts per currency", () => {
    expect(formatMoney(1399, "usd")).toBe("$13.99");
    expect(formatMoney(7499, "USD")).toBe("$74.99");
    expect(formatMoney(1200, "jpy")).toBe("¥1,200");
    expect(formatMoney(0, "usd")).toBe("$0.00");
  });
});

describe("planByPriceIdFromEnv", () => {
  it("maps only the price ids that are set", () => {
    const map = planByPriceIdFromEnv({
      STRIPE_WEEKLY_PRICE_ID: "price_w",
      STRIPE_MONTHLY_PRICE_ID: "price_m",
      STRIPE_ANNUAL_PRICE_ID: undefined,
      STRIPE_ENTERPRISE_PRICE_ID: "",
    });
    expect(map.price_w).toBe("weekly");
    expect(map.price_m).toBe("monthly");
    // The central config it now delegates to also always knows the
    // Ambient fallback id and the literal legacy prices.
    expect(map["price_1UUxUnGfHuTnzrlHH0pNYhJU"]).toBe("ambient");
    expect(Object.keys(map)).toHaveLength(7);
  });

  it("Phase A: names the Lite/Ultra prices and the grandfathered prices", () => {
    const map = planByPriceIdFromEnv({
      STRIPE_LITE_WEEKLY_PRICE_ID: "price_lite_w",
      STRIPE_LITE_MONTHLY_PRICE_ID: "price_lite_m",
      STRIPE_LITE_ANNUAL_PRICE_ID: "price_lite_a",
      STRIPE_ULTRA_WEEKLY_PRICE_ID: "price_ultra_w",
      STRIPE_ULTRA_MONTHLY_PRICE_ID: "price_ultra_m",
      STRIPE_ULTRA_ANNUAL_PRICE_ID: "price_ultra_a",
    });
    expect(map.price_lite_w).toBe("lite_weekly");
    expect(map.price_lite_m).toBe("lite_monthly");
    expect(map.price_lite_a).toBe("lite_annual");
    expect(map.price_ultra_w).toBe("ultra_weekly");
    expect(map.price_ultra_m).toBe("ultra_monthly");
    expect(map.price_ultra_a).toBe("ultra_annual");
    // Grandfathered prices name as the Pro plans they have always been.
    expect(map["price_1UPH6KGfHuTnzrlHDBzDHobj"]).toBe("weekly");
    expect(map["price_1UPGwjGfHuTnzrlHwwU5k4WO"]).toBe("monthly");
    expect(map["price_1UPH7MGfHuTnzrlHxbGXji4K"]).toBe("annual");
  });

  it("Phase A: reminder labels name Lite/Ultra tiers", () => {
    const map = planByPriceIdFromEnv({
      STRIPE_LITE_MONTHLY_PRICE_ID: "price_lite_m",
      STRIPE_ULTRA_ANNUAL_PRICE_ID: "price_ultra_a",
    });
    const lite = describeStripePrice(
      { id: "price_lite_m", unit_amount: 899, currency: "usd", recurring: { interval: "month", interval_count: 1 } },
      map,
    );
    expect(lite.planLabel).toBe("Lite Monthly plan");
    expect(lite.chargeLabel).toBe("$8.99/month");
    const ultra = describeStripePrice(
      { id: "price_ultra_a", unit_amount: 14999, currency: "usd", recurring: { interval: "year", interval_count: 1 } },
      map,
    );
    expect(ultra.planLabel).toBe("Ultra Annual plan");
    expect(ultra.chargeLabel).toBe("$149.99/year");
  });
});

describe("describeStripePrice", () => {
  const envMap = { price_m: "monthly", price_a: "annual", price_w: "weekly" };

  it("names the plan from the env map and labels the charge by interval", () => {
    expect(
      describeStripePrice(
        { id: "price_m", unit_amount: 1399, currency: "usd", recurring: { interval: "month", interval_count: 1 } },
        envMap,
      ),
    ).toEqual({
      planLabel: "Monthly plan",
      amountLabel: "$13.99",
      chargeLabel: "$13.99/month",
      perMonthLabel: null,
    });
  });

  it("gives annual its honest per-month equivalent", () => {
    const d = describeStripePrice(
      { id: "price_a", unit_amount: 7499, currency: "usd", recurring: { interval: "year", interval_count: 1 } },
      envMap,
    );
    expect(d.planLabel).toBe("VIP Pro plan");
    expect(d.chargeLabel).toBe("$74.99/year");
    expect(d.perMonthLabel).toBe("$6.25/month");
  });

  it("falls back to the interval when the price id is unknown", () => {
    const d = describeStripePrice(
      { id: "price_unknown", unit_amount: 799, currency: "usd", recurring: { interval: "week", interval_count: 1 } },
      envMap,
    );
    expect(d.planLabel).toBe("Weekly plan");
    expect(d.chargeLabel).toBe("$7.99/week");
  });

  it("handles multi-interval billing and missing recurring info", () => {
    const d = describeStripePrice(
      { id: null, unit_amount: 2997, currency: "usd", recurring: { interval: "month", interval_count: 3 } },
      {},
    );
    expect(d.chargeLabel).toBe("$29.97 every 3 months");
    const bare = describeStripePrice({ id: null, unit_amount: 500, currency: "usd", recurring: null }, {});
    expect(bare.planLabel).toBe("Pro plan");
    expect(bare.chargeLabel).toBe("$5.00");
  });
});

describe("formatTrialEnd", () => {
  it("renders the exact UTC moment, labeled", () => {
    const sec = Math.floor(Date.UTC(2026, 9, 21, 15, 42) / 1000);
    const label = formatTrialEnd(sec);
    expect(label).toContain("October 21, 2026");
    expect(label).toContain("3:42 PM");
    expect(label.endsWith("UTC")).toBe(true);
  });
});

describe("trialEndingEmail", () => {
  const base = {
    planLabel: "Monthly plan",
    chargeLabel: "$13.99/month",
    perMonthLabel: null,
    endsOnLabel: "October 21, 2026 at 3:42 PM UTC",
    manageUrl: "https://worldeye.app/settings",
  };

  it("states the plan, the exact charge, the exact end, and the cancel path", () => {
    const { subject, html } = trialEndingEmail(base);
    expect(subject).toContain("trial is ending");
    expect(html).toContain("Monthly plan");
    expect(html).toContain("$13.99/month");
    expect(html).toContain("October 21, 2026 at 3:42 PM UTC");
    expect(html).toContain("Settings → Manage billing");
    expect(html).toContain("https://worldeye.app/settings");
    expect(html).toContain("you won't be charged");
  });

  it("states the 7-day first-charge money-back guarantee and the claim address", () => {
    const { html } = trialEndingEmail(base);
    expect(html).toContain("7-day money-back guarantee on your first charge");
    expect(html).toContain("within 7 days of the charge for a full refund, no questions asked");
    expect(html).toContain("passiveincomewai@gmail.com");
  });

  it("adds the per-month equivalent only when one is supplied", () => {
    const withPm = trialEndingEmail({ ...base, planLabel: "VIP Pro plan", chargeLabel: "$74.99/year", perMonthLabel: "$6.25/month" });
    expect(withPm.html).toContain("that's $6.25/month, billed once a year");
    expect(trialEndingEmail(base).html).not.toContain("billed once a year");
  });
});
