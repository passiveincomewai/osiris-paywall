// Admin: create a Marketing Studio template.
// Gated by the same ADMIN_EMAILS check as the rest of /admin.
// Archive is PATCH { active: false } on [id] — there is no DELETE route.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";

export const runtime = "nodejs";

const CATEGORIES = ["feed", "story", "reel", "tiktok", "short", "carousel", "banner", "discount", "feature", "email", "thumbnail"] as const;

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "template";
}

function validDim(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 16 && v <= 4000;
}

export async function POST(req: Request) {
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const category = typeof body.category === "string" ? body.category : "";
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: `category must be one of ${CATEGORIES.join(", ")}` }, { status: 400 });
  }

  const format = typeof body.format === "string" ? body.format.trim() : "";
  if (!format) return NextResponse.json({ error: "format is required" }, { status: 400 });

  if (!validDim(body.width) || !validDim(body.height)) {
    return NextResponse.json({ error: "width and height must be integers between 16 and 4000" }, { status: 400 });
  }

  const kind = typeof body.kind === "string" && body.kind ? body.kind : "svg";
  const svgBody = typeof body.svgBody === "string" ? body.svgBody : null;
  if (kind === "svg") {
    if (!svgBody || !svgBody.trim()) {
      return NextResponse.json({ error: "svgBody is required for svg templates" }, { status: 400 });
    }
    if (svgBody.length > 200_000) {
      return NextResponse.json({ error: "svgBody must be at most 200000 characters" }, { status: 400 });
    }
  }

  const editableFields = body.editableFields === undefined ? [] : body.editableFields;
  if (!Array.isArray(editableFields)) {
    return NextResponse.json({ error: "editableFields must be an array" }, { status: 400 });
  }

  const layers = body.layers === undefined ? null : body.layers;
  const assetUrl = typeof body.assetUrl === "string" ? body.assetUrl : null;
  const carouselGroup = typeof body.carouselGroup === "string" ? body.carouselGroup : null;
  const slideIndex = typeof body.slideIndex === "number" && Number.isInteger(body.slideIndex) ? body.slideIndex : null;
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : [];
  let publishAt: Date | null = null;
  if (typeof body.publishAt === "string" && body.publishAt) {
    const d = new Date(body.publishAt);
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "publishAt must be a valid date" }, { status: 400 });
    publishAt = d;
  }

  // Unique slug: base, then -2, -3, …
  const base = slugify(title);
  let slug = base;
  for (let n = 2; await db.marketingTemplate.findUnique({ where: { slug }, select: { id: true } }); n++) {
    slug = `${base}-${n}`;
  }

  const row = await db.marketingTemplate.create({
    data: {
      slug,
      title,
      category,
      kind,
      format,
      width: body.width,
      height: body.height,
      svgBody,
      assetUrl,
      editableFields: editableFields as object,
      layers: (layers ?? undefined) as object | undefined,
      carouselGroup,
      slideIndex,
      tags,
      publishAt,
      createdBy: session?.user?.id ?? null,
    },
  });

  await audit("studio.template.create", {
    actorUserId: session?.user?.id, targetType: "MarketingTemplate", targetId: row.id,
    details: { slug: row.slug, title: row.title, category: row.category, kind: row.kind },
  });
  return NextResponse.json(row, { status: 201 });
}
