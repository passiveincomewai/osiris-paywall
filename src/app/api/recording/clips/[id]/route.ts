import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordingAccess } from "@/lib/recording/access";

export const runtime = "nodejs";

/** Delete a clip's metadata (the browser deletes the IndexedDB blob). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await recordingAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  const { id } = await params;
  const clip = await db.clipMeta.findFirst({ where: { id, userId: a.userId } });
  if (!clip) return NextResponse.json({ error: "not found" }, { status: 404 });
  await db.clipMeta.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
