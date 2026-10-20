import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordingAccess } from "@/lib/recording/access";

export const runtime = "nodejs";

/** Dashboard status: Pro access + usage counts (cameras, clips). */
export async function GET() {
  const a = await recordingAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  const [cameras, clips] = await Promise.all([
    db.savedCamera.count({ where: { userId: a.userId } }),
    db.clipMeta.aggregate({
      where: { userId: a.userId },
      _sum: { durationSec: true, sizeBytes: true },
      _count: true,
    }),
  ]);
  return NextResponse.json({
    pro: a.pro,
    tier: a.tier,
    cameras,
    clips: clips._count,
    clipSeconds: clips._sum.durationSec ?? 0,
    clipBytes: clips._sum.sizeBytes ?? 0,
  });
}
