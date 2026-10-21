import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { shareStorageConfigured } from "@/lib/clip-share/core";

export const runtime = "nodejs";

async function sessionUserId(): Promise<string | null> {
  const session = await auth().catch(() => null);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}

/**
 * Owner-only share management. A share that isn't the caller's is a
 * 404 — existence is never confirmed to anyone else.
 */

/** Edit the share title. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "signin" }, { status: 401 });
  const { id } = await params;
  const share = await db.clipShare.findFirst({ where: { id, userId } }).catch(() => null);
  if (!share) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 140) : "";
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const updated = await db.clipShare.update({ where: { id: share.id }, data: { title } });
  return NextResponse.json({ share: { id: updated.id, title: updated.title } });
}

/**
 * Revoke: stamp revokedAt (the watch page immediately serves "gone")
 * and delete the hosted files, so a revoked link is truly dead.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "signin" }, { status: 401 });
  const { id } = await params;
  const share = await db.clipShare.findFirst({ where: { id, userId } }).catch(() => null);
  if (!share) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!share.revokedAt) {
    await db.clipShare.update({ where: { id: share.id }, data: { revokedAt: new Date() } });
    if (shareStorageConfigured()) {
      const urls = [share.blobUrl, share.posterUrl].filter((u): u is string => !!u);
      if (urls.length) await del(urls).catch(() => null);
    }
  }
  return NextResponse.json({ ok: true });
}
