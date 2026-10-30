/**
 * CENTRAL PLAN CONFIG — the one source of truth for plans, prices and
 * entitlements (Pricing Redesign Phase A, 2026-10-29; design:
 * ~/workspace/pricing-redesign/PHASE1-AUDIT.md §6).
 *
 * Before this module the same facts were re-derived in half a dozen
 * places (plan-tier, camera-alerts/tier, recording/tier,
 * trial-reminders' planByPriceIdFromEnv, manage's PRICE_ENV_KEYS) and
 * "annual" secretly meant "VIP entitlements". Here the two axes are
 * separate, on purpose:
 *
 *   tier   ∈ free | lite | pro | ultra     (what you get)
 *   period ∈ weekly | monthly | annual     (how often you pay)
 *
 * A PlanKey is one sellable combination (lite_weekly … ultra_annual)
 * plus the standalone products that are NOT part of the tier grid
 * (enterprise, ambient, ski).
 *
 * DARK BY DESIGN (Phase A): nothing user-visible reads this yet beyond
 * the re-pointed resolvers, the sellable set is unchanged, and Lite /
 * Ultra cannot be bought until Phase C — even though their Stripe
 * prices exist. Price ids resolve from env ONLY for the grid tiers
 * (the Powder Pass pattern): unconfigured ⇒ priceId null ⇒ not
 * sellable, never a hardcoded fallback that could charge a wrong
 * price. The verified Lite/Ultra price ids live in
 * ~/workspace/pricing-redesign/PRICE-IDS.md and in test fixtures —
 * never as runtime constants in this file.
 *
 * Trial lengths are DERIVED from src/lib/billing/trials.ts
 * (TRIAL_DAYS: weekly 3, monthly/annual 10 — the owner's locked rule,
 * extended to every tier). They are never restated as literals here.
 */
import { TRIAL_DAYS, type BillingPlan } from "./trials";

/** The entitlement tier axis. "free" is the no-subscription tier. */
export type PlanTierKey = "free" | "lite" | "pro" | "ultra";

/** The billing-period axis. */
export type BillingPeriod = "weekly" | "monthly" | "annual";

/** Every sellable plan: the 3×3 tier×period grid + standalone products. */
export type PlanKey =
  | "lite_weekly"
  | "lite_monthly"
  | "lite_annual"
  | "pro_weekly"
  | "pro_monthly"
  | "pro_annual"
  | "ultra_weekly"
  | "ultra_monthly"
  | "ultra_annual"
  | "enterprise"
  | "ambient"
  | "ski";

export type StandaloneKey = "enterprise" | "ambient" | "ski";

export interface PlanDef {
  key: PlanKey;
  /** Entitlement tier; null for the true standalone products
   *  (ambient, ski), which confer no tier at all. Enterprise carries
   *  the top tier — it includes everything. */
  tier: PlanTierKey | null;
  /** Billing period; null only where a product has no grid period. */
  period: BillingPeriod | null;
  /** Env var holding the Stripe price id. */
  envKey: string;
  /** Display price, e.g. "$8.99" (display only — Stripe is the ledger). */
  displayPrice: string;
  /** The name the plan is sold under, e.g. "Lite Monthly". */
  displayName: string;
  /** Which TRIAL_DAYS entry governs this plan's trial: grid plans key
   *  off their PERIOD (weekly 3 / monthly 10 / annual 10 for every
   *  tier), standalone plans off their own BillingPlan entry. */
  trialPlan: BillingPlan;
  /** Hardcoded price id used ONLY where one already existed before
   *  this module (Ambient, mirroring lib/plan-tier's fallback and the
   *  checkout route). Grid tiers NEVER get a fallback. */
  fallbackPriceId?: string;
}

function gridDef(
  tier: "lite" | "pro" | "ultra",
  period: BillingPeriod,
  envKey: string,
  displayPrice: string,
  displayName: string,
): PlanDef {
  return {
    key: `${tier}_${period}` as PlanKey,
    tier,
    period,
    envKey,
    displayPrice,
    displayName,
    trialPlan: period,
  };
}

