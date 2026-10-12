// ── Studio credits: pure configuration ──────────────────────────────────
// No DB imports — this module is safe to use from client-adjacent code,
// tests, and the settings/credits layers alike.
//
// Money model: 1 credit = CREDIT_USD dollars of retail value. Every
// generation kind has a fixed credit price; paid providers (video) also
// carry a real per-unit cost, and the safety rule in validateCreditConfig
// guarantees the retail price always covers at least 2× that cost unless
// an admin explicitly flips safetyOverride (which is audit-logged on save).

export type RenderKind = "image_render" | "video_personalize" | "video_template";

// Phase 3: AI kinds are fulfilled asynchronously by Cosmo (WorldEye's AI
// agent) from a job queue — there is no synchronous AI API behind them.
// Their provider unit cost is 0 by design (fulfilled in-house), so under
// the 2× safety rule every AI credit is margin; the monthly AI budget
// below is a workload/capacity cap expressed in dollars, not a cost.
export const AI_KINDS = [
  "ai_caption",
  "ai_hooks",
  "ai_script",
  "ai_video_ideas",
  "ai_image",
  "ai_background",
] as const;

export type AiKind = (typeof AI_KINDS)[number];

export type CreditKind = RenderKind | AiKind;

export const CREDIT_KINDS: readonly CreditKind[] = [
  "image_render",
  "video_personalize",
  "video_template",
  ...AI_KINDS,
] as const;

export function isAiKind(kind: string): kind is AiKind {
  return (AI_KINDS as readonly string[]).includes(kind);
}

export interface AiKindMeta {
  label: string;
  /** What the affiliate receives, stated plainly on the order form. */
  deliverable: string;
  result: "text" | "image";
}

export const AI_KIND_META: Record<AiKind, AiKindMeta> = {
  ai_caption: {
    label: "Caption pack",
    deliverable: "5 platform-tailored captions with your link and disclosure",
    result: "text",
  },
  ai_hooks: {
    label: "Hook pack",
    deliverable: "10 scroll-stopping opening hooks for your next posts",
    result: "text",
  },
  ai_script: {
    label: "Reel script",
    deliverable: "A full 30-second reel script — hook, timed beats, CTA, on-screen text",
    result: "text",
  },
  ai_video_ideas: {
    label: "Video ideas",
    deliverable: "5 video concepts with titles, hooks, shot outlines, and CTAs",
    result: "text",
  },
  ai_image: {
    label: "AI image",
    deliverable: "One finished marketing image, made to order",
    result: "image",
  },
  ai_background: {
    label: "Ad background",
    deliverable: "One text-free background image for your own ad designs",
    result: "image",
  },
};

// ── Credit packs (Phase 3) ──────────────────────────────────────────────
// The owner creates one Stripe product + one-time price per pack; the
// price id lands in the env slot named by `priceEnv`. A pack whose env
// slot is empty is shown as unavailable — never as a dead buy button.
export interface CreditPackDef {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  priceEnv: string;
  /** Plain-language purchasing power, shown on the credits page. */
  blurb: string;
}

export const CREDIT_PACKS: CreditPackDef[] = [
  {
    id: "starter",
    name: "Starter",
    credits: 100,
    priceUsd: 9.99,
    priceEnv: "STRIPE_CREDIT_PACK_STARTER",
    blurb: "≈ 4 personalized videos, 6 AI images, or 50 caption packs",
  },
  {
    id: "creator",
    name: "Creator",
    credits: 300,
    priceUsd: 24.99,
    priceEnv: "STRIPE_CREDIT_PACK_CREATOR",
    blurb: "≈ 12 personalized videos, 20 AI images, or 150 caption packs",
  },
  {
    id: "power",
    name: "Power",
    credits: 1000,
    priceUsd: 69.99,
    priceEnv: "STRIPE_CREDIT_PACK_POWER",
    blurb: "≈ 40 personalized videos, 66 AI images, or 500 caption packs",
  },
];

export interface StudioCreditConfig {
  creditUsd: number;
  prices: Record<CreditKind, number>;
  monthlyAllowance: number;
  providerUnitCostUsd: Record<CreditKind, number>;
  providersEnabled: Record<CreditKind, boolean>;
  safetyOverride: boolean;
  /** Global monthly cap on AI generation, in USD at the credit anchor. */
  monthlyAiBudgetUsd: number;
  /** Per-user monthly cap on AI generation, in credits. */
  aiUserMonthlyCapCredits: number;
  creditPacks: CreditPackDef[];
}

export const CREDIT_USD = 0.1;
export const PRICE_IMAGE_RENDER = 1;
export const PRICE_VIDEO_PERSONALIZE = 25;
export const PRICE_VIDEO_TEMPLATE = 40;
export const MONTHLY_MEMBER_CREDITS = 100;
export const MONTHLY_AI_BUDGET_USD = 200;
export const AI_USER_MONTHLY_CAP_CREDITS = 300;

