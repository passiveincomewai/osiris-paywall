// Admin: ambassador application queue (newest first), with the
// applicant's profile code and user name/email.
// Gated by the same ADMIN_EMAILS check as the rest of /admin.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/affiliate/admin";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function GET() {
  try { await requireAdmin(); } catch (e) { return forbidden(e); }
  const applications = await db.ambassadorApplication.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      profile: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });
  return NextResponse.json({ applications });
}