/**
 * The plan definitions. Pro reuses the existing env keys and prices
 * unchanged; Lite/Ultra read the new env keys (set in Vercel at Phase
 * A/C — code behaves correctly whether or not they are set yet:
 * unset ⇒ that plan is simply not sellable).
 */
export const PLAN_DEFS: Record<PlanKey, PlanDef> = {
  lite_weekly: gridDef("lite", "weekly", "STRIPE_LITE_WEEKLY_PRICE_ID", "$4.99", "Lite Weekly"),
  lite_monthly: gridDef("lite", "monthly", "STRIPE_LITE_MONTHLY_PRICE_ID", "$8.99", "Lite Monthly"),
  lite_annual: gridDef("lite", "annual", "STRIPE_LITE_ANNUAL_PRICE_ID", "$44.99", "Lite Annual"),
  pro_weekly: gridDef("pro", "weekly", "STRIPE_WEEKLY_PRICE_ID", "$7.99", "Weekly"),
  pro_monthly: gridDef("pro", "monthly", "STRIPE_MONTHLY_PRICE_ID", "$13.99", "Monthly"),
  pro_annual: gridDef("pro", "annual", "STRIPE_ANNUAL_PRICE_ID", "$74.99", "VIP Pro"),
  ultra_weekly: gridDef("ultra", "weekly", "STRIPE_ULTRA_WEEKLY_PRICE_ID", "$12.99", "Ultra Weekly"),
  ultra_monthly: gridDef("ultra", "monthly", "STRIPE_ULTRA_MONTHLY_PRICE_ID", "$24.99", "Ultra Monthly"),
  ultra_annual: gridDef("ultra", "annual", "STRIPE_ULTRA_ANNUAL_PRICE_ID", "$149.99", "Ultra Annual"),
  enterprise: {
    key: "enterprise",
    tier: "ultra",
    period: "annual",
    envKey: "STRIPE_ENTERPRISE_PRICE_ID",
    displayPrice: "$999",
    displayName: "Enterprise",
    trialPlan: "enterprise",
  },
  ambient: {
    key: "ambient",
    tier: null,
    period: "monthly",
    envKey: "STRIPE_AMBIENT_PRICE_ID",
    displayPrice: "$4.99",
    displayName: "Ambient",
    trialPlan: "ambient",
    // The pre-existing Ambient fallback (same id lib/plan-tier's
    // AMBIENT_PRICE_ID_FALLBACK carries): the env var wins when set.
    fallbackPriceId: "price_1UUxUnGfHuTnzrlHH0pNYhJU",
  },
  ski: {
    key: "ski",
    tier: null,
    period: "monthly",
    envKey: "POWDER_PASS_PRICE_ID",
    displayPrice: "$4.99",
    displayName: "Powder Pass",
    trialPlan: "ski",
  },
};

export const PLAN_KEYS = Object.keys(PLAN_DEFS) as PlanKey[];

/** A plan with its env-resolved price id and derived trial/sellable. */
export interface ResolvedPlan extends PlanDef {
  /** The configured Stripe price id, or null when unconfigured. */
  priceId: string | null;
  /** Trial days, DERIVED from TRIAL_DAYS via the def's trialPlan. */
  trialDays: number;
  /** Sellable = a price id is configured. Nothing else gates Phase A. */
  sellable: boolean;
}

export function resolvePlan(
  key: PlanKey,
  env: Record<string, string | undefined>,
): ResolvedPlan {
  const def = PLAN_DEFS[key];
  const priceId = env[def.envKey] || def.fallbackPriceId || null;
  return {
    ...def,
    priceId,
    trialDays: TRIAL_DAYS[def.trialPlan],
    sellable: priceId !== null,
  };
}

export function resolvePlans(
  env: Record<string, string | undefined>,
): Record<PlanKey, ResolvedPlan> {
  const out = {} as Record<PlanKey, ResolvedPlan>;
  for (const key of PLAN_KEYS) out[key] = resolvePlan(key, env);
  return out;
}

