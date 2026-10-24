// GET/PATCH /api/account/preferences — the one preference store.
// GET returns the effective preferences (schema defaults when the user
// has no row yet). PATCH validates through lib/account/preferences.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPreferences, updatePreferences } from "@/lib/account/preferences";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json({ preferences: await getPreferences(userId) });
}

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await updatePreferences(userId, body);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ preferences: result.preferences });
}
