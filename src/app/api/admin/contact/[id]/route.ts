// Admin: manage one contact-form submission.
// PATCH { status: "unread" | "read" | "resolved" } — stamps/clears readAt.
// DELETE — removes the submission.
// Gated by the same requireAdmin() (ADMIN_EMAILS) as the rest of /admin.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";

export const runtime = "nodejs";

const STATUSES = ["unread", "read", "resolved"] as const;

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }

  const { status } = (await req.json().catch(() => ({}))) as { status?: string };
  if (!status || !(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json(
      { error: `status must be one of ${STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const existing = await db.contactMessage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const updated = await db.contactMessage.update({
    where: { id },
    data: {
      status,
      readAt: status === "unread" ? null : (existing.readAt ?? new Date()),
    },
  });
  await audit("contact.status", {
    actorUserId: session?.user?.id, targetType: "ContactMessage", targetId: id,
    details: { from: existing.status, to: status, topic: existing.topic },
  });
  return NextResponse.json({ id: updated.id, status: updated.status });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }

  const existing = await db.contactMessage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  await db.contactMessage.delete({ where: { id } });
  await audit("contact.delete", {
    actorUserId: session?.user?.id, targetType: "ContactMessage", targetId: id,
    details: { topic: existing.topic, from: existing.email },
  });
  return NextResponse.json({ ok: true, id });
}
