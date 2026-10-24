// POST /api/account/device/heartbeat — device session tracking.
// Upserts the caller's device row; a never-seen device records a
// sign-in event and (when the account already has devices) triggers
// the new-device email alert. A revoked device is told so, and the
// client signs itself out.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hashIp } from "@/lib/affiliate/attribution";
import { approximateLocationFromHeaders, deviceLabel } from "@/lib/account/device";
import { newDeviceEmail, sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const EVENT_GAP_MS = 24 * 3600_000;

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { deviceId?: string };
  const deviceId = String(body.deviceId ?? "").slice(0, 64);
  if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });

  const ua = req.headers.get("user-agent") ?? "";
  const label = deviceLabel(ua);
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const ipHash = hashIp(forwarded);
  const location = approximateLocationFromHeaders(req.headers);
  const now = new Date();

  const existing = await db.userDeviceSession.findUnique({
    where: { userId_deviceId: { userId, deviceId } },
  });
  if (existing?.revokedAt) {
    return NextResponse.json({ revoked: true });
  }

  const isNewDevice = !existing;
  await db.userDeviceSession.upsert({
    where: { userId_deviceId: { userId, deviceId } },
    create: {
      userId, deviceId, label,
      userAgent: ua.slice(0, 500), ipHash, approximateLocation: location, lastSeenAt: now,
    },
    update: { label, userAgent: ua.slice(0, 500), ipHash, approximateLocation: location, lastSeenAt: now },
  });

  // Sign-in history: an event for a new device, and a fresh event when
  // the device returns after a day away (daily granularity, not a row
  // per page load).
  const lastEvent = await db.userSignInEvent.findFirst({
    where: { userId, deviceId },
    orderBy: { createdAt: "desc" },
  });
  const needsEvent = isNewDevice || !lastEvent || now.getTime() - lastEvent.createdAt.getTime() > EVENT_GAP_MS;
  if (needsEvent) {
    await db.userSignInEvent.create({
      data: { userId, deviceId, deviceLabel: label, ipHash, approximateLocation: location },
    });
  }

  if (isNewDevice) {
    const priorDevices = await db.userDeviceSession.count({
      where: { userId, deviceId: { not: deviceId } },
    });
    if (priorDevices > 0) {
      const user = await db.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      if (user?.email) {
        const { subject, html } = newDeviceEmail({
          name: user.name,
          deviceLabel: label,
          location,
          whenLabel: now.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
        });
        void sendEmail(user.email, subject, html).catch(() => {});
      }
    }
  }

  return NextResponse.json({ revoked: false, isNewDevice });
}
