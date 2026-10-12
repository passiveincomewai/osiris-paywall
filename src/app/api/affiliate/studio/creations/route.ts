// GET  /api/affiliate/studio/creations — the caller's saved creations.
// POST /api/affiliate/studio/creations — save a personalized template render
// (params only; downloads re-render deterministically from template + params).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildStudioContext } from "@/lib/studio/context";
import { computeRenderHash, validateValues } from "@/lib/studio/render";
import type { EditableField } from "@/lib/studio/types";
import { activeOnly, requireAffiliate } from "../../_util";

export const runtime = "nodejs";

export async function GET() {
  const { profile, error } = await requireAffiliate();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }
  const blocked = activeOnly(profile);
  if (blocked) return blocked;

  const creations = await db.studioCreation.findMany({
    where: { affiliateProfileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { template: { select: { slug: true, title: true, category: true } } },
  });

  return NextResponse.json({
    creations: creations.map((c) => ({
      ...c,
      templateSlug: c.template?.slug ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const { profile, error } = await requireAffiliate();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }
  const blocked = activeOnly(profile);
  if (blocked) return blocked;

  const body = (await req.json().catch(() => ({}))) as {
    templateSlug?: unknown;
    title?: unknown;
    values?: unknown;
  };

  const templateSlug = typeof body.templateSlug === "string" ? body.templateSlug : "";
  if (!templateSlug) {
    return NextResponse.json({ error: "templateSlug is required" }, { status: 400 });
  }
  if (
    body.values !== undefined &&
    (typeof body.values !== "object" || body.values === null || Array.isArray(body.values))
  ) {
    return NextResponse.json({ error: "values must be an object" }, { status: 400 });
  }
  const rawValues = (body.values ?? {}) as Record<string, unknown>;

  const template = await db.marketingTemplate.findFirst({
    where: { slug: templateSlug, active: true },
  });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const fields: EditableField[] = Array.isArray(template.editableFields)
    ? (template.editableFields as unknown as EditableField[])
    : [];
  const validated = validateValues(fields, rawValues);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const ctx = await buildStudioContext(profile);
  const renderHash = computeRenderHash(template.updatedAt.toISOString(), validated.values, ctx.code);
  const title =
    (typeof body.title === "string" ? body.title.slice(0, 120) : "") || template.title;

  const row = await db.studioCreation.create({
    data: {
      affiliateProfileId: profile.id,
      templateId: template.id,
      title,
      kind: template.carouselGroup ? "carousel" : "image",
      params: validated.values,
      renderHash,
    },
  });

  return NextResponse.json(
    {
      ...row,
      templateSlug: template.slug,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    },
    { status: 201 },
  );
}
