// Admin: update a Marketing Studio template (partial PATCH).
// Archive = PATCH { active: false } — there is no DELETE route.
// Gated by the same ADMIN_EMAILS check as the rest of /admin.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";

export const runtime = "nodejs";

const CATEGORIES = ["feed", "story", "reel", "tiktok", "short", "carousel", "banner", "discount", "feature", "email", "thumbnail"] as const;

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

function validDim(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 16 && v <= 4000;
}

const STRING_FIELDS = ["title", "format", "svgBody", "assetUrl", "previewUrl", "carouselGroup"] as const;
const BOOL_FIELDS = ["featured", "active"] as const;
const INT_FIELDS = ["slideIndex", "sortOrder"] as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }

  const existing = await db.marketingTemplate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  if (body.category !== undefined) {
    if (typeof body.category !== "string" || !(CATEGORIES as readonly string[]).includes(body.category)) {
      return NextResponse.json({ error: `category must be one of ${CATEGORIES.join(", ")}` }, { status: 400 });
    }
    data.category = body.category;
  }
  for (const f of ["width", "height"] as const) {
    if (body[f] !== undefined) {
      if (!validDim(body[f])) {
        return NextResponse.json({ error: `${f} must be an integer between 16 and 4000` }, { status: 400 });
      }
      data[f] = body[f];
    }
  }
  for (const f of STRING_FIELDS) {
    if (body[f] !== undefined) {
      if (body[f] !== null && typeof body[f] !== "string") {
        return NextResponse.json({ error: `${f} must be a string` }, { status: 400 });
      }
      data[f] = body[f];
    }
  }
  if (typeof data.title === "string") data.title = data.title.trim();
  if (data.title === "") return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
  if (typeof data.svgBody === "string" && data.svgBody.length > 200_000) {
    return NextResponse.json({ error: "svgBody must be at most 200000 characters" }, { status: 400 });
  }
  for (const f of BOOL_FIELDS) {
    if (body[f] !== undefined) {
      if (typeof body[f] !== "boolean") return NextResponse.json({ error: `${f} must be a boolean` }, { status: 400 });
      data[f] = body[f];
    }
  }
  for (const f of INT_FIELDS) {
    if (body[f] !== undefined) {
      if (body[f] !== null && !(typeof body[f] === "number" && Number.isInteger(body[f]))) {
        return NextResponse.json({ error: `${f} must be an integer` }, { status: 400 });
      }
      data[f] = body[f];
    }
  }
  if (body.editableFields !== undefined) {
    if (!Array.isArray(body.editableFields)) {
      return NextResponse.json({ error: "editableFields must be an array" }, { status: 400 });
    }
    data.editableFields = body.editableFields;
  }
  if (body.layers !== undefined) data.layers = body.layers;
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.some((t) => typeof t !== "string")) {
      return NextResponse.json({ error: "tags must be an array of strings" }, { status: 400 });
    }
    data.tags = body.tags;
  }
  if (body.publishAt !== undefined) {
    if (body.publishAt === null || body.publishAt === "") {
      data.publishAt = null;
    } else if (typeof body.publishAt === "string") {
      const d = new Date(body.publishAt);
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "publishAt must be a valid date" }, { status: 400 });
      data.publishAt = d;
    } else {
      return NextResponse.json({ error: "publishAt must be a date string or null" }, { status: 400 });
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const row = await db.marketingTemplate.update({ where: { id }, data });
  await audit("studio.template.update", {
    actorUserId: session?.user?.id, targetType: "MarketingTemplate", targetId: id,
    details: { slug: existing.slug, changed: Object.keys(data) },
  });
  return NextResponse.json(row);
}
