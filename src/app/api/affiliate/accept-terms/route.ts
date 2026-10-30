// POST /api/affiliate/accept-terms — record the signed-in user's
// acceptance of the affiliate program terms (lib/affiliate/terms).
// The demo join flow calls this immediately before POST /api/affiliate/join
// so enrolment is always preceded by a stored, timestamped acceptance.
// Idempotent per (user, termsVersion): re-accepting the same version
// returns the original record instead of writing a second row.
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AFFILIATE_TERMS_VERSION } from "@/lib/affiliate/terms";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { version?: unknown; source?: unknown };
  const version =
    typeof body.version === "string" && body.version.trim() && body.version.length <= 40
      ? body.version.trim()
      : AFFILIATE_TERMS_VERSION;
  const source =
    typeof body.source === "string" && body.source.trim() && body.source.length <= 40
      ? body.source.trim()
      : "demo";

  const existing = await db.affiliateTermsAcceptance.findUnique({
    where: { userId_termsVersion: { userId, termsVersion: version } },
  });
  if (existing) {
    return NextResponse.json({
      accepted: true,
      already: true,
      termsVersion: existing.termsVersion,
      acceptedAt: existing.acceptedAt.toISOString(),
    });
  }

  const row = await db.affiliateTermsAcceptance.create({
    data: { userId, termsVersion: version, source },
  });
  return NextResponse.json({
    accepted: true,
    already: false,
    termsVersion: row.termsVersion,
    acceptedAt: row.acceptedAt.toISOString(),
  });
}
