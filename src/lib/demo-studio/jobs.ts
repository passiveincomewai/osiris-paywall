// AI Demo Studio — job + library data layer.
//
// The queue is self-describing, like the Studio AI queue: a claimed
// job's plan carries every step the worker needs, so the worker holds
// no site-specific knowledge beyond the step vocabulary.

import { db } from "@/lib/db";
import type { DemoPlan } from "./plan";

// A claimed job whose worker vanished (VM restart, crash) becomes
// claimable again after this long instead of being stuck forever.
const CLAIM_STALE_MS = 30 * 60 * 1000;

export async function createDemoJob(input: {
  prompt: string;
  plan: DemoPlan;
  style: string;
  orientation: string;
  createdBy?: string | null;
}) {
  return db.demoJob.create({
    data: {
      prompt: input.prompt,
      plan: input.plan as unknown as object,
      style: input.style,
      orientation: input.orientation,
      createdBy: input.createdBy ?? null,
    },
  });
}

export async function listDemoJobs(limit = 30) {
  return db.demoJob.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { video: { select: { id: true, title: true } } },
  });
}

/** Claim the oldest queued job (or a stale-claimed one) for a worker. */
export async function claimNextDemoJob() {
  const staleBefore = new Date(Date.now() - CLAIM_STALE_MS);
  const candidate = await db.demoJob.findFirst({
    where: {
      OR: [
        { status: "queued" },
        { status: "claimed", claimedAt: { lt: staleBefore } },
        { status: "recording", claimedAt: { lt: staleBefore } },
        { status: "rendering", claimedAt: { lt: staleBefore } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  if (!candidate) return null;
  // Conditional update keeps a single winner if two workers race.
  const updated = await db.demoJob.updateMany({
    where: { id: candidate.id, status: candidate.status },
    data: { status: "claimed", claimedAt: new Date(), progress: "claimed", error: null },
  });
  if (updated.count === 0) return null;
  return db.demoJob.findUnique({ where: { id: candidate.id } });
}

export async function updateDemoJobProgress(id: string, status: string, progress: string) {
  return db.demoJob.update({
    where: { id },
    data: { status, progress },
  }).catch(() => null);
}

export async function completeDemoJob(
  id: string,
  video: {
    title: string;
    description?: string;
    features: string[];
    style: string;
    orientation: string;
    durationSec?: number;
    videoUrl: string;
    rawUrl?: string;
    posterUrl?: string;
  },
) {
  const job = await db.demoJob.findUnique({ where: { id } });
  if (!job) return null;
  const created = await db.demoVideo.create({
    data: {
      title: video.title,
      description: video.description ?? null,
      features: video.features as unknown as object,
      prompt: job.prompt,
      style: job.style,
      orientation: job.orientation,
      durationSec: video.durationSec ?? null,
      videoUrl: video.videoUrl,
      rawUrl: video.rawUrl ?? null,
      posterUrl: video.posterUrl ?? null,
      status: "draft",
    },
  });
  await db.demoJob.update({
    where: { id },
    data: { status: "complete", progress: "complete", videoId: created.id, completedAt: new Date() },
  });
  return created;
}

export async function failDemoJob(id: string, error: string) {
  return db.demoJob.update({
    where: { id },
    data: { status: "failed", progress: "failed", error: error.slice(0, 4000), completedAt: new Date() },
  }).catch(() => null);
}

// ── Library ─────────────────────────────────────────────────────────

export async function listDemoVideos(limit = 60) {
  return db.demoVideo.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { placements: true },
  });
}

export async function updateDemoVideo(
  id: string,
  patch: { status?: string; affiliateShared?: boolean; outdated?: boolean; title?: string; description?: string },
) {
  return db.demoVideo.update({ where: { id }, data: patch });
}

export async function createDemoPlacement(videoId: string, page: string, slot: string) {
  return db.demoPlacement.upsert({
    where: { page_slot_videoId: { page, slot, videoId } },
    create: { videoId, page, slot, active: true },
    update: { active: true },
  });
}

export async function deleteDemoPlacement(id: string) {
  return db.demoPlacement.delete({ where: { id } }).catch(() => null);
}

/** The video a public slot renders, if an admin placed an approved one. */
export async function getPlacedVideo(page: string, slot: string) {
  const placement = await db.demoPlacement.findFirst({
    where: { page, slot, active: true, video: { status: "approved" } },
    orderBy: { createdAt: "desc" },
    include: { video: true },
  });
  return placement?.video ?? null;
}

/** Videos an affiliate may reuse: approved AND shared, newest first. */
export async function listAffiliateDemoVideos(limit = 60) {
  return db.demoVideo.findMany({
    where: { status: "approved", affiliateShared: true },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true, title: true, description: true, features: true, style: true,
      orientation: true, durationSec: true, videoUrl: true, posterUrl: true,
      createdAt: true,
    },
  });
}
