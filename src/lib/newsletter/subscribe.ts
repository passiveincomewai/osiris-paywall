// ── The one newsletter subscribe routine ────────────────────────────────
// Every growth surface (footer form, email-capture cards, the signup and
// /welcome claim opt-ins) lands here — a single mechanism, never a
// parallel one.
//
// Flow (changed 2026-10-28 on Jameson's instruction): there is NO
// double opt-in any more. The address is validated the moment it is
// entered (lib/newsletter/validate-email: syntax, placeholder and
// disposable domains, junk patterns, typo suggestion, and a DNS check
// that the domain can receive mail) and a passing address is subscribed
// IMMEDIATELY — the row is created already verified, and the only email
// sent is the welcome message carrying the unsubscribe link. Nobody is
// asked to confirm by email, and junk like a@a.com never reaches the
// list. The legacy /api/newsletter/verify route still exists for
// confirmation links sent before this change; nothing new mints them.
//
// Outcomes, not exceptions, for the expected cases — an invalid or
// mistyped address, a transient DNS failure, and an already-subscribed
// address are normal answers, and the signup opt-in in particular must
// learn "already subscribed" without treating it as a failure.
// Unexpected errors (database down) throw: the HTTP route turns them
// into a 500, the account-creation flows catch + log them so an opt-in
// can never break account creation.
import { db } from "@/lib/db";
import { sendEmail, newsletterWelcomeEmail, appUrl } from "@/lib/email";
import { validateEmailAddress } from "./validate-email";

/** The `source` tag stored on the subscriber row (capped at 40 chars). */
export type NewsletterSource = string;

export type SubscribeOutcome =
  | { kind: "invalid"; code: string; message: string }
  | { kind: "suggestion"; suggestion: string; message: string }
  | { kind: "unavailable"; message: string }
  | { kind: "already" }
  | { kind: "subscribed"; emailed: boolean };

export interface SubscribeOptions {
  /** The user saw the typo suggestion and confirmed the original address. */
  confirmed?: boolean;
}

export async function subscribeToNewsletter(
  email: unknown,
  source?: unknown,
  opts: SubscribeOptions = {},
): Promise<SubscribeOutcome> {
  const validation = await validateEmailAddress(email, { confirmed: opts.confirmed });
  if (!validation.ok) {
    if (validation.code === "typo_suggestion" && validation.suggestion) {
      return { kind: "suggestion", suggestion: validation.suggestion, message: validation.message };
    }
    if (validation.code === "dns_unavailable") {
      return { kind: "unavailable", message: validation.message };
    }
    return { kind: "invalid", code: validation.code, message: validation.message };
  }
  const clean = validation.email;
  const sourceTag = String(source ?? "").slice(0, 40);

  const existing = await db.newsletterSubscriber.findUnique({ where: { email: clean } });
  if (existing?.verified) {
    // Already on the list — no row churn, no second email.
    return { kind: "already" };
  }

  const now = new Date();
  let sub;
  if (existing) {
    // A pre-existing unverified row (legacy double opt-in remnant): the
    // address just passed instant validation, so it graduates to a full
    // subscription now. Source updates only when the caller passes one.
    sub = await db.newsletterSubscriber.update({
      where: { email: clean },
      data: {
        verified: true,
        verifiedAt: now,
        verifyToken: null,
        source: sourceTag || existing.source,
      },
    });
  } else {
    sub = await db.newsletterSubscriber.create({
      data: {
        email: clean,
        verified: true,
        verifiedAt: now,
        verifyToken: null,
        source: sourceTag || null,
      },
    });
  }
  // Welcome email — NOT a verification step: the subscription is already
  // in force. It carries the unsubscribe link, and its failure never
  // fails the subscribe (reported as emailed:false instead).
  const { subject, html } = newsletterWelcomeEmail(
    appUrl(`/api/newsletter/unsubscribe?token=${sub.unsubToken}`),
  );
  const emailed = await sendEmail(clean, subject, html).catch(() => false);
  return { kind: "subscribed", emailed };
}
