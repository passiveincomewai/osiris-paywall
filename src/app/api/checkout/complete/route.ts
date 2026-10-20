import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { normalizeEmail } from "@/lib/password-auth";
import {
  describeStripePrice,
  planByPriceIdFromEnv,
} from "@/lib/billing/trial-reminders";

export const runtime = "nodejs";

/**
 * Verify a just-completed checkout session and return the purchase email plus
 * any existing profile details (for prefilling the account setup form).
 * The session id is unguessable and verified server-side against Stripe —
 * query params alone grant nothing.
 */
export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("session_id") ?? "";
  if (!sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }

  let checkout: Awaited<ReturnType<ReturnType<typeof stripe>["checkout"]["sessions"]["retrieve"]>>;
  try {
    checkout = await stripe().checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "subscription"],
    });
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  }
  if (checkout.status !== "complete" || checkout.mode !== "subscription") {
    return NextResponse.json({ error: "Payment not complete" }, { status: 402 });
  }

  const customer = checkout.customer;
  const rawEmail =
    typeof customer === "string" ? checkout.customer_email : (customer?.deleted ? null : (customer?.email ?? checkout.customer_email));
  const email = rawEmail ? normalizeEmail(rawEmail) : null;
  if (!email) {
    return NextResponse.json({ error: "No email on this purchase" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { name: true, phone: true },
  });

  // What they actually bought, for the welcome page's completion loop:
  // a trial user has NOT been charged yet, and the page must say so —
  // when the trial ends and what the first charge will be. Derived from
  // the live subscription/price, never restated. Any failure here just
  // omits the fields; the claim flow itself must never break over copy.
  let plan: string | null = checkout.metadata?.plan ?? null;
  let trialEndsAt: string | null = null;
  let chargeLabel: string | null = null;
  try {
    const sub = checkout.subscription;
    if (sub && typeof sub !== "string") {
      if (sub.status === "trialing" && sub.trial_end) {
        trialEndsAt = new Date(sub.trial_end * 1000).toISOString();
      }
      const price = sub.items.data[0]?.price;
      if (price) {
        chargeLabel = describeStripePrice(
          {
            id: price.id,
            unit_amount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring
              ? {
                  interval: price.recurring.interval,
                  interval_count: price.recurring.interval_count,
                }
              : null,
          },
          planByPriceIdFromEnv(process.env),
        ).chargeLabel;
      }
    }
  } catch {
    plan = plan ?? null;
  }

  return NextResponse.json({
    email,
    name: user?.name ?? null,
    phone: user?.phone ?? null,
    plan,
    trialEndsAt,
    chargeLabel,
  });
}
