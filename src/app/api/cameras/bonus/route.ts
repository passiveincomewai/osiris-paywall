// GET /api/cameras/bonus — the signed-in user's unspent invite-bonus
// camera opens. The free base allowance stays per-device localStorage
// (lib/cameraGate); this balance is the server-side portion on top of
// it, and the server is its source of truth.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCameraBonusBalance } from "@/lib/camera-bonus";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ balance: await getCameraBonusBalance(userId) });
}
