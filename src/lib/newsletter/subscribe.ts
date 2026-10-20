// ── The one newsletter subscribe routine ────────────────────────────────
// Every growth surface (footer form, email-capture cards, the signup and
// /welcome claim opt-ins) lands here — a single mechanism, never a
// parallel one. It owns the double opt-in: the row is created (or its
// token rotated) unverified, and a verification email goes out; the
// address only counts once /api/newsletter/verify confirms the token.
//
// Outcomes, not exceptions, for the expected cases — a malformed address
// and an already-verified subscriber are normal answers, and the signup
// opt-in in particular must learn "already subscribed" without treating
// it as a failure. Unexpected errors (database down) throw: the HTTP
// route turns them into a 500, the account-creation flows catch + log
// them so an opt-in can never break account creation.
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { sendEmail, newsletterVerifyEmail, appUrl } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The `source` tag stored on the subscriber row (capped at 40 chars). */
export type NewsletterSource = string;

export type SubscribeOutcome =
  | { kind: "invalid" }
  | { kind: "already" }
  | { kind: "subscribed"; emailed: boolean };

export async function subscribeToNewsletter(
  email: unknown,
  source?: unknown,
): Promise<SubscribeOutcome> {
  const clean = String(email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(clean)) return { kind: "invalid" };

  const verifyToken = randomBytes(24).toString("hex");
  const existing = await db.newsletterSubscriber.findUnique({ where: { email: clean } });
  if (existing?.verified) {
    // Already on the list and confirmed — no row churn, no second email.
    return { kind: "already" };
  }
  if (existing) {
    await db.newsletterSubscriber.update({
      where: { email: clean },
      data: { verifyToken, source: String(source ?? "").slice(0, 40) || existing.source },
    });
  } else {
    await db.newsletterSubscriber.create({
      data: { email: clean, verifyToken, source: String(source ?? "").slice(0, 40) || null },
    });
  }
  const { subject, html } = newsletterVerifyEmail(appUrl(`/api/newsletter/verify?token=${verifyToken}`));
  const emailed = await sendEmail(clean, subject, html);
  return { kind: "subscribed", emailed };
}
