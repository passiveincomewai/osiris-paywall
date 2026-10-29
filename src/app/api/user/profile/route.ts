import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { usernameError, phoneError, normalizePhone } from "@/lib/password-auth";
import { isVerifiedRow } from "@/lib/auth-verification";

export const runtime = "nodejs";

// GET /api/user/profile — the caller's profile details.
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true, email: true, phone: true, passwordHash: true, emailVerified: true, image: true,
      accounts: { select: { provider: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  return NextResponse.json({
    name: user.name,
    email: user.email,
    phone: user.phone,
    image: user.image,
    hasPassword: user.passwordHash !== null,
    // lib/auth-verification's rule: the column OR a provider-verified
    // OAuth link (legacy Google rows were never stamped).
    emailVerified: isVerifiedRow(user),
  });
}

// PATCH /api/user/profile — update display name and phone number.
export async function PATCH(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { name, phone } = (await req.json().catch(() => ({}))) as {
    name?: string;
    phone?: string;
  };

  const data: { name?: string; phone?: string } = {};
  if (name !== undefined) {
    const err = usernameError(name);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    data.name = name.trim();
  }
  if (phone !== undefined) {
    const err = phoneError(phone);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    data.phone = normalizePhone(phone);
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const user = await db.user.update({ where: { id: userId }, data });
  return NextResponse.json({ ok: true, name: user.name, phone: user.phone });
}
