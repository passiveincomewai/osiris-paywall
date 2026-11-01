// GET/POST /api/affiliate/studio/repurpose/posts — Content Calendar
// records (spec §10). A StudioPost is a scheduled/manual post of one
// variation to one platform. method "reminder" = the affiliate posts
// it themselves (the only honest default); "api" exists only for
// platforms with genuinely approved API publishing (Phase 4 gates it).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { POST_PLATFORMS, REMINDER_OFFSETS } from "@/lib/studio/calendar";
import { requireStudioAccess } from "../../../_util";

export const runtime = "nodejs";

function serializePost(p: {
  id: string; projectId: string | null; variationId: string | null; platform: string;
  caption: string | null; affiliateLink: string | null; scheduledAt: Date; timezone: string;
  method: string; status: string; reminderOffsetsMin: number[]; publishedUrl: string | null;
  createdAt: Date;
}) {
  return { ...p, scheduledAt: p.scheduledAt.toISOString(), createdAt: p.createdAt.toISOString() };
}

export async function GET(req: Request) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const where: Record<string, unknown> = { profileId: profile.id };
  if (from || to) {
    where.scheduledAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  const posts = await db.studioPost.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
    take: 500,
  });
  return NextResponse.json({ posts: posts.map(serializePost) });
}

export async function POST(req: Request) {
  const { profile, error } = await requireStudioAccess();
  if (error || !profile) return error ?? NextResponse.json({ error: "Not an affiliate" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const platform = typeof body.platform === "string" ? body.platform : "";
  if (!(POST_PLATFORMS as readonly string[]).includes(platform)) {
    return NextResponse.json({ error: `platform must be one of ${POST_PLATFORMS.join(", ")}` }, { status: 400 });
  }
  const scheduledAt = typeof body.scheduledAt === "string" ? new Date(body.scheduledAt) : null;
  if (!scheduledAt || isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "scheduledAt must be a valid date/time." }, { status: 400 });
  }

  let variationId: string | null = null;
  let projectId: string | null = null;
  if (typeof body.variationId === "string" && body.variationId) {
    const v = await db.studioVariation.findUnique({
      where: { id: body.variationId },
      include: { project: { select: { id: true, profileId: true } } },
    });
    if (!v || v.project.profileId !== profile.id) {
      return NextResponse.json({ error: "Variation not found" }, { status: 404 });
    }
    variationId = v.id;
    projectId = v.project.id;
  }

  const offsets = Array.isArray(body.reminderOffsetsMin)
    ? body.reminderOffsetsMin.filter(
        (o): o is number => typeof o === "number" && (REMINDER_OFFSETS as readonly number[]).includes(o),
      )
    : [1440, 30];

  const post = await db.studioPost.create({
    data: {
      profileId: profile.id,
      projectId,
      variationId,
      platform,
      caption: typeof body.caption === "string" ? body.caption.slice(0, 2200) : null,
      affiliateLink: typeof body.affiliateLink === "string" ? body.affiliateLink.slice(0, 1000) : null,
      scheduledAt,
      timezone: typeof body.timezone === "string" ? body.timezone.slice(0, 60) : "UTC",
      method: "reminder",
      status: "scheduled",
      reminderOffsetsMin: [...new Set(offsets)],
    },
  });
  return NextResponse.json({ post: serializePost(post) });
}
