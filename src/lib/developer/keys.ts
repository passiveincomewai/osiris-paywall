/**
 * Public API key management for Account Settings — the session-side
 * counterpart to authenticateApiKey. Same table, same token machinery
 * as the Enterprise keys (src/lib/enterprise/keys routes), scoped to
 * scope "public" rows and open to ANY signed-in user: the free tier is
 * the front door of the developer platform.
 */
import { db } from "@/lib/db";
import { generateApiKey, hashSecret } from "@/lib/enterprise/tokens";

export const PUBLIC_KEY_SCOPE = "public";
export const MAX_PUBLIC_KEYS_PER_USER = 5;

const KEY_DISPLAY_FIELDS = {
  id: true,
  name: true,
  keyPrefix: true,
  hits: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
} as const;

export async function listPublicKeys(userId: string) {
  return db.enterpriseApiKey.findMany({
    where: { userId, scope: PUBLIC_KEY_SCOPE },
    orderBy: { createdAt: "desc" },
    select: KEY_DISPLAY_FIELDS,
  });
}

export type CreatePublicKeyResult =
  | { ok: true; key: string; apiKey: { id: string; name: string; keyPrefix: string; createdAt: Date } }
  | { ok: false; error: string };

/** Create a public key. The plaintext comes back ONCE, in this result. */
export async function createPublicKey(
  userId: string,
  name: string,
): Promise<CreatePublicKeyResult> {
  const live = await db.enterpriseApiKey.count({
    where: { userId, scope: PUBLIC_KEY_SCOPE, revokedAt: null },
  });
  if (live >= MAX_PUBLIC_KEYS_PER_USER) {
    return {
      ok: false,
      error: `Key limit reached (${MAX_PUBLIC_KEYS_PER_USER} active public keys). Revoke one to create another.`,
    };
  }
  const { key, prefix } = generateApiKey();
  const row = await db.enterpriseApiKey.create({
    data: {
      userId,
      name,
      keyPrefix: prefix,
      keyHash: hashSecret(key),
      scope: PUBLIC_KEY_SCOPE,
    },
    select: { id: true, name: true, keyPrefix: true, createdAt: true },
  });
  return { ok: true, key, apiKey: row };
}

/** Revoke one of the user's own public keys. False when nothing matched. */
export async function revokePublicKey(userId: string, id: string): Promise<boolean> {
  const result = await db.enterpriseApiKey.updateMany({
    where: { id, userId, scope: PUBLIC_KEY_SCOPE, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count > 0;
}
