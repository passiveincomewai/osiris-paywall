// Studio AI (Phase 3) unit tests: pure logic only — the monthly budget
// and per-user cap math (incl. month boundaries), pack-credit
// idempotency decisions, the internal-endpoint bearer guard, request
// validation + fulfillment spec house rules, staleness, and image
// sniffing. DB paths are exercised against staging; these tests pin the
// rules that guard Cosmo's capacity and the owner's money.
import { describe, it, expect } from "vitest";
import {
  DEFAULT_CREDIT_CONFIG,
  validateCreditConfig,
  type StudioCreditConfig,
} from "./credits-config";
import { evaluatePackCredit } from "./credits";
import {
  AI_JOB_STALE_MS,
  bearerMatches,
  buildAiJobParams,
  evaluateAiCharge,
  isStaleAiJob,
  sniffImageMime,
  sumAiMonthCredits,
} from "./ai";

function configWith(patch: Partial<StudioCreditConfig>): StudioCreditConfig {
  return { ...DEFAULT_CREDIT_CONFIG, ...patch };
}

const CTX = { referralLink: "https://worldeye.app/ref/abc123", discountCode: null };

describe("AI pricing config sanity", () => {
  it("the default config validates, with every AI kind priced and zero-cost", () => {
    expect(validateCreditConfig(DEFAULT_CREDIT_CONFIG)).toEqual({ ok: true });
    expect(DEFAULT_CREDIT_CONFIG.prices.ai_caption).toBe(2);
    expect(DEFAULT_CREDIT_CONFIG.prices.ai_hooks).toBe(3);
    expect(DEFAULT_CREDIT_CONFIG.prices.ai_script).toBe(5);
    expect(DEFAULT_CREDIT_CONFIG.prices.ai_video_ideas).toBe(3);
    expect(DEFAULT_CREDIT_CONFIG.prices.ai_background).toBe(10);
    expect(DEFAULT_CREDIT_CONFIG.prices.ai_image).toBe(15);
    expect(DEFAULT_CREDIT_CONFIG.monthlyAiBudgetUsd).toBe(200);
    expect(DEFAULT_CREDIT_CONFIG.aiUserMonthlyCapCredits).toBe(300);
  });

  it("the 2x safety rule still governs AI kinds if a real unit cost appears", () => {
    // ai_image retails at 15 credits = $1.50; a $1.00 unit cost needs $2.00.
    const cfg = configWith({
      providerUnitCostUsd: { ...DEFAULT_CREDIT_CONFIG.providerUnitCostUsd, ai_image: 1 },
    });
    const r = validateCreditConfig(cfg);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("ai_image");
  });

  it("rejects bad budget, cap, and pack definitions", () => {
    expect(validateCreditConfig(configWith({ monthlyAiBudgetUsd: -1 })).ok).toBe(false);
    expect(validateCreditConfig(configWith({ aiUserMonthlyCapCredits: 2.5 })).ok).toBe(false);
    const dup = configWith({
      creditPacks: [
        { id: "starter", name: "A", credits: 100, priceUsd: 9.99, priceEnv: "STRIPE_A", blurb: "" },
        { id: "starter", name: "B", credits: 200, priceUsd: 19.99, priceEnv: "STRIPE_B", blurb: "" },
      ],
    });
    expect(validateCreditConfig(dup).ok).toBe(false);
    const badEnv = configWith({
      creditPacks: [
        { id: "starter", name: "A", credits: 100, priceUsd: 9.99, priceEnv: "NOT_AN_ENV", blurb: "" },
      ],
    });
    expect(validateCreditConfig(badEnv).ok).toBe(false);
    const free = configWith({
      creditPacks: [
        { id: "starter", name: "A", credits: 0, priceUsd: 9.99, priceEnv: "STRIPE_A", blurb: "" },
      ],
    });
    expect(validateCreditConfig(free).ok).toBe(false);
  });

  it("ships the three owner-approved packs", () => {
    const packs = DEFAULT_CREDIT_CONFIG.creditPacks;
    expect(packs.map((p) => [p.id, p.credits, p.priceUsd])).toEqual([
      ["starter", 100, 9.99],
      ["creator", 300, 24.99],
      ["power", 1000, 69.99],
    ]);
    expect(packs.map((p) => p.priceEnv)).toEqual([
      "STRIPE_CREDIT_PACK_STARTER",
      "STRIPE_CREDIT_PACK_CREATOR",
      "STRIPE_CREDIT_PACK_POWER",
    ]);
  });
});

