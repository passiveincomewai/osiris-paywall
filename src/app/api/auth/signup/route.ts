// POST /api/auth/signup — create an email+password account.
// Sends a verification email; the account can't sign in until it's verified.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  normalizeEmail, passwordError, hashPassword,
  generateToken, isRateLimited, clientIp, VERIFY_ID_PREFIX,
} from "@/lib/password-auth";
import { validateEmailAddress } from "@/lib/email/validate-email";
import { usernameValidationError } from "@/lib/account/names";
import { sendEmail, emailConfigured, verificationEmail, appUrl } from "@/lib/email";
import { sendGrowthEvent, hashUserRef, utmFromRequest } from "@/lib/growth";
import { subscribeToNewsletter } from "@/lib/newsletter/subscribe";
import { sendMetaEvent, metaUserDataFromRequest } from "@/lib/meta-capi";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const PROVIDER_LABELS: Record<string, string> = {
  github: "GitHub", google: "Google", apple: "Apple",
  discord: "Discord", twitter: "X", facebook: "Facebook",
};

export async function POST(req: Request) {
  if (isRateLimited(`signup:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many signups from this network. Try again in an hour." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  const name = String(body.name ?? "").trim();

  // Real-email gate (Jameson, 2026-10-29 — he created an account with a
  // fake address and it let him): the same instant validation the
  // newsletter runs (lib/email/validate-email) — strict syntax,
  // placeholder + disposable domains, junk patterns, a typo suggestion,
  // and a DNS check that the domain can receive mail. It runs BEFORE
  // the account exists: a failing address never creates a row. A
  // transient DNS failure answers a retryable 503, never a "fake
  // email" verdict. Honest limit: a well-formed address at a real
  // domain whose mailbox doesn't exist still passes — no instant check
  // can see individual mailboxes, and no confirmation round trip is
  // added (that's a separate owner decision).
  const validation = await validateEmailAddress(email);
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: validation.message,
        code: validation.code,
        ...(validation.suggestion ? { suggestion: validation.suggestion } : {}),
      },
      { status: validation.retryable ? 503 : 400 },
    );
  }
  // A username is REQUIRED at signup (owner's rule) and must satisfy the
  // shared validator: no spaces, letters/numbers/_/- only.
  const nameErr = usernameValidationError(name);
  if (nameErr) return NextResponse.json({ error: nameErr }, { status: 400 });
  const pwErr = passwordError(password);
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

  const existing = await db.user.findUnique({
    where: { email },
    include: { accounts: { select: { provider: true } } },
  });
  if (existing) {
    if (existing.passwordHash) {
      return NextResponse.json(
        { error: "An account with this email already exists. Sign in instead." },
        { status: 409 }
      );
    }
    const providers = [...new Set(existing.accounts.map((a) => PROVIDER_LABELS[a.provider] ?? a.provider))];
    return NextResponse.json(
      {
        error: `This email is already registered via ${providers.join(", ") || "another sign-in method"}. Sign in with it instead — no password needed.`,
        providers,
      },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({ data: { email, name, passwordHash } });

  // Growth Engine conversion event (no-op until configured; never blocks signup).
  void sendGrowthEvent({
    type: "signup",
    userRef: hashUserRef(user.id),
    idempotencyKey: `signup:${user.id}`,
    ...utmFromRequest(req),
  });

  // Meta Conversions API twin of the signup form's browser
  // CompleteRegistration event. The event id is generated here and
  // returned in the response so the form fires its fbq event with the
  // SAME id and Meta deduplicates the pair. Fire-and-forget: a no-op
  // until META_CAPI_ACCESS_TOKEN is set, and never blocks signup.
  const metaEventId = randomUUID();
  void sendMetaEvent({
    eventName: "CompleteRegistration",
    eventId: metaEventId,
    eventSourceUrl: appUrl("/signup"),
    userData: metaUserDataFromRequest(req, email),
  });

  // Single-use verification token (24h). Old ones for this email are cleared first.
  await db.verificationToken.deleteMany({ where: { identifier: `${VERIFY_ID_PREFIX}${email}` } });
  const token = generateToken();
  await db.verificationToken.create({
    data: {
      identifier: `${VERIFY_ID_PREFIX}${email}`,
      token,
      expires: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });

  let emailSent = false;
  if (emailConfigured()) {
    const url = appUrl(`/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`);
    const { subject, html } = verificationEmail(name, url);
    emailSent = await sendEmail(email, subject, html);
  }

  // Newsletter opt-in (the signup form's unchecked-by-default checkbox):
  // subscribe through the one existing routine — double opt-in, tagged
  // source "signup". Strictly best-effort: an already-subscribed address
  // is a normal outcome in there, and any failure is logged, never a
  // failed signup.
  if (body.newsletterOptIn === true) {
    try {
      await subscribeToNewsletter(email, "signup");
    } catch (err) {
      console.error("newsletter opt-in (signup) failed:", err);
    }
  }

  return NextResponse.json({ ok: true, userId: user.id, emailSent, metaEventId });
}
