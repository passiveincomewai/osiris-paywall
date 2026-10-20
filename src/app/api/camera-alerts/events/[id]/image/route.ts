import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { verifyEventImageToken } from "@/lib/camera-alerts/image-token";

export const runtime = "nodejs";

/**
 * The exact still an alert was based on (stored on the AlertEvent).
 * Two ways in: the signed token the alert email carries (mail clients
 * have no session), or the owning member's own session. Everyone else
 * gets a 404 — an event id alone is never enough.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await db.alertEvent
    .findUnique({ where: { id }, select: { userId: true, imageJpeg: true } })
    .catch(() => null);
  if (!event?.imageJpeg) return NextResponse.json({ error: "not found" }, { status: 404 });

  const token = new URL(req.url).searchParams.get("t");
  let allowed = verifyEventImageToken(id, token);
  if (!allowed) {
    const session = await auth().catch(() => null);
    allowed = (session?.user as { id?: string } | undefined)?.id === event.userId;
  }
  if (!allowed) return NextResponse.json({ error: "not found" }, { status: 404 });

  return new NextResponse(Buffer.from(event.imageJpeg, "base64"), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
