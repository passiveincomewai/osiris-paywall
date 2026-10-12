// GET /api/affiliate/studio/render?slug=&format=png&scale=1&preview=1&f_<key>=value
// Renders a template personalized with the caller's real affiliate context.
// Rate-limited per user; QR renders fail closed (422) when validation fails.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/password-auth";
import { buildStudioContext } from "@/lib/studio/context";
import { QrValidationError, renderTemplate, validateValues } from "@/lib/studio/render";
import type { EditableField, StudioFormat, TemplateLayer } from "@/lib/studio/types";
import { activeOnly, requireAffiliate } from "../../_util";

export const runtime = "nodejs";

const FORMATS: readonly StudioFormat[] = ["png", "jpeg", "webp"];
const CONTENT_TYPES: Record<StudioFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(req: Request) {
  const { profile, userId, error } = await requireAffiliate();
  if (error || !profile || !userId) {
    return error ?? NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const blocked = activeOnly(profile);
  if (blocked) return blocked;

  if (isRateLimited(`studio-render:${userId}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many renders — try again in a minute" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });

  const formatParam = searchParams.get("format") ?? "png";
  if (!(FORMATS as readonly string[]).includes(formatParam)) {
    return NextResponse.json({ error: "format must be png, jpeg, or webp" }, { status: 400 });
  }
  const format = formatParam as StudioFormat;

  let scale = 1;
  const scaleParam = searchParams.get("scale");
  if (scaleParam !== null) {
    const parsed = Number(scaleParam);
    if (!Number.isFinite(parsed)) {
      return NextResponse.json({ error: "scale must be a number between 0.2 and 1" }, { status: 400 });
    }
    scale = Math.min(1, Math.max(0.2, parsed));
  }
  const previewParam = searchParams.get("preview");
  const preview = previewParam === "1" || previewParam === "true";

  const now = new Date();
  const template = await db.marketingTemplate.findFirst({
    where: {
      slug,
      active: true,
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
    },
  });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  if (!template.svgBody) {
    return NextResponse.json({ error: "Template is not renderable" }, { status: 400 });
  }

  const fields: EditableField[] = Array.isArray(template.editableFields)
    ? (template.editableFields as unknown as EditableField[])
    : [];
  const layers: TemplateLayer[] = Array.isArray(template.layers)
    ? (template.layers as unknown as TemplateLayer[])
    : [];

  const rawValues: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("f_") && key.length > 2) rawValues[key.slice(2)] = value;
  }

  const validated = validateValues(fields, rawValues);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const ctx = await buildStudioContext(profile);

  let rendered;
  try {
    rendered = await renderTemplate({
      template: {
        slug: template.slug,
        width: template.width,
        height: template.height,
        svgBody: template.svgBody,
        assetUrl: template.assetUrl,
        updatedAt: template.updatedAt,
      },
      fields,
      layers,
      ctx,
      values: validated.values,
      format,
      scale,
    });
  } catch (e) {
    if (e instanceof QrValidationError) {
      return NextResponse.json({ error: "QR validation failed — download blocked" }, { status: 422 });
    }
    console.error("studio render failed", e);
    return NextResponse.json({ error: "Render failed" }, { status: 500 });
  }

  const ext = rendered.format;
  const filename = preview
    ? `worldeye-${template.slug}-preview.${ext}`
    : `worldeye-${template.slug}.${ext}`;
  return new NextResponse(new Uint8Array(rendered.buffer), {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPES[rendered.format],
      "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      ETag: rendered.renderHash,
    },
  });
}
