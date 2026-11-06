import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendPushToUser } from "@/lib/push/send";

export const runtime = "nodejs";

/**
 * Browser push — send a test notification to the signed-in user's OWN
 * subscribed devices (never anyone else's). The settings page uses it
 * so a user can prove the channel end to end on the spot.
 */
export async function POST() {
  const session = await auth().catch(() => null);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return NextResponse.json({ error: "signin" }, { status: 401 });

  const result = await sendPushToUser(uid, {
    title: "WorldEye push is on",
    body: "Test notification — alerts you choose for push will arrive like this.",
    url: "/settings",
    tag: "worldeye-push-test",
  });
  if (!result.configured) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  return NextResponse.json({ ok: true, ...result });
}
