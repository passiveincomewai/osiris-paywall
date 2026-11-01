// Admin: manage one partnership application.
// PATCH { status?, adminNotes?, nextFollowUpAt? } — status must be one of
// PARTNERSHIP_STATUSES (src/lib/partners.ts); nextFollowUpAt is an ISO
// date string or null to clear. DELETE — removes the application.
// Gated by the same requireAdmin() (ADMIN_EMAILS) as the rest of /admin,
// and audited like the contact inbox actions.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";
import { PARTNERSHIP_STATUS_VALUES, PARTNER_NOTES_MAX } from "@/lib/partners";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }

  const body = (await req.json().catch(() => ({}))) as {
    status?: string;
    adminNotes?: string | null;
    nextFollowUpAt?: string | null;
  };

  const data: { status?: string; adminNotes?: string | null; nextFollowUpAt?: Date | null } = {};
  if (body.status !== undefined) {
    if (!PARTNERSHIP_STATUS_VALUES.includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of ${PARTNERSHIP_STATUS_VALUES.join(", ")}` },
        { status: 400 },
      );
    }
    data.status = body.status;
  }
  if (body.adminNotes !== undefined) {
    data.adminNotes =
      body.adminNotes === null ? null : String(body.adminNotes).slice(0, PARTNER_NOTES_MAX);
  }
  if (body.nextFollowUpAt !== undefined) {
    if (body.nextFollowUpAt === null || body.nextFollowUpAt === "") {
      data.nextFollowUpAt = null;
    } else {
      const d = new Date(body.nextFollowUpAt);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "nextFollowUpAt must be a date or null" }, { status: 400 });
      }
      data.nextFollowUpAt = d;
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const existing = await db.partnershipApplication.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const updated = await db.partnershipApplication.update({ where: { id }, data });
  await audit("partnerships.update", {
    actorUserId: session?.user?.id, targetType: "PartnershipApplication", targetId: id,
    details: {
      company: existing.company, type: existing.type,
      ...(data.status ? { statusFrom: existing.status, statusTo: data.status } : {}),
      ...(data.nextFollowUpAt !== undefined ? { followUp: data.nextFollowUpAt } : {}),
      ...(data.adminNotes !== undefined ? { notes: true } : {}),
    },
  });
  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    adminNotes: updated.adminNotes,
    nextFollowUpAt: updated.nextFollowUpAt ? updated.nextFollowUpAt.toISOString() : null,
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }

  const existing = await db.partnershipApplication.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  await db.partnershipApplication.delete({ where: { id } });
  await audit("partnerships.delete", {
    actorUserId: session?.user?.id, targetType: "PartnershipApplication", targetId: id,
    details: { company: existing.company, type: existing.type, from: existing.email },
  });
  return NextResponse.json({ ok: true, id });
}
