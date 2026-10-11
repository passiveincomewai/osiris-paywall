import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe, appUrl } from "@/lib/stripe";
import type { SubscriptionStatus } from "@prisma/client";
import { recordCommissionsForInvoice, reverseCommissionsForInvoice } from "@/lib/affiliate/commissions";
import { attributeUserToAffiliate, linkAttribution } from "@/lib/affiliate/attribution";
import { normalizeEmail, isValidEmail } from "@/lib/password-auth";
import { sendEmail, emailConfigured } from "@/lib/email";

export const runtime = "nodejs"; // signature verification needs the raw body

function toDate(secs: number | null | undefined): Date {
  return new Date((secs ?? 0) * 1000);
}

/**
 * Stripe API v18 moved the billing period off the subscription and onto its
 * items. The weekly pass is always a single item, so item[0] is canonical.
 */
function currentPeriod(sub: Stripe.Subscription): { start: Date; end: Date } {
  const item = sub.items.data[0];
  return {
    start: toDate(item?.current_period_start),
    end: toDate(item?.current_period_end),
  };
}

/**
 * Stripe API v18 removed Invoice.subscription. Invoices now reference their
 * subscription through parent.subscription_details.
 */
function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent;
  if (parent?.type === "subscription_details" && parent.subscription_details) {
    const s = parent.subscription_details.subscription;
    return typeof s === "string" ? s : s.id;
  }
  return null;
}

/**
 * Single write path for subscription state. Upsert keyed on the Stripe
 * subscription id (idempotent — safe to replay events). userId is resolved
 * from subscription metadata first, then from the existing DB row (covers
 * subscription.updated/deleted, which carry no client_reference_id).
 */
async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  // NOTE: Stripe's Metadata index signature types `.userId` as `string`
  // (never undefined), so the widening annotation is load-bearing.
  let userId: string | undefined = sub.metadata?.userId;
  if (!userId) {
    const row = await db.subscription.findUnique({
      where: { stripeSubscriptionId: sub.id },
      select: { userId: true },
    });
    userId = row?.userId ?? undefined;
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) {
    console.error(`[stripe-webhook] no customer on subscription ${sub.id}; skipping`);
    return;
  }

  // Guest checkout: no userId anywhere yet — resolve the account from the
  // Stripe customer's email. Paid buyers get their account auto-created
  // (email counts as verified — they just paid with it) and claim it with
  // a password on /welcome.
  if (!userId) {
    try {
      const customer = await stripe().customers.retrieve(customerId);
      const rawEmail =
        typeof customer !== "string" && !customer.deleted ? customer.email : null;
      const email = rawEmail ? normalizeEmail(rawEmail) : null;
      if (!email || !isValidEmail(email)) {
        console.error(`[stripe-webhook] no usable email for guest subscription ${sub.id}; skipping`);
        return;
      }
      let user = await db.user.findUnique({ where: { email } });
      if (!user) {
        const name =
          typeof customer !== "string" && !customer.deleted && customer.name
            ? customer.name
            : null;
        user = await db.user.create({
          data: { email, name, emailVerified: new Date() },
        });
        // Best-effort claim email with a direct link — /welcome covers buyers
        // who miss it.
        if (emailConfigured()) {
          try {
            const sessions = await stripe().checkout.sessions.list({ subscription: sub.id, limit: 1 });
            const csId = sessions.data[0]?.id;
            const claimUrl = csId ? `${appUrl()}/welcome?session_id=${csId}` : `${appUrl()}/welcome`;
            await sendEmail(
              email,
              "Your WorldEye Pro account is ready",
              `<p>Your Pro subscription is active. Create your account to get started:</p><p><a href="${claimUrl}">${claimUrl}</a></p>`
            );
          } catch (e) {
            console.error("[stripe-webhook] claim email failed:", e);
          }
        }
      }
      userId = user.id;
    } catch (e) {
      console.error(`[stripe-webhook] guest user resolution failed for ${sub.id}:`, e);
      return;
    }
  }

  const period = currentPeriod(sub);
  const data = {
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    stripePriceId: sub.items.data[0]?.price.id ?? "",
    // Stripe's Status union matches the Prisma SubscriptionStatus enum 1:1.
    // A future Stripe-side status would fail loudly here rather than
    // silently storing a wrong value.
    status: sub.status as SubscriptionStatus,
    currentPeriodStart: period.start,
    currentPeriodEnd: period.end,
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
        // Only subscription invoices renew access; ignore one-off invoices.
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceId = invoice.id;
        const subId = subscriptionIdFromInvoice(invoice);
        if (subId && invoiceId) {
          await subscriptionFromId(subId);
          // Affiliate commissions: only real paid subscription invoices.
          if (invoice.amount_paid > 0) {
            const sub = await db.subscription.findUnique({
              where: { stripeSubscriptionId: subId },
              select: { userId: true },
            });
            const userId = sub?.userId;
            if (userId) {
              // Prefer the affiliate captured at checkout (subscription metadata);
              // fall back to cookie-based attribution (no-op server-side).
              const stripeSub = await stripe().subscriptions.retrieve(subId);
              const affProfileId = stripeSub.metadata?.affiliateProfileId;
              if (affProfileId) {
                await linkAttribution(userId, affProfileId);
              } else {
                await attributeUserToAffiliate(userId);
              }
              const customerId =
                typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id ?? "";
              await recordCommissionsForInvoice({
                stripeInvoiceId: invoiceId,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subId,
                userId,
                amountCents: invoice.amount_paid,
                currency: invoice.currency ?? "usd",
              });
            }
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        // Card failed on renewal → reflect past_due immediately so the
        // paywall (via JWT refresh) locks them out at the next check.
        const subId = subscriptionIdFromInvoice(event.data.object as Stripe.Invoice);
        if (subId) await subscriptionFromId(subId);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // Event object IS the subscription — no extra API call needed.
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "charge.refunded": {
        // Reverse affiliate commissions tied to the refunded invoice.
        const charge = event.data.object as Stripe.Charge;
        // NOTE: `invoice` is not on the v18 Charge type; read it defensively
        // at runtime (Stripe still sends it on charge events).
        const chargeInvoice = (charge as unknown as { invoice?: string | { id?: string } | null }).invoice;
        const invoiceId = typeof chargeInvoice === "string" ? chargeInvoice : chargeInvoice?.id;
        if (invoiceId) await reverseCommissionsForInvoice(invoiceId, "charge.refunded");
        break;
      }
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
        if (chargeId) {
          const disputed = await stripe().charges.retrieve(chargeId);
          const dInvoice = (disputed as unknown as { invoice?: string | { id?: string } | null }).invoice;
          const invoiceId = typeof dInvoice === "string" ? dInvoice : dInvoice?.id;
          if (invoiceId) await reverseCommissionsForInvoice(invoiceId, "charge.dispute.created");
        }
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
