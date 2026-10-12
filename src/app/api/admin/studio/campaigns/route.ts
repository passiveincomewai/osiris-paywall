// Admin: list + create Studio campaigns.
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

/** Normalize hashtags: require array of strings, trim, strip leading #, drop empties, max 20. */
function normalizeHashtags(v: unknown): string[] | null {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.some((t) => typeof t !== "string")) return null;
  const out = (v as string[])
    .map((t) => t.trim().replace(/^#+/, "").trim())
    .filter(Boolean);
  return out.slice(0, 20);
}

function stringArray(v: unknown): string[] | null {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.some((t) => typeof t !== "string")) return null;
  return (v as string[]).map((t) => t.trim()).filter(Boolean);
}

export async function GET() {
  try { await requireAdmin(); } catch (e) { return forbidden(e); }
  const campaigns = await db.studioCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { participations: true } },
      participations: {
        orderBy: { joinedAt: "desc" },
        include: {
          profile: { select: { referralCode: true, customCode: true } },
        },
      },
    },
  });
  return NextResponse.json({ campaigns });
}

export async function POST(req: Request) {
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }
  const actor = session?.user?.id;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const goal = typeof body.goal === "string" ? body.goal.trim() : "";
  if (!goal) return NextResponse.json({ error: "goal is required" }, { status: 400 });
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) return NextResponse.json({ error: "description is required" }, { status: 400 });

  const startsAt = typeof body.startsAt === "string" ? new Date(body.startsAt) : new Date(NaN);
  const endsAt = typeof body.endsAt === "string" ? new Date(body.endsAt) : new Date(NaN);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "startsAt must be a valid date" }, { status: 400 });
  }
  if (Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "endsAt must be a valid date" }, { status: 400 });
  }
  if (!(startsAt.getTime() < endsAt.getTime())) {
    return NextResponse.json({ error: "startsAt must be before endsAt" }, { status: 400 });
  }

  const xpReward = body.xpReward === undefined ? 0 : body.xpReward;
  if (!validReward(xpReward)) {
    return NextResponse.json({ error: "xpReward must be an integer between 0 and 100000" }, { status: 400 });
  }
  const creditReward = body.creditReward === undefined ? 0 : body.creditReward;
  if (!validReward(creditReward)) {
    return NextResponse.json({ error: "creditReward must be an integer between 0 and 100000" }, { status: 400 });
  }

  if (!isValidHttpUrl(body.landingUrl)) {
    return NextResponse.json({ error: "landingUrl must be a valid http(s) URL" }, { status: 400 });
  }
  const landingUrl = (body.landingUrl as string).trim();

  const requiredHashtags = normalizeHashtags(body.hashtags ?? body.requiredHashtags);
  if (requiredHashtags === null) {
    return NextResponse.json({ error: "hashtags must be an array of strings" }, { status: 400 });
  }

  const channels = stringArray(body.channels);
  if (channels === null) {
    return NextResponse.json({ error: "channels must be an array of strings" }, { status: 400 });
  }
  const templateSlugs = stringArray(body.templateSlugs);
  if (templateSlugs === null) {
    return NextResponse.json({ error: "templateSlugs must be an array of strings" }, { status: 400 });
  }

  const requiredCaptionSnippet =
    body.requiredCaptionSnippet === undefined || body.requiredCaptionSnippet === null
      ? null
      : typeof body.requiredCaptionSnippet === "string"
        ? body.requiredCaptionSnippet
        : undefined;
  if (requiredCaptionSnippet === undefined) {
    return NextResponse.json({ error: "requiredCaptionSnippet must be a string" }, { status: 400 });
  }

  const status = body.status === undefined ? "draft" : body.status;
  if (typeof status !== "string" || !(STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: `status must be one of ${STATUSES.join(", ")}` }, { status: 400 });
  }

  const campaign = await db.studioCampaign.create({
    data: {
      name,
      goal,
      description,
      startsAt,
      endsAt,
      requiredHashtags,
      requiredCaptionSnippet,
      landingUrl,
      xpReward,
      creditReward,
      channels,
      templateSlugs,
      status,
      createdBy: actor ?? null,
    },
  });

  await audit("studio.campaign.create", {
    actorUserId: actor, targetType: "StudioCampaign", targetId: campaign.id,
    details: { name: campaign.name, status: campaign.status, xpReward, creditReward },
  });
  return NextResponse.json({ campaign }, { status: 201 });
}
