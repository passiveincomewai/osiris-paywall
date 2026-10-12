// GET   /api/affiliate/studio/showcase — { showcaseEnabled, code } for the
//       caller's public /bio/<code> page.
// PATCH /api/affiliate/studio/showcase { enabled } — toggle whether featured
//       creations appear on the public bio page. Studio-gated like the
//       rest of the Studio API surface.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudioAccess } from "../../_util";

export const runtime = "nodejs";

function codeFor(profile: { customCode: string | null; referralCode: string }): string {
  return profile.customCode ?? profile.referralCode;
}

export async function GET() {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }
  return NextResponse.json({ showcaseEnabled: profile.showcaseEnabled, code: codeFor(profile) });
}

export async function PATCH(req: Request) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }
  const body = (await req.json().catch(() => ({}))) as { enabled?: unknown };
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }
  const updated = await db.affiliateProfile.update({
    where: { id: profile.id },
    data: { showcaseEnabled: body.enabled },
    select: { showcaseEnabled: true, customCode: true, referralCode: true },
  });
  return NextResponse.json({ showcaseEnabled: updated.showcaseEnabled, code: codeFor(updated) });
}
