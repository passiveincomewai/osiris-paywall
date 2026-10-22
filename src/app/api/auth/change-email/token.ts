// Pending email-change tokens, stored in the Auth.js VerificationToken
// table exactly like the signup-verify and password-reset flows — the
// pending change rides inside the identifier:
//
//   identifier = "change-email:<userId>:<newEmail>"
//   token      = 256-bit random hex (single use)
//   expires    = 24h, matching the signup verification window
//
// User ids are cuids (no ":"), so splitting the remainder at its first
// ":" recovers both parts unambiguously. No schema change needed.
export const CHANGE_EMAIL_ID_PREFIX = "change-email:";
export const CHANGE_EMAIL_TTL_MS = 24 * 3600 * 1000;

export function changeEmailIdentifier(userId: string, newEmail: string): string {
  return `${CHANGE_EMAIL_ID_PREFIX}${userId}:${newEmail}`;
}

/** Identifier prefix matching every pending change owned by one user. */
export function changeEmailUserPrefix(userId: string): string {
  return `${CHANGE_EMAIL_ID_PREFIX}${userId}:`;
}

export function parseChangeEmailIdentifier(
  identifier: string,
): { userId: string; newEmail: string } | null {
  if (!identifier.startsWith(CHANGE_EMAIL_ID_PREFIX)) return null;
  const rest = identifier.slice(CHANGE_EMAIL_ID_PREFIX.length);
  const sep = rest.indexOf(":");
  if (sep <= 0 || sep === rest.length - 1) return null;
  return { userId: rest.slice(0, sep), newEmail: rest.slice(sep + 1) };
}