/* ------------------------------------------------------------------ */
/* Legacy price ids — historical facts, named explicitly.              */
/*                                                                     */
/* These prices are not sold anymore (or, for the current annual       */
/* price, are ALSO reachable through env) — they exist here so a       */
/* subscriber still riding one resolves to exactly the entitlements    */
/* they have always had (grandfathering is absolute: no existing       */
/* subscriber's price or access ever changes).                         */
/* ------------------------------------------------------------------ */

/**
 * The legacy-VIP cutoff. Holders of an annual legacy-VIP price (the
 * current $74.99 annual price or the grandfathered $59.99 annual
 * price) whose subscription was created BEFORE this moment keep the
 * VIP extras (alerts 10, recording 40, timelapse, intel feeds) for as
 * long as their subscription lives; subscriptions created on the Pro
 * annual price from the cutoff on get plain Pro entitlements.
 *
 * NOTE (Phase C): the launch may move this cutoff BEFORE any
 * Lite/Ultra sale opens — it must stay ahead of the first post-launch
 * Pro-annual sale, or a new buyer would be grandfathered by accident.
 */
export const LEGACY_VIP_CUTOFF = new Date("2026-10-30T00:00:00Z");

interface LegacyPriceEntry {
  tier: PlanTierKey | null;
  period: BillingPeriod | null;
  planKey: PlanKey | null;
  /** True for the annual prices whose pre-cutoff holders keep VIP extras. */
  legacyVipEligible: boolean;
}

/** Literal legacy price id → what it has always meant. */
const LEGACY_PRICE_TABLE: Record<string, LegacyPriceEntry> = {
  // Grandfathered Pro prices (same products as the current Pro prices):
  price_1UPH6KGfHuTnzrlHDBzDHobj: { tier: "pro", period: "weekly", planKey: "pro_weekly", legacyVipEligible: false }, // GF weekly $3.99
  price_1UPGwjGfHuTnzrlHwwU5k4WO: { tier: "pro", period: "monthly", planKey: "pro_monthly", legacyVipEligible: false }, // GF monthly $9.99
  price_1UPH7MGfHuTnzrlHxbGXji4K: { tier: "pro", period: "annual", planKey: "pro_annual", legacyVipEligible: true }, // GF annual $59.99
  // The CURRENT annual price ($74.99): also the env-configured
  // pro_annual price today. Named here so its legacy-VIP eligibility
  // attaches to the price itself, whichever way it is reached.
  price_1USW5HGfHuTnzrlHveoTpmwd: { tier: "pro", period: "annual", planKey: "pro_annual", legacyVipEligible: true },
  // The Ambient fallback id when no env var names it (standalone).
  price_1UUxUnGfHuTnzrlHH0pNYhJU: { tier: null, period: "monthly", planKey: "ambient", legacyVipEligible: false },
  // Dead pre-rebuild prices (0 subscriptions ever): if one is ever
  // seen on a live subscription it defaults to Pro, like any payer.
  price_1UPGxdGfHuTnzrlHpaLBMFv5: { tier: "pro", period: null, planKey: null, legacyVipEligible: false }, // $59.99/mo on "Annual pro plan"
  price_1UPGwHGfHuTnzrlHHXjun0oW: { tier: "pro", period: null, planKey: null, legacyVipEligible: false }, // one-time $9.99
  price_1UPGw1GfHuTnzrlHcyYpGH1H: { tier: "pro", period: null, planKey: null, legacyVipEligible: false }, // $3.99/mo on "Weekly pro plan"
};

/* ------------------------------------------------------------------ */
/* Price resolution — price id → { tier, period }                      */
/* ------------------------------------------------------------------ */

export interface PriceResolution {
  priceId: string;
  /** False when the id is not one the config knows. Unknown ids still
   *  resolve (tier "pro") — a paying subscriber is never stripped by
   *  an unrecognized price, matching the historical default. */
  known: boolean;
  /** The plan this price belongs to, when known. */
  planKey: PlanKey | null;
  /** Entitlement tier; null = standalone product (ambient/ski). */
  tier: PlanTierKey | null;
  period: BillingPeriod | null;
  /** "ambient" | "ski" for the standalone products, else null. */
  standalone: "ambient" | "ski" | null;
  /** True when this price's pre-cutoff holders keep VIP extras. */
  legacyVipEligible: boolean;
}

