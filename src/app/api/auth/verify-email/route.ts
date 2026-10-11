// GET /api/auth/verify-email?token=…&email=… — consume a signup verification
// token, mark the email verified, and bounce to the sign-in page.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeEmail, tokensEqual, VERIFY_ID_PREFIX } from "@/lib/password-auth";
import { appUrl } from "@/lib/email";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  const email = normalizeEmail(searchParams.get("email") ?? "");

  const fail = () =>
    NextResponse.redirect(appUrl("/signin?error=verify"), { status: 303 });

  if (!token || !email) return fail();

  const row = await db.verificationToken.findUnique({ where: { token } });
  if (
    !row ||
    row.identifier !== `${VERIFY_ID_PREFIX}${email}` ||
    !tokensEqual(row.token, token) ||
    row.expires < new Date()
  ) {
    return fail();
  }

  await db.$transaction([
    db.user.update({ where: { email }, data: { emailVerified: new Date() } }),
    db.verificationToken.delete({ where: { token } }),
  ]);

  return NextResponse.redirect(appUrl("/signin?verified=1"), { status: 303 });
}
