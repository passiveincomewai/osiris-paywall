// GET  /api/affiliate/studio/creations — the caller's saved creations.
// POST /api/affiliate/studio/creations — save a personalized template render
// (params only; downloads re-render deterministically from template + params).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildStudioContext } from "@/lib/studio/context";
import {
  chargeForGeneration,
  ensureMonthlyAllowance,
  settleGenerationJob,
} from "@/lib/studio/credits";
import { getCreditConfig } from "@/lib/studio/credits-settings";
import { computeRenderHash, validateValues } from "@/lib/studio/render";
import type { EditableField } from "@/lib/studio/types";
import { requireStudioAccess } from "../../_util";

export const runtime = "nodejs";

export async function GET() {
  // requireStudioAccess includes the active-affiliate + membership gate.
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }

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
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    templateSlug?: unknown;
    title?: unknown;
    values?: unknown;
    jobId?: unknown;
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

  // ── Credits (Phase 2, Rule 2) ──────────────────────────────────────
  // Pricing semantics: one design costs IMAGE_RENDER (config price,
  // default 1) exactly once across all paths, keyed by renderHash —
  // saving here is one of the charging paths (values were validated
  // above, before any charge). Video templates are the exception:
  // they were already paid for via a GenerationJob, so this POST only
  // RECORDS the creation against that done job and charges nothing.
  let paidJobId: string | null = null;
  let creationKind: string;
  // True only when THIS request charged a fresh job (image/carousel
  // path) — only that job may be refunded if the create below throws.
  // A video job was already settled "done" by its own flow and must
  // never be re-settled as failed here.
  let chargedHere = false;

  if (template.kind === "video") {
    creationKind = "video";
    const jobId = typeof body.jobId === "string" ? body.jobId : "";
    if (!jobId) {
      return NextResponse.json({ error: "video_job_required" }, { status: 402 });
    }
    // NOTE: GenerationJob rows are keyed by `profileId` (see the row
    // shape in src/lib/studio/credits.ts — jobs are created with
    // profileId, not affiliateProfileId), so the ownership scope here
    // uses that field name.
    const job = await (db as any).generationJob.findFirst({
      where: {
        id: jobId,
        profileId: profile.id,
        kind: { in: ["video_personalize", "video_template"] },
        status: "done",
      },
    });
    if (!job) {
      return NextResponse.json({ error: "video_job_required" }, { status: 402 });
    }
    paidJobId = job.id;
  } else {
    creationKind = template.carouselGroup ? "carousel" : "image";
    const config = await getCreditConfig();
    // Grant the monthly allowance first (the studio gate already
    // proved membership) so a member's first charge of the month
    // sees their allowance.
    await ensureMonthlyAllowance(profile.id, true, config);
    const charge = await chargeForGeneration({
      profileId: profile.id,
      kind: "image_render",
      params: { templateSlug },
      config,
    });
    if (!charge.ok) {
      return NextResponse.json(
        { error: "insufficient_credits", cost: charge.cost, balance: charge.balance },
        { status: 402 },
      );
    }
    paidJobId = charge.job.id;
    chargedHere = true;
  }

  const createData = {
    affiliateProfileId: profile.id,
    templateId: template.id,
    title,
    kind: creationKind,
    params: validated.values,
    renderHash,
    paidJobId,
  };

  let row;
  try {
    row = await db.studioCreation.create({
      data: createData,
    });
  } catch (e) {
    if (chargedHere && paidJobId) {
      await settleGenerationJob({
        profileId: profile.id,
        jobId: paidJobId,
        outcome: "failed",
        error: e instanceof Error ? e.message : String(e),
      });
    }
    throw e;
  }

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
