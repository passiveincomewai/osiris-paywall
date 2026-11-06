// POST /api/camera-requests — public "request a camera" intake.
// A visitor searched the globe or the camera directory for a place,
// found nothing, and asked us to look for a feed there. Validates via
// the shared parser (src/lib/camera-requests), rate-limits per IP with
// the same helper the partners/contact routes use (5/hour), silently
// drops honeypot submissions with a success-shaped answer, resolves
// the signed-in user (if any) server-side, and stores the request for
// the admin readout in /admin/camera-requests. Requests are never
// exposed publicly — there is no GET here by design.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isRateLimited, clientIp } from "@/lib/password-auth";
import { parseCameraRequest, isCameraRequestHoneypotTripped } from "@/lib/camera-requests";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (isRateLimited(`camera-request:${clientIp(req)}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many requests from this network. Try again in an hour." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);

  // Honeypot: a filled hidden field means a bot. Answer like a success
  // (don't tip it off) and store nothing.
  if (isCameraRequestHoneypotTripped(body)) {
    return NextResponse.json({ ok: true });
  }

  const parsed = parseCameraRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  // The user id comes from the session, never from the request body.
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;

  const row = await db.cameraRequest.create({
    data: { ...parsed.data, userId, status: "new" },
  });

  return NextResponse.json({ ok: true, id: row.id });
}
