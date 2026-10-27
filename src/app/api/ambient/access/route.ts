import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sessionHasAmbientAccess } from "@/lib/ambient/access";
import { resolveAmbientAccess } from "@/lib/ambient/access-server";

/**
 * GET /api/ambient/access — the player's access truth. The session
 * claim answers when present; a signed-in user whose claim is absent
 * or false gets one authoritative DB resolution (the same resolver
 * the stream-key routes use), so a just-finished checkout heals here
 * even before the JWT's 60 s TTL rolls.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ signedIn: false, access: false });
  }
  if (sessionHasAmbientAccess(session)) {
    return NextResponse.json({ signedIn: true, access: true });
  }
  const access = await resolveAmbientAccess(session.user.id).catch(() => false);
  return NextResponse.json({ signedIn: true, access });
}
