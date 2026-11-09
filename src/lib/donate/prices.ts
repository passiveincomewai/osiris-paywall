/**
 * Support WorldEye donations — Stripe price resolution (server only).
 *
 * The donation products are created by the owner in the Stripe
 * dashboard ("Support WorldEye (one-time)" / "Support WorldEye
 * (monthly)"); the code NEVER creates or mutates products/prices.
 * Preset amounts resolve to price IDs BY LOOKUP KEY (works in live
 * and test mode identically). Custom amounts use session-time
 * price_data against the resolved product ID. If the products do not
 * exist yet, resolution returns null and the session endpoint answers
 * 503 — the popup shows its load-error state rather than a fake
 * checkout.
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

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { value: ResolvedPrice | null; at: number }>();

async function resolveDonatePrice(
  frequency: DonateFrequency,
  amount: number,
): Promise<ResolvedPrice | null> {
  const lookupKey = donateLookupKey(frequency, amount);
  if (!lookupKey) return null;
  const hit = cache.get(lookupKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
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
  return value;
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
