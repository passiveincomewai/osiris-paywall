/**
 * Checkout deduplication (Conversion Wave 2, F6) — the decision unit
 * behind POST /api/checkout's member guard. Pure and injectable: the
 * route hands in the member's DB subscription row plus two Stripe read
 * ports, and every branch of the decision table is pinned by
 * checkout-guard.test.ts. The route stays a thin adapter.
 *
 * The failure this prevents: a member starting a second checkout while
 * already holding a plan — the double-subscription pattern — and the
 * quieter one beneath it, a second Stripe *customer* record minted for
 * an email that already has one.
 *
 * Rules, in order:
 *  1. A DB Subscription row that is live (status active|trialing and
 *     the current period ends in the future) BLOCKS. (The pre-F6 route
 *     checked `active` only, so a trialing member could check out a
 *     second plan on top of the trial.)
 *  2. Otherwise a known Stripe customer (from the DB row) is reused
 *     as-is — the resubscribe path, unchanged.
 *  3. With no DB row, Stripe customers are looked up by account email
 *     (the customers.list({email}) pattern lib/conversion-analytics
 *     already uses) and one is REUSED instead of creating a duplicate:
 *     the record whose metadata.userId is this user wins, else the
 *     first. Before any reuse, EVERY customer under the email is
 *     checked for a live subscription — a live one BLOCKS, because a
 *     plan held under this email that our DB row doesn't mirror (a
 *     guest checkout never claimed, a row lost to a webhook gap) is
 *     exactly the duplicate this guard exists to stop.
 *  4. Stripe read failures fail OPEN (proceed): the DB guard in rule 1
 *     is the hard stop, and a Stripe hiccup must not break the buy
 *     path — worst case the route creates a fresh customer, exactly
 *     what it did before this guard existed.
 *
 * This module never writes to Stripe or the DB, and nothing here
 * cancels, merges, refunds, or modifies an existing subscription or
 * customer — the guard is prospective only.
 */

export interface GuardDbSubscription {
  status: string;
  currentPeriodEnd: Date;
  stripeCustomerId: string | null;
  /** The live row's price — lets rule 1 tell a standalone-product
   *  subscription (Ambient) apart from a tier plan. Optional: rows
   *  described without it keep the pre-Ambient behaviour exactly. */
  stripePriceId?: string | null;
}

export interface GuardStripeCustomer {
  id: string;
  metadata?: Record<string, string> | null;
}

export interface GuardStripeSubscription {
  status: string;
}

export interface CheckoutGuardPorts {
  listCustomersByEmail: (email: string) => Promise<GuardStripeCustomer[]>;
  listCustomerSubscriptions: (
    customerId: string,
  ) => Promise<GuardStripeSubscription[]>;
}

export type CheckoutGuardDecision =
  | { kind: "blocked"; reason: "db_subscription" | "stripe_subscription" }
  | { kind: "proceed"; customerId?: string };

/** The block's user-facing sentence. Every checkout client surfaces a
 *  server's `error` string verbatim (the /checkout page's and the
 *  embedded body's error phases, the hosted starter's throw), so the
 *  message itself carries the route to the manage surface. */
export const ALREADY_SUBSCRIBED_MESSAGE =
  "You already have an active WorldEye plan, so there's nothing new to check out. To change or cancel your plan, go to Settings → Subscription.";
export const ALREADY_SUBSCRIBED_CODE = "already_subscribed";
export const MANAGE_SUBSCRIPTION_PATH = "/settings/subscription";

const LIVE_STATUSES: ReadonlySet<string> = new Set(["active", "trialing"]);

/** Live = status active|trialing with the paid/trial period still ahead. */
export function dbSubscriptionIsLive(
  sub: GuardDbSubscription | null | undefined,
  now: Date,
): boolean {
  return (
    !!sub && LIVE_STATUSES.has(sub.status) && sub.currentPeriodEnd > now
  );
}

export async function resolveCheckoutGuard(input: {
  userId: string;
  email: string | null | undefined;
  dbSub: GuardDbSubscription | null;
  ports: CheckoutGuardPorts;
  now?: Date;
  /** The plan being bought, when the caller knows it. Only used for
   *  the standalone-product carve-out in rule 1. */
  plan?: string;
  /** Resolved Ambient price id (lib/plan-tier), for the same. */
  ambientPriceId?: string;
  /** Resolved Powder Pass price id (lib/plan-tier), for the same —
   *  Powder Pass is the second standalone product. Undefined until
   *  the owner provisions the price. */
  skiPriceId?: string;
}): Promise<CheckoutGuardDecision> {
  const now = input.now ?? new Date();
  const { dbSub } = input;

  // Rule 1 — a live plan in our own DB blocks, full stop.
  if (dbSubscriptionIsLive(dbSub, now)) {
    /* Carve-out (standalone products — WorldEye Ambient, Powder
       Pass): a standalone product is not a tier, and a member's
       single Subscription row can hold one while they hold no tier
       plan. Blocking them from ever buying anything else would
       strand every standalone subscriber, so a standalone-only live
       row does not block a purchase of a DIFFERENT plan — the
       checkout proceeds on the same Stripe customer, and the new
       subscription replaces the row via the webhook (the displaced
       standalone sub is cancelled at Stripe by the webhook sync; the
       manage surface is where a member cancels by hand). The reverse
       needs no carve-out: a standalone holder re-buying the SAME
       standalone is a duplicate, and a tier holder buying a
       standalone stays blocked by rule 1 itself — for Ambient that
       is exact (every tier includes it) and for VIP buying Powder
       Pass likewise; a Pro holder adding Powder Pass is also held
       by the single-row constraint, the same wall Ambient was built
       behind (flagged in the Powder Pass foundation report as a
       launch decision, not silently solved here). */
    const existingIsAmbientOnly =
      !!input.ambientPriceId &&
      !!dbSub?.stripePriceId &&
      dbSub.stripePriceId === input.ambientPriceId;
    const existingIsSkiOnly =
      !!input.skiPriceId &&
      !!dbSub?.stripePriceId &&
      dbSub.stripePriceId === input.skiPriceId;
    if (
      input.plan &&
      ((existingIsAmbientOnly && input.plan !== "ambient") ||
        (existingIsSkiOnly && input.plan !== "ski"))
    ) {
      return { kind: "proceed", customerId: dbSub?.stripeCustomerId ?? undefined };
    }
    return { kind: "blocked", reason: "db_subscription" };
  }

  // Rule 2 — resubscribe on the customer we already know.
  if (dbSub?.stripeCustomerId) {
    return { kind: "proceed", customerId: dbSub.stripeCustomerId };
  }

  // Rule 3 — no DB row: reuse by email, after the live-sub sweep.
  const email = input.email?.trim();
  if (!email) return { kind: "proceed" };
  let customers: GuardStripeCustomer[];
  try {
    customers = await input.ports.listCustomersByEmail(email);
  } catch {
    return { kind: "proceed" }; // Rule 4 — fail open.
  }
  if (customers.length === 0) return { kind: "proceed" };

  for (const customer of customers) {
    try {
      const subs = await input.ports.listCustomerSubscriptions(customer.id);
      if (subs.some((s) => LIVE_STATUSES.has(s.status))) {
        return { kind: "blocked", reason: "stripe_subscription" };
      }
    } catch {
      // Fail open per customer: an unreadable subscription list must
      // not veto a checkout the DB guard already cleared.
    }
  }

  const preferred =
    customers.find((c) => c.metadata?.userId === input.userId) ?? customers[0];
  return { kind: "proceed", customerId: preferred.id };
}