const UNKNOWN_RESOLUTION = {
  known: false,
  planKey: null,
  tier: "pro",
  period: null,
  standalone: null,
  legacyVipEligible: false,
} as const;

/**
 * Resolve a Stripe price id against the env-configured plans PLUS the
 * explicit legacy table. Env entries win on plan identity; the legacy
 * table contributes legacyVipEligible to an env entry for the same id
 * (that is how the current annual price carries its eligibility).
 */
export function resolvePriceId(
  priceId: string | null | undefined,
  env: Record<string, string | undefined>,
): PriceResolution {
  if (!priceId) return { priceId: priceId ?? "", ...UNKNOWN_RESOLUTION, known: false };
  const legacy = LEGACY_PRICE_TABLE[priceId];
  for (const key of PLAN_KEYS) {
    const plan = resolvePlan(key, env);
    if (plan.priceId && plan.priceId === priceId) {
      return {
        priceId,
        known: true,
        planKey: key,
        tier: plan.tier,
        period: plan.period,
        standalone: key === "ambient" || key === "ski" ? key : null,
        // Legacy-VIP eligibility attaches to the Pro annual plan
        // itself (its pre-cutoff holders keep the VIP extras) as well
        // as to the literal legacy prices in the table below.
        legacyVipEligible: key === "pro_annual" || (legacy?.legacyVipEligible ?? false),
      };
    }
  }
  if (legacy) {
    const standalone =
      legacy.planKey === "ambient" || legacy.planKey === "ski" ? legacy.planKey : null;
    return {
      priceId,
      known: true,
      planKey: legacy.planKey,
      tier: legacy.tier,
      period: legacy.period,
      standalone,
      legacyVipEligible: legacy.legacyVipEligible,
    };
  }
  return { priceId, ...UNKNOWN_RESOLUTION };
}

/**
 * Does this resolution carry legacy VIP extras for a subscription
 * created at `createdAt`? True iff the price is a legacy-VIP annual
 * price AND the subscription predates LEGACY_VIP_CUTOFF. When the
 * creation date is unknown (price-only call sites), eligibility alone
 * decides — the grandfathering-safe direction: an existing holder is
 * never stripped on a missing date, and every real subscription row
 * carries a createdAt for the call sites that must distinguish.
 */
export function legacyVipFor(
  resolution: PriceResolution,
  createdAt?: Date | string | null,
): boolean {
  if (!resolution.legacyVipEligible) return false;
  if (createdAt == null) return true;
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return created.getTime() < LEGACY_VIP_CUTOFF.getTime();
}

/** Convenience: legacy-VIP extras for (price id, env, createdAt). */
export function hasLegacyVip(
  priceId: string | null | undefined,
  env: Record<string, string | undefined>,
  createdAt?: Date | string | null,
): boolean {
  return legacyVipFor(resolvePriceId(priceId, env), createdAt);
}

/* ------------------------------------------------------------------ */
/* Entitlements — every limit, sourced here and nowhere else.          */
/* ------------------------------------------------------------------ */

export interface Entitlements {
  /** Unlimited camera opens (any paid tier; free is ladder-capped). */
  unlimitedOpens: boolean;
  /** Premium map layers (any paid tier incl. Lite). */
  premiumLayers: boolean;
  /** OI AI Assistant (any paid tier incl. Lite). */
  oiAssistant: boolean;
  /** Advanced search filters (any paid tier incl. Lite). */
  searchFilters: boolean;
  /** Recording Studio access (any paid tier incl. Lite). */
  recordingStudio: boolean;
  /** Cameras recordable at once in the multi-camera studio. */
  multiCamCap: number;
  /** Active camera-alert rules. Alerts start at Pro (Lite 0). */
  alertCap: number;
  /** Camera Timelapse (Ultra, or legacy VIP holders). */
  timelapse: boolean;
  /** Premium Intel Feeds (Ultra, or legacy VIP holders). */
  intelFeeds: boolean;
  /** Standalone Ambient Mode access without an Ambient subscription
   *  (any paid tier bypasses the Ambient gate, as today). */
  ambientBypass: boolean;
}

