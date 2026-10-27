import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveAmbientAccess } from "@/lib/ambient/access-server";
import { hashRelayToken, newRelayToken } from "@/lib/ambient/stream-key-crypto";

/**
 * POST /api/ambient/stream-key/rotate — mint a fresh relay token
 * (the old one dies immediately). Returned once, like the original.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const access = await resolveAmbientAccess(session.user.id).catch(() => false);
  if (!access) {
    return NextResponse.json(
      { error: "Stream to YouTube needs WorldEye Ambient or a Pro plan" },
      { status: 403 },
    );
  }
  const existing = await db.ambientStreamKey.findUnique({
    where: { userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Save a stream key first" },
      { status: 404 },
    );
  }
  const relayToken = newRelayToken();
  await db.ambientStreamKey.update({
    where: { userId: session.user.id },
    data: { relayTokenHash: hashRelayToken(relayToken) },
  });
  return NextResponse.json({ relayToken });
}
