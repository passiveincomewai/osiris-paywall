// POST /api/instagram/issue — register a single-use state nonce for one
// fleet Instagram account connection attempt.
//
// The fleet generates a high-entropy nonce, sends only its SHA-256 hash
// here, then uses the raw nonce as the OAuth `state` in Instagram's
// authorize URL. The raw nonce is the pickup credential for
// /api/instagram/pickup, so it never touches this database. Issuing for a
// username replaces that account's previous unfinished attempt — there is
// only ever one live handshake per account.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRateLimited, clientIp } from "@/lib/password-auth";
import {
  NONCE_TTL_MS,
  isFleetUsername,
  isNonceHash,
  pruneExpiredHandshakes,
} from "@/lib/instagram-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (isRateLimited(`ig-issue:${clientIp(req)}`, 60, 15 * 60 * 1000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const username = (body as { username?: unknown } | null)?.username;
  const nonceHash = (body as { nonceHash?: unknown } | null)?.nonceHash;
  if (!isFleetUsername(username) || !isNonceHash(nonceHash)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await pruneExpiredHandshakes();

  const expiresAt = new Date(Date.now() + NONCE_TTL_MS);
  await db.igOAuthHandshake.deleteMany({
    where: { username, pickedUpAt: null },
  });
  await db.igOAuthHandshake.create({
    data: { username, nonceHash, expiresAt },
  });

  return NextResponse.json(
    { ok: true, expiresAt: expiresAt.toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
