// ── TOTP service: DB-facing half of item 2 ──────────────────────────
import { db } from "@/lib/db";
import {
  decryptTotpSecret, encryptTotpSecret, generateBackupCodes, generateTotpSecret,
  hashBackupCode, matchBackupCode, totpOtpAuthUrl, verifyTotp,
} from "./totp";

export async function getTotpStatus(userId: string) {
  const row = await db.userTotp.findUnique({ where: { userId } });
  return {
    exists: !!row,
    enabled: !!row?.enabledAt,
    enabledAt: row?.enabledAt ?? null,
    backupCodesRemaining: row?.backupCodeHashes.length ?? 0,
  };
}

/** Begin (or restart) setup: stores an encrypted, not-yet-enabled secret. */
export async function beginTotpSetup(userId: string, accountLabel: string) {
  const secret = generateTotpSecret();
  await db.userTotp.upsert({
    where: { userId },
    create: { userId, secretEncrypted: encryptTotpSecret(secret), enabledAt: null, backupCodeHashes: [] },
    update: { secretEncrypted: encryptTotpSecret(secret), enabledAt: null, backupCodeHashes: [] },
  });
  return { secret, otpauthUrl: totpOtpAuthUrl(secret, accountLabel) };
}

/** Confirm setup with a code from the authenticator; issues backup codes once. */
export async function enableTotp(userId: string, code: string) {
  const row = await db.userTotp.findUnique({ where: { userId } });
  if (!row) return { error: "Start setup first." } as const;
  const secret = decryptTotpSecret(row.secretEncrypted);
  if (!verifyTotp(secret, code)) return { error: "That code didn't match — check your authenticator and try again." } as const;
  const backupCodes = generateBackupCodes(8);
  await db.userTotp.update({
    where: { userId },
    data: { enabledAt: new Date(), backupCodeHashes: backupCodes.map(hashBackupCode) },
  });
  return { backupCodes } as const;
}

/** Verify a sign-in challenge code: TOTP first, then a backup code (consumed). */
export async function verifyChallenge(userId: string, code: string): Promise<boolean> {
  const row = await db.userTotp.findUnique({ where: { userId } });
  if (!row?.enabledAt) return false;
  const secret = decryptTotpSecret(row.secretEncrypted);
  if (verifyTotp(secret, code)) return true;
  const idx = matchBackupCode(row.backupCodeHashes, code);
  if (idx >= 0) {
    const remaining = row.backupCodeHashes.filter((_, i) => i !== idx);
    await db.userTotp.update({ where: { userId }, data: { backupCodeHashes: remaining } });
    return true;
  }
  return false;
}

/** Regenerate backup codes (requires a valid current code). Old codes die. */
export async function regenerateBackupCodes(userId: string, code: string) {
  const ok = await verifyChallenge(userId, code);
  if (!ok) return { error: "That code didn't match." } as const;
  const backupCodes = generateBackupCodes(8);
  await db.userTotp.update({
    where: { userId },
    data: { backupCodeHashes: backupCodes.map(hashBackupCode) },
  });
  return { backupCodes } as const;
}

/** Disable 2FA entirely (requires a valid current code or backup code). */
export async function disableTotp(userId: string, code: string) {
  const ok = await verifyChallenge(userId, code);
  if (!ok) return { error: "That code didn't match." } as const;
  await db.userTotp.delete({ where: { userId } });
  return { ok: true } as const;
}
