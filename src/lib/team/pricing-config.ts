// Team Access pricing config — server module.
//
// The authoritative tier table, seat caps, and Stripe seat Price IDs
// live in the TeamPricingConfig row (id "default") so pricing can be
// tuned without a deploy. Any absent or malformed data falls back to
// the compiled-in defaults from ./pricing — this module never throws,
// because checkout and webhook reconciliation both depend on it.

import { db } from "@/lib/db";
import {
  CYCLES,
  DEFAULT_TIERS,
  validateTierTable,
  type Cycle,
  type TierBand,
} from "./pricing";

/** Stripe Product that all per-seat Prices belong to. */
export const SEAT_PRODUCT_ID = "prod_VTi94CLS52M2zn";

/** Stripe Price IDs created for the graduated seat item, one per cycle. */
export const CREATED_SEAT_PRICE_IDS: Record<Cycle, string> = {
  weekly: "price_1USkldGfHuTnzrlH7ABJpZd3",
  monthly: "price_1USklkGfHuTnzrlHCy6F9P2b",
  annual: "price_1USklsGfHuTnzrlH6bKmLS71",
};

export interface TeamPricingConfigResolved {
  maxSeats: number;
  inviteExpiryDays: number;
  tiers: Record<Cycle, TierBand[]>;
  seatPriceIds: Record<Cycle, string>;
}

export const DEFAULT_TEAM_PRICING_CONFIG: TeamPricingConfigResolved = {
  maxSeats: 50,
  inviteExpiryDays: 7,
  tiers: DEFAULT_TIERS,
  seatPriceIds: CREATED_SEAT_PRICE_IDS,
};

function positiveIntOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Per-cycle validated tiers: a bad cycle falls back to its default alone. */
function resolveTiers(raw: unknown): Record<Cycle, TierBand[]> {
  const record = asRecord(raw);
  const out = {} as Record<Cycle, TierBand[]>;
  for (const cycle of CYCLES) {
    const candidate = record?.[cycle];
    out[cycle] = validateTierTable(candidate)
      ? candidate
      : DEFAULT_TIERS[cycle];
  }
  return out;
}

/** Per-cycle seat Price IDs: a missing/blank cycle falls back to its default. */
function resolveSeatPriceIds(raw: unknown): Record<Cycle, string> {
  const record = asRecord(raw);
  const out = {} as Record<Cycle, string>;
  for (const cycle of CYCLES) {
    const candidate = record?.[cycle];
    out[cycle] =
      typeof candidate === "string" && candidate.length > 0
        ? candidate
        : CREATED_SEAT_PRICE_IDS[cycle];
  }
  return out;
}

/**
 * Read the TeamPricingConfig row (id "default"), resolving every field
 * against the compiled-in defaults. Never throws: a missing row, a DB
 * error, or malformed Json all yield the defaults (per-field where
 * possible).
 */
export async function getTeamPricingConfig(): Promise<TeamPricingConfigResolved> {
  try {
    const row = await db.teamPricingConfig.findUnique({
      where: { id: "default" },
    });
    if (!row) return { ...DEFAULT_TEAM_PRICING_CONFIG };
    return {
      maxSeats: positiveIntOr(row.maxSeats, DEFAULT_TEAM_PRICING_CONFIG.maxSeats),
      inviteExpiryDays: positiveIntOr(
        row.inviteExpiryDays,
        DEFAULT_TEAM_PRICING_CONFIG.inviteExpiryDays,
      ),
      tiers: resolveTiers(row.tiers),
      seatPriceIds: resolveSeatPriceIds(row.seatPriceIds),
    };
  } catch {
    return { ...DEFAULT_TEAM_PRICING_CONFIG };
  }
}

/**
 * True when `priceId` is one of the configured per-seat Stripe Price
 * IDs (any cycle). Used by webhook reconciliation to tell the seat line
 * item apart from the base subscription item.
 */
export function isSeatPriceId(
  priceId: string | null | undefined,
  config: TeamPricingConfigResolved,
): boolean {
  if (!priceId) return false;
  return Object.values(config.seatPriceIds).includes(priceId);
}
