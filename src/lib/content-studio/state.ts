// Content Studio — control-state data layer.
//
// The admin panel is a CONTROL surface for the autonomous content
// engine that runs on Cosmo's VM (~/workspace/content-engine). The
// engine's SQLite store stays its system of record for production and
// publishing; this Postgres state is the shared control plane:
//
//   panel ──writes──► ContentPlatformState + ContentControlEvent
//   engine ──polls──► /api/internal/content-studio/controls (applies)
//   engine ──pushes─► ContentEngineSnapshot (overview | queue | errors)
//   panel ──reads───► latest snapshot per section + control state
//
// Safety semantics mirror the engine's store exactly: modes are
// manual | hybrid | autonomous; every platform has a ceiling that no
// write may exceed (reddit = manual forever, tiktok = hybrid max —
// ARCHITECTURE.md §2/§4). Per-platform pause and a global pause live
// alongside; the global flag rides the reserved "__global__" row.

import { db } from "@/lib/db";

export const CONTENT_MODES = ["manual", "hybrid", "autonomous"] as const;
export type ContentMode = (typeof CONTENT_MODES)[number];

const MODE_RANK: Record<ContentMode, number> = { manual: 0, hybrid: 1, autonomous: 2 };

export function isContentMode(v: unknown): v is ContentMode {
  return typeof v === "string" && (CONTENT_MODES as readonly string[]).includes(v);
}

export function modeExceedsCeiling(mode: ContentMode, ceiling: string): boolean {
  const c: ContentMode = isContentMode(ceiling) ? ceiling : "manual";
  return MODE_RANK[mode] > MODE_RANK[c];
}

export const GLOBAL_PLATFORM_KEY = "__global__";

export interface PlatformSeed {
  platform: string;
  label: string;
  ceiling: ContentMode;
  connectionStatus: string;
}

// Platform keys/labels/ceilings match the engine's platform_state
// (engine.db) one-for-one. Connection statuses reflect verified
// reality at seed time (2026-11-04): YouTube publishes through the
// owner-signed-in Studio browser route (first public Short verified);
// Instagram's connector link was found dropped at audit; TikTok uses
// the same browser route with sign-in pending; X is parked by the
// owner after an incomplete sign-in; Reddit is draft-only by rule.
export const PLATFORM_SEEDS: PlatformSeed[] = [
  { platform: "youtube_long", label: "YouTube (long-form)", ceiling: "autonomous", connectionStatus: "connected_studio_browser" },
  { platform: "youtube_shorts", label: "YouTube Shorts", ceiling: "autonomous", connectionStatus: "connected_studio_browser" },
  { platform: "instagram_reels", label: "Instagram Reels", ceiling: "autonomous", connectionStatus: "link_dropped" },
  { platform: "tiktok", label: "TikTok", ceiling: "hybrid", connectionStatus: "browser_route_signin_pending" },
  { platform: "x_twitter", label: "X / Twitter", ceiling: "autonomous", connectionStatus: "browser_route_parked" },
  { platform: "reddit", label: "Reddit", ceiling: "manual", connectionStatus: "draft_only" },
];

export const PLATFORM_LABELS: Record<string, string> = Object.fromEntries(
  PLATFORM_SEEDS.map((s) => [s.platform, s.label]),
);

/** Create any missing platform/global rows from the seeds. Idempotent. */
export async function ensureContentPlatformState() {
  for (const seed of PLATFORM_SEEDS) {
    await db.contentPlatformState.upsert({
      where: { platform: seed.platform },
      create: {
        platform: seed.platform,
        mode: "manual",
        ceiling: seed.ceiling,
        paused: false,
        connectionStatus: seed.connectionStatus,
      },
      update: {},
    });
  }
  await db.contentPlatformState.upsert({
    where: { platform: GLOBAL_PLATFORM_KEY },
    create: {
      platform: GLOBAL_PLATFORM_KEY,
      mode: "manual",
      ceiling: "autonomous",
      paused: false,
      connectionStatus: "not_connected",
    },
    update: {},
  });
}

export interface PlatformControl {
  platform: string;
  label: string;
  mode: string;
  ceiling: string;
  paused: boolean;
  connectionStatus: string;
  updatedAt: string | null;
}

