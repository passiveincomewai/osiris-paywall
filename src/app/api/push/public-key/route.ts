import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getVapidPublicKey } from "@/lib/push/config";

export const runtime = "nodejs";

/**
 * Browser push — the VAPID public key a device subscribes with.
 * Answers { configured: false } until the owner sets VAPID_PUBLIC_KEY
 * / VAPID_PRIVATE_KEY in the deployment environment; push stays inert
 * (and the settings UI says so) until then. Signed-in users only: the
 * key is not secret, but subscriptions belong to accounts.
 */
export async function GET() {
  const session = await auth().catch(() => null);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return NextResponse.json({ error: "signin" }, { status: 401 });

  const publicKey = getVapidPublicKey();
  if (!publicKey) return NextResponse.json({ configured: false });
  return NextResponse.json({ configured: true, publicKey });
}
