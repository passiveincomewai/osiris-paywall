import { NextRequest, NextResponse } from "next/server";
import { isVipTier, vipAccess } from "@/lib/vip/tier";
import { createPlace, listPlaces, MAX_PLACES } from "@/lib/vip/places";

export const runtime = "nodejs";

/**
 * VIP watched places. GET is open to any signed-in owner (a lapsed VIP
 * still sees their places); creating is VIP-only, mirroring the
 * camera-alert APIs' contract.
 */
export async function GET() {
  const a = await vipAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  const places = await listPlaces(a.userId);
  return NextResponse.json({ tier: a.tier, vip: isVipTier(a.tier), maxPlaces: MAX_PLACES, places });
}

export async function POST(req: NextRequest) {
  const a = await vipAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  if (!isVipTier(a.tier)) {
    return NextResponse.json(
      { error: "vip", message: "Watched places are a VIP Pro feature." },
      { status: 403 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const result = await createPlace(a.userId, body as Record<string, unknown>);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ place: result.value }, { status: 201 });
}
