/**
 * Support WorldEye donations — webhook-side recording (server only).
 *
 * The Stripe webhook is the ONLY writer of Donation rows. Detection
 * is metadata-first: every donation session/subscription carries
 * metadata.type === "donation" (set by POST /api/donate/session in
 * session metadata, payment-intent metadata, and subscription_data
 * metadata — the last of which Stripe copies onto the subscription).
 *
 * Idempotency: stripeRef (checkout session id, or invoice id for a
 * monthly renewal) is UNIQUE; a replayed event finds the existing row
 * and stops. Recording also flips User.supporter for signed-in donors
 * so donation prompts stop for their account.
 */
import type Stripe from "stripe";
import { db } from "@/lib/db";
import type { DonateFrequency } from "./config";

export function isDonationMetadata(
  md: Record<string, string> | null | undefined,
): boolean {
  return md?.type === "donation";
}

function frequencyOf(
  md: Record<string, string> | null | undefined,
): DonateFrequency {
  return md?.frequency === "monthly" ? "monthly" : "once";
}

export interface DonationRecordInput {
  stripeRef: string;
  amountCents: number;
  currency: string;
  frequency: DonateFrequency;
  source: string | null;
  userId: string | null;
  email: string | null;
}

export async function markSupporter(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { supporter: true },
  });
}

/**
 * Insert the donation row (once) and set the supporter flag when the
 * donor is a signed-in user. A userId that does not resolve to a real
 * account is stored as null rather than failing the row (the donor's
 * email still identifies the gift).
 */
export async function recordDonation(input: DonationRecordInput): Promise<void> {
  let userId = input.userId;
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) userId = null;
  }
  const existing = await db.donation.findUnique({
    where: { stripeRef: input.stripeRef },
    select: { id: true },
  });
  if (!existing) {
    await db.donation.create({
      data: {
        userId,
        email: input.email,
        amountCents: input.amountCents,
        currency: input.currency,
        frequency: input.frequency,
        source: input.source,
        stripeRef: input.stripeRef,
      },
    });
  }
  if (userId) await markSupporter(userId);
}

/** Donation record from a completed checkout session (the first
 * payment for both one-time and monthly donations). Null when the
 * session is not a donation. */
export function donationFromCheckoutSession(
  session: Stripe.Checkout.Session,
): DonationRecordInput | null {
  if (!isDonationMetadata(session.metadata)) return null;
  return {
    stripeRef: session.id,
    amountCents: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    frequency: frequencyOf(session.metadata),
    source: session.metadata?.source ?? null,
    userId:
      session.client_reference_id ?? session.metadata?.userId ?? null,
    email:
      session.customer_details?.email ?? session.customer_email ?? null,
  };
}

/** Donation record from a paid invoice on a donation subscription
 * (monthly renewals). Null for non-donations and zero-amount
 * invoices. The subscription's FIRST invoice is skipped by the
 * caller (billing_reason "subscription_create") because the checkout
 * session branch already recorded that payment. */
export function donationFromInvoice(
  invoice: Stripe.Invoice,
  sub: Stripe.Subscription,
): DonationRecordInput | null {
  if (!isDonationMetadata(sub.metadata)) return null;
  if (!invoice.id || (invoice.amount_paid ?? 0) <= 0) return null;
  return {
    stripeRef: invoice.id,
    amountCents: invoice.amount_paid,
    currency: invoice.currency ?? "usd",
    frequency: "monthly",
    source: sub.metadata?.source ?? null,
    userId: sub.metadata?.userId ?? null,
    email: invoice.customer_email ?? null,
  };
}