const NO_ENTITLEMENTS: Entitlements = {
  unlimitedOpens: false,
  premiumLayers: false,
  oiAssistant: false,
  searchFilters: false,
  recordingStudio: false,
  multiCamCap: 0,
  alertCap: 0,
  timelapse: false,
  intelFeeds: false,
  ambientBypass: false,
};

/** The paid-tier baseline every tier from Lite up shares. */
const PAID_BASE: Entitlements = {
  ...NO_ENTITLEMENTS,
  unlimitedOpens: true,
  premiumLayers: true,
  oiAssistant: true,
  searchFilters: true,
  recordingStudio: true,
  ambientBypass: true,
};

/**
 * The entitlement set for a tier. `legacyVip` (a pre-cutoff holder of
 * a legacy-VIP annual price) raises the holder to the VIP extras —
 * alertCap 10, multiCamCap 40, timelapse, intel feeds — whatever tier
 * the price itself carries.
 */
export function entitlementsFor(
  tier: PlanTierKey,
  opts?: { legacyVip?: boolean },
): Entitlements {
  let ent: Entitlements;
  switch (tier) {
    case "lite":
      ent = { ...PAID_BASE, multiCamCap: 5, alertCap: 0 };
      break;
    case "pro":
      ent = { ...PAID_BASE, multiCamCap: 20, alertCap: 2 };
      break;
    case "ultra":
      ent = { ...PAID_BASE, multiCamCap: 40, alertCap: 10, timelapse: true, intelFeeds: true };
      break;
    default:
      ent = { ...NO_ENTITLEMENTS };
  }
  if (opts?.legacyVip) {
    ent = {
      ...ent,
      alertCap: Math.max(ent.alertCap, 10),
      multiCamCap: Math.max(ent.multiCamCap, 40),
      timelapse: true,
      intelFeeds: true,
    };
  }
  return ent;
}

/* ------------------------------------------------------------------ */
/* Plan names by price id — the naming map the reminder emails, the    */
/* subscription page and the local tier adapters have always shared    */
/* (historically planByPriceIdFromEnv in trial-reminders.ts).          */
/* ------------------------------------------------------------------ */

/**
 * priceId → plan name. The Pro grid keeps its historical PERIOD names
 * ("weekly" | "monthly" | "annual") — every existing consumer keys off
 * them and their behavior is unchanged. Lite/Ultra resolve to their
 * PlanKey ("lite_weekly" … "ultra_annual") so new consumers and the
 * reminder labels can name the tier; standalone products resolve to
 * "enterprise" | "ambient" | "ski". Legacy grandfathered prices name
 * as the Pro plan they have always been.
 */
export function planNameByPriceId(
  env: Record<string, string | undefined>,
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const key of PLAN_KEYS) {
    const plan = resolvePlan(key, env);
    if (!plan.priceId) continue;
    map[plan.priceId] =
      plan.tier === "pro" && plan.period ? plan.period : key;
  }
  // Legacy grandfathered prices (not env-configured): name them as the
  // Pro plans they are. The current annual price is normally already
  // mapped via env; its literal entry keeps the name if env rotates.
  const legacyNames: Array<[string, string]> = [
    ["price_1UPH6KGfHuTnzrlHDBzDHobj", "weekly"],
    ["price_1UPGwjGfHuTnzrlHwwU5k4WO", "monthly"],
    ["price_1UPH7MGfHuTnzrlHxbGXji4K", "annual"],
    ["price_1USW5HGfHuTnzrlHveoTpmwd", "annual"],
  ];
  for (const [id, name] of legacyNames) {
    if (!(id in map)) map[id] = name;
  }
  return map;
}
