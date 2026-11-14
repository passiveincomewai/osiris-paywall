// Admin: the global campaign suppression list — list + add.
// Suppressed addresses are never added to a campaign and are
// re-checked at send time by the tick engine.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";
import { isValidEmail, normalizeEmail } from "@/lib/campaigns/parse";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    return forbidden(e);
  }
  const suppressions = await db.emailSuppression.findMany({ orderBy: { createdAt: "desc" }, take: 1000 });
  return NextResponse.json({ suppressions });
}

export async function POST(req: Request) {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    return forbidden(e);
  }
  const body = (await req.json().catch(() => ({}))) as { email?: string; reason?: string };
  const email = normalizeEmail(body.email ?? "");
  if (!isValidEmail(email)) return NextResponse.json({ error: "a valid email is required" }, { status: 400 });

  const row = await db.emailSuppression.upsert({
    where: { email },
    create: { email, reason: (body.reason ?? "").slice(0, 200) },
    update: { reason: (body.reason ?? "").slice(0, 200) },
  });
  await audit("campaign.suppression.add", {
    actorUserId: session?.user?.id,
    targetType: "EmailSuppression",
    targetId: row.id,
    details: { email },
  });
  return NextResponse.json({ id: row.id, email: row.email }, { status: 201 });
}
