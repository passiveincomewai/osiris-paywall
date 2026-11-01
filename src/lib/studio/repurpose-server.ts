/**
 * Marketing Studio 2.0 — Repurposing Machine server helpers.
 *
 * Ownership is the invariant: every query is scoped by profileId, so a
 * project/variation id from another affiliate reads as "not found".
 * Tracking links reuse AffiliateTrackingLink (label + ?t= slug) — the
 * shared 25-link cap applies; when it is exhausted the project simply
 * has no link and the UI says why. Attribution rules are untouched.
 */
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { referralLinkFor } from "@/lib/affiliate/brand";
import { trackingSlugFromLabel } from "@/lib/affiliate/insights";
import type { StudioProject, StudioVariation } from "@prisma/client";

export const MAX_TRACKING_LINKS = 25;
export const MAX_PROJECTS_PER_PROFILE = 100;
export const MAX_TITLE_LEN = 120;
export const MAX_TRANSCRIPT_LEN = 20_000;

export function newCreativeId(): string {
  return `v_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function serializeProject(p: StudioProject, variationCount?: number) {
  return {
    id: p.id,
    title: p.title,
    sourceKind: p.sourceKind,
    sourceRef: p.sourceRef,
    sourceName: p.sourceName,
    durationSec: p.durationSec,
    width: p.width,
    height: p.height,
    ownershipConfirmed: p.ownershipConfirmed,
    analysis: p.analysis,
    hasTranscript: !!p.transcript,
    trackingLinkId: p.trackingLinkId,
    status: p.status,
    folder: p.folder,
    brandVoice: p.brandVoice,
    campaignTag: p.campaignTag,
    variationCount: variationCount ?? undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function serializeVariation(v: StudioVariation) {
  return {
    id: v.id,
    projectId: v.projectId,
    creativeId: v.creativeId,
    direction: v.direction,
    title: v.title,
    aspect: v.aspect,
    composition: v.composition,
    hookText: v.hookText,
    captionText: v.captionText,
    codeSnapshot: v.codeSnapshot,
    status: v.status,
    renderJobId: v.renderJobId,
    favorite: v.favorite,
    postedPlatform: v.postedPlatform,
    postedUrl: v.postedUrl,
    postedAt: v.postedAt,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

/**
 * Mint (or reuse) the project's tracking link. Returns the link id and
 * its public URL, or null when the shared 25-link cap is exhausted.
 */
export async function ensureProjectTrackingLink(
  profile: { id: string; referralCode: string; customCode: string | null },
  project: { id: string; title: string; trackingLinkId: string | null },
): Promise<{ id: string; url: string } | null> {
  const code = profile.customCode ?? profile.referralCode;
  if (project.trackingLinkId) {
    const existing = await db.affiliateTrackingLink.findFirst({
      where: { id: project.trackingLinkId, affiliateProfileId: profile.id },
    });
    if (existing) return { id: existing.id, url: `${referralLinkFor(code)}?t=${existing.slug}` };
  }
  const count = await db.affiliateTrackingLink.count({
    where: { affiliateProfileId: profile.id },
  });
  if (count >= MAX_TRACKING_LINKS) return null;

  const label = `Repurpose: ${project.title}`.slice(0, 80);
  const baseSlug = trackingSlugFromLabel(label) || "repurpose";
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
    data: { affiliateProfileId: profile.id, label, slug },
  });
  await db.studioProject.update({
    where: { id: project.id },
    data: { trackingLinkId: link.id },
  });
  return { id: link.id, url: `${referralLinkFor(code)}?t=${link.slug}` };
}
