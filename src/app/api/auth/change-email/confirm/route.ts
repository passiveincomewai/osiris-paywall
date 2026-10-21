// GET /api/auth/change-email/confirm?token=…&email=… — step 2 of the
// email change: consume the token mailed to the NEW address, move the
// account email, and notify the OLD address. Mirrors the verify-email
// landing shape: every outcome bounces to /settings with a flag the
// settings page turns into a plain-language notice (emailChange=done |
// expired | invalid | taken). Works signed-in or not — possession of
// the new inbox is the proof, exactly like signup verification.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeEmail, tokensEqual } from "@/lib/password-auth";
import { sendEmail, emailConfigured, appUrl } from "@/lib/email";
import { changeEmailUserPrefix, parseChangeEmailIdentifier } from "../token";
import { emailChangedNoticeEmail } from "../emails";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const fail = (reason: string) =>
    NextResponse.redirect(appUrl(`/settings?emailChange=${reason}`), { status: 303 });

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token") ?? "";
  const email = normalizeEmail(searchParams.get("email") ?? "");
  if (!token || !email) return fail("invalid");

  const row = await db.verificationToken.findUnique({ where: { token } });
  if (!row || !tokensEqual(row.token, token)) return fail("invalid");

  const parsed = parseChangeEmailIdentifier(row.identifier);
  if (!parsed || parsed.newEmail !== email) return fail("invalid");

  if (row.expires < new Date()) {
    await db.verificationToken.delete({ where: { token } }).catch(() => {});
    return fail("expired");
  }

  const user = await db.user.findUnique({
    where: { id: parsed.userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) {
    await db.verificationToken.delete({ where: { token } }).catch(() => {});
    return fail("invalid");
  }

  // Already applied (double-click / second tab raced us): consume + done.
  if (user.email && normalizeEmail(user.email) === parsed.newEmail) {
    await db.verificationToken.delete({ where: { token } }).catch(() => {});
    return NextResponse.redirect(appUrl("/settings?emailChange=done"), { status: 303 });
  }

  // Re-check uniqueness at confirm time — the address may have been
  // registered by someone else while the link sat in the inbox.
  const owner = await db.user.findUnique({
    where: { email: parsed.newEmail },
    select: { id: true },
  });
  if (owner && owner.id !== user.id) {
    await db.verificationToken.delete({ where: { token } }).catch(() => {});
    return fail("taken");
  }

  const oldEmail = user.email;
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      // The confirmation itself verifies the new address.
      data: { email: parsed.newEmail, emailVerified: new Date() },
    }),
    db.verificationToken.delete({ where: { token } }),
  ]);
  // Clear any stray pending rows for this user (paranoia — POST keeps one).
  await db.verificationToken
    .deleteMany({ where: { identifier: { startsWith: changeEmailUserPrefix(user.id) } } })
    .catch(() => {});

  // Security heads-up to the old address. Best-effort: the change has
  // already landed, so a mail failure must not fail the confirm.
  if (oldEmail && emailConfigured()) {
    const { subject, html } = emailChangedNoticeEmail(user.name, parsed.newEmail);
    await sendEmail(oldEmail, subject, html).catch(() => {});
  }

  return NextResponse.redirect(appUrl("/settings?emailChange=done"), { status: 303 });
}
