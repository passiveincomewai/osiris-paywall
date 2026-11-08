// POST /api/instagram/pickup — one-time code pickup for the fleet.
//
// The caller presents the raw state nonce issued for an account
// connection attempt. If the callback has delivered a code for that
// nonce, the code is returned exactly once and burned (nulled in the
// store) in the same step. Unknown, expired, and already-consumed nonces
// are indistinguishable: all get the same 404. A nonce whose callback has
// not landed yet reports "pending" so the fleet can poll for a few
// minutes after the account holder consents.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRateLimited, clientIp } from "@/lib/password-auth";
import { pruneExpiredHandshakes, sha256Hex } from "@/lib/instagram-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { headers: { "Cache-Control": "no-store" } };

export async function POST(req: Request) {
  if (isRateLimited(`ig-pickup:${clientIp(req)}`, 300, 15 * 60 * 1000)) {
    return NextResponse.json({ ok: false }, { status: 429, ...noStore });
  }

  const body = await req.json().catch(() => null);
  const nonce = (body as { nonce?: unknown } | null)?.nonce;
  if (typeof nonce !== "string" || nonce.length < 16 || nonce.length > 512) {
    return NextResponse.json({ ok: false }, { status: 400, ...noStore });
  }

  await pruneExpiredHandshakes();

  const row = await db.igOAuthHandshake
    .findUnique({ where: { nonceHash: sha256Hex(nonce) } })
    .catch(() => null);
  if (!row || row.pickedUpAt || row.expiresAt < new Date()) {
    return NextResponse.json({ ok: false }, { status: 404, ...noStore });
  }
  if (!row.code) {
    return NextResponse.json(
      { ok: false, status: "pending" },
      { status: 200, ...noStore },
    );
  }

  // Burn atomically: only the caller that flips pickedUpAt from null gets
  // the code, and the stored copy is nulled in the same update.
  const burned = await db.igOAuthHandshake.updateMany({
    where: { id: row.id, code: { not: null }, pickedUpAt: null },
    data: { code: null, pickedUpAt: new Date() },
  });
  if (burned.count !== 1) {
    return NextResponse.json({ ok: false }, { status: 404, ...noStore });
  }

  return NextResponse.json(
    { ok: true, username: row.username, code: row.code },
    noStore,
  );
}
