// Signed-in email change, step 1 (this route) + step 2 (./confirm).
//
// POST   — request (or re-send) a change: validates the new address,
//          stores a single-use 24h token in the VerificationToken table
//          (identifier "change-email:<userId>:<newEmail>"), and emails a
//          confirmation link to the NEW address. The account email does
//          NOT move until that link is confirmed.
// GET    — the caller's pending change, if any ({ pendingEmail }).
// DELETE — cancel the caller's pending change.
//
// Unlike the public resend-verification endpoint this one is session-
// authenticated and returns honest errors: the caller is signed in and
// changing their own address, so there is nothing to enumerate.
//
// Account-type safety: sign-in never resolves a user by email except the
// credentials/magic-link lookup itself — Google resolves through the
// Account row (providerAccountId → userId) and sessions carry the user
// id, so moving User.email is safe for OAuth and password accounts
// alike. Uniqueness is re-checked again at confirm time.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  normalizeEmail, isValidEmail, generateToken,
  isRateLimited, clientIp,
} from "@/lib/password-auth";
import { sendEmail, emailConfigured, appUrl } from "@/lib/email";
import {
  CHANGE_EMAIL_TTL_MS, changeEmailIdentifier, changeEmailUserPrefix,
  parseChangeEmailIdentifier,
} from "./token";
import { changeEmailConfirmEmail } from "./emails";

export const runtime = "nodejs";

async function callerId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await callerId();
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const row = await db.verificationToken.findFirst({
    where: { identifier: { startsWith: changeEmailUserPrefix(userId) } },
  });
  if (!row) return NextResponse.json({ pendingEmail: null });
  if (row.expires < new Date()) {
    await db.verificationToken.deleteMany({
      where: { identifier: { startsWith: changeEmailUserPrefix(userId) } },
    });
    return NextResponse.json({ pendingEmail: null });
  }
  const parsed = parseChangeEmailIdentifier(row.identifier);
  return NextResponse.json({ pendingEmail: parsed?.newEmail ?? null });
}

export async function POST(req: Request) {
  if (isRateLimited(`change-email:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests. Try again in an hour." }, { status: 429 });
  }
  const userId = await callerId();
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const newEmail = normalizeEmail(String(body.newEmail ?? ""));
  if (!isValidEmail(newEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  if (!user.email) {
    return NextResponse.json({ error: "Your account has no email address to change." }, { status: 400 });
  }
  if (newEmail === normalizeEmail(user.email)) {
    return NextResponse.json({ error: "That's already your account email." }, { status: 400 });
  }

  const owner = await db.user.findUnique({ where: { email: newEmail }, select: { id: true } });
  if (owner && owner.id !== userId) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  if (!emailConfigured()) {
    return NextResponse.json(
      { error: "We couldn't send the confirmation email. Please try again later." },
      { status: 503 },
    );
  }

  // One pending change per user: a fresh request replaces the old token.
  await db.verificationToken.deleteMany({
    where: { identifier: { startsWith: changeEmailUserPrefix(userId) } },
  });
  const token = generateToken();
  await db.verificationToken.create({
    data: {
      identifier: changeEmailIdentifier(userId, newEmail),
      token,
      expires: new Date(Date.now() + CHANGE_EMAIL_TTL_MS),
    },
  });

  const url = appUrl(`/api/auth/change-email/confirm?token=${token}&email=${encodeURIComponent(newEmail)}`);
  const { subject, html } = changeEmailConfirmEmail(user.name, newEmail, url);
  const sent = await sendEmail(newEmail, subject, html);
  if (!sent) {
    // Don't leave a live token pointing at an email that never arrived.
    await db.verificationToken.delete({ where: { token } }).catch(() => {});
    return NextResponse.json(
      { error: "We couldn't send the confirmation email. Please try again later." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, pendingEmail: newEmail });
}

export async function DELETE() {
  const userId = await callerId();
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  await db.verificationToken.deleteMany({
    where: { identifier: { startsWith: changeEmailUserPrefix(userId) } },
  });
  return NextResponse.json({ ok: true });
}
