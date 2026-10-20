// POST /api/auth/signup — create an email+password account.
// Sends a verification email; the account can't sign in until it's verified.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  normalizeEmail, isValidEmail, passwordError, hashPassword,
  generateToken, isRateLimited, clientIp, VERIFY_ID_PREFIX,
} from "@/lib/password-auth";
import { sendEmail, emailConfigured, verificationEmail, appUrl } from "@/lib/email";
import { sendGrowthEvent, hashUserRef, utmFromRequest } from "@/lib/growth";
import { subscribeToNewsletter } from "@/lib/newsletter/subscribe";

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
  const name = String(body.name ?? "").trim().slice(0, 100) || null;

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
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

  return NextResponse.json({ ok: true, userId: user.id, emailSent });
}
