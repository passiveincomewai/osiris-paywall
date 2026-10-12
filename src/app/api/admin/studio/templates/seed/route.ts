// Admin: seed / refresh the built-in Marketing Studio template library.
// Seeding refreshes design fields of built-in templates but preserves
// admin-chosen active/featured flags (handled inside the seed lib).
// Gated by the same ADMIN_EMAILS check as the rest of /admin.
import { NextResponse } from "next/server";
import { requireAdmin, audit } from "@/lib/affiliate/admin";
import { seedStudioTemplates } from "@/lib/studio/templates-seed";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function POST() {
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }

  const count = await seedStudioTemplates();
  await audit("studio.template.seed", {
    actorUserId: session?.user?.id, targetType: "MarketingTemplate",
    details: { count },
  });
  return NextResponse.json({ ok: true, count });
}
