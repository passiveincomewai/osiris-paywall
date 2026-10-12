import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/affiliate/admin";

export const runtime = "nodejs";

/**
 * Admin: seed Competitor rows from the researched JSON bundled in
 * src/data/competitors/*.json. Upserts by slug — safe to re-run.
 * (The sandbox can't reach Postgres, so seeding happens in production.)
 */
export async function POST() {
  try { await requireAdmin(); } catch { return NextResponse.json({ ok: false }, { status: 403 }); }
  const dir = join(process.cwd(), "src", "data", "competitors");
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    return NextResponse.json({ ok: false, error: "No bundled data found" }, { status: 500 });
  }
  const results: { slug: string; published: boolean }[] = [];
  for (const f of files) {
    try {
      const d = JSON.parse(await readFile(join(dir, f), "utf8"));
      if (!d.slug || !d.name || !d.description) continue;
      const { _researchNotes, ...data } = d;
      await db.competitor.upsert({
        where: { slug: data.slug },
        create: {
          slug: data.slug, name: data.name, website: data.website ?? null,
          categories: data.categories ?? [], tagline: data.tagline ?? null,
          description: data.description, features: data.features ?? [],
          pricing: data.pricing ?? null, whyWorldEye: data.whyWorldEye ?? [],
          competitorWins: data.competitorWins ?? null,
          verdictWorldEye: data.verdictWorldEye ?? null,
          verdictCompetitor: data.verdictCompetitor ?? null,
          sources: data.sources ?? [],
          lastReviewed: new Date(), published: !!data.published,
          seoTitle: data.seoTitle ?? null, seoDescription: data.seoDescription ?? null,
        },
        update: {
          name: data.name, website: data.website ?? null,
          categories: data.categories ?? [], tagline: data.tagline ?? null,
          description: data.description, features: data.features ?? [],
          pricing: data.pricing ?? null, whyWorldEye: data.whyWorldEye ?? [],
          competitorWins: data.competitorWins ?? null,
          verdictWorldEye: data.verdictWorldEye ?? null,
          verdictCompetitor: data.verdictCompetitor ?? null,
          sources: data.sources ?? [],
          lastReviewed: new Date(), published: !!data.published,
          seoTitle: data.seoTitle ?? null, seoDescription: data.seoDescription ?? null,
        },
      });
      results.push({ slug: data.slug, published: !!data.published });
    } catch (e) {
      console.error(`[seed] failed on ${f}`, e);
    }
  }
  return NextResponse.json({ ok: true, seeded: results.length, results });
}
