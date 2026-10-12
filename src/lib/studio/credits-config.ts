// ── Studio credits: pure configuration ──────────────────────────────────
// No DB imports — this module is safe to use from client-adjacent code,
// tests, and the settings/credits layers alike.
//
// Money model: 1 credit = CREDIT_USD dollars of retail value. Every
// generation kind has a fixed credit price; paid providers (video) also
// carry a real per-unit cost, and the safety rule in validateCreditConfig
// guarantees the retail price always covers at least 2× that cost unless
// an admin explicitly flips safetyOverride (which is audit-logged on save).

export type CreditKind = "image_render" | "video_personalize" | "video_template";

export const CREDIT_KINDS: readonly CreditKind[] = [
  "image_render",
  "video_personalize",
  "video_template",
] as const;

export interface StudioCreditConfig {
  creditUsd: number;
  prices: Record<CreditKind, number>;
  monthlyAllowance: number;
  providerUnitCostUsd: Record<CreditKind, number>;
  providersEnabled: Record<CreditKind, boolean>;
  safetyOverride: boolean;
}

export const CREDIT_USD = 0.1;
export const PRICE_IMAGE_RENDER = 1;
export const PRICE_VIDEO_PERSONALIZE = 25;
export const PRICE_VIDEO_TEMPLATE = 40;
export const MONTHLY_MEMBER_CREDITS = 100;

export const DEFAULT_CREDIT_CONFIG: StudioCreditConfig = {
  creditUsd: CREDIT_USD,
  prices: {
    image_render: PRICE_IMAGE_RENDER,
    video_personalize: PRICE_VIDEO_PERSONALIZE,
    video_template: PRICE_VIDEO_TEMPLATE,
  },
  monthlyAllowance: MONTHLY_MEMBER_CREDITS,
  providerUnitCostUsd: {
    image_render: 0,
    video_personalize: 0,
    video_template: 0,
  },
  providersEnabled: {
    image_render: true,
    video_personalize: true,
    video_template: true,
  },
  safetyOverride: false,
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
