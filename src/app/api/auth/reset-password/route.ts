// POST /api/auth/reset-password — consume a reset token and set a new password.
// A successful reset also marks the email verified (clicking the link proves
// inbox control) and burns every outstanding reset token for the email.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  normalizeEmail, isValidEmail, passwordError, hashPassword,
  tokensEqual, isRateLimited, clientIp, RESET_ID_PREFIX,
} from "@/lib/password-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isRateLimited(`reset:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const token = String(body.token ?? "");
  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");

  const pwErr = passwordError(password);
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });
  if (!token || !isValidEmail(email)) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const row = await db.verificationToken.findUnique({ where: { token } });
  if (
    !row ||
    row.identifier !== `${RESET_ID_PREFIX}${email}` ||
    !tokensEqual(row.token, token) ||
    row.expires < new Date()
  ) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.user.update({
      where: { email },
      data: { passwordHash, ...(user.emailVerified ? {} : { emailVerified: new Date() }) },
    }),
    db.verificationToken.deleteMany({ where: { identifier: `${RESET_ID_PREFIX}${email}` } }),
  ]);

  return NextResponse.json({ ok: true });
}
