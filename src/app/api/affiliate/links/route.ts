// GET/POST/DELETE /api/affiliate/links — labeled tracking links.
//
// A tracking link is the affiliate's primary referral link plus a
// ?t=<slug> tag. Clicks through it are recorded against the link so the
// dashboard can show per-link performance; attribution still resolves
// through the primary code, so links never fork the money trail.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { REF_CODE_RE } from "@/lib/affiliate/attribution";
import { trackingSlugFromLabel } from "@/lib/affiliate/insights";
import { referralLinkFor } from "@/lib/affiliate/brand";
import { requireAffiliate, activeOnly } from "../_util";

export const runtime = "nodejs";

const MAX_LINKS = 25;

async function listWithStats(profileId: string, code: string) {
  const links = await db.affiliateTrackingLink.findMany({
    where: { affiliateProfileId: profileId },
    orderBy: { createdAt: "asc" },
  });
  const counts = await db.referralClick.groupBy({
    by: ["trackingLinkId"],
    where: { affiliateProfileId: profileId, trackingLinkId: { in: links.map((l) => l.id) } },
    _count: { _all: true },
  });
  const byId = new Map(counts.map((c) => [c.trackingLinkId, c._count._all]));
  return links.map((l) => ({
    id: l.id,
    label: l.label,
    slug: l.slug,
    url: `${referralLinkFor(code)}?t=${l.slug}`,
    clicks: byId.get(l.id) ?? 0,
    createdAt: l.createdAt,
  }));
}

export async function GET() {
  const { profile, error } = await requireAffiliate();
  if (error) return error;
  const code = profile.customCode ?? profile.referralCode;
  return NextResponse.json({ links: await listWithStats(profile.id, code), max: MAX_LINKS });
}

export async function POST(req: Request) {
  const { profile, error } = await requireAffiliate();
  if (error) return error;
  const blocked = activeOnly(profile);
  if (blocked) return blocked;

  const { label, slug: rawSlug } = (await req.json().catch(() => ({}))) as { label?: string; slug?: string };
  const cleanLabel = (label ?? "").trim().slice(0, 80);
  if (!cleanLabel) return NextResponse.json({ error: "Give the link a label, e.g. \"YouTube description\"." }, { status: 400 });

  const count = await db.affiliateTrackingLink.count({ where: { affiliateProfileId: profile.id } });
  if (count >= MAX_LINKS) return NextResponse.json({ error: `You can have at most ${MAX_LINKS} tracking links.` }, { status: 400 });

  const baseSlug = (rawSlug ?? "").trim().toLowerCase() || trackingSlugFromLabel(cleanLabel);
  if (!REF_CODE_RE.test(baseSlug)) {
    return NextResponse.json({ error: "Link tag must be 3–32 characters: letters, numbers, dashes or underscores." }, { status: 400 });
  }
  // De-dupe: append -2, -3… until unique for this affiliate.
  let slug = baseSlug;
  for (let n = 2; ; n++) {
    const exists = await db.affiliateTrackingLink.findUnique({
      where: { affiliateProfileId_slug: { affiliateProfileId: profile.id, slug } },
      select: { id: true },
    });
    if (!exists) break;
    const suffix = `-${n}`;
    slug = baseSlug.slice(0, 32 - suffix.length) + suffix;
  }

  const link = await db.affiliateTrackingLink.create({
    data: { affiliateProfileId: profile.id, label: cleanLabel, slug },
  });
  const code = profile.customCode ?? profile.referralCode;
  return NextResponse.json({
    link: { id: link.id, label: link.label, slug: link.slug, url: `${referralLinkFor(code)}?t=${link.slug}`, clicks: 0, createdAt: link.createdAt },
  });
}

export async function DELETE(req: Request) {
  const { profile, error } = await requireAffiliate();
  if (error) return error;
  const blocked = activeOnly(profile);
  if (blocked) return blocked;
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  // Clicks keep their history; the FK nulls their link reference.
  await db.affiliateTrackingLink.deleteMany({ where: { id, affiliateProfileId: profile.id } });
  return NextResponse.json({ ok: true });
}
