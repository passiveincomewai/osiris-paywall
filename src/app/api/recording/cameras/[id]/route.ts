import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordingAccess } from "@/lib/recording/access";

export const runtime = "nodejs";

async function owned(id: string, userId: string) {
  return db.savedCamera.findFirst({ where: { id, userId } });
}

/** Rename / regroup / reorder a saved camera. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await recordingAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  const { id } = await params;
  const cam = await owned(id, a.userId);
  if (!cam) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 120);
  if (typeof body.group === "string" && body.group.trim()) data.group = body.group.trim().slice(0, 60);
  if (typeof body.sortOrder === "number") data.sortOrder = Math.max(0, Math.min(10000, Math.floor(body.sortOrder)));
  const updated = await db.savedCamera.update({ where: { id }, data });
  return NextResponse.json({ camera: updated });
}

/** Remove a saved camera. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await recordingAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  const { id } = await params;
  const cam = await owned(id, a.userId);
  if (!cam) return NextResponse.json({ error: "not found" }, { status: 404 });
  await db.savedCamera.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
