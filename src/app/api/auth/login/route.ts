// POST /api/auth/login — precise credential pre-check for the sign-in form.
// Auth.js's authorize() stays strict/generic; this endpoint owns the UX:
// it distinguishes wrong-password, OAuth-only accounts, and unverified
// emails so the form can say something useful. On { ok: true } the client
// completes the real sign-in via signIn("credentials") — the password is
// verified again inside authorize(), so this check grants nothing by itself.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeEmail, isValidEmail, verifyPassword, isRateLimited, clientIp } from "@/lib/password-auth";

export const runtime = "nodejs";

const PROVIDER_LABELS: Record<string, string> = {
  github: "GitHub", google: "Google", apple: "Apple",
  discord: "Discord", twitter: "X", facebook: "Facebook",
};

export async function POST(req: Request) {
  const ip = clientIp(req);
  if (isRateLimited(`login:${ip}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  if (!isValidEmail(email) || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }
  if (isRateLimited(`login:${ip}:${email}`, 10, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts for this email. Try again in a few minutes." }, { status: 429 });
  }

  const user = await db.user.findUnique({
    where: { email },
    include: { accounts: { select: { provider: true } } },
  });

  // Generic on purpose: no hint whether the email is registered.
  const invalid = () => NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  if (!user || !user.passwordHash) {
    if (user && !user.passwordHash) {
      const providers = [...new Set(user.accounts.map((a) => a.provider))];
      const labels = providers.map((p) => PROVIDER_LABELS[p] ?? p);
      return NextResponse.json(
        {
          error: "no_password",
          providers,
          message: `This account signs in with ${labels.join(", ") || "a social provider"} — no password is set. Use the button below instead.`,
        },
        { status: 409 }
      );
    }
    return invalid();
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      {
        error: "unverified",
        message: "Please verify your email first — check your inbox for the verification link.",
      },
      { status: 403 }
    );
  }

  if (!(await verifyPassword(password, user.passwordHash))) return invalid();

  return NextResponse.json({ ok: true });
}
