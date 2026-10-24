// ── Username rules (owner's orders, 2026-10-22) ─────────────────────
// One validator for signup, the profile API, and the set-name prompt:
//   * a name is REQUIRED (no anonymous accounts);
//   * NO SPACES — letters, numbers, underscore and hyphen only;
//   * 2–32 characters (the bounds the profile API has always used).
// Display names from OAuth providers (e.g. Google's "First Last") are
// never rewritten server-side; an account whose stored name fails this
// validator is exactly what the one-time set-name prompt exists for.

export const USERNAME_RE = /^[A-Za-z0-9_-]+$/;

export function usernameValidationError(raw: string | null | undefined): string | null {
  const name = (raw ?? "").trim();
  if (!name) return "Choose a username — it's required.";
  if (name.length < 2) return "Username must be at least 2 characters.";
  if (name.length > 32) return "Username must be under 32 characters.";
  if (/\s/.test(name)) return "Usernames can't contain spaces — use letters, numbers, _ or -.";
  if (!USERNAME_RE.test(name)) return "Username can only use letters, numbers, _ and -.";
  return null;
}

export function isValidUsername(raw: string | null | undefined): boolean {
  return usernameValidationError(raw) === null;
}
