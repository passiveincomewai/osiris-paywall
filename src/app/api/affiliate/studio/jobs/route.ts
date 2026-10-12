// POST /api/affiliate/studio/jobs — charge Studio credits for a video
// generation job (personalize or template) against a video template.
// Returns the job id; the client settles the job via
// POST /api/affiliate/studio/jobs/[id]/settle once rendering finishes
// (done) or fails (failed → refunded).
//
// Server-side price integrity: a "video_personalize" request carrying a
// hook text that differs from the template's default hook is really the
// template workflow, so it is charged as "video_template" instead —
// the client cannot get template pricing at the personalize price by
// editing the hook.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  chargeForGeneration,
  ensureMonthlyAllowance,
} from "@/lib/studio/credits";
import { getCreditConfig } from "@/lib/studio/credits-settings";
import type { EditableField } from "@/lib/studio/types";
import { requireStudioAccess } from "../../_util";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) {
    return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    kind?: unknown;
    slug?: unknown;
    hookText?: unknown;
  };

  const kind = body.kind;
  if (kind !== "video_personalize" && kind !== "video_template") {
    return NextResponse.json(
      { error: 'kind must be "video_personalize" or "video_template"' },
      { status: 400 },
    );
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  const now = new Date();
  const template = await db.marketingTemplate.findFirst({
    where: {
      slug,
      kind: "video",
      active: true,
      OR: [{ publishAt: null }, { publishAt: { lte: now } }],
    },
  });
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const fields: EditableField[] = Array.isArray(template.editableFields)
    ? (template.editableFields as unknown as EditableField[])
    : [];
  const defaultHook = fields.find((f) => f.key === "hook")?.default;

  const hookText = body.hookText;
  let effectiveKind: "video_personalize" | "video_template" = kind;
  if (
    kind === "video_personalize" &&
    typeof hookText === "string" &&
    hookText.trim() !== "" &&
    hookText.trim() !== String(defaultHook ?? "").trim()
  ) {
    effectiveKind = "video_template";
  }

  const config = await getCreditConfig();
  // Grant the monthly allowance first (the studio gate already proved
  // membership) so a member's first charge of the month sees it.
  await ensureMonthlyAllowance(profile.id, true, config);
  const charge = await chargeForGeneration({
    profileId: profile.id,
    kind: effectiveKind,
    params: { slug, hookText: hookText ?? null },
    config,
  });
  if (!charge.ok) {
    return NextResponse.json(
      { error: "insufficient_credits", cost: charge.cost, balance: charge.balance },
      { status: 402 },
    );
  }

  return NextResponse.json(
    { jobId: charge.job.id, kind: effectiveKind, cost: charge.job.creditCost, balance: charge.balance },
    { status: 201 },
  );
}
