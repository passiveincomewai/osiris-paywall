// POST /api/affiliate/studio/repurpose/render — charge Studio credits
// for one variation render (kind "repurpose_render"). The browser does
// the rendering; the client settles via the existing generic route
// POST /api/affiliate/studio/jobs/[id]/settle ("done" keeps the charge,
// "failed" auto-refunds — including the tab-closed-mid-render beacon).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chargeForGeneration, ensureMonthlyAllowance } from "@/lib/studio/credits";
import { getCreditConfig } from "@/lib/studio/credits-settings";
import { requireStudioAccess } from "../../../_util";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { variationId?: unknown };
  const variationId = typeof body.variationId === "string" ? body.variationId : "";
  if (!variationId) return NextResponse.json({ error: "variationId required" }, { status: 400 });

  const variation = await db.studioVariation.findUnique({
    where: { id: variationId },
    include: { project: { select: { profileId: true, ownershipConfirmed: true } } },
  });
  if (!variation || variation.project.profileId !== profile.id) {
    return NextResponse.json({ error: "Variation not found" }, { status: 404 });
  }
  if (!variation.project.ownershipConfirmed) {
    return NextResponse.json(
      { error: "Ownership confirmation is required before rendering." },
      { status: 400 },
    );
  }

  const config = await getCreditConfig();
  if (!config.providersEnabled.repurpose_render) {
    return NextResponse.json(
      { error: "Repurposing renders are currently disabled by the admin." },
      { status: 503 },
    );
  }

  await ensureMonthlyAllowance(profile.id, true, config);
  const charge = await chargeForGeneration({
    profileId: profile.id,
    kind: "repurpose_render",
    params: { variationId: variation.id, creativeId: variation.creativeId },
    config,
  });
  if (!charge.ok) {
    return NextResponse.json(
      { error: "insufficient_credits", balance: charge.balance },
      { status: 402 },
    );
  }

  await db.studioVariation.update({
    where: { id: variation.id },
    data: { renderJobId: charge.job.id },
  });

  return NextResponse.json({
    job: { id: charge.job.id, creditCost: charge.job.creditCost },
    balance: charge.balance,
  });
}
