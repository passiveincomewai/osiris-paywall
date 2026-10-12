import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/affiliate/admin";

export const runtime = "nodejs";

/** Admin: list all competitors (published + drafts). */
export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ ok: false }, { status: 403 }); }
  const rows = await db.competitor.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ ok: true, rows });
}

/** Admin: create a competitor (usually starts as draft). */
export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ ok: false }, { status: 403 }); }
  const d = await req.json().catch(() => ({}));
  if (!d.slug || !d.name || !d.description) {
    return NextResponse.json({ ok: false, error: "slug, name and description are required" }, { status: 400 });
  }
  const row = await db.competitor.create({
    data: {
      slug: String(d.slug).toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      name: String(d.name),
      website: d.website || null,
      categories: Array.isArray(d.categories) ? d.categories : [],
      tagline: d.tagline || null,
      description: String(d.description),
      features: d.features ?? [],
      pricing: d.pricing || null,
      whyWorldEye: d.whyWorldEye ?? [],
      competitorWins: d.competitorWins || null,
      verdictWorldEye: d.verdictWorldEye || null,
      verdictCompetitor: d.verdictCompetitor || null,
      sources: d.sources ?? [],
      published: !!d.published,
      seoTitle: d.seoTitle || null,
      seoDescription: d.seoDescription || null,
    },
  });
  return NextResponse.json({ ok: true, row });
}
