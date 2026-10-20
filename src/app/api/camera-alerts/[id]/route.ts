import { NextRequest, NextResponse } from "next/server";
import { cameraAlertAccess } from "@/lib/camera-alerts/tier";
import { deleteRule, updateRule } from "@/lib/camera-alerts/service";

export const runtime = "nodejs";

/**
 * One alert rule: edit its condition/channels, pause or resume it,
 * delete it. Owner-only (the service answers 404 for anyone else's).
 * Pausing and deleting stay available after a VIP lapse — the lapse
 * pauses checking, it doesn't trap the member's rules.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await cameraAlertAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const result = await updateRule(a.userId, id, body as Record<string, unknown>);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ rule: result.value });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await cameraAlertAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  const { id } = await params;
  const result = await deleteRule(a.userId, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