export async function getControlState(): Promise<{ platforms: PlatformControl[]; globalPaused: boolean }> {
  await ensureContentPlatformState();
  const rows = await db.contentPlatformState.findMany();
  const byKey = new Map(rows.map((r) => [r.platform, r]));
  const platforms: PlatformControl[] = PLATFORM_SEEDS.map((seed) => {
    const row = byKey.get(seed.platform);
    return {
      platform: seed.platform,
      label: seed.label,
      mode: row?.mode ?? "manual",
      ceiling: row?.ceiling ?? seed.ceiling,
      paused: row?.paused ?? false,
      connectionStatus: row?.connectionStatus ?? seed.connectionStatus,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  });
  return { platforms, globalPaused: byKey.get(GLOBAL_PLATFORM_KEY)?.paused ?? false };
}

export async function recordControlEvent(
  actor: string | null,
  action: string,
  platform: string | null,
  payload: Record<string, unknown>,
) {
  return db.contentControlEvent.create({
    data: { actor, action, platform, payload: payload as object },
  });
}

export async function listControlEvents(limit = 30) {
  const rows = await db.contentControlEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    actor: r.actor,
    action: r.action,
    platform: r.platform,
    payload: r.payload,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** Latest snapshot per section (sections: overview | queue | errors). */
export async function latestSnapshots(): Promise<
  Record<string, { payload: unknown; createdAt: string }>
> {
  const rows = await db.contentEngineSnapshot.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const out: Record<string, { payload: unknown; createdAt: string }> = {};
  for (const r of rows) {
    if (!out[r.section]) {
      out[r.section] = { payload: r.payload, createdAt: r.createdAt.toISOString() };
    }
  }
  return out;
}

export async function storeSnapshot(section: string, payload: unknown) {
  return db.contentEngineSnapshot.create({
    data: { section, payload: payload as object },
  });
}

export type ControlResult = { ok: true } | { ok: false; status: number; error: string };

function err(status: number, error: string): ControlResult {
  return { ok: false, status, error };
}

/**
 * Apply one admin control action. Validates against the platform
 * ceilings on the server — the UI disabling an option is never the
 * enforcement. Every successful change writes a ContentControlEvent,
 * which is also the engine's apply queue.
 */
export async function applyControl(input: {
  actor: string | null;
  action: string;
  platform?: string | null;
  mode?: string | null;
}): Promise<ControlResult> {
  const { actor, action, platform, mode } = input;
  await ensureContentPlatformState();

  if (action === "set_mode") {
    if (!platform || !PLATFORM_LABELS[platform]) return err(400, "unknown platform");
    if (!isContentMode(mode)) return err(400, "mode must be one of: manual, hybrid, autonomous");
    const row = await db.contentPlatformState.findUnique({ where: { platform } });
    const ceiling = row?.ceiling ?? PLATFORM_SEEDS.find((s) => s.platform === platform)!.ceiling;
    if (modeExceedsCeiling(mode, ceiling)) {
      return err(
        400,
        `${PLATFORM_LABELS[platform]} is capped at "${ceiling}" by programme rule — "${mode}" is not permitted for this platform. Nothing was changed.`,
      );
    }
    await db.contentPlatformState.update({ where: { platform }, data: { mode } });
    await recordControlEvent(actor, action, platform, { mode, ceiling });
    return { ok: true };
  }

  if (action === "pause_platform" || action === "resume_platform") {
    if (!platform || !PLATFORM_LABELS[platform]) return err(400, "unknown platform");
    const paused = action === "pause_platform";
    await db.contentPlatformState.update({ where: { platform }, data: { paused } });
    await recordControlEvent(actor, action, platform, { paused });
    return { ok: true };
  }

  if (action === "global_pause" || action === "global_resume") {
    const paused = action === "global_pause";
    await db.contentPlatformState.update({
      where: { platform: GLOBAL_PLATFORM_KEY },
      data: { paused },
    });
    await recordControlEvent(actor, action, null, { paused });
    return { ok: true };
  }

  return err(
    400,
    "unknown action — expected one of: set_mode, pause_platform, resume_platform, global_pause, global_resume",
  );
}
