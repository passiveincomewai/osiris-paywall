// POST /api/auth/forgot-password — request a password reset email.
// Always returns { ok: true } so the endpoint can't be used to enumerate
// which emails have accounts.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  normalizeEmail, isValidEmail, generateToken,
  isRateLimited, clientIp, RESET_ID_PREFIX,
} from "@/lib/password-auth";
import { sendEmail, emailConfigured, resetPasswordEmail, appUrl } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isRateLimited(`forgot:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Try again in an hour." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email ?? ""));

  if (isValidEmail(email)) {
    const user = await db.user.findUnique({ where: { email } });
    // Only password accounts can reset a password; everyone else gets the
    // same silent success (no enumeration).
    if (user?.passwordHash) {
      await db.verificationToken.deleteMany({ where: { identifier: `${RESET_ID_PREFIX}${email}` } });
      const token = generateToken();
      await db.verificationToken.create({
        data: {
          identifier: `${RESET_ID_PREFIX}${email}`,
          token,
          expires: new Date(Date.now() + 3600 * 1000),
        },
      });
      if (emailConfigured()) {
        const url = appUrl(`/reset-password?token=${token}&email=${encodeURIComponent(email)}`);
        const { subject, html } = resetPasswordEmail(user.name, url);
        await sendEmail(email, subject, html);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
