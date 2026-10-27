import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { resolveAmbientAccess } from "@/lib/ambient/access-server";
import {
  encryptStreamKey,
  hashRelayToken,
  newRelayToken,
} from "@/lib/ambient/stream-key-crypto";

/**
 * The signed-in member's YouTube stream-key record (Ambient → Stream
 * to YouTube). The key itself is write-only from the client's point
 * of view: PUT stores it encrypted; GET reports only that a key is
 * configured; DELETE removes the record. The relay token is returned
 * exactly once — at first save and on rotation — because only its
 * hash is stored.
 */

async function gate() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  }
  const access = await resolveAmbientAccess(session.user.id).catch(() => false);
  if (!access) {
    return {
      error: NextResponse.json(
        { error: "Stream to YouTube needs WorldEye Ambient or a Pro plan" },
        { status: 403 },
      ),
    };
  }
  return { userId: session.user.id };
}

export async function GET() {
  const g = await gate();
  if ("error" in g) return g.error;
  const row = await db.ambientStreamKey.findUnique({ where: { userId: g.userId } });
  return NextResponse.json({ configured: !!row });
}

export async function PUT(req: Request) {
  const g = await gate();
  if ("error" in g) return g.error;
  const { youtubeKey } = (await req.json().catch(() => ({}))) as {
    youtubeKey?: string;
  };
  const key = (youtubeKey ?? "").trim();
  if (key.length < 8 || key.length > 200 || /\s/.test(key)) {
    return NextResponse.json(
      { error: "That doesn't look like a YouTube stream key" },
      { status: 400 },
    );
  }
  const existing = await db.ambientStreamKey.findUnique({
    where: { userId: g.userId },
  });
  const relayToken = existing ? null : newRelayToken();
  await db.ambientStreamKey.upsert({
    where: { userId: g.userId },
    create: {
      userId: g.userId,
      keyCiphertext: encryptStreamKey(key),
      relayTokenHash: hashRelayToken(relayToken ?? newRelayToken()),
    },
    update: { keyCiphertext: encryptStreamKey(key) },
  });
  // On first save the token must reach the user once; on later saves
  // the existing token stands (rotation is its own endpoint).
  return NextResponse.json({ configured: true, relayToken });
}

export async function DELETE() {
  const g = await gate();
  if ("error" in g) return g.error;
  await db.ambientStreamKey.deleteMany({ where: { userId: g.userId } });
  return NextResponse.json({ configured: false });
}
