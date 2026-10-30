// GET /api/affiliate/studio/embed/[code]/[slug] — PUBLIC personalized
// banner image for embeds (blogs, forums, site sidebars). No session:
// the (code, slug) pair is the address, exactly like /ref/<code>.
// Renders the template with its DEFAULT field values and the
// affiliate's real context (referral link + QR baked in by the shared
// pipeline) with preview semantics — embeds never charge credits.
// IP rate-limited; responses carry a strong ETag (the render hash)
// and public cache headers so CDNs absorb repeat views. QR renders
// fail closed (422) when validation fails, same as the studio route.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { findAffiliateByCode } from "@/lib/affiliate/attribution";
import { clientIp, isRateLimited } from "@/lib/password-auth";
import { buildStudioContext } from "@/lib/studio/context";
import {
  QrValidationError,
  computeRenderHash,
  renderTemplate,
  validateValues,
} from "@/lib/studio/render";
import type { EditableField, StudioFormat, TemplateLayer } from "@/lib/studio/types";

export const runtime = "nodejs";

const FORMATS: readonly StudioFormat[] = ["png", "jpeg", "webp"];
const CONTENT_TYPES: Record<StudioFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};
const CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string; slug: string }> },
) {
  if (isRateLimited(`studio-embed:${clientIp(req)}`, 60, 60_000)) {
    return NextResponse.json(
      { error: "Too many requests — try again in a minute" },
      { status: 429 },
    );
  }

  const { code, slug } = await params;

  // Active profiles only — findAffiliateByCode filters on status and
  // resolves former-code aliases. Unknown codes and unknown slugs both
  // read as 404: the endpoint never reveals which half failed.
  const resolved = await findAffiliateByCode(code);
  if (!resolved) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const profile = await db.affiliateProfile.findUnique({ where: { id: resolved.id } });
  if (!profile || profile.status !== "active") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const formatParam = searchParams.get("format") ?? "png";
  if (!(FORMATS as readonly string[]).includes(formatParam)) {
    return NextResponse.json(
      { error: "format must be png, jpeg, or webp" },
      { status: 400 },
    );
  }
  const format = formatParam as StudioFormat;

  let scale = 1;
  const scaleParam = searchParams.get("scale");
  if (scaleParam !== null) {
    const parsed = Number(scaleParam);
    if (!Number.isFinite(parsed)) {
      return NextResponse.json(
        { error: "scale must be a number between 0.2 and 1" },
        { status: 400 },
      );
    }
    scale = Math.min(1, Math.max(0.2, parsed));
  }

  const now = new Date();
  const template = await db.marketingTemplate.findFirst({
    where: {
      slug,
      active: true,
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
    },
  });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Ambassador-category templates embed only for approved ambassadors.
  if (template.category === "ambassador" && !profile.isAmbassador) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!template.svgBody) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fields: EditableField[] = Array.isArray(template.editableFields)
    ? (template.editableFields as unknown as EditableField[])
    : [];
  const layers: TemplateLayer[] = Array.isArray(template.layers)
    ? (template.layers as unknown as TemplateLayer[])
    : [];

  // Embeds render the template's default text — there is no editor
  // session behind a public <img>. A required field with no default
  // cannot be embedded and surfaces validateValues' error as a 400.
  const validated = validateValues(fields, {});
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const ctx = await buildStudioContext(profile);

  // Strong ETag = the render hash over exactly the inputs the render
  // below consumes. A matching If-None-Match answers 304 BEFORE paying
  // for the render.
  const renderHash = computeRenderHash(
    template.updatedAt.toISOString(),
    validated.values,
    ctx.code,
  );
  const etag = `"${renderHash}"`;
  const ifNoneMatch = req.headers.get("if-none-match");
  if (
    ifNoneMatch &&
    ifNoneMatch
      .split(",")
      .map((v) => v.trim())
      .includes(etag)
  ) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": CACHE_CONTROL },
    });
  }

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
      return NextResponse.json(
        { error: "QR validation failed — embed blocked" },
        { status: 422 },
      );
    }
    console.error("studio embed render failed", e);
    return NextResponse.json({ error: "Render failed" }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(rendered.buffer), {
    status: 200,
    headers: {
      "Content-Type": CONTENT_TYPES[rendered.format],
      "Content-Disposition": `inline; filename="worldeye-${template.slug}-embed.${rendered.format}"`,
      "Cache-Control": CACHE_CONTROL,
      ETag: etag,
    },
  });
}
