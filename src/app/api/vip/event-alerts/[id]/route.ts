import { NextRequest, NextResponse } from "next/server";
import { isVipTier, vipAccess } from "@/lib/vip/tier";
import { deleteEventRule, updateEventRule } from "@/lib/vip/events/service";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await vipAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  if (!isVipTier(a.tier)) {
    return NextResponse.json(
      { error: "vip", message: "Event alerts are a VIP Pro feature." },
      { status: 403 },
    );
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const result = await updateEventRule(a.userId, id, body as Record<string, unknown>);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ rule: result.value });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const a = await vipAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  if (!isVipTier(a.tier)) {
    return NextResponse.json(
      { error: "vip", message: "Event alerts are a VIP Pro feature." },
      { status: 403 },
    );
  }
  const { id } = await params;
  const result = await deleteEventRule(a.userId, id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true });
}
