import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pushConfigured } from "@/lib/push/config";
import { validateSubscriptionInput } from "@/lib/push/logic";
import { saveSubscription } from "@/lib/push/service";

export const runtime = "nodejs";

/**
 * Browser push — store this device's subscription for the signed-in
 * user. Body is the browser's PushSubscription.toJSON():
 * { endpoint, keys: { p256dh, auth } }. Shape is validated once, in
 * lib/push/logic, before anything reaches the table.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return NextResponse.json({ error: "signin" }, { status: 401 });
  if (!pushConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const parsed = validateSubscriptionInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null;
  await saveSubscription(uid, parsed.value, userAgent);
  return NextResponse.json({ ok: true });
}
