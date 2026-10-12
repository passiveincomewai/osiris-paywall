// GET    /api/affiliate/studio/creations/[id] — re-download: re-render the
//        saved creation deterministically from its template + stored params.
// DELETE /api/affiliate/studio/creations/[id] — delete an own creation.
// Ownership is always scoped by the caller's profile id: another affiliate's
// creation id reads as 404, never as a leak that it exists.
//
// Credits (Phase 2, Rule 2): NO charging ever happens in this route —
// saved creations were paid at save time. Grandfathering: creation rows
// with paidJobId null are pre-credits legacy rows, and they re-render
// free here exactly like paid rows.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/password-auth";
import { buildStudioContext } from "@/lib/studio/context";
import { QrValidationError, renderTemplate, validateValues } from "@/lib/studio/render";
import type { EditableField, StudioFormat, TemplateLayer } from "@/lib/studio/types";
import { requireStudioAccess } from "../../../_util";

export const runtime = "nodejs";

const FORMATS: readonly StudioFormat[] = ["png", "jpeg", "webp"];
const CONTENT_TYPES: Record<StudioFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

function slugifyTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/g, "") || "creation"
  );
}

/** Stored params are already validated, but coerce defensively for the
 *  fallback path (template fields may have changed since the save). */
function coerceStoredValues(params: unknown): Record<string, string> {
  if (typeof params !== "object" || params === null || Array.isArray(params)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
    else if (typeof value === "number" || typeof value === "boolean") out[key] = String(value);
  }
  return out;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // requireStudioAccess includes the active-affiliate + membership gate.
  const { profile, userId, error } = await requireStudioAccess();
  if (error || !profile || !userId) {
    return error ?? NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (isRateLimited(`studio-render:${userId}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many renders — try again in a minute" }, { status: 429 });
  }

  const { id } = await params;
  const creation = await db.studioCreation.findFirst({
    where: { id, affiliateProfileId: profile.id },
    include: { template: true },
  });
  if (!creation) return NextResponse.json({ error: "Creation not found" }, { status: 404 });

  const template = creation.template;
  if (!creation.templateId || !template) {
    return NextResponse.json({ error: "Template no longer available" }, { status: 410 });
  }
  // A template that still exists but was deactivated still renders: the
  // affiliate saved this creation while it was live.
  if (!template.svgBody) {
    return NextResponse.json({ error: "Template no longer available" }, { status: 410 });
  }

  const { searchParams } = new URL(req.url);
  const formatParam = searchParams.get("format") ?? "png";
  if (!(FORMATS as readonly string[]).includes(formatParam)) {
    return NextResponse.json({ error: "format must be png, jpeg, or webp" }, { status: 400 });
  }
  const format = formatParam as StudioFormat;

  const fields: EditableField[] = Array.isArray(template.editableFields)
    ? (template.editableFields as unknown as EditableField[])
    : [];
  const layers: TemplateLayer[] = Array.isArray(template.layers)
    ? (template.layers as unknown as TemplateLayer[])
    : [];

  const stored = coerceStoredValues(creation.params);
  const validated = validateValues(fields, stored);
  const values: Record<string, string> = "values" in validated ? validated.values : stored;

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
      values,
      format,
    });
  } catch (e) {
    if (e instanceof QrValidationError) {
      return NextResponse.json({ error: "QR validation failed — download blocked" }, { status: 422 });
    }
    console.error("studio creation re-render failed", e);
    return NextResponse.json({ error: "Render failed" }, { status: 500 });
  }

  const filename = `worldeye-${slugifyTitle(creation.title)}.${rendered.format}`;
  return new NextResponse(new Uint8Array(rendered.buffer), {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPES[rendered.format],
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      ETag: rendered.renderHash,
    },
  });
}

/**
 * PATCH /api/affiliate/studio/creations/[id] — Phase 5 A/B caption test:
 * save the caller's two caption variants, which one they actually posted,
 * and their free-text result note. Manual honesty: nothing here invents
 * platform metrics. Ownership is scoped exactly like GET/DELETE above.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }

  const { id } = await params;
  const creation = await db.studioCreation.findFirst({
    where: { id, affiliateProfileId: profile.id },
    select: { id: true, affiliateProfileId: true },
  });
  if (!creation) return NextResponse.json({ error: "Creation not found" }, { status: 404 });
  if (creation.affiliateProfileId !== profile.id) {
    return NextResponse.json({ error: "Creation not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    captionVariants?: unknown;
    postedVariant?: unknown;
    resultNote?: unknown;
  };

  const data: { captionVariants?: { a: string; b: string }; postedVariant?: string | null; resultNote?: string | null } = {};

  if (body.captionVariants !== undefined) {
    const v = body.captionVariants as { a?: unknown; b?: unknown } | null;
    if (typeof v !== "object" || v === null || Array.isArray(v)) {
      return NextResponse.json({ error: "captionVariants must be an object with a and b" }, { status: 400 });
    }
    const a = v.a === undefined || v.a === null ? "" : v.a;
    const b = v.b === undefined || v.b === null ? "" : v.b;
    if (typeof a !== "string" || typeof b !== "string") {
      return NextResponse.json({ error: "caption variants must be strings" }, { status: 400 });
    }
    if (a.length > 2000 || b.length > 2000) {
      return NextResponse.json({ error: "caption variants must be at most 2000 characters" }, { status: 400 });
    }
    data.captionVariants = { a, b };
  }

  if (body.postedVariant !== undefined) {
    if (body.postedVariant !== null && body.postedVariant !== "a" && body.postedVariant !== "b") {
      return NextResponse.json({ error: "postedVariant must be \"a\", \"b\", or null" }, { status: 400 });
    }
    data.postedVariant = body.postedVariant as string | null;
  }

  if (body.resultNote !== undefined) {
    if (body.resultNote !== null && typeof body.resultNote !== "string") {
      return NextResponse.json({ error: "resultNote must be a string" }, { status: 400 });
    }
    if (typeof body.resultNote === "string" && body.resultNote.length > 2000) {
      return NextResponse.json({ error: "resultNote must be at most 2000 characters" }, { status: 400 });
    }
    data.resultNote = (body.resultNote as string | null) || null;
  }

  const updated = await db.studioCreation.update({
    where: { id: creation.id },
    data,
    select: { id: true, captionVariants: true, postedVariant: true, resultNote: true },
  });
  return NextResponse.json({
    creation: {
      id: updated.id,
      captionVariants: updated.captionVariants ?? null,
      postedVariant: updated.postedVariant ?? null,
      resultNote: updated.resultNote ?? null,
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }

  const { id } = await params;
  const creation = await db.studioCreation.findFirst({
    where: { id, affiliateProfileId: profile.id },
    select: { id: true },
  });
  if (!creation) return NextResponse.json({ error: "Creation not found" }, { status: 404 });

  await db.studioCreation.delete({ where: { id: creation.id } });
  return NextResponse.json({ ok: true });
}
