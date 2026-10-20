// POST /api/cameras/bonus/consume — spend ONE bonus camera open. The
// globe calls this when a signed-in user opens a camera past their
// free base allowance on this device; { consumed: false } means the
// bonus is spent (here or on another device) and the signup nudge
// takes over, exactly as it does at the plain base limit.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { consumeCameraBonus } from "@/lib/camera-bonus";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json(await consumeCameraBonus(userId));
}