describe("sumAiMonthCredits", () => {
  const now = new Date("2026-10-12T12:00:00.000Z");
  const job = (over: Partial<{ kind: string; creditCost: number; status: string; createdAt: Date }>) => ({
    kind: "ai_caption",
    creditCost: 2,
    status: "queued",
    createdAt: new Date("2026-10-05T00:00:00.000Z"),
    ...over,
  });

  it("sums AI charges created in the current UTC month", () => {
    const jobs = [
      job({ creditCost: 2 }),
      job({ kind: "ai_image", creditCost: 15, status: "done" }),
      job({ kind: "ai_hooks", creditCost: 3, createdAt: new Date("2026-10-01T00:00:00.000Z") }),
    ];
    expect(sumAiMonthCredits(jobs, now)).toBe(20);
  });

  it("excludes other months at the boundaries", () => {
    const jobs = [
      job({ createdAt: new Date("2026-09-30T23:59:59.000Z") }),
      job({ createdAt: new Date("2026-11-01T00:00:00.000Z") }),
    ];
    expect(sumAiMonthCredits(jobs, now)).toBe(0);
    // First instant of the month counts.
    expect(
      sumAiMonthCredits([job({ createdAt: new Date("2026-10-01T00:00:00.000Z") })], now),
    ).toBe(2);
  });

  it("excludes refunded/failed jobs and non-AI kinds", () => {
    const jobs = [
      job({ status: "refunded" }),
      job({ status: "failed" }),
      job({ kind: "image_render", creditCost: 1 }),
      job({ kind: "video_personalize", creditCost: 25 }),
    ];
    expect(sumAiMonthCredits(jobs, now)).toBe(0);
  });
});

describe("evaluateAiCharge", () => {
  it("allows a charge under both caps", () => {
    expect(
      evaluateAiCharge({ globalMonthCredits: 100, userMonthCredits: 10, cost: 15, config: DEFAULT_CREDIT_CONFIG }),
    ).toEqual({ ok: true });
  });

  it("blocks when the projected month spend would exceed the $200 budget", () => {
    // 1990 credits = $199.00 at the $0.10 anchor; +15 credits = $200.50 > $200.
    expect(
      evaluateAiCharge({ globalMonthCredits: 1990, userMonthCredits: 0, cost: 15, config: DEFAULT_CREDIT_CONFIG }),
    ).toEqual({ ok: false, error: "ai_budget_exhausted" });
  });

  it("allows landing exactly on the budget", () => {
    // 1985 + 15 = 2000 credits = exactly $200.00.
    expect(
      evaluateAiCharge({ globalMonthCredits: 1985, userMonthCredits: 0, cost: 15, config: DEFAULT_CREDIT_CONFIG }),
    ).toEqual({ ok: true });
  });

  it("blocks at the per-user monthly cap and allows landing exactly on it", () => {
    expect(
      evaluateAiCharge({ globalMonthCredits: 0, userMonthCredits: 290, cost: 15, config: DEFAULT_CREDIT_CONFIG }),
    ).toEqual({ ok: false, error: "ai_user_cap" });
    expect(
      evaluateAiCharge({ globalMonthCredits: 0, userMonthCredits: 285, cost: 15, config: DEFAULT_CREDIT_CONFIG }),
    ).toEqual({ ok: true });
  });

  it("reports the global budget before the user cap", () => {
    expect(
      evaluateAiCharge({ globalMonthCredits: 1999, userMonthCredits: 299, cost: 15, config: DEFAULT_CREDIT_CONFIG }),
    ).toEqual({ ok: false, error: "ai_budget_exhausted" });
  });
});

describe("evaluatePackCredit (webhook idempotency)", () => {
  it("credits a purchase whose idempotency key has never been seen", () => {
    expect(evaluatePackCredit(false)).toBe("credit");
  });

  it("never credits a replayed purchase twice", () => {
    expect(evaluatePackCredit(true)).toBe("already_credited");
  });
});

