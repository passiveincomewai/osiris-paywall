// GET /api/share/code — the signed-in user's share code: their
// affiliate code when they have a profile (the one code they ever
// need), else the anonymous code they claimed, else null (the client
// then falls back to this device's anonymous identity).
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getShareCodeForUser } from "@/lib/share/identity";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ code: null, kind: null });
  const found = await getShareCodeForUser(userId);
  return NextResponse.json({ code: found?.code ?? null, kind: found?.kind ?? null });
}
