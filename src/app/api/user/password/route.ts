import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sendEmail, passwordChangedEmail } from "@/lib/email";
import {
  passwordError,
  hashPassword,
  verifyPassword,
  isRateLimited,
  clientIp,
} from "@/lib/password-auth";

export const runtime = "nodejs";

// POST /api/user/password — change (or set, for OAuth users) the account password.
// Current password is required only when one is already set.
export async function POST(req: Request) {
  if (isRateLimited(`pwchange:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { currentPassword, newPassword } = (await req.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };
  const pwErr = passwordError(newPassword ?? "");
  if (pwErr) return NextResponse.json({ error: pwErr }, { status: 400 });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, email: true, name: true },
  });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  if (user.passwordHash) {
    if (!currentPassword || !(await verifyPassword(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }
  }

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword!) },
  });
  // Security-pack notice (pick 15): best-effort — a mail failure must
  // never fail a completed password change.
  try {
    const whenLabel = `${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })} at ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} UTC`;
    const mail = passwordChangedEmail({ name: user.name, whenLabel });
    if (user.email) await sendEmail(user.email, mail.subject, mail.html);
  } catch {
    /* best-effort */
  }
  return NextResponse.json({ ok: true });
}
