// ── Venmo payout handles ─────────────────────────────────────────────────
// Venmo usernames are 5–30 characters: letters, numbers, underscores and
// hyphens, and don't start with a hyphen/underscore in practice. Affiliates
// usually type them with a leading "@" — we store the bare handle.

const HANDLE_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{4,29}$/;

/** Normalize a user-typed Venmo handle; null when it isn't a valid handle. */
export function normalizeVenmoHandle(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const bare = input.trim().replace(/^@+/, "");
  return HANDLE_RE.test(bare) ? bare : null;
}

export function isValidVenmoHandle(input: unknown): boolean {
  return normalizeVenmoHandle(input) !== null;
}

/** Display form: "@handle". */
export function formatVenmoHandle(handle: string): string {
  return `@${handle.replace(/^@+/, "")}`;
}
