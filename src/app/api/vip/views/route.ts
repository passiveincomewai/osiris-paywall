import { NextRequest, NextResponse } from "next/server";
import { isVipTier, vipAccess } from "@/lib/vip/tier";
import { createView, listViews, MAX_VIEWS } from "@/lib/vip/views";

export const runtime = "nodejs";

/**
 * VIP saved globe views. GET open to any signed-in owner; creating is
 * VIP-only, mirroring the other VIP feature APIs.
 */
export async function GET() {
  const a = await vipAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  const views = await listViews(a.userId);
  return NextResponse.json({ tier: a.tier, vip: isVipTier(a.tier), maxViews: MAX_VIEWS, views });
}

export async function POST(req: NextRequest) {
  const a = await vipAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  if (!isVipTier(a.tier)) {
    return NextResponse.json(
      { error: "vip", message: "Saved views are a VIP Pro feature." },
      { status: 403 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const result = await createView(a.userId, body as Record<string, unknown>);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ view: result.value }, { status: 201 });
}
