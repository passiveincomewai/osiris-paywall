// GET /api/affiliate/studio/render?slug=&format=png&scale=1&preview=1&f_<key>=value
// Renders a template personalized with the caller's real affiliate context.
// Rate-limited per user; QR renders fail closed (422) when validation fails.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isRateLimited } from "@/lib/password-auth";
import { buildStudioContext } from "@/lib/studio/context";
import {
  chargeForGeneration,
  ensureMonthlyAllowance,
  settleGenerationJob,
} from "@/lib/studio/credits";
import { getCreditConfig } from "@/lib/studio/credits-settings";
import {
  QrValidationError,
  computeRenderHash,
  renderTemplate,
  validateValues,
} from "@/lib/studio/render";
import type { EditableField, StudioFormat, TemplateLayer } from "@/lib/studio/types";
import { requireStudioAccess } from "../../_util";

export const runtime = "nodejs";

const FORMATS: readonly StudioFormat[] = ["png", "jpeg", "webp"];
const CONTENT_TYPES: Record<StudioFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(req: Request) {
  // requireStudioAccess includes the active-affiliate check and the
  // membership gate, so no separate activeOnly call is needed here.
  const { profile, userId, error } = await requireStudioAccess();
  if (error || !profile || !userId) {
    return error ?? NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

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
  // Ambassador-category templates render only for approved ambassadors.
  if (template.category === "ambassador" && !profile.isAmbassador) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
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

  // ── Credits (Phase 2, Rule 2) ──────────────────────────────────────
  // Pricing semantics: one design costs IMAGE_RENDER (config price,
  // default 1) exactly once across all paths, keyed by renderHash.
  // Previews (preview=1) are FREE — no job, no charge. A non-preview
  // render whose renderHash already exists as one of this profile's
  // saved creations was already paid for (at download or save time),
  // so it renders free too. Otherwise charge BEFORE rendering; the job
  // is settled "done" on success and "failed" (refunded) on any throw.
  let paidJobId: string | null = null;
  if (!preview) {
    const hash = computeRenderHash(template.updatedAt.toISOString(), validated.values, ctx.code);
    const existing = await db.studioCreation.findFirst({
      where: { affiliateProfileId: profile.id, renderHash: hash },
      select: { id: true },
    });
    if (!existing) {
      const config = await getCreditConfig();
      // Grant the monthly allowance first (the studio gate already
      // proved membership) so a member's first charge of the month
      // sees their allowance.
      await ensureMonthlyAllowance(profile.id, true, config);
      const charge = await chargeForGeneration({
        profileId: profile.id,
        kind: "image_render",
        params: { slug, renderHash: hash },
        config,
      });
      if (!charge.ok) {
        return NextResponse.json(
          { error: "insufficient_credits", cost: charge.cost, balance: charge.balance },
          { status: 402 },
        );
      }
      paidJobId = charge.job.id;
    }
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
    // Any failed render refunds the charge (if one was made) BEFORE the
    // existing error response is returned.
    if (paidJobId) {
      await settleGenerationJob({
        profileId: profile.id,
        jobId: paidJobId,
        outcome: "failed",
        error: e instanceof Error ? e.message : String(e),
      });
    }
    if (e instanceof QrValidationError) {
      return NextResponse.json({ error: "QR validation failed — download blocked" }, { status: 422 });
    }
    console.error("studio render failed", e);
    return NextResponse.json({ error: "Render failed" }, { status: 500 });
  }

  if (paidJobId) {
    await settleGenerationJob({ profileId: profile.id, jobId: paidJobId, outcome: "done" });
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
