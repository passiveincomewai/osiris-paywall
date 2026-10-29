// GET /api/auth/verify-email?token=…&email=… — consume a signup verification
// token and mark the email verified. Landing: since 2026-10-29 accounts
// sign in before verifying, the clicker is often already signed in —
// they land in Settings (where the verified state and the +5 camera
// unlock show); a signed-out clicker lands on the sign-in page as
// before.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
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

  const session = await auth().catch(() => null);
  const signedInAsThisUser =
    session?.user?.email && normalizeEmail(session.user.email) === email;
  return NextResponse.redirect(
    appUrl(signedInAsThisUser ? "/settings?verified=1" : "/signin?verified=1"),
    { status: 303 },
  );
}
