import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { removeSubscription } from "@/lib/push/service";

export const runtime = "nodejs";

/**
 * Browser push — remove this device's subscription for the signed-in
 * user. Body: { endpoint }. Scoped to the caller: an endpoint owned
 * by someone else is never touched.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) return NextResponse.json({ error: "signin" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (typeof body?.endpoint !== "string" || body.endpoint.length === 0) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }

  await removeSubscription(uid, body.endpoint);
  return NextResponse.json({ ok: true });
}
