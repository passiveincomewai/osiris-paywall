import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/affiliate/admin";

export const runtime = "nodejs";

const EDITABLE = [
  "name", "website", "categories", "tagline", "description", "features",
  "pricing", "whyWorldEye", "competitorWins", "verdictWorldEye",
  "verdictCompetitor", "sources", "published", "seoTitle", "seoDescription",
  "lastReviewed",
] as const;

/** Admin: update a competitor. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ ok: false }, { status: 403 }); }
  const { id } = await params;
  const d = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const k of EDITABLE) {
    if (k in d) data[k] = d[k];
  }
  if ("lastReviewed" in data && data.lastReviewed) data.lastReviewed = new Date(data.lastReviewed as string);
  try {
    const row = await db.competitor.update({ where: { id }, data });
    return NextResponse.json({ ok: true, row });
  } catch {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }
}

/** Admin: delete a competitor. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ ok: false }, { status: 403 }); }
  const { id } = await params;
  await db.competitor.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
