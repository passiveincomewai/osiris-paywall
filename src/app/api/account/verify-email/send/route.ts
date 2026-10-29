// POST /api/account/verify-email/send — the Settings "Verify your
// email" resend. Session-authenticated, so unlike the public
// /api/auth/resend-verification it answers with the FULL truth (the
// caller is signed in as this very account — nothing to enumerate):
//   already verified (incl. provider-verified OAuth accounts, whose
//     stamp is healed in here) → { ok: true, alreadyVerified: true }
//   send attempted and delivered to the mail provider → { ok: true, sent: true }
//   send attempted and failed → 502 with a plain message
//   too soon after the last send → 429 (one send per minute per user;
//     the endpoint is the real limiter, the button's cooldown is UX)
// The send itself is lib/auth-verification's one implementation,
// shared with signup and the public resend endpoint.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/password-auth";
import { isVerifiedRow, sendVerificationEmail } from "@/lib/auth-verification";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      emailVerified: true,
      accounts: { select: { provider: true } },
    },
  });
  if (!user || !user.email) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  if (isVerifiedRow(user)) {
    // Provider-verified but never stamped (legacy Google rows): write
    // the stamp now so the column tells the truth everywhere else.
    if (!user.emailVerified) {
      await db.user.updateMany({
        where: { id: userId, emailVerified: null },
        data: { emailVerified: new Date() },
      });
    }
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  if (isRateLimited(`verify-send:${userId}`, 1, 60 * 1000)) {
    return NextResponse.json(
      { error: "A verification email was just sent — give it a minute before asking for another." },
      { status: 429 },
    );
  }

  const result = await sendVerificationEmail({ email: user.email, name: user.name });
  if (!result.sent) {
    return NextResponse.json(
      {
        error:
          result.reason === "not_configured"
            ? "Email delivery isn't configured on this server yet — contact support."
            : "We couldn't send the verification email just now — try again in a moment.",
      },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, sent: true });
}
