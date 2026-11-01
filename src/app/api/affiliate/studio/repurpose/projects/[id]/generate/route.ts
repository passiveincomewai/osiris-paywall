// POST /api/affiliate/studio/repurpose/projects/[id]/generate
// Builds N creative variations from the project's measured analysis
// using the pure direction builders. Generation itself is free (it is
// composition data); credits are charged per render, like the rest of
// the Studio. Branding is snapshotted from the caller's real Studio
// context — link, and the discount code only when Stripe-confirmed.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildStudioContext } from "@/lib/studio/context";
import {
  buildVariation,
  pickDirections,
  DIRECTIONS,
  type Aspect,
  type BrandingSnapshot,
  type DirectionId,
  type SourceAnalysis,
} from "@/lib/studio/repurpose";
import {
  ensureProjectTrackingLink,
  newCreativeId,
  serializeVariation,
} from "@/lib/studio/repurpose-server";
import { requireStudioAccess } from "../../../../../_util";

export const runtime = "nodejs";

const ASPECT_SET = ["9:16", "1:1", "4:5", "16:9"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  const { id } = await params;
  const project = await db.studioProject.findFirst({ where: { id, profileId: profile.id } });
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  if (!project.ownershipConfirmed) {
    return NextResponse.json(
      { error: "Confirm you own this media or have permission to edit and distribute it first." },
      { status: 400 },
    );
  }
  const analysis = project.analysis as SourceAnalysis | null;
  if (!analysis || typeof analysis.durationSec !== "number" || !analysis.measured) {
    return NextResponse.json(
      { error: "Analyze the video first — variations are built from the measured analysis." },
      { status: 400 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    count?: unknown;
    directions?: unknown;
    aspect?: unknown;
    hookText?: unknown;
    hooks?: unknown;
  };

  let directionIds: DirectionId[];
  if (Array.isArray(body.directions) && body.directions.length > 0) {
    const valid = new Set(DIRECTIONS.map((d) => d.id));
    directionIds = body.directions.filter(
      (d): d is DirectionId => typeof d === "string" && valid.has(d as DirectionId),
    );
    if (directionIds.length === 0) {
      return NextResponse.json({ error: "Pick at least one valid creative direction." }, { status: 400 });
    }
  } else {
    const count = typeof body.count === "number" ? body.count : 3;
    if (![3, 5, 10].includes(count) && (count < 1 || count > 10)) {
      return NextResponse.json({ error: "Choose 3, 5, 10, or a custom count up to 10." }, { status: 400 });
    }
    directionIds = pickDirections(count);
  }

  const aspect: Aspect = typeof body.aspect === "string" && ASPECT_SET.includes(body.aspect)
    ? (body.aspect as Aspect)
    : "9:16";
  const hooks = (body.hooks && typeof body.hooks === "object" ? body.hooks : {}) as Record<string, unknown>;
  const defaultHook = typeof body.hookText === "string" && body.hookText.trim()
    ? body.hookText.trim().slice(0, 200)
    : "Did you know you can explore public cameras around the world?";

  const ctx = await buildStudioContext(profile);
  const branding: BrandingSnapshot = {
    includeLink: true,
    includeQr: true,
    includeCode: !!ctx.couponCode,
    link: ctx.link,
    code: ctx.couponCode,
    discountPct: ctx.discountPct,
    displayName: ctx.displayName,
    referralCode: ctx.code,
  };

  const link = await ensureProjectTrackingLink(profile, project).catch(() => null);

  const created = [];
  for (const direction of directionIds) {
    const hookText = typeof hooks[direction] === "string" && (hooks[direction] as string).trim()
      ? (hooks[direction] as string).trim().slice(0, 200)
      : defaultHook;
    const built = buildVariation(direction, analysis, {
      hookText,
      branding,
      transcript: project.transcript,
      aspect,
    });
    const variation = await db.studioVariation.create({
      data: {
        projectId: project.id,
        creativeId: newCreativeId(),
        direction,
        title: built.title,
        aspect,
        composition: built.composition as unknown as object,
        hookText,
        captionText: null,
        codeSnapshot: ctx.couponCode,
        status: "draft",
      },
    });
    created.push(serializeVariation(variation));
  }

  if (project.status === "draft") {
    await db.studioProject.update({ where: { id: project.id }, data: { status: "ready" } });
  }

  return NextResponse.json({
    variations: created,
    trackingLink: link ? { id: link.id, url: link.url } : null,
    trackingNote: link
      ? null
      : "No tracking link was minted — you already have 25 tracking links. Delete one in Promote & Share to track this project.",
  });
}
