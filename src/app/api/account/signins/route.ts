// GET /api/account/signins — recent sign-in history for the caller.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rows = await db.userSignInEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    signins: rows.map((r) => ({
      id: r.id,
      deviceId: r.deviceId,
      deviceLabel: r.deviceLabel,
      approximateLocation: r.approximateLocation,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
