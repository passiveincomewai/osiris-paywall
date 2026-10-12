// Admin: update a Studio campaign (partial PATCH; status included).
// Gated by the same ADMIN_EMAILS check as the rest of /admin.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, audit } from "@/lib/affiliate/admin";
import { isValidHttpUrl } from "@/lib/studio/campaigns";

export const runtime = "nodejs";

const STATUSES = ["draft", "active", "ended"] as const;

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

function validReward(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100000;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }
  const actor = session?.user?.id;

  const existing = await db.studioCampaign.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  for (const f of ["name", "goal", "description"] as const) {
    if (body[f] !== undefined) {
      if (typeof body[f] !== "string" || !(body[f] as string).trim()) {
        return NextResponse.json({ error: `${f} must be a non-empty string` }, { status: 400 });
      }
      data[f] = (body[f] as string).trim();
    }
  }
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !(STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: `status must be one of ${STATUSES.join(", ")}` }, { status: 400 });
    }
    data.status = body.status;
  }
  for (const f of ["startsAt", "endsAt"] as const) {
    if (body[f] !== undefined) {
      const d = typeof body[f] === "string" ? new Date(body[f] as string) : new Date(NaN);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: `${f} must be a valid date` }, { status: 400 });
      }
      data[f] = d;
    }
  }
  const nextStarts = (data.startsAt as Date | undefined) ?? existing.startsAt;
  const nextEnds = (data.endsAt as Date | undefined) ?? existing.endsAt;
  if (!(nextStarts.getTime() < nextEnds.getTime())) {
    return NextResponse.json({ error: "startsAt must be before endsAt" }, { status: 400 });
  }
  for (const f of ["xpReward", "creditReward"] as const) {
    if (body[f] !== undefined) {
      if (!validReward(body[f])) {
        return NextResponse.json({ error: `${f} must be an integer between 0 and 100000` }, { status: 400 });
      }
      data[f] = body[f];
    }
  }
  if (body.landingUrl !== undefined) {
    if (!isValidHttpUrl(body.landingUrl)) {
      return NextResponse.json({ error: "landingUrl must be a valid http(s) URL" }, { status: 400 });
    }
    data.landingUrl = (body.landingUrl as string).trim();
  }
  const hashtags = body.hashtags ?? body.requiredHashtags;
  if (hashtags !== undefined) {
    if (!Array.isArray(hashtags) || hashtags.some((t) => typeof t !== "string")) {
      return NextResponse.json({ error: "hashtags must be an array of strings" }, { status: 400 });
    }
    data.requiredHashtags = (hashtags as string[])
      .map((t) => t.trim().replace(/^#+/, "").trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  for (const f of ["channels", "templateSlugs"] as const) {
    if (body[f] !== undefined) {
      if (!Array.isArray(body[f]) || (body[f] as unknown[]).some((t) => typeof t !== "string")) {
        return NextResponse.json({ error: `${f} must be an array of strings` }, { status: 400 });
      }
      data[f] = (body[f] as string[]).map((t) => t.trim()).filter(Boolean);
    }
  }
  if (body.requiredCaptionSnippet !== undefined) {
    if (body.requiredCaptionSnippet !== null && typeof body.requiredCaptionSnippet !== "string") {
      return NextResponse.json({ error: "requiredCaptionSnippet must be a string or null" }, { status: 400 });
    }
    data.requiredCaptionSnippet = body.requiredCaptionSnippet;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const campaign = await db.studioCampaign.update({ where: { id }, data });
  await audit("studio.campaign.update", {
    actorUserId: actor, targetType: "StudioCampaign", targetId: id,
    details: { changed: Object.keys(data), status: campaign.status },
  });
  return NextResponse.json({ campaign });
}
