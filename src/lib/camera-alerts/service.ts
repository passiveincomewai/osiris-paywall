/**
 * Camera alerts — the rule/event service behind /api/camera-alerts.
 * Routes stay thin: auth + tier live there; ownership, the per-tier
 * active cap (free 0 · Pro 2 · VIP Pro 10, from logic.alertCapForTier),
 * condition/channel validation and catalogue truth live here so
 * every entry point enforces them identically.
 */
import { db } from "@/lib/db";
import { catalogue } from "@/lib/vision/frames";
import {
  activeCapReached,
  alertCapForTier,
  capMessage,
  MAX_ACTIVE_ALERT_RULES,
  validateChannels,
  validateCondition,
  type AlertTier,
} from "./logic";
import { eventImageUrl } from "./image-token";

export type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

const fail = (status: number, error: string): ServiceResult<never> => ({ ok: false, status, error });

export interface RuleView {
  id: string;
  cameraId: string;
  cameraName: string;
  condition: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  active: boolean;
  lastVerdict: string;
  lastCheckedAt: string | null;
  lastAlertedAt: string | null;
  createdAt: string;
}

interface RuleRow extends Omit<RuleView, "lastCheckedAt" | "lastAlertedAt" | "createdAt"> {
  lastCheckedAt: Date | null;
  lastAlertedAt: Date | null;
  createdAt: Date;
}

const toView = (r: RuleRow): RuleView => ({
  ...r,
  lastCheckedAt: r.lastCheckedAt?.toISOString() ?? null,
  lastAlertedAt: r.lastAlertedAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

export async function listRules(userId: string): Promise<RuleView[]> {
  const rows = (await db.alertRule.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }],
  })) as RuleRow[];
  return rows.map(toView);
}

export function activeRuleCount(userId: string): Promise<number> {
  return db.alertRule.count({ where: { userId, active: true } });
}

export async function createRule(
  userId: string,
  input: { cameraId?: unknown; condition?: unknown; emailEnabled?: unknown; inAppEnabled?: unknown },
  tier: AlertTier,
): Promise<ServiceResult<RuleView>> {
  const cameraId = typeof input.cameraId === "string" ? input.cameraId.trim() : "";
  if (!cameraId) return fail(400, "Pick a camera to watch.");
  const cond = validateCondition(input.condition);
  if (!cond.ok) return fail(400, cond.error);
  const channels = validateChannels(input);
  if (!channels.ok) return fail(400, channels.error);

  // The catalogue is the truth: the camera must exist and must have a
  // still image — a live-stream-only camera can never be checked.
  const cat = await catalogue().catch(() => null);
  const camera = cat?.cameras.get(cameraId);
  if (!camera) return fail(400, "That camera isn't in the WorldEye catalogue.");
  if (!camera.still) {
    return fail(400, "That camera is a live stream without still images — alerts need a still photo to check, so pick another camera.");
  }

  const cap = alertCapForTier(tier);
  if (activeCapReached(await activeRuleCount(userId), cap)) return fail(409, capMessage(cap, tier));

  const row = (await db.alertRule.create({
    data: {
      userId,
      cameraId,
      cameraName: camera.name,
      condition: cond.value,
      emailEnabled: channels.emailEnabled,
      inAppEnabled: channels.inAppEnabled,
    },
  })) as RuleRow;
  return { ok: true, value: toView(row) };
}

export async function updateRule(
  userId: string,
  id: string,
  patch: { condition?: unknown; emailEnabled?: unknown; inAppEnabled?: unknown; active?: unknown },
  tier: AlertTier,
): Promise<ServiceResult<RuleView>> {
  const existing = (await db.alertRule.findFirst({ where: { id, userId } })) as RuleRow | null;
  if (!existing) return fail(404, "Alert not found.");

  const data: Record<string, unknown> = {};
  if (patch.condition !== undefined) {
    const cond = validateCondition(patch.condition);
    if (!cond.ok) return fail(400, cond.error);
    data.condition = cond.value;
  }
  if (patch.emailEnabled !== undefined || patch.inAppEnabled !== undefined) {
    const channels = validateChannels({
      emailEnabled: patch.emailEnabled !== undefined ? patch.emailEnabled : existing.emailEnabled,
      inAppEnabled: patch.inAppEnabled !== undefined ? patch.inAppEnabled : existing.inAppEnabled,
    });
    if (!channels.ok) return fail(400, channels.error);
    data.emailEnabled = channels.emailEnabled;
    data.inAppEnabled = channels.inAppEnabled;
  }
  if (patch.active !== undefined) {
    const active = patch.active === true;
    // Resuming is gated by the caller's CURRENT tier cap: a member who
    // downgraded (VIP→Pro, or lapsed to free) keeps every existing rule
    // — pausing, editing and deleting always work — but can't grow the
    // active set past their cap; they're refused until they're back
    // under it. (Rules already active are never touched here.)
    if (active && !existing.active) {
      const cap = alertCapForTier(tier);
      if (activeCapReached(await activeRuleCount(userId), cap)) {
        return fail(409, capMessage(cap, tier));
      }
    }
    data.active = active;
    // Resuming starts a fresh episode: the next match notifies again.
    if (active) data.matchNotified = false;
  }

  const row = (await db.alertRule.update({ where: { id }, data })) as RuleRow;
  return { ok: true, value: toView(row) };
}

export async function deleteRule(userId: string, id: string): Promise<ServiceResult<{ deleted: true }>> {
  const existing = await db.alertRule.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return fail(404, "Alert not found.");
  await db.alertRule.delete({ where: { id } });
  return { ok: true, value: { deleted: true } };
}

export interface EventView {
  id: string;
  ruleId: string;
  cameraId: string;
  cameraName: string;
  condition: string;
  observation: string;
  frameAt: string | null;
  imageUrl: string | null;
  emailSent: boolean;
  read: boolean;
  createdAt: string;
}

export async function listEvents(userId: string, limit = 30): Promise<EventView[]> {
  const rows = await db.alertEvent.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    include: { rule: { select: { cameraId: true, cameraName: true, condition: true } } },
  });
  return rows.map((e) => ({
    id: e.id,
    ruleId: e.ruleId,
    cameraId: e.rule.cameraId,
    cameraName: e.rule.cameraName,
    condition: e.rule.condition,
    observation: e.observation,
    frameAt: e.frameAt?.toISOString() ?? null,
    imageUrl: e.imageJpeg ? eventImageUrl(e.id) : null,
    emailSent: e.emailSent,
    read: e.readAt !== null,
    createdAt: e.createdAt.toISOString(),
  }));
}

export function unreadEventCount(userId: string): Promise<number> {
  return db.alertEvent.count({ where: { userId, readAt: null } });
}

export async function markAllEventsRead(userId: string): Promise<void> {
  await db.alertEvent.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}

export { MAX_ACTIVE_ALERT_RULES, alertCapForTier };
