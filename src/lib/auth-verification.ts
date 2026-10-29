// ── Email verification: the shared rules and the one send path ─────────
// Verification state (Jameson's model, changed 2026-10-29):
//   • Signing in NEVER waits for verification — an unverified password
//     account signs in like any other. Verification is a Settings step
//     that unlocks +5 camera checks on the ladder (lib/camera-ladder).
//   • An address counts as verified when User.emailVerified is set OR
//     the account is linked to an OAuth provider that verifies the
//     address itself (Google — the only OAuth provider configured).
//     The Auth.js adapter never stamped emailVerified for OAuth
//     sign-ins (measured 2026-10-29: of 81 unverified rows, 71 are
//     Google users who were never blocked and were never actually
//     unverified), so resolveEmailVerified writes the stamp the first
//     time it sees a provider-verified account. No backfill migration:
//     rows heal at sign-in / first read.
//   • ONE send implementation (sendVerificationEmail below) serves the
//     signup route, the public resend endpoint, and the Settings
//     verify endpoint — and it reports whether the email actually went
//     out. The old resend flow swallowed the send result and answered
//     { ok: true } unconditionally, so the button claimed "sent" even
//     when nothing was delivered (the 2026-10-29 resend bug).
import { db } from "@/lib/db";
import { generateToken, VERIFY_ID_PREFIX } from "@/lib/password-auth";
import { sendEmail, emailConfigured, verificationEmail, appUrl } from "@/lib/email";

/** OAuth providers whose own sign-in proves the address is real. */
const PROVIDER_VERIFIED = new Set(["google"]);

export function isProviderVerified(accounts: { provider: string }[]): boolean {
  return accounts.some((a) => PROVIDER_VERIFIED.has(a.provider));
}

/** The verification rule over an already-loaded user row. Pure. */
export function isVerifiedRow(row: {
  emailVerified: Date | null;
  accounts: { provider: string }[];
}): boolean {
  return row.emailVerified !== null || isProviderVerified(row.accounts);
}

/**
 * The caller's verification state, with the OAuth stamp healed in:
 * a provider-verified account whose column is still null gets
 * emailVerified written (once — the update is conditional on null),
 * so every later reader can trust the column. Fail-soft: any DB error
 * reads as "not verified" rather than breaking a session.
 */
export async function resolveEmailVerified(userId: string): Promise<boolean> {
  try {
    const row = await db.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true, accounts: { select: { provider: true } } },
    });
    if (!row) return false;
    if (row.emailVerified) return true;
    if (!isProviderVerified(row.accounts)) return false;
    await db.user.updateMany({
      where: { id: userId, emailVerified: null },
      data: { emailVerified: new Date() },
    });
    return true;
  } catch {
    return false;
  }
}

export type VerificationSendResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "send_failed" };

/**
 * Mint a fresh single-use verification token (24h, any previous ones
 * for the address cleared) and send the verification email. The
 * result says whether the email actually left — callers that may
 * report success to a user MUST check `sent` (the resend bug was
 * reporting success without it).
 */
export async function sendVerificationEmail(user: {
  email: string;
  name: string | null;
}): Promise<VerificationSendResult> {
  if (!emailConfigured()) return { sent: false, reason: "not_configured" };
  await db.verificationToken.deleteMany({
    where: { identifier: `${VERIFY_ID_PREFIX}${user.email}` },
  });
  const token = generateToken();
  await db.verificationToken.create({
    data: {
      identifier: `${VERIFY_ID_PREFIX}${user.email}`,
      token,
      expires: new Date(Date.now() + 24 * 3600 * 1000),
    },
  });
  const url = appUrl(
    `/api/auth/verify-email?token=${token}&email=${encodeURIComponent(user.email)}`,
  );
  const { subject, html } = verificationEmail(user.name, url);
  const sent = await sendEmail(user.email, subject, html);
  return sent ? { sent: true } : { sent: false, reason: "send_failed" };
}
