// POST /api/auth/resend-verification — re-send the signup verification
// email (public, for signed-out users: the signup "check your inbox"
// screen and legacy sign-in links).
//
// Honesty rework (2026-10-29, the "resend button isn't working" bug):
// the old version ignored the send result entirely and always answered
// { ok: true }, so every surface cheerfully reported "sent" even when
// nothing had been delivered. Now, when an unverified password account
// exists for the address, the response reports the REAL outcome —
// { ok: true, sent: true } only when the email actually went out, and
// a 502 when the send failed. (One thing no endpoint can fix: an
// address whose mailbox doesn't exist hard-bounces at the provider and
// lands on its suppression list — later sends are accepted by the API
// but never delivered. That was the actual fate of the test accounts
// in the bug report; the sending path itself was healthy.)
//
// When no such account exists (unknown address, OAuth-only, already
// verified) the answer stays a silent { ok: true } — no enumeration
// signal beyond what /api/auth/login already gives away.
//
// Throttles: per-IP 5/hour (unchanged) + per-email one send/minute,
// enforced only on calls that actually send. The signed-in Settings
// flow uses /api/account/verify-email/send instead.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  normalizeEmail, isValidEmail, isRateLimited, clientIp,
} from "@/lib/password-auth";
import { sendVerificationEmail } from "@/lib/auth-verification";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isRateLimited(`resend:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Try again in an hour." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email ?? ""));

  if (isValidEmail(email)) {
    const user = await db.user.findUnique({ where: { email } });
    if (user?.passwordHash && !user.emailVerified) {
      if (isRateLimited(`resend-email:${email}`, 1, 60 * 1000)) {
        return NextResponse.json(
          { error: "A verification email was just sent to that address — give it a minute before asking for another." },
          { status: 429 },
        );
      }
      // `email` is the request's normalized address — the very key the
      // row was found by (User.email is nullable in the schema; an
      // account found by address has this one).
      const result = await sendVerificationEmail({ email, name: user.name });
      if (!result.sent) {
        return NextResponse.json(
          {
            error:
              result.reason === "not_configured"
                ? "Email delivery isn't configured on this server yet — contact support to activate your account."
                : "We couldn't send the verification email just now — try again in a moment.",
          },
          { status: 502 },
        );
      }
      return NextResponse.json({ ok: true, sent: true });
    }
  }

  return NextResponse.json({ ok: true });
}
