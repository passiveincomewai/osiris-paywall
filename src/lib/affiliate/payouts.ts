// ── Affiliate payout lifecycle: transitions + status emails ─────────────
// Single home for payout state changes so the admin API route and any
// internal tooling share the exact same guards, commission bookkeeping and
// email behaviour.
//
// Flow: requested → approved → processing → paid, plus rejected (from
// requested; commissions return to available). Every actual transition
// emails the affiliate in plain words, exactly once: Payout.lastEmailedStatus
// records the status last emailed, and a status email is only sent when it
// differs from the payout's current status. Owners are alerted by email the
// moment a request lands.

import { db } from "@/lib/db";
import { sendEmail, shell, appUrl, escapeHtml } from "@/lib/email";
import { formatVenmoHandle } from "./venmo";

export const PAYOUT_OWNER_EMAIL = "passiveincomewai@gmail.com";
export const PAYOUT_SLA_MS = 48 * 3600_000;

const fmtUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function fmtDenver(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    weekday: "short", month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(d);
}

function methodLabel(method: string, venmoHandle: string | null): string {
  if (method === "venmo") return venmoHandle ? `Venmo (${formatVenmoHandle(venmoHandle)})` : "Venmo";
  if (method === "stripe_connect") return "Stripe Connect";
  if (method === "paypal") return "PayPal"; // historical records only
  return "manual arrangement";
}

type PayoutWithAffiliate = {
  id: string;
  amountCents: number;
  method: string;
  status: string;
  providerRef: string | null;
  note: string | null;
  requestedAt: Date;
  lastEmailedStatus: string | null;
  affiliate: {
    payoutEmail: string | null;
    venmoHandle: string | null;
    user: { email: string; name: string | null };
  };
};

async function loadPayout(payoutId: string): Promise<PayoutWithAffiliate | null> {
  return db.payout.findUnique({
    where: { id: payoutId },
    include: { affiliate: { include: { user: { select: { email: true, name: true } } } } },
  }) as Promise<PayoutWithAffiliate | null>;
}

function affiliateEmail(p: PayoutWithAffiliate): string {
  return p.affiliate.payoutEmail ?? p.affiliate.user.email;
}

function bodyWrap(lines: string[]): string {
  return lines
    .map((l) => `<p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 10px;">${l}</p>`)
    .join("\n");
}

// ── Status emails ────────────────────────────────────────────────────────

export function payoutStatusEmail(p: PayoutWithAffiliate): { subject: string; html: string } | null {
  const amount = fmtUsd(p.amountCents);
  const first = escapeHtml(p.affiliate.user.name?.split(" ")[0] ?? "there");
  const method = escapeHtml(methodLabel(p.method, p.affiliate.venmoHandle));
  const dash = { label: "Open your affiliate dashboard", href: appUrl("/affiliates/dashboard") };
  switch (p.status) {
    case "requested":
      return {
        subject: `We received your payout request — ${amount}`,
        html: shell("Payout request received", `Your ${amount} payout request is in the queue.`,
          bodyWrap([
            `Hi ${first},`,
            `We received your payout request for <b style="color:#fff;">${amount}</b>, to be paid via ${method}.`,
            `We review payout requests within 48 hours and we'll email you at each step — approved, processing, and paid. No action is needed from you.`,
          ]), dash),
      };
    case "approved":
      return {
        subject: `Your payout of ${amount} was approved`,
        html: shell("Payout approved", `Your ${amount} payout was approved and is being prepared.`,
          bodyWrap([
            `Hi ${first},`,
            `Good news — your payout of <b style="color:#fff;">${amount}</b> has been approved and is being prepared.`,
            `Next step: we send it via ${method}, and you'll get another email when it's on its way.`,
          ]), dash),
      };
    case "processing":
      return {
        subject: `Your payout of ${amount} is processing`,
        html: shell("Payout processing", `Your ${amount} payout is now processing.`,
          bodyWrap([
            `Hi ${first},`,
            `Your payout of <b style="color:#fff;">${amount}</b> is now processing — it's on its way via ${method}.`,
            `You'll get a final email as soon as it's marked paid.`,
          ]), dash),
      };
    case "paid":
      return {
        subject: `Your payout of ${amount} has been paid`,
        html: shell("Payout paid", `Your ${amount} payout has been paid.`,
          bodyWrap([
            `Hi ${first},`,
            `Your payout of <b style="color:#fff;">${amount}</b> has been paid via ${method}.` +
              (p.providerRef ? ` Reference: ${escapeHtml(p.providerRef)}.` : ""),
            `Thanks for promoting WorldEye.`,
          ]), dash),
      };
    case "rejected":
      return {
        subject: `Your payout request of ${amount} was declined`,
        html: shell("Payout request declined", `Your payout request of ${amount} was declined.`,
          bodyWrap([
            `Hi ${first},`,
            `Your payout request of <b style="color:#fff;">${amount}</b> (via ${method}) was declined` +
              (p.note ? `: ${escapeHtml(p.note)}` : "."),
            `The commissions have returned to your available balance, so you can request a new payout whenever you're ready.`,
          ]), dash),
      };
    default:
      return null;
  }
}

