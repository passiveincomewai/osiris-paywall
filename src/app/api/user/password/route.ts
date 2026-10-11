import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
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

  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
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
  return NextResponse.json({ ok: true });
}
