// GET /api/affiliate/studio/templates — the active, published template
// library (never leaks svgBody). Filters: ?category=, ?q= (title search),
// ?slug= for a single template. Response also carries per-category counts.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureStudioTemplates } from "@/lib/studio/templates-seed";
import { ensureStudioVideos } from "@/lib/studio/video-seed";
import { TEMPLATE_CATEGORIES } from "@/lib/studio/types";
import { requireStudioAccess } from "../../_util";

export const runtime = "nodejs";

type TemplateRow = Awaited<ReturnType<typeof findPublished>>[number];

async function findPublished() {
  const now = new Date();
  return db.marketingTemplate.findMany({
    where: {
      active: true,
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
}

/** Public shape: everything the library/personalize UI needs, minus svgBody. */
function publicTemplate(t: TemplateRow) {
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    category: t.category,
    kind: t.kind,
    format: t.format,
    width: t.width,
    height: t.height,
    assetUrl: t.assetUrl,
    previewUrl: t.previewUrl,
    editableFields: t.editableFields,
    layers: t.layers,
    carouselGroup: t.carouselGroup,
    slideIndex: t.slideIndex,
    featured: t.featured,
    sortOrder: t.sortOrder,
    tags: t.tags,
  };
}

export async function GET(req: Request) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }

  await ensureStudioTemplates();
  await ensureStudioVideos();

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const category = searchParams.get("category");
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (category !== null && !(TEMPLATE_CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json(
      { error: `category must be one of ${TEMPLATE_CATEGORIES.join(", ")}` },
      { status: 400 },
    );
  }

  const rows = await findPublished();

  if (slug !== null) {
    const found = rows.find((t) => t.slug === slug);
    if (!found) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    const template = publicTemplate(found);
    // `templates` mirrors the single row: the Quick Edit client reads the
    // list shape even for slug lookups.
    return NextResponse.json({ template, templates: [template] });
  }

  const counts = new Map<string, number>();
  for (const t of rows) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  const categories = [...counts.entries()].map(([key, count]) => ({ key, count }));

  const filtered = rows.filter((t) => {
    if (category !== null && t.category !== category) return false;
    if (q && !t.title.toLowerCase().includes(q)) return false;
    return true;
  });

  return NextResponse.json({ templates: filtered.map(publicTemplate), categories });
}