export const DEFAULT_CREDIT_CONFIG: StudioCreditConfig = {
  creditUsd: CREDIT_USD,
  prices: {
    image_render: PRICE_IMAGE_RENDER,
    video_personalize: PRICE_VIDEO_PERSONALIZE,
    video_template: PRICE_VIDEO_TEMPLATE,
    ai_caption: 2,
    ai_hooks: 3,
    ai_script: 5,
    ai_video_ideas: 3,
    ai_image: 15,
    ai_background: 10,
  },
  monthlyAllowance: MONTHLY_MEMBER_CREDITS,
  providerUnitCostUsd: {
    image_render: 0,
    video_personalize: 0,
    video_template: 0,
    ai_caption: 0,
    ai_hooks: 0,
    ai_script: 0,
    ai_video_ideas: 0,
    ai_image: 0,
    ai_background: 0,
  },
  providersEnabled: {
    image_render: true,
    video_personalize: true,
    video_template: true,
    ai_caption: true,
    ai_hooks: true,
    ai_script: true,
    ai_video_ideas: true,
    ai_image: true,
    ai_background: true,
  },
  safetyOverride: false,
  monthlyAiBudgetUsd: MONTHLY_AI_BUDGET_USD,
  aiUserMonthlyCapCredits: AI_USER_MONTHLY_CAP_CREDITS,
  creditPacks: CREDIT_PACKS.map((p) => ({ ...p })),
};

/** Retail dollar value of one generation of `kind` under `cfg`. */
export function priceUsd(cfg: StudioCreditConfig, kind: CreditKind): number {
  return cfg.prices[kind] * cfg.creditUsd;
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function validateCreditConfig(
  cfg: StudioCreditConfig,
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (!cfg || typeof cfg !== "object") {
    return { ok: false, errors: ["config: must be an object"] };
  }

  if (typeof cfg.creditUsd !== "number" || !Number.isFinite(cfg.creditUsd) || cfg.creditUsd <= 0) {
    errors.push("creditUsd: must be a finite number greater than 0");
  }

  if (
    typeof cfg.monthlyAllowance !== "number" ||
    !Number.isInteger(cfg.monthlyAllowance) ||
    cfg.monthlyAllowance < 0
  ) {
    errors.push("monthlyAllowance: must be a non-negative integer");
  }

  for (const kind of CREDIT_KINDS) {
    const price = cfg.prices?.[kind];
    if (typeof price !== "number" || !Number.isInteger(price) || price < 0) {
      errors.push(`${kind}: price must be a non-negative integer number of credits`);
    }

    const unitCost = cfg.providerUnitCostUsd?.[kind];
    if (typeof unitCost !== "number" || !Number.isFinite(unitCost) || unitCost < 0) {
      errors.push(`${kind}: provider unit cost must be a finite number >= 0`);
    }

    if (typeof cfg.providersEnabled?.[kind] !== "boolean") {
      errors.push(`${kind}: providersEnabled must be a boolean`);
    }
  }

  if (typeof cfg.safetyOverride !== "boolean") {
    errors.push("safetyOverride: must be a boolean");
  }

  if (
    typeof cfg.monthlyAiBudgetUsd !== "number" ||
    !Number.isFinite(cfg.monthlyAiBudgetUsd) ||
    cfg.monthlyAiBudgetUsd < 0
  ) {
    errors.push("monthlyAiBudgetUsd: must be a finite number >= 0");
  }

  if (
    typeof cfg.aiUserMonthlyCapCredits !== "number" ||
    !Number.isInteger(cfg.aiUserMonthlyCapCredits) ||
    cfg.aiUserMonthlyCapCredits < 0
  ) {
    errors.push("aiUserMonthlyCapCredits: must be a non-negative integer");
  }

  if (!Array.isArray(cfg.creditPacks)) {
    errors.push("creditPacks: must be an array");
  } else {
    const seen = new Set<string>();
    for (const pack of cfg.creditPacks) {
      const label = pack && typeof pack.id === "string" && pack.id ? `creditPacks.${pack.id}` : "creditPacks";
      if (!pack || typeof pack !== "object") {
        errors.push("creditPacks: every pack must be an object");
        continue;
      }
      if (typeof pack.id !== "string" || !/^[a-z0-9_-]+$/.test(pack.id)) {
        errors.push(`${label}: id must be a lowercase slug`);
      } else if (seen.has(pack.id)) {
        errors.push(`${label}: duplicate pack id`);
      }
      seen.add(String(pack.id));
      if (typeof pack.credits !== "number" || !Number.isInteger(pack.credits) || pack.credits <= 0) {
        errors.push(`${label}: credits must be a positive integer`);
      }
      if (typeof pack.priceUsd !== "number" || !Number.isFinite(pack.priceUsd) || pack.priceUsd <= 0) {
        errors.push(`${label}: priceUsd must be a finite number greater than 0`);
      }
      if (typeof pack.priceEnv !== "string" || !/^STRIPE_[A-Z0-9_]+$/.test(pack.priceEnv)) {
        errors.push(`${label}: priceEnv must name a STRIPE_* env var`);
      }
    }
  }

  // SAFETY RULE: when a kind costs real money to produce, its retail price
  // must be at least 2× the provider unit cost. An admin may bypass this
  // only by setting safetyOverride, which is recorded in the audit log.
  if (!cfg.safetyOverride) {
    for (const kind of CREDIT_KINDS) {
      const unitCost = cfg.providerUnitCostUsd?.[kind];
      const price = cfg.prices?.[kind];
      if (
        typeof unitCost === "number" &&
        Number.isFinite(unitCost) &&
        unitCost > 0 &&
        typeof price === "number" &&
        Number.isFinite(price) &&
        typeof cfg.creditUsd === "number" &&
        Number.isFinite(cfg.creditUsd)
      ) {
        const retail = price * cfg.creditUsd;
        if (retail < 2 * unitCost) {
          errors.push(
            `${kind}: price ${price} credits (${fmtUsd(retail)}) must be at least 2x provider unit cost ${fmtUsd(unitCost)}`,
          );
        }
      }
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
