// PATCH/DELETE /api/affiliate/studio/repurpose/posts/[id]
// Reschedule, cancel, or record the manual publish (URL the affiliate
// pastes after posting — never fabricated by the server).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireStudioAccess } from "../../../../_util";

export const runtime = "nodejs";

async function loadOwn(profileId: string, id: string) {
  return db.studioPost.findFirst({ where: { id, profileId } });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  const { id } = await params;
  const post = await loadOwn(profile.id, id);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (typeof body.scheduledAt === "string") {
    const d = new Date(body.scheduledAt);
    if (isNaN(d.getTime())) return NextResponse.json({ error: "scheduledAt must be a valid date/time." }, { status: 400 });
    data.scheduledAt = d;
    // Rescheduling re-arms reminders that haven't fired for the new time.
    if (post.status === "reminder_due" || post.status === "cancelled") data.status = "scheduled";
  }
  if (typeof body.caption === "string") data.caption = body.caption.slice(0, 2200);
  if (body.status === "cancelled") data.status = "cancelled";
  if (body.status === "published") {
    data.status = "published";
    if (typeof body.publishedUrl === "string" && body.publishedUrl.trim()) {
      data.publishedUrl = body.publishedUrl.trim().slice(0, 1000);
    }
    // Mirror the manual record onto the variation (Phase 5 reads it).
    if (post.variationId) {
      await db.studioVariation.update({
        where: { id: post.variationId },
        data: {
          status: "published",
          postedPlatform: post.platform,
          postedUrl: typeof data.publishedUrl === "string" ? data.publishedUrl : undefined,
          postedAt: new Date(),
        },
      }).catch(() => undefined);
    }
  }

  const updated = await db.studioPost.update({ where: { id: post.id }, data });
  return NextResponse.json({
    post: {
      ...updated,
      scheduledAt: updated.scheduledAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  const { id } = await params;
  const post = await loadOwn(profile.id, id);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  await db.studioPost.delete({ where: { id: post.id } });
  return NextResponse.json({ ok: true });
}
