// Studio credits unit tests: the pure decision logic only — config
// validation (incl. the 2× provider-cost safety rule), month math, debit
// planning, and settle decisions. DB-backed paths (transactions, ledger
// writes) are exercised against staging; these tests pin the rules that
// guard real money and must never regress.
import { describe, it, expect } from "vitest";
import {
  DEFAULT_CREDIT_CONFIG,
  validateCreditConfig,
  priceUsd,
  type StudioCreditConfig,
} from "./credits-config";
import { monthKeyOf, allowanceDue, planCharge, evaluateSettle } from "./credits";

type ConfigPatch = Omit<
  Partial<StudioCreditConfig>,
  "prices" | "providerUnitCostUsd" | "providersEnabled"
> & {
  prices?: Partial<StudioCreditConfig["prices"]>;
  providerUnitCostUsd?: Partial<StudioCreditConfig["providerUnitCostUsd"]>;
  providersEnabled?: Partial<StudioCreditConfig["providersEnabled"]>;
};

function configWith(patch: ConfigPatch): StudioCreditConfig {
  return {
    ...DEFAULT_CREDIT_CONFIG,
    ...patch,
    prices: { ...DEFAULT_CREDIT_CONFIG.prices, ...(patch.prices ?? {}) },
    providerUnitCostUsd: {
      ...DEFAULT_CREDIT_CONFIG.providerUnitCostUsd,
      ...(patch.providerUnitCostUsd ?? {}),
    },
    providersEnabled: {
      ...DEFAULT_CREDIT_CONFIG.providersEnabled,
      ...(patch.providersEnabled ?? {}),
    },
  };
}

describe("validateCreditConfig", () => {
  it("accepts the defaults", () => {
    expect(validateCreditConfig(DEFAULT_CREDIT_CONFIG)).toEqual({ ok: true });
    expect(priceUsd(DEFAULT_CREDIT_CONFIG, "video_personalize")).toBeCloseTo(2.5);
    expect(priceUsd(DEFAULT_CREDIT_CONFIG, "image_render")).toBeCloseTo(0.1);
  });

  it("trips the safety rule when the price is below 2x the provider unit cost", () => {
    // video_personalize retails at 25 credits = $2.50; a $3.00 unit cost
    // needs at least $6.00 of retail price.
    const cfg = configWith({ providerUnitCostUsd: { video_personalize: 3 } });
    const r = validateCreditConfig(cfg);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0]).toContain("video_personalize");
      expect(r.errors[0]).toContain("$2.50");
      expect(r.errors[0]).toContain("$3.00");
    }
  });

  it("passes the safety rule at exactly 2x the provider unit cost", () => {
    const cfg = configWith({ providerUnitCostUsd: { video_personalize: 1.25 } });
    expect(validateCreditConfig(cfg)).toEqual({ ok: true });
  });

  it("does not apply the safety rule to zero-cost kinds", () => {
    const cfg = configWith({ prices: { image_render: 0 } });
    expect(validateCreditConfig(cfg)).toEqual({ ok: true });
  });

  it("safetyOverride bypasses the safety rule", () => {
    const cfg = configWith({
      providerUnitCostUsd: { video_personalize: 3 },
      safetyOverride: true,
    });
    expect(validateCreditConfig(cfg)).toEqual({ ok: true });
  });

  it("rejects a negative price", () => {
    const r = validateCreditConfig(configWith({ prices: { image_render: -1 } }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("image_render");
  });

  it("rejects a non-integer price", () => {
    const r = validateCreditConfig(configWith({ prices: { video_template: 39.5 } }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("video_template");
  });

  it("rejects bad creditUsd, monthlyAllowance, and unit costs", () => {
    expect(validateCreditConfig(configWith({ creditUsd: 0 })).ok).toBe(false);
    expect(validateCreditConfig(configWith({ creditUsd: Number.NaN })).ok).toBe(false);
    expect(validateCreditConfig(configWith({ monthlyAllowance: -5 })).ok).toBe(false);
    expect(validateCreditConfig(configWith({ monthlyAllowance: 99.9 })).ok).toBe(false);
    expect(
      validateCreditConfig(configWith({ providerUnitCostUsd: { image_render: -0.5 } })).ok,
    ).toBe(false);
  });
});

describe("monthKeyOf", () => {
  it("formats the UTC year-month, zero-padded", () => {
    expect(monthKeyOf(new Date("2026-10-12T14:02:00.000Z"))).toBe("2026-10");
    expect(monthKeyOf(new Date("2026-01-05T00:00:00.000Z"))).toBe("2026-01");
    expect(monthKeyOf(new Date("2025-12-31T23:59:59.000Z"))).toBe("2025-12");
  });

  it("uses UTC, not local time, at month boundaries", () => {
    // 2026-11-01T00:30Z is still Oct 31 in US timezones.
    expect(monthKeyOf(new Date("2026-11-01T00:30:00.000Z"))).toBe("2026-11");
  });
});

describe("allowanceDue", () => {
  const now = new Date("2026-10-12T12:00:00.000Z");

  it("is due when there was never a grant", () => {
    expect(allowanceDue(null, now)).toBe(true);
  });

  it("is not due again in the same UTC month", () => {
    expect(allowanceDue(new Date("2026-10-01T00:00:00.000Z"), now)).toBe(false);
    expect(allowanceDue(new Date("2026-10-12T11:59:00.000Z"), now)).toBe(false);
  });

  it("is due when the last grant was in an earlier month", () => {
    expect(allowanceDue(new Date("2026-09-30T23:59:59.000Z"), now)).toBe(true);
    expect(allowanceDue(new Date("2025-12-15T00:00:00.000Z"), new Date("2026-01-01T00:00:00.000Z"))).toBe(true);
  });

  it("is not due when the last grant is dated in a future month", () => {
    expect(allowanceDue(new Date("2026-11-01T00:00:00.000Z"), now)).toBe(false);
  });
});

describe("planCharge", () => {
  it("debits when the balance covers the cost", () => {
    expect(planCharge(100, 25)).toEqual({ ok: true, balanceAfter: 75 });
  });

  it("allows spending the exact balance", () => {
    expect(planCharge(25, 25)).toEqual({ ok: true, balanceAfter: 0 });
  });

  it("allows a zero cost at a zero balance", () => {
    expect(planCharge(0, 0)).toEqual({ ok: true, balanceAfter: 0 });
  });

  it("returns the insufficient_credits shape when short", () => {
    expect(planCharge(10, 25)).toEqual({
      ok: false,
      error: "insufficient_credits",
      cost: 25,
      balance: 10,
    });
    expect(planCharge(0, 1).ok).toBe(false);
  });
});

describe("evaluateSettle", () => {
  it("settles a queued job on done", () => {
    expect(evaluateSettle("queued", "done")).toBe("settle_done");
    expect(evaluateSettle("running", "done")).toBe("settle_done");
  });

  it("refunds a queued job on failed", () => {
    expect(evaluateSettle("queued", "failed")).toBe("refund");
    expect(evaluateSettle("running", "failed")).toBe("refund");
  });

  it("is a noop for terminal jobs, whatever the outcome", () => {
    expect(evaluateSettle("done", "done")).toBe("noop");
    expect(evaluateSettle("done", "failed")).toBe("noop");
    expect(evaluateSettle("failed", "done")).toBe("noop");
    expect(evaluateSettle("failed", "failed")).toBe("noop");
    expect(evaluateSettle("refunded", "done")).toBe("noop");
    expect(evaluateSettle("refunded", "failed")).toBe("noop");
  });
});
