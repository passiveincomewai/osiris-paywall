// ── Failed-payment recovery (dunning) ────────────────────────────────
// When Stripe reports invoice.payment_failed for a subscription invoice,
// the customer gets ONE recovery email per payment attempt: the
// invoice's Stripe-hosted page (pay + update the card on file) plus a
// link to their billing page. Before this module, that rescue was a
// manual email from the owner (e.g. the 2026-10-23/24 Anthony Rodriguez
// conversion: Radar block, then a bank decline, invoice link sent by
// hand).
//
// Discipline, mirroring the lifecycle engine (lib/lifecycle/engine.ts):
//  - Sends go through the site mailer (lib/email → Resend) rendered in
//    the shared brand shell (lifecycle template, transactional kind).
//  - Every send is logged in LifecycleEmailLog under template
//    "payment_failed_recovery" with contextKey "<invoiceId>:<attempt>".
//    The (userId, template, contextKey) unique row IS the dedupe: a
//    replayed webhook event for the same attempt can never re-send,
//    while the NEXT Stripe attempt (attempt_count + 1) earns a fresh
//    email. No new table, no migration.
//  - Owner/test inboxes are never recipients (lifecycle EXCLUDED_EMAILS,
//    via isExcludedEmail — the same list the lifecycle guards use).
//  - A failed send writes NO log row, so a later event can retry it.
//  - Transactional mail: exempt from the marketing opt-out and the 48h
//    marketing cap (lib/lifecycle/guards.ts documents the class).

import type Stripe from "stripe";
import { db } from "@/lib/db";
import { emailConfigured, sendEmail } from "@/lib/email";
import { appUrl, stripe } from "@/lib/stripe";
import { isExcludedEmail } from "@/lib/lifecycle/config";
import { paymentFailedRecoveryEmail } from "@/lib/lifecycle/templates";
import { formatMoney } from "@/lib/billing/trial-reminders";

export const PAYMENT_RECOVERY_TEMPLATE = "payment_failed_recovery";

/**
 * Stripe API v18 removed Invoice.subscription. Invoices reference their
 * subscription through parent.subscription_details. (Same resolution
 * the webhook route performs; exported for the past-due banner.)
 */
export function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent;
  if (parent?.type === "subscription_details" && parent.subscription_details) {
    const s = parent.subscription_details.subscription;
    return typeof s === "string" ? s : s.id;
  }
  return null;
}

/** Dedupe key: one recovery email per invoice per Stripe payment attempt. */
export function recoveryContextKey(invoiceId: string, attemptCount: number): string {
  return `${invoiceId}:${Math.max(1, Math.floor(attemptCount) || 1)}`;
}

export type PaymentRecoverySkipReason =
  | "not_subscription_invoice"
  | "no_subscription_row"
  | "no_user"
  | "excluded_recipient"
  | "no_hosted_url"
  | "email_not_configured"
  | "already_sent"
  | "send_failed";

export type PaymentRecoveryResult =
  | { sent: true; userId: string; contextKey: string }
  | { sent: false; reason: PaymentRecoverySkipReason };