describe("bearerMatches (internal queue guard)", () => {
  it("is false for everything when no secret is configured (routes 404)", () => {
    expect(bearerMatches(undefined, "Bearer anything")).toBe(false);
    expect(bearerMatches(undefined, null)).toBe(false);
    expect(bearerMatches("", "Bearer ")).toBe(false);
  });

  it("requires the exact Bearer header", () => {
    expect(bearerMatches("s3cret", "Bearer s3cret")).toBe(true);
    expect(bearerMatches("s3cret", "Bearer wrong")).toBe(false);
    expect(bearerMatches("s3cret", "s3cret")).toBe(false);
    expect(bearerMatches("s3cret", null)).toBe(false);
  });
});

describe("buildAiJobParams", () => {
  it("builds params with the deliverable, platform, and referral link", () => {
    const r = buildAiJobParams("ai_hooks", { subject: "Tokyo cameras", platform: "TikTok" }, CTX);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.params.platform).toBe("TikTok");
      expect(r.params.referralLink).toBe(CTX.referralLink);
      expect(r.params.spec).toContain("36,000+");
      expect(r.params.spec).toContain("exactly 10 hooks");
    }
  });

  it("encodes the Instagram caption house rule only for Instagram captions", () => {
    const ig = buildAiJobParams("ai_caption", { subject: "Storm cams", platform: "Instagram" }, CTX);
    expect(ig.ok).toBe(true);
    if (ig.ok) {
      expect(ig.params.spec).toContain("EXACTLY 5 hashtags");
      expect(ig.params.spec).toContain("TOP");
    }
    const tt = buildAiJobParams("ai_caption", { subject: "Storm cams", platform: "TikTok" }, CTX);
    expect(tt.ok).toBe(true);
    if (tt.ok) expect(tt.params.spec).not.toContain("EXACTLY 5 hashtags");
  });

  it("never invents a discount: no code in context, none promised in spec", () => {
    const r = buildAiJobParams("ai_caption", { subject: "x", platform: "X" }, CTX);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.params.spec).toContain("do NOT invent one");
    const withCode = buildAiJobParams(
      "ai_caption",
      { subject: "x", platform: "X" },
      { referralLink: CTX.referralLink, discountCode: "ALEX20" },
    );
    expect(withCode.ok).toBe(true);
    if (withCode.ok) expect(withCode.params.spec).toContain("ALEX20");
  });

  it("rejects empty/overlong subjects and unknown platforms", () => {
    expect(buildAiJobParams("ai_script", { subject: "  ", platform: "YouTube" }, CTX).ok).toBe(false);
    expect(
      buildAiJobParams("ai_script", { subject: "a".repeat(501), platform: "YouTube" }, CTX).ok,
    ).toBe(false);
    expect(buildAiJobParams("ai_script", { subject: "ok", platform: "MySpace" }, CTX).ok).toBe(false);
  });
});

describe("isStaleAiJob", () => {
  const now = new Date("2026-10-12T12:00:00.000Z");
  it("is stale only when queued for more than 7 days", () => {
    const old = new Date(now.getTime() - AI_JOB_STALE_MS - 1);
    const fresh = new Date(now.getTime() - AI_JOB_STALE_MS + 60_000);
    expect(isStaleAiJob({ status: "queued", createdAt: old }, now)).toBe(true);
    expect(isStaleAiJob({ status: "queued", createdAt: fresh }, now)).toBe(false);
    expect(isStaleAiJob({ status: "done", createdAt: old }, now)).toBe(false);
    expect(isStaleAiJob({ status: "refunded", createdAt: old }, now)).toBe(false);
  });
});

describe("sniffImageMime", () => {
  it("detects png/jpeg/webp from magic bytes and rejects the rest", () => {
    expect(sniffImageMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe("image/png");
    expect(sniffImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(
      sniffImageMime(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      ),
    ).toBe("image/webp");
    expect(sniffImageMime(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBeNull(); // GIF
    expect(sniffImageMime(new Uint8Array([]))).toBeNull();
  });
});
