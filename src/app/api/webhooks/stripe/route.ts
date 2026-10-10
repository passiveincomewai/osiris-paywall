import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs"; // signature verification needs the raw body

function toDate(secs: number | null | undefined): Date {
  return new Date((secs ?? 0) * 1000);
}

/**
 * Single write path for subscription state. Upsert keyed on the Stripe
 * subscription id (idempotent — safe to replay events). userId is resolved
 * from subscription metadata first, then from the existing DB row (covers
 * subscription.updated/deleted, which carry no client_reference_id).
 */
async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  let userId = sub.metadata?.userId;
  if (!userId) {
    const row = await db.subscription.findUnique({
      where: { stripeSubscriptionId: sub.id },
      select: { userId: true },
    });
    userId = row?.userId;
  }
  if (!userId) {
    console.error(`[stripe-webhook] no userId for subscription ${sub.id}; skipping`);
    return;
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) {
    console.error(`[stripe-webhook] no customer on subscription ${sub.id}; skipping`);
    return;
  }

  const data = {
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    stripePriceId: sub.items.data[0]?.price.id ?? "",
    status: sub.status, // Stripe values map 1:1 onto the SubscriptionStatus enum
    currentPeriodStart: toDate(sub.current_period_start),
    currentPeriodEnd: toDate(sub.current_period_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
  };

  await db.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: data,
    update: data,
  });
}

async function subscriptionFromId(subscriptionId: string): Promise<void> {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  await syncSubscription(sub);
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    // req.text() gives the RAW body — constructEvent does its own
    // constant-time signature comparison internally.
    event = stripe().webhooks.constructEvent(await req.text(), signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Optional hardening: refuse test-mode events in production and vice versa.
  if (process.env.STRIPE_LIVE_MODE === "true" && !event.livemode) {
    console.warn(`[stripe-webhook] ignoring test event ${event.id} in live mode`);
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        if (s.mode === "subscription" && s.subscription) {
          await subscriptionFromId(s.subscription as string);
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;
        // Only subscription invoices renew access; ignore one-off invoices.
        if (subId) await subscriptionFromId(subId);
        break;
      }
      case "invoice.payment_failed": {
        // Card failed on renewal → reflect past_due immediately so the
        // paywall (via JWT refresh) locks them out at the next check.
        const invoice = event.data.object as Stripe.Invoice;
        const subId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;
        if (subId) await subscriptionFromId(subId);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // Event object IS the subscription — no extra API call needed.
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break; // acknowledge everything else
    }
  } catch (err) {
    console.error(`[stripe-webhook] handler failed for ${event.type}:`, err);
    // Return 500 so Stripe retries the delivery.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
