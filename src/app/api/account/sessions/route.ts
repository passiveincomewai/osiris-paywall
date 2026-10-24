// /api/account/sessions — active device sessions + remote sign-out.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const rows = await db.userDeviceSession.findMany({
    where: { userId },
    orderBy: [{ revokedAt: "asc" }, { lastSeenAt: "desc" }],
    take: 50,
  });
  return NextResponse.json({
    sessions: rows.map((r) => ({
      deviceId: r.deviceId,
      label: r.label,
      approximateLocation: r.approximateLocation,
      lastSeenAt: r.lastSeenAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      revokedAt: r.revokedAt?.toISOString() ?? null,
    })),
  });
}

// POST { deviceId } revokes that device; { allOthers: true, currentDeviceId }
// revokes everything except the caller's device.
export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as {
    deviceId?: string; allOthers?: boolean; currentDeviceId?: string;
  };
  const now = new Date();
  if (body.allOthers) {
    const current = String(body.currentDeviceId ?? "");
    const r = await db.userDeviceSession.updateMany({
      where: { userId, revokedAt: null, ...(current ? { deviceId: { not: current } } : {}) },
      data: { revokedAt: now },
    });
    return NextResponse.json({ ok: true, revoked: r.count });
  }
  const deviceId = String(body.deviceId ?? "");
  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  await db.userDeviceSession.updateMany({
    where: { userId, deviceId, revokedAt: null },
    data: { revokedAt: now },
  });
  return NextResponse.json({ ok: true, revoked: 1 });
}
