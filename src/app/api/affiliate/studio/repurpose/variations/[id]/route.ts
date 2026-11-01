// PATCH/DELETE /api/affiliate/studio/repurpose/variations/[id]
// Edit one variation's composition (the editor's save path), hook,
// caption text, status, favourite flag, and manual posting record.
// Posting is recorded by the affiliate (platform metrics are never
// invented here — same manual-honesty rule as StudioCreation variants).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeVariation } from "@/lib/studio/repurpose-server";
import { validateComposition, type RepurposeComposition } from "@/lib/studio/repurpose";
import { requireStudioAccess } from "../../../../_util";

export const runtime = "nodejs";

async function loadOwnVariation(profileId: string, id: string) {
  const v = await db.studioVariation.findUnique({
    where: { id },
    include: { project: { select: { profileId: true, durationSec: true } } },
  });
  if (!v || v.project.profileId !== profileId) return null;
  return v;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  const { id } = await params;
  const variation = await loadOwnVariation(profile.id, id);
  if (!variation) return NextResponse.json({ error: "Variation not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (body.composition && typeof body.composition === "object") {
    const comp = body.composition as RepurposeComposition;
    const duration = variation.project.durationSec ?? comp.segments?.reduce((m, s) => Math.max(m, s.endSec), 0) ?? 0;
    const errors = validateComposition(comp, duration);
    if (errors.length > 0) {
      return NextResponse.json({ error: `Invalid composition: ${errors.join("; ")}` }, { status: 400 });
    }
    data.composition = comp;
    if (typeof comp.hookText === "string") data.hookText = comp.hookText.slice(0, 200);
    if (typeof comp.aspect === "string") data.aspect = comp.aspect;
  }
  if (typeof body.hookText === "string") data.hookText = body.hookText.slice(0, 200);
  if (typeof body.captionText === "string") data.captionText = body.captionText.slice(0, 2200);
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim().slice(0, 120);
  if (typeof body.favorite === "boolean") data.favorite = body.favorite;
  if (typeof body.status === "string" && ["draft", "rendered", "published", "archived"].includes(body.status)) {
    data.status = body.status;
  }
  if (body.status === "published") {
    if (typeof body.postedPlatform === "string") data.postedPlatform = body.postedPlatform.slice(0, 40);
    if (typeof body.postedUrl === "string") data.postedUrl = body.postedUrl.slice(0, 500);
    data.postedAt = new Date();
  }

  const updated = await db.studioVariation.update({ where: { id: variation.id }, data });
  return NextResponse.json({ variation: serializeVariation(updated) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  const { id } = await params;
  const variation = await loadOwnVariation(profile.id, id);
  if (!variation) return NextResponse.json({ error: "Variation not found" }, { status: 404 });
  await db.studioVariation.delete({ where: { id: variation.id } });
  return NextResponse.json({ ok: true });
}
