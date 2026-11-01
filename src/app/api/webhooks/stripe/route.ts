import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe, appUrl } from "@/lib/stripe";
import type { SubscriptionStatus } from "@prisma/client";
import { recordCommissionsForInvoice, reverseCommissionsForInvoice } from "@/lib/affiliate/commissions";
import { creditPackPurchase } from "@/lib/studio/credits";
import { getCreditConfig } from "@/lib/studio/credits-settings";
import { attributeUserToAffiliate, linkAttribution } from "@/lib/affiliate/attribution";
import { grantInviteCameraBonus } from "@/lib/camera-bonus";
import { attributeUserToDiscountAffiliate } from "@/lib/affiliate/discount";
import { normalizeEmail, isValidEmail } from "@/lib/password-auth";
import { sendEmail, emailConfigured } from "@/lib/email";
import { sendGrowthEvent, hashUserRef } from "@/lib/growth";
import { sendMetaEvent } from "@/lib/meta-capi";
import { getTeamPricingConfig } from "@/lib/team/pricing-config";
import { findBaseItem, reconcileOrgSeatsFromSubscription } from "@/lib/team/seats";
import { recordTeamEvent } from "@/lib/team/analytics";
import { sendPaymentFailedRecovery } from "@/lib/billing/dunning";
import { fulfillGiftPurchase, isGiftStripeSubscription } from "@/lib/billing/gift";
import { isAmbientPriceId, isPowderPassPriceId } from "@/lib/plan-tier";
import {
  trialConvertedWelcomeEmail,
  planChangedEmail,
  cardUpdatedEmail,
  refundProcessedEmail,
} from "@/lib/email";
import { describeStripePrice, formatMoney, planByPriceIdFromEnv } from "@/lib/billing/trial-reminders";
import { isExcludedEmail } from "@/lib/lifecycle/config";

export const runtime = "nodejs"; // signature verification needs the raw body

function toDate(secs: number | null | undefined): Date {
  return new Date((secs ?? 0) * 1000);
}

/**
 * Stripe API v18 moved the billing period off the subscription and onto its
 * items. Team Access adds a graduated SEAT item to the same subscription,
 * so item[0] is no longer guaranteed to be the base plan: the period and
 * the stored stripePriceId must come from the BASE item — the first item
 * that is not a seat price / not the seat product (lib/team/seats
 * findBaseItem). Falls back to item[0] when nothing qualifies.
 */
function currentPeriod(
  sub: Stripe.Subscription,
  config: Awaited<ReturnType<typeof getTeamPricingConfig>>,
): { start: Date; end: Date } {
  const item = findBaseItem(sub, config) ?? sub.items.data[0];
  return {
    start: toDate(item?.current_period_start),
    end: toDate(item?.current_period_end),
  };
}

