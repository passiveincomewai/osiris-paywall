/**
 * Support WorldEye donations — Stripe price resolution (server only).
 *
 * The donation products are created by the owner in the Stripe
 * dashboard; the code NEVER creates or mutates products/prices.
 * Preset amounts resolve to price IDs BY LOOKUP KEY first (works in
 * live and test mode identically) — the lookup-key path stays
 * preferred, so the owner can take over resolution at any time just
 * by setting the keys. The four one-time prices the owner created
 * currently have NO lookup keys set, so when lookup resolution finds
 * nothing, one-time presets fall back to the known live price IDs
 * below (each sits on its own "$N Donation" product). Monthly has no
 * live prices at all yet, so monthly resolution stays lookup-only.
 * Custom amounts use session-time price_data against the resolved
 * product ID. If resolution returns null the session endpoint
 * answers 503 — the popup shows its load-error state rather than a
 * fake checkout.
 */
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import {
  donateLookupKey,
  isDonatePreset,
  DONATE_DEFAULT_AMOUNT,
  type DonateFrequency,
} from "./config";

interface ResolvedPrice {
  priceId: string;
  productId: string;
}

/**
 * Fallback live price IDs for the owner-created one-time donation
 * prices (lookup_key unset on all four; verified live 2026-11-09).
 * Consulted ONLY when lookup-key resolution returns nothing, and
 * only for frequency "once" — there are no monthly prices to fall
 * back to.
 */
const DONATE_ONCE_PRICE_ID_FALLBACK: Record<number, string> = {
  5: "price_1UZwpYGfHuTnzrlHaQi35iPK",
  10: "price_1UZwpmGfHuTnzrlHq5e5Q02F",
  25: "price_1UZwq0GfHuTnzrlHm7l1Co6L",
  50: "price_1UZwqGGfHuTnzrlHMYqv3bDD",
};

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { value: ResolvedPrice | null; at: number }>();

/**
 * Fallback path: retrieve a known live one-time price directly by
 * ID. Returns null (the 503 fail-safe) when there is no fallback for
 * the amount, when Stripe errors, or when the price is inactive.
 * Cached under its own `idfallback:` key so it can never collide
 * with the lookup-key cache entries.
 */
async function resolveByPriceIdFallback(
  frequency: DonateFrequency,
  amount: number,
): Promise<ResolvedPrice | null> {
  if (frequency !== "once") return null;
  const priceId = DONATE_ONCE_PRICE_ID_FALLBACK[amount];
  if (!priceId) return null;
  const cacheKey = `idfallback:${amount}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  let value: ResolvedPrice | null = null;
  try {
    const price = await stripe().prices.retrieve(priceId, {
      expand: ["product"],
    });
    if (price && price.active) {
      const product = price.product as Stripe.Product | string;
      value = {
        priceId: price.id,
        productId: typeof product === "string" ? product : product.id,
      };
    }
  } catch {
    value = null;
  }
  cache.set(cacheKey, { value, at: Date.now() });
  return value;
}

async function resolveDonatePrice(
  frequency: DonateFrequency,
  amount: number,
): Promise<ResolvedPrice | null> {
  const lookupKey = donateLookupKey(frequency, amount);
  if (!lookupKey) return null;
  const hit = cache.get(lookupKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    if (hit.value) return hit.value;
    // Fresh negative lookup result — go straight to the ID fallback.
    return resolveByPriceIdFallback(frequency, amount);
  }
  let value: ResolvedPrice | null = null;
  try {
    const list = await stripe().prices.list({
      lookup_keys: [lookupKey],
      active: true,
      limit: 1,
      expand: ["data.product"],
    });
    const price = list.data[0];
    if (price) {
      const product = price.product as Stripe.Product | string;
      value = {
        priceId: price.id,
        productId: typeof product === "string" ? product : product.id,
      };
    }
  } catch {
    value = null;
  }
  cache.set(lookupKey, { value, at: Date.now() });
  if (value) return value;
  return resolveByPriceIdFallback(frequency, amount);
}

export type DonateLineItemResult =
  | { ok: true; lineItem: Stripe.Checkout.SessionCreateParams.LineItem }
  | { ok: false; error: string };

const UNAVAILABLE =
  "Donations are not available yet — the Stripe donation products have not been created.";

/**
 * Build the single checkout line item for a donation:
 * preset → the lookup-key price; custom → price_data on the matching
 * product (with a monthly recurrence for the monthly product).
 */
export async function buildDonateLineItem(
  frequency: DonateFrequency,
  amount: number,
): Promise<DonateLineItemResult> {
  if (isDonatePreset(amount)) {
    const resolved = await resolveDonatePrice(frequency, amount);
    if (!resolved) return { ok: false, error: UNAVAILABLE };
    return { ok: true, lineItem: { price: resolved.priceId, quantity: 1 } };
  }
  // Custom amount: price_data needs the product ID — resolve it from
  // the default preset's price on the same (frequency) product.
  const anchor = await resolveDonatePrice(frequency, DONATE_DEFAULT_AMOUNT);
  if (!anchor) return { ok: false, error: UNAVAILABLE };
  const priceData: Stripe.Checkout.SessionCreateParams.LineItem.PriceData = {
    currency: "usd",
    unit_amount: amount * 100,
    product: anchor.productId,
    ...(frequency === "monthly"
      ? { recurring: { interval: "month" as const } }
      : {}),
  };
  return { ok: true, lineItem: { price_data: priceData, quantity: 1 } };
}
