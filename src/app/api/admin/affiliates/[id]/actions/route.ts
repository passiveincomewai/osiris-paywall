// Admin: per-affiliate controls from the detail page — grant/revoke free
// Pro, set status (incl. remove/reactivate), ambassador toggle, discount
// code reset, XP adjust, and one-off emails (send_email: welcome /
// payout_available / checkin / custom — see sendAffiliateAdminEmail).
// All effects live in src/lib/affiliate/admin-detail.ts; every action is
// audit-logged.
import { NextResponse } from "next/server";
import { requireAdmin, audit } from "@/lib/affiliate/admin";
import {
  applyAffiliateAdminAction,
  sendAffiliateAdminEmail,
  AffiliateActionError,
  type AffiliateAdminAction,
} from "@/lib/affiliate/admin-detail";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

const KNOWN_ACTIONS = ["grant_comp", "revoke_comp", "set_status", "set_ambassador", "reset_discount", "adjust_xp", "send_email"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!KNOWN_ACTIONS.includes(String(body.action))) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  // Email sends: the audit details record the template + outcome only —
  // never the admin-written custom subject/body text itself.
  if (body.action === "send_email") {
    try {
      const out = await sendAffiliateAdminEmail(id, session?.user?.email ?? undefined, {
        template: String(body.template ?? ""),
        subject: typeof body.subject === "string" ? body.subject : undefined,
        body: typeof body.body === "string" ? body.body : undefined,
      });
      await audit("affiliate.send_email", {
        actorUserId: session?.user?.id,
        targetType: "AffiliateProfile",
        targetId: id,
        details: { template: String(body.template ?? ""), result: out.result },
      });
      return NextResponse.json({ ok: true, ...out });
    } catch (e) {
      if (e instanceof AffiliateActionError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
  }

  const input = body as unknown as AffiliateAdminAction;

  try {
    const out = await applyAffiliateAdminAction(id, session?.user?.email ?? undefined, input);
    await audit(`affiliate.${String(body.action)}`, {
      actorUserId: session?.user?.id,
      targetType: "AffiliateProfile",
      targetId: id,
      details: { ...body, result: out.result },
    });
    return NextResponse.json({ ok: true, ...out });
  } catch (e) {
    if (e instanceof AffiliateActionError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    throw e;
  }
}
