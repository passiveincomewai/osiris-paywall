// Admin: decide an ambassador application.
// POST { decision: "approved" | "rejected" } ("approve"/"reject" also
// accepted). Approval flips the profile's isAmbassador flag.
// Gated by the same ADMIN_EMAILS check as the rest of /admin.
import { NextResponse } from "next/server";
import { requireAdmin, audit } from "@/lib/affiliate/admin";
import { decideApplication, normalizeDecision } from "@/lib/studio/ambassador";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }
  const actor = session?.user?.id;

  const body = (await req.json().catch(() => ({}))) as { decision?: unknown };
  const decision = normalizeDecision(body.decision);
  if (!decision) {
    return NextResponse.json({ error: 'decision must be "approved" or "rejected"' }, { status: 400 });
  }

  try {
    const application = await decideApplication(id, decision);
    await audit(`studio.ambassador.${decision}`, {
      actorUserId: actor, targetType: "AmbassadorApplication", targetId: id,
      details: {
        platform: application.platform,
        handle: application.handle,
        profileId: application.profileId,
      },
    });
    return NextResponse.json({ application });
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 400;
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not decide application" },
      { status },
    );
  }
}
