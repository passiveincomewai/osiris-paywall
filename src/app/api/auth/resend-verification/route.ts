// POST /api/auth/resend-verification — re-send the signup verification email.
// Silent unless the account exists, has a password, and is still unverified.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  normalizeEmail, isValidEmail, generateToken,
  isRateLimited, clientIp, VERIFY_ID_PREFIX,
} from "@/lib/password-auth";
import { sendEmail, emailConfigured, verificationEmail, appUrl } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isRateLimited(`resend:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Try again in an hour." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email ?? ""));

  if (isValidEmail(email)) {
    const user = await db.user.findUnique({ where: { email } });
    if (user?.passwordHash && !user.emailVerified && emailConfigured()) {
      await db.verificationToken.deleteMany({ where: { identifier: `${VERIFY_ID_PREFIX}${email}` } });
      const token = generateToken();
      await db.verificationToken.create({
        data: {
          identifier: `${VERIFY_ID_PREFIX}${email}`,
          token,
          expires: new Date(Date.now() + 24 * 3600 * 1000),
        },
      });
      const url = appUrl(`/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`);
      const { subject, html } = verificationEmail(user.name, url);
      await sendEmail(email, subject, html);
    }
  }

  return NextResponse.json({ ok: true });
}
