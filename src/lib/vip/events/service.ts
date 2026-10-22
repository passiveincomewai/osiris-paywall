/**
 * Event alerts — rules + inbox service (mirrors lib/camera-alerts/service).
 *
 * Rule creation is VIP-only (enforced in the route, like camera
 * alerts); reads stay open to the owner so a lapsed VIP sees their
 * paused rules. The checker skips non-VIP owners at check time, so a
 * lapse pauses delivery without deleting anything.
 */
import { db } from "@/lib/db";
import {
  validateEventConfig,
  type EventKind,
  type IssConfig,
  type LaunchConfig,
  type QuakeConfig,
} from "./logic";

export const MAX_ACTIVE_EVENT_RULES = 15;

export type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; status: number };

export interface EventRuleView {
  id: string;
  kind: EventKind;
  placeId: string | null;
  placeName: string | null;
  config: QuakeConfig | LaunchConfig | IssConfig;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  active: boolean;
  lastCheckedAt: string | null;
  createdAt: string;
}

export interface EventAlertView {
  id: string;
  ruleId: string;
  kind: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  emailSent: boolean;
  readAt: string | null;
  createdAt: string;
}

interface RuleRow {
  id: string;
  kind: string;
  placeId: string | null;
  place: { name: string } | null;
  config: unknown;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  active: boolean;
  lastCheckedAt: Date | null;
  createdAt: Date;
}

function toRuleView(r: RuleRow): EventRuleView {
  const checked = validateEventConfig(r.kind, r.config);
  return {
    id: r.id,
    kind: (r.kind as EventKind) ?? "quake",
    placeId: r.placeId,
    placeName: r.place?.name ?? null,
    config: checked.ok
      ? checked.config
      : r.kind === "launch"
        ? { leadHours: [24] }
        : r.kind === "iss"
          ? { minElevationDeg: 25, leadHours: 12 }
          : { minMag: 5 },
    emailEnabled: r.emailEnabled,
    inAppEnabled: r.inAppEnabled,
    active: r.active,
    lastCheckedAt: r.lastCheckedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function listEventRules(userId: string): Promise<EventRuleView[]> {
  const rows = await db.eventAlertRule.findMany({
    where: { userId },
    include: { place: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRuleView);
}

export function activeEventRuleCount(userId: string): Promise<number> {
  return db.eventAlertRule.count({ where: { userId, active: true } });
}

export async function createEventRule(
  userId: string,
  body: Record<string, unknown>,
): Promise<ServiceResult<EventRuleView>> {
  const checked = validateEventConfig(body.kind, body.config);
  if (!checked.ok) return { ok: false, error: checked.error, status: 400 };
  const kind = checked.kind;

  let placeId: string | null = null;
  if (body.placeId !== undefined && body.placeId !== null) {
    if (typeof body.placeId !== "string") {
      return { ok: false, error: "place_invalid", status: 400 };
    }
    const place = await db.vipPlace.findFirst({
      where: { id: body.placeId, userId },
      select: { id: true },
    });
    if (!place) return { ok: false, error: "place_not_found", status: 400 };
    placeId = place.id;
  }
  if (kind === "iss" && !placeId) {
    return { ok: false, error: "place_required", status: 400 };
  }

  const active = body.active !== false;
  if (active) {
    const count = await activeEventRuleCount(userId);
    if (count >= MAX_ACTIVE_EVENT_RULES) {
      return { ok: false, error: "rule_limit", status: 409 };
    }
  }
  const row = await db.eventAlertRule.create({
    data: {
      userId,
      kind,
      placeId,
      config: checked.config as object,
      emailEnabled: body.emailEnabled !== false,
      inAppEnabled: body.inAppEnabled !== false,
      active,
    },
    include: { place: { select: { name: true } } },
  });
  return { ok: true, value: toRuleView(row) };
}

export async function updateEventRule(
  userId: string,
  id: string,
  body: Record<string, unknown>,
): Promise<ServiceResult<EventRuleView>> {
  const existing = await db.eventAlertRule.findFirst({ where: { id, userId } });
  if (!existing) return { ok: false, error: "not_found", status: 404 };

  const data: Record<string, unknown> = {};
  if (body.config !== undefined || body.kind !== undefined) {
    const checked = validateEventConfig(body.kind ?? existing.kind, body.config ?? existing.config);
    if (!checked.ok) return { ok: false, error: checked.error, status: 400 };
    data.config = checked.config as object;
    if (body.kind !== undefined) data.kind = checked.kind;
  }
  if (body.placeId !== undefined) {
    if (body.placeId === null) data.placeId = null;
    else if (typeof body.placeId === "string") {
      const place = await db.vipPlace.findFirst({
        where: { id: body.placeId, userId },
        select: { id: true },
      });
      if (!place) return { ok: false, error: "place_not_found", status: 400 };
      data.placeId = place.id;
    } else return { ok: false, error: "place_invalid", status: 400 };
  }
  const kind = (data.kind as string) ?? existing.kind;
  const placeId = (data.placeId as string | null | undefined) ?? existing.placeId;
  if (kind === "iss" && !placeId) {
    return { ok: false, error: "place_required", status: 400 };
  }
  if (typeof body.emailEnabled === "boolean") data.emailEnabled = body.emailEnabled;
  if (typeof body.inAppEnabled === "boolean") data.inAppEnabled = body.inAppEnabled;
  if (typeof body.active === "boolean") {
    if (body.active && !existing.active) {
      const count = await activeEventRuleCount(userId);
      if (count >= MAX_ACTIVE_EVENT_RULES) {
        return { ok: false, error: "rule_limit", status: 409 };
      }
    }
    data.active = body.active;
  }
  const row = await db.eventAlertRule.update({
    where: { id },
    data,
    include: { place: { select: { name: true } } },
  });
  return { ok: true, value: toRuleView(row) };
}

export async function deleteEventRule(
  userId: string,
  id: string,
): Promise<ServiceResult<{ deleted: true }>> {
  const existing = await db.eventAlertRule.findFirst({ where: { id, userId } });
  if (!existing) return { ok: false, error: "not_found", status: 404 };
  await db.eventAlertRule.delete({ where: { id } });
  return { ok: true, value: { deleted: true } };
}

export async function listEventAlerts(userId: string, limit = 30): Promise<EventAlertView[]> {
  const rows = await db.eventAlertEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((e) => ({
    id: e.id,
    ruleId: e.ruleId,
    kind: e.kind,
    title: e.title,
    body: e.body,
    data: (e.data as Record<string, unknown> | null) ?? null,
    emailSent: e.emailSent,
    readAt: e.readAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
  }));
}

export function unreadEventAlertCount(userId: string): Promise<number> {
  return db.eventAlertEvent.count({ where: { userId, readAt: null } });
}

export async function markAllEventAlertsRead(userId: string): Promise<void> {
  await db.eventAlertEvent.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
