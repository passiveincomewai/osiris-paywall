/**
 * WorldEye — Live Drone Tracking: ingest authentication.
 *
 * Receivers and operator gateways authenticate with a bearer token from
 * the environment — never from the database, never self-issued:
 *
 *   DRONE_INGEST_TOKENS="rx-rooftop:longrandom1,rx-field:longrandom2"
 *
 * Each token is bound to a receiver id; the id the token maps to is the
 * identity the report is stored under (a token cannot impersonate
 * another receiver). A legacy single-token form is also accepted:
 *
 *   DRONE_INGEST_TOKEN="longrandom"   → receiver id comes from the body
 *
 * When neither is set, ingest is DISABLED and the route answers 404 —
 * the same convention as /api/internal/studio-ai (an unconfigured
 * endpoint should look like it does not exist).
 */

import { createHash, timingSafeEqual } from 'node:crypto';

interface TokenBinding {
  receiverId: string | null; // null → id from request body
  digest: Buffer;
}

function digestOf(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

function bindings(): TokenBinding[] {
  const out: TokenBinding[] = [];
  const pairs = process.env.DRONE_INGEST_TOKENS;
  if (pairs) {
    for (const part of pairs.split(',')) {
      const idx = part.indexOf(':');
      if (idx <= 0) continue;
      const receiverId = part.slice(0, idx).trim();
      const token = part.slice(idx + 1).trim();
      if (receiverId && token) out.push({ receiverId, digest: digestOf(token) });
    }
  }
  const single = process.env.DRONE_INGEST_TOKEN?.trim();
  if (single) out.push({ receiverId: null, digest: digestOf(single) });
  return out;
}

export function ingestConfigured(): boolean {
  return bindings().length > 0;
}

/**
 * Verify `Authorization: Bearer <token>`. Returns the bound receiver id
 * (which may be null for the shared-token form), or undefined when the
 * token is missing/wrong. Comparison is timing-safe over SHA-256
 * digests so token length is not leaked either.
 */
export function verifyIngestBearer(req: Request): { receiverId: string | null } | undefined {
  const header = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!m) return undefined;
  const presented = digestOf(m[1].trim());
  for (const b of bindings()) {
    if (timingSafeEqual(presented, b.digest)) return { receiverId: b.receiverId };
  }
  return undefined;
}