function formatAttemptDate(secs: number): string {
  return new Date(secs * 1000).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Send the recovery email for one failed invoice. Never throws for an
 * expected skip — every outcome is a PaymentRecoveryResult, and every
 * skip is console-logged with its reason (the webhook treats a mail
 * problem as best-effort and never fails the delivery for it).
 */
export async function sendPaymentFailedRecovery(
  invoice: Stripe.Invoice,
): Promise<PaymentRecoveryResult> {
  const skip = (reason: PaymentRecoverySkipReason): PaymentRecoveryResult => {
    console.warn(
      `[dunning] recovery email skipped for invoice ${invoice.id ?? "?"}: ${reason}`,
    );
    return { sent: false, reason };
  };

  if (!invoice.id) return skip("not_subscription_invoice");
  const subId = subscriptionIdFromInvoice(invoice);
  if (!subId) return skip("not_subscription_invoice");

  const sub = await db.subscription.findUnique({
    where: { stripeSubscriptionId: subId },
    select: { userId: true },
  });
  if (!sub) return skip("no_subscription_row");

  const user = await db.user.findUnique({
    where: { id: sub.userId },
    select: { id: true, email: true, name: true },
  });
  if (!user?.email) return skip("no_user");
  // The canonical owner/test exclusion list (also treats null as excluded).
  if (isExcludedEmail(user.email)) return skip("excluded_recipient");

  const hostedUrl = invoice.hosted_invoice_url;
  if (!hostedUrl) return skip("no_hosted_url");
  if (!emailConfigured()) return skip("email_not_configured");

  const contextKey = recoveryContextKey(invoice.id, invoice.attempt_count ?? 1);
  const existing = await db.lifecycleEmailLog.findUnique({
    where: {
      userId_template_contextKey: {
        userId: user.id,
        template: PAYMENT_RECOVERY_TEMPLATE,
        contextKey,
      },
    },
    select: { status: true },
  });
  if (existing?.status === "sent") return skip("already_sent");

  const rendered = paymentFailedRecoveryEmail({
    name: user.name,
    amountLabel: formatMoney(invoice.amount_due ?? 0, invoice.currency ?? "usd"),
    hostedInvoiceUrl: hostedUrl,
    accountUrl: `${appUrl()}/settings/subscription`,
    nextAttemptLabel: invoice.next_payment_attempt
      ? formatAttemptDate(invoice.next_payment_attempt)
      : null,
  });

  const ok = await sendEmail(user.email, rendered.subject, rendered.html);
  if (!ok) return skip("send_failed");

  try {
    await db.lifecycleEmailLog.create({
      data: {
        userId: user.id,
        recipientEmail: user.email,
        template: PAYMENT_RECOVERY_TEMPLATE,
        contextKey,
        kind: "transactional",
        subject: rendered.subject,
        status: "sent",
      },
    });
  } catch {
    // Unique-violation race: a concurrent delivery logged it first. The
    // email still went out exactly once per attempt in practice, and the
    // row that exists now blocks any replay — count it as sent.
  }
  return { sent: true, userId: user.id, contextKey };
}

// ── Past-due banner state (for /api/billing/past-due) ────────────────

export interface PastDueState {
  /** The open invoice the banner/email point at, or null (generic form). */
  invoiceId: string | null;
  hostedInvoiceUrl: string | null;
  /** Pre-formatted amount due (formatMoney), when an invoice resolved. */
  amountLabel: string | null;
}

/**
 * Resolve the past-due state for the in-app banner: null when the user
 * has no past_due subscription row; otherwise the open Stripe invoice
 * for THEIR subscription (the same pay/update target the recovery
 * email carries). Reads the same DB row the session JWT mirrors — the
 * JWT itself is never touched. Never throws: a Stripe failure degrades
 * to the generic state (invoice fields null → billing-page CTA).
 */
export async function getPastDueState(userId: string): Promise<PastDueState | null> {
  const sub = await db.subscription
    .findUnique({
      where: { userId },
      select: {
        status: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    })
    .catch(() => null);
  if (!sub || sub.status !== "past_due") return null;

  const generic: PastDueState = {
    invoiceId: null,
    hostedInvoiceUrl: null,
    amountLabel: null,
  };
  try {
    const list = await stripe().invoices.list({
      customer: sub.stripeCustomerId,
      status: "open",
      limit: 10,
    });
    const inv = list.data.find(
      (i) =>
        i.hosted_invoice_url &&
        subscriptionIdFromInvoice(i) === sub.stripeSubscriptionId,
    );
    if (!inv) return generic;
    return {
      invoiceId: inv.id ?? null,
      hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
      amountLabel: formatMoney(inv.amount_due ?? 0, inv.currency ?? "usd"),
    };
  } catch {
    return generic;
  }
}