/**
 * Send the affiliate the email for the payout's CURRENT status — but only
 * if that status hasn't already been emailed (exactly-once per transition).
 * `force` is the admin's explicit manual resend for delivery failures.
 * Returns true when an email was sent.
 */
export async function sendPayoutStatusEmail(payoutId: string, opts: { force?: boolean } = {}): Promise<boolean> {
  const p = await loadPayout(payoutId);
  if (!p) return false;
  if (!opts.force && p.lastEmailedStatus === p.status) return false;
  const mail = payoutStatusEmail(p);
  if (!mail) return false;
  const ok = await sendEmail(affiliateEmail(p), mail.subject, mail.html);
  if (ok) {
    await db.payout.update({ where: { id: p.id }, data: { lastEmailedStatus: p.status } });
  }
  return ok;
}

/** Owner alert + affiliate confirmation when a payout request lands. */
export async function notifyPayoutRequested(payoutId: string): Promise<{ ownerEmailed: boolean; affiliateEmailed: boolean }> {
  const p = await loadPayout(payoutId);
  if (!p) return { ownerEmailed: false, affiliateEmailed: false };
  const amount = fmtUsd(p.amountCents);
  const method = methodLabel(p.method, p.affiliate.venmoHandle);
  const deadline = new Date(p.requestedAt.getTime() + PAYOUT_SLA_MS);
  const ownerHtml = shell(
    "New affiliate payout request",
    `${amount} payout requested — 48-hour processing window.`,
    bodyWrap([
      `<b style="color:#fff;">Affiliate:</b> ${escapeHtml(p.affiliate.user.name ?? "—")} &lt;${escapeHtml(p.affiliate.user.email)}&gt;`,
      `<b style="color:#fff;">Amount:</b> ${amount}`,
      `<b style="color:#fff;">Method:</b> ${escapeHtml(method)}`,
      `<b style="color:#fff;">Payout email:</b> ${escapeHtml(p.affiliate.payoutEmail ?? p.affiliate.user.email)}`,
      `<b style="color:#fff;">Requested:</b> ${fmtDenver(p.requestedAt)}`,
      `<b style="color:#fff;">48-hour deadline:</b> ${fmtDenver(deadline)}`,
      `Review it in the admin payout queue.`,
    ]),
    { label: "Open the payout queue", href: appUrl("/admin/affiliates") },
  );
  const ownerEmailed = await sendEmail(
    PAYOUT_OWNER_EMAIL,
    `Payout requested: ${amount} — ${p.affiliate.user.name ?? p.affiliate.user.email} (${method})`,
    ownerHtml,
  ).catch(() => false);
  const affiliateEmailed = await sendPayoutStatusEmail(payoutId).catch(() => false);
  return { ownerEmailed, affiliateEmailed };
}

// ── Transitions ──────────────────────────────────────────────────────────

export type PayoutAction = "approve" | "reject" | "start_processing" | "mark_paid" | "resend_email";

export type TransitionResult =
  | { ok: true; status: string; emailed: boolean }
  | { ok: false; error: string; httpStatus: number };

const TRANSITIONS: Record<Exclude<PayoutAction, "resend_email">, { from: string[]; to: string }> = {
  approve: { from: ["requested"], to: "approved" },
  reject: { from: ["requested"], to: "rejected" },
  start_processing: { from: ["approved"], to: "processing" },
  mark_paid: { from: ["approved", "processing"], to: "paid" },
};

export async function transitionPayout(
  payoutId: string,
  action: PayoutAction,
  opts: { decidedBy?: string; providerRef?: string; note?: string } = {},
): Promise<TransitionResult> {
  const payout = await db.payout.findUnique({ where: { id: payoutId } });
  if (!payout) return { ok: false, error: "Not found", httpStatus: 404 };

  if (action === "resend_email") {
    // Explicit admin resend (delivery-failure recovery). Not a transition;
    // the exactly-once rule governs automatic sends, this is a human retry.
    const emailed = await sendPayoutStatusEmail(payoutId, { force: true });
    return { ok: true, status: payout.status, emailed };
  }

  const t = TRANSITIONS[action];
  if (!t.from.includes(payout.status)) {
    return {
      ok: false,
      error: action === "mark_paid" && payout.status === "requested" ? "Approve first" : "Bad state",
      httpStatus: 400,
    };
  }

  const decided = { decidedAt: new Date(), decidedBy: opts.decidedBy, note: opts.note };
  if (action === "reject") {
    await db.$transaction([
      db.payout.update({ where: { id: payout.id }, data: { status: "rejected", ...decided } }),
      // Return the commissions to available so they can be requested again.
      db.commission.updateMany({ where: { payoutId: payout.id, status: "requested" }, data: { status: "available", payoutId: null } }),
    ]);
  } else if (action === "mark_paid") {
    await db.$transaction([
      db.payout.update({ where: { id: payout.id }, data: { status: "paid", ...decided, providerRef: opts.providerRef } }),
      db.commission.updateMany({ where: { payoutId: payout.id }, data: { status: "paid" } }),
    ]);
  } else {
    await db.payout.update({ where: { id: payout.id }, data: { status: t.to as "approved" | "processing", ...decided } });
  }

  const emailed = await sendPayoutStatusEmail(payoutId).catch(() => false);
  return { ok: true, status: t.to, emailed };
}