function basePriceId(
  sub: Stripe.Subscription,
  config: Awaited<ReturnType<typeof getTeamPricingConfig>>,
): string {
  const item = findBaseItem(sub, config) ?? sub.items.data[0];
  return item?.price?.id ?? "";
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
 * Once-only customer notice, deduped through LifecycleEmailLog (the
 * dunning pattern): the log row is written ONLY after a successful
 * send, so a failed send is retried by Stripe's replay and a
 * successful one can never repeat. Used by the 2026-11 round-2
 * webhook emails (trial-converted welcome, plan change, card added,
 * refund processed).
 */
async function sendOncePerKey(input: {
  userId: string;
  template: string;
  contextKey: string;
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const already = await db.lifecycleEmailLog.findUnique({
    where: {
      userId_template_contextKey: {
        userId: input.userId,
        template: input.template,
        contextKey: input.contextKey,
      },
    },
    select: { id: true },
  });
  if (already) return;
  const ok = await sendEmail(input.to, input.subject, input.html);
  if (ok) {
    await db.lifecycleEmailLog.create({
      data: { userId: input.userId, template: input.template, contextKey: input.contextKey },
    });
  }
}

/**
 * Single write path for subscription state. Upsert keyed on the Stripe
 * subscription id (idempotent — safe to replay events). userId is resolved
 * from subscription metadata first, then from the existing DB row (covers
 * subscription.updated/deleted, which carry no client_reference_id).
 */
async function syncSubscription(sub: Stripe.Subscription): Promise<string | undefined> {
  // Gift subscriptions (lib/billing/gift) never entitle anyone: the
  // buyer paid for a RECIPIENT's prepaid term, fulfilled through the
  // GiftSubscription row on checkout.session.completed. Syncing one
  // here would hand the buyer (or a guest-resolved account) a plan
  // they bought for someone else.
  if (isGiftStripeSubscription(sub)) {
    return undefined;
  }
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
    return undefined;
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
        return undefined;
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
      return undefined;
    }
  }

  const teamConfig = await getTeamPricingConfig();
  const period = currentPeriod(sub, teamConfig);
  const data = {
    userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: sub.id,
    stripePriceId: basePriceId(sub, teamConfig),
    // Stripe's Status union matches the Prisma SubscriptionStatus enum 1:1.
    // A future Stripe-side status would fail loudly here rather than
    // silently storing a wrong value.
    status: sub.status as SubscriptionStatus,
    currentPeriodStart: period.start,
    currentPeriodEnd: period.end,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
  };

  // Comp (free Pro) rows carry synthetic ids ("comp_…", see
  // src/lib/pro/comp.ts) and sit on the same userId @unique slot. If this
  // user now has a REAL Stripe subscription, the comp row must yield —
  // otherwise the upsert below would try to create a second row for the
  // user and fail on the unique constraint, stranding a paying customer.
  // Only comp rows are ever deleted here; a real row is never touched
  // (a second real sub for the same user keeps the existing behavior).
  const existingForUser = await db.subscription.findUnique({
    where: { userId },
    select: { stripeSubscriptionId: true, stripePriceId: true },
  });
  if (
    existingForUser &&
    existingForUser.stripeSubscriptionId.startsWith("comp_") &&
    existingForUser.stripeSubscriptionId !== sub.id
  ) {
    await db.subscription.delete({ where: { userId } });
  }

  // Standalone-product yield (owner-approved 2026-10-26 for Ambient;
  // extended to Powder Pass at its foundation slice): Ambient and
  // Powder Pass are standalone $4.99 subscriptions, NOT tiers — but
  // Subscription.userId is @unique, so one row per user. When a TIER
  // subscription syncs for a user whose row is a standalone
  // subscription, the standalone sub is cancelled at Stripe and its
  // row yields the slot. The reverse (a standalone sub syncing over a
  // tier row — possible only if that cancel failed, or via an
  // out-of-band purchase) is a no-op: the tier row wins and the
  // orphaned standalone sub's events must not clobber it. A
  // standalone sub syncing over the OTHER standalone product (a swap
  // the checkout guard deliberately allows) takes the slot the same
  // way, cancelling the displaced sub so it stops billing.
  //
  // Inclusion note: Ambient is included in every Pro/VIP tier, so a
  // tier upgrade loses the buyer nothing. Powder Pass is included in
  // VIP only — a ski holder who buys a weekly/monthly (Pro) plan
  // still yields and cancels, per the owner's tier-over-ski rule;
  // that asymmetry is called out in the Powder Pass foundation
  // report as a launch decision, and it cannot bite while
  // POWDER_PASS_ENABLED is off (no ski subs can exist).
  if (existingForUser && existingForUser.stripeSubscriptionId !== sub.id) {
    const standaloneOf = (priceId: string): "Ambient" | "Powder Pass" | null =>
      isAmbientPriceId(priceId, process.env)
        ? "Ambient"
        : isPowderPassPriceId(priceId, process.env)
          ? "Powder Pass"
          : null;
    const existingStandalone = standaloneOf(existingForUser.stripePriceId);
    const incomingStandalone = standaloneOf(data.stripePriceId);
    if (
      existingStandalone &&
      (!incomingStandalone || incomingStandalone !== existingStandalone)
    ) {
      try {
        await stripe().subscriptions.cancel(existingForUser.stripeSubscriptionId);
        console.log(
          `[stripe-webhook] cancelled ${existingStandalone} sub ${existingForUser.stripeSubscriptionId} for user ${userId} (upgraded to ${sub.id})`,
        );
      } catch (e) {
        console.error(
          `[stripe-webhook] failed to cancel ${existingStandalone} sub ${existingForUser.stripeSubscriptionId} on upgrade:`,
          e,
        );
      }
      await db.subscription.delete({ where: { userId } });
    } else if (incomingStandalone && !existingStandalone) {
      console.log(
        `[stripe-webhook] ignoring ${incomingStandalone} sub ${sub.id} for user ${userId}: a tier subscription already holds the row`,
      );
      return userId;
    }
  }

  await db.subscription.upsert({
    where: { stripeSubscriptionId: sub.id },
    create: data,
    update: data,
  });

  // Team Access: if this subscriber owns an organization, reconcile its
  // seat state from the subscription's items (webhook is the reconciler
  // of record). Best-effort — a seat reconcile failure must not fail
  // the subscription sync above.
  try {
    const org = await db.organization.findUnique({ where: { ownerId: userId } });
    if (org) {
      await reconcileOrgSeatsFromSubscription(
        { id: org.id, pendingSeats: org.pendingSeats },
        sub,
        teamConfig,
      );
    }
  } catch (e) {
    console.error("[stripe-webhook] team seat reconcile failed:", e);
  }
  return userId;
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
    // NOTE: checkout.session.created is a real Stripe event but missing from
    // the stripe@18.5.0 Event type union — hence the string comparison.
    if ((event.type as string) === "checkout.session.created") {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode === "subscription") {
        const email = s.customer_details?.email ?? s.customer_email ?? null;
        const plan = s.metadata?.plan ?? null;
        await db.checkoutAttempt.upsert({
          where: { stripeSessionId: s.id },
          create: { stripeSessionId: s.id, email, plan },
          update: {},
        }).catch(() => {});
      }
      return NextResponse.json({ received: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        // Studio credit packs (Phase 3): one-time payment sessions whose
        // metadata names the pack + buyer profile. The credit amount is
        // resolved from the server-side pack config by id — never from
        // anything the client sent — and crediting is idempotent on the
        // checkout session id, so Stripe replays can never double-credit.
        // Only sessions Stripe reports as actually paid are credited.
        if (s.mode === "payment" && s.metadata?.kind === "studio_credit_pack") {
          if (s.payment_status === "paid") {
            const packId = s.metadata.packId ?? "";
            const profileId = s.metadata.profileId ?? "";
            const config = await getCreditConfig();
            const pack = config.creditPacks.find((p) => p.id === packId);
            if (pack && profileId) {
              const result = await creditPackPurchase({
                profileId,
                credits: pack.credits,
                idempotencyKey: `stripe_checkout_session:${s.id}`,
              });
              console.log(
                `[stripe-webhook] credit pack "${pack.id}" (+${pack.credits}) for profile ${profileId}: ${result.credited ? "credited" : "already credited (replay)"}`,
              );
            } else {
              console.error(
                `[stripe-webhook] credit pack session ${s.id}: unknown pack "${packId}" or missing profile — not credited`,
              );
            }
          }
        }
        // Gift subscriptions: the buyer paid for a recipient's one
        // prepaid term. fulfilment (gift pending → paid, renewal
        // cancelled, recipient emailed a redemption link) lives in
        // lib/billing/gift and is idempotent on the gift row, so
        // Stripe replays no-op. The generic subscription branch below
        // must NOT also run: syncSubscription skips gift subs anyway,
        // and the gift purchase is not the buyer's own conversion
        // (no Meta CAPI twin, no discount attribution).
        if (s.mode === "subscription" && s.metadata?.kind === "gift") {
          const giftResult = await fulfillGiftPurchase(s);
          if (giftResult.handled) {
            await db.checkoutAttempt.updateMany({
              where: { stripeSessionId: s.id },
              data: { status: "completed" },
            }).catch(() => {});
            break;
          }
        }
        if (s.mode === "subscription" && s.subscription) {
          const subId = s.subscription as string;
          await subscriptionFromId(subId);
          // Meta Conversions API twins of the /welcome browser events.
          // The event id is the checkout session id — exactly what
          // WelcomeClient fires as the fbq eventID — so Meta
          // deduplicates the pair. Trialing → StartTrial; paid →
          // Purchase. Additive + fire-and-forget (sendMetaEvent no-ops
          // without META_CAPI_ACCESS_TOKEN and never throws); the whole
          // block is guarded so it can never fail the webhook.
          try {
            const subRow = await db.subscription.findUnique({
              where: { stripeSubscriptionId: subId },
              select: { status: true, userId: true },
            });
            const buyerEmail =
              s.customer_details?.email ??
              (subRow?.userId
                ? (await db.user.findUnique({
                    where: { id: subRow.userId },
                    select: { email: true },
                  }))?.email
                : null);
            if (subRow?.status === "trialing") {
              void sendMetaEvent({
                eventName: "StartTrial",
                eventId: s.id,
                eventSourceUrl: `${appUrl()}/welcome`,
                userData: { email: buyerEmail },
              });
            } else if (s.payment_status === "paid") {
              void sendMetaEvent({
                eventName: "Purchase",
                eventId: s.id,
                eventSourceUrl: `${appUrl()}/welcome`,
                userData: { email: buyerEmail },
                value: typeof s.amount_total === "number" ? s.amount_total / 100 : undefined,
                currency: (s.currency ?? "usd").toUpperCase(),
              });
            }
          } catch (e) {
            console.error("[stripe-webhook] meta CAPI (checkout completed) failed:", e);
          }
          // Discount-code attribution fallback: if the buyer redeemed an
          // affiliate's tiered discount code and has no stronger
          // attribution, credit that affiliate. The link/cookie path stays
          // primary — when the subscription carries affiliateProfileId
          // metadata (captured at checkout from the referral cookie), the
          // invoice handler links it and this fallback stays out of the
          // way. linkAttribution itself is also first-write-wins.
          const promo = (s.discounts ?? [])[0]?.promotion_code ?? null;
          if (promo) {
            try {
              const subRow = await db.subscription.findUnique({
                where: { stripeSubscriptionId: subId },
                select: { userId: true },
              });
              const stripeSub = await stripe().subscriptions.retrieve(subId).catch(() => null);
              if (subRow?.userId && !stripeSub?.metadata?.affiliateProfileId) {
                await attributeUserToDiscountAffiliate(subRow.userId, promo);
              }
            } catch (e) {
              // Attribution is best-effort here — the subscription sync
              // above already succeeded; never fail the webhook for it.
              console.error("[stripe-webhook] discount attribution failed:", e);
            }
          }
        }
        // Close any tracked cart attempt — they converted.
        await db.checkoutAttempt.updateMany({
          where: { stripeSessionId: s.id },
          data: { status: "completed" },
        }).catch(() => {});
        break;
      }
      case "invoice.payment_succeeded": {
        // Only subscription invoices renew access; ignore one-off invoices.
        const invoice = event.data.object as Stripe.Invoice;
        const invoiceId = invoice.id;
        const subId = subscriptionIdFromInvoice(invoice);
        if (subId && invoiceId) {
          // Read the pre-sync status first: a paid invoice landing on a
          // subscription that was trialing is the trial CONVERSION —
          // the Purchase the /welcome StartTrial was the front half of.
          const priorStatus = (
            await db.subscription
              .findUnique({ where: { stripeSubscriptionId: subId }, select: { status: true } })
              .catch(() => null)
          )?.status;
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
              // Invite-a-friend camera bonus: for a guest whose account
              // this checkout created, the attribution above is their
              // signup completing — pay the inviter's +15 camera opens.
              // Idempotent per invitee; best-effort like the attribution
              // itself — never fail the webhook for a bonus.
              try {
                await grantInviteCameraBonus(userId);
              } catch (e) {
                console.error("[stripe-webhook] invite camera bonus failed:", e);
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
              // Growth Engine conversion event (no-op until configured).
              // Idempotency key = invoice id, so Stripe replays dedupe.
              // UTMs are not available server-side at renewal time; campaign
              // attribution for revenue joins via the user's signup window
              // in the Growth Engine, traffic via PageView UTM aggregates.
              void sendGrowthEvent({
                type: "paid_subscription",
                userRef: hashUserRef(userId),
                amountCents: invoice.amount_paid,
                currency: invoice.currency ?? "usd",
                idempotencyKey: `invoice:${invoiceId}`,
              });
              // Meta CAPI: trial conversion → Purchase. The event id is
              // the invoice id: invoice events don't carry the checkout
              // session id, and there is no browser twin at conversion
              // time (the buyer's /welcome event was StartTrial) — this
              // one is server-only, keyed for Stripe-replay idempotence
              // in Meta's dedup window by its own id.
              if (priorStatus === "trialing") {
                try {
                  const buyer = await db.user.findUnique({
                    where: { id: userId },
                    select: { email: true },
                  });
                  void sendMetaEvent({
                    eventName: "Purchase",
                    eventId: invoiceId,
                    eventSourceUrl: `${appUrl()}/pricing`,
                    userData: { email: buyer?.email },
                    value: invoice.amount_paid / 100,
                    currency: (invoice.currency ?? "usd").toUpperCase(),
                  });
                } catch (e) {
                  console.error("[stripe-webhook] meta CAPI (trial conversion) failed:", e);
                }
                // Trial-converted welcome (round 2, R2): the customer
                // hears it from us too — what converted, what was
                // charged, when the paid period ends. Figures come
                // from the invoice + the live Stripe price; once per
                // subscription via LifecycleEmailLog.
                try {
                  if (emailConfigured()) {
                    const buyer = await db.user.findUnique({
                      where: { id: userId },
                      select: { email: true, name: true },
                    });
                    const subRow = await db.subscription.findUnique({
                      where: { stripeSubscriptionId: subId },
                      select: { currentPeriodEnd: true },
                    });
                    const price = stripeSub.items.data[0]?.price;
                    if (buyer && subRow && price && !isExcludedEmail(buyer.email)) {
                      const desc = describeStripePrice(
                        {
                          id: price.id,
                          unit_amount: price.unit_amount,
                          currency: price.currency,
                          recurring: price.recurring
                            ? { interval: price.recurring.interval, interval_count: price.recurring.interval_count }
                            : null,
                        },
                        planByPriceIdFromEnv(process.env),
                      );
                      const mail = trialConvertedWelcomeEmail({
                        name: buyer.name,
                        planName: desc.planLabel,
                        amountLabel: formatMoney(invoice.amount_paid, invoice.currency ?? "usd"),
                        periodEndLabel: subRow.currentPeriodEnd.toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        }),
                      });
                      await sendOncePerKey({
                        userId,
                        template: "trial_converted_welcome",
                        contextKey: subId,
                        to: buyer.email,
                        subject: mail.subject,
                        html: mail.html,
                      });
                    }
                  }
                } catch (e) {
                  console.error("[stripe-webhook] trial-converted welcome failed:", e);
                }
              }
            }
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        // Card failed on renewal → reflect past_due immediately so the
        // paywall (via JWT refresh) locks them out at the next check.
        const invoice = event.data.object as Stripe.Invoice;
        const subId = subscriptionIdFromInvoice(invoice);
        if (subId) await subscriptionFromId(subId);
        // Dunning: email the customer a recovery link (the invoice's
        // hosted page + their billing page). Best-effort — the status
        // sync above is the critical path, so a mail failure is logged,
        // never thrown (it must not fail the webhook delivery). The
        // send is deduped per invoice attempt via LifecycleEmailLog, so
        // Stripe replays can't double-send.
        try {
          const recovery = await sendPaymentFailedRecovery(invoice);
          if (recovery.sent) {
            console.log(
              `[stripe-webhook] payment recovery email sent for invoice ${invoice.id} (attempt key ${recovery.contextKey})`,
            );
          }
        } catch (e) {
          console.error("[stripe-webhook] payment recovery email failed:", e);
        }
        break;
      }
      case "customer.subscription.updated": {
        // Event object IS the subscription — no extra API call needed.
        const updatedSub = event.data.object as Stripe.Subscription;
        const updatedUserId = await syncSubscription(updatedSub);
        // Plan-change confirmation (round 2, R5): previous_attributes
        // carries the pre-change items; a different base price id IS
        // the plan/interval switch. Status flips (trial conversion,
        // cancellation flags) are not plan changes and stay silent
        // here — they have their own emails.
        try {
          const prevAttrs = (
            event.data as {
              previous_attributes?: {
                items?: { data?: Array<{ price?: { id?: string } }> };
              };
            }
          ).previous_attributes;
          const prevPriceId = prevAttrs?.items?.data?.[0]?.price?.id;
          const newPriceId = updatedSub.items.data[0]?.price?.id;
          if (
            updatedUserId &&
            prevPriceId &&
            newPriceId &&
            prevPriceId !== newPriceId &&
            emailConfigured()
          ) {
            const user = await db.user.findUnique({
              where: { id: updatedUserId },
              select: { email: true, name: true },
            });
            if (user && !isExcludedEmail(user.email)) {
              const s = stripe();
              const planByPriceId = planByPriceIdFromEnv(process.env);
              const labelFor = async (priceId: string) => {
                const p = await s.prices.retrieve(priceId);
                const d = describeStripePrice(
                  {
                    id: p.id,
                    unit_amount: p.unit_amount,
                    currency: p.currency,
                    recurring: p.recurring
                      ? { interval: p.recurring.interval, interval_count: p.recurring.interval_count }
                      : null,
                  },
                  planByPriceId,
                );
                return `${d.planLabel} — ${d.chargeLabel}`;
              };
              const mail = planChangedEmail({
                name: user.name,
                oldLabel: await labelFor(prevPriceId),
                newLabel: await labelFor(newPriceId),
              });
              await sendOncePerKey({
                userId: updatedUserId,
                template: "plan_changed",
                contextKey: `${updatedSub.id}:${event.id}`,
                to: user.email,
                subject: mail.subject,
                html: mail.html,
              });
            }
          }
        } catch (e) {
          console.error("[stripe-webhook] plan-change email failed:", e);
        }
        break;
      }
      case "payment_method.attached": {
        // Card added/replaced (round 2, R5): a security-relevant
        // billing change the account holder should hear about from us.
        try {
          const pm = event.data.object as Stripe.PaymentMethod;
          const customerId = typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
          if (customerId && emailConfigured()) {
            const subRow = await db.subscription.findFirst({
              where: { stripeCustomerId: customerId },
              select: { userId: true },
            });
            const user = subRow
              ? await db.user.findUnique({
                  where: { id: subRow.userId },
                  select: { email: true, name: true },
                })
              : null;
            if (subRow && user && !isExcludedEmail(user.email)) {
              const cardLabel = pm.card
                ? `${pm.card.brand ? pm.card.brand[0].toUpperCase() + pm.card.brand.slice(1) : "Card"} ending ${pm.card.last4}`
                : null;
              const mail = cardUpdatedEmail({ name: user.name, cardLabel });
              await sendOncePerKey({
                userId: subRow.userId,
                template: "card_updated",
                contextKey: pm.id,
                to: user.email,
                subject: mail.subject,
                html: mail.html,
              });
            }
          }
        } catch (e) {
          console.error("[stripe-webhook] card-updated email failed:", e);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const deletedSub = event.data.object as Stripe.Subscription;
        // Capture pre-sync seat state so the cancellation event fires
        // exactly when an org actually had seats on this subscription.
        let seatOrg: { id: string; ownerId: string; hadSeats: boolean } | null = null;
        try {
          let ownerId: string | undefined = deletedSub.metadata?.userId;
          if (!ownerId) {
            const row = await db.subscription.findUnique({
              where: { stripeSubscriptionId: deletedSub.id },
              select: { userId: true },
            });
            ownerId = row?.userId ?? undefined;
          }
          if (ownerId) {
            const org = await db.organization.findUnique({ where: { ownerId } });
            if (org) {
              seatOrg = {
                id: org.id,
                ownerId,
                hadSeats: org.purchasedSeats > 0 || !!org.stripeSeatItemId,
              };
            }
          }
        } catch {
          seatOrg = null;
        }
        await syncSubscription(deletedSub);
        if (seatOrg?.hadSeats) {
          await recordTeamEvent("team_subscription_canceled", seatOrg.ownerId, seatOrg.id);
        }
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
        // Refund-processed notice (round 2, R6): the amount Stripe
        // shows as refunded on this charge, nothing more. One email
        // per (charge, refunded-total) step, so a later second partial
        // refund produces its own notice and replays never repeat.
        try {
          if (charge.amount_refunded > 0 && emailConfigured()) {
            const customerId = typeof charge.customer === "string" ? charge.customer : charge.customer?.id;
            const subRow = customerId
              ? await db.subscription.findFirst({
                  where: { stripeCustomerId: customerId },
                  select: { userId: true },
                })
              : null;
            const user = subRow
              ? await db.user.findUnique({
                  where: { id: subRow.userId },
                  select: { email: true, name: true },
                })
              : null;
            const to = user?.email ?? charge.receipt_email ?? charge.billing_details?.email ?? null;
            if (subRow && user && to && !isExcludedEmail(to)) {
              const mail = refundProcessedEmail({
                name: user.name,
                amountLabel: formatMoney(charge.amount_refunded, charge.currency ?? "usd"),
              });
              await sendOncePerKey({
                userId: subRow.userId,
                template: "refund_processed",
                contextKey: `${charge.id}:${charge.amount_refunded}`,
                to,
                subject: mail.subject,
                html: mail.html,
              });
            }
          }
        } catch (e) {
          console.error("[stripe-webhook] refund email failed:", e);
        }
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
