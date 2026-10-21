import { NextRequest, NextResponse } from "next/server";
import { isVipTier, vipAccess } from "@/lib/vip/tier";
import {
  activeEventRuleCount,
  createEventRule,
  listEventAlerts,
  listEventRules,
  markAllEventAlertsRead,
  unreadEventAlertCount,
  MAX_ACTIVE_EVENT_RULES,
} from "@/lib/vip/events/service";

export const runtime = "nodejs";

/**
 * VIP event alerts — quake / launch / ISS-pass rules + the inbox.
 * Same contract as /api/camera-alerts: GET open to any signed-in
 * owner (a lapsed VIP sees their paused rules), creating is VIP-only,
 * and the checker also skips non-VIP owners at check time.
 */
export async function GET() {
  const a = await vipAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  const [rules, events, unreadCount, activeCount] = await Promise.all([
    listEventRules(a.userId),
    listEventAlerts(a.userId),
    unreadEventAlertCount(a.userId),
    activeEventRuleCount(a.userId),
  ]);
  return NextResponse.json({
    tier: a.tier,
    vip: isVipTier(a.tier),
    maxActive: MAX_ACTIVE_EVENT_RULES,
    activeCount,
    rules,
    events,
    unreadCount,
  });
}

export async function POST(req: NextRequest) {
  const a = await vipAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  if (!isVipTier(a.tier)) {
    return NextResponse.json(
      { error: "vip", message: "Event alerts are a VIP Pro feature." },
      { status: 403 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const result = await createEventRule(a.userId, body as Record<string, unknown>);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ rule: result.value }, { status: 201 });
}

/** Mark every event-alert inbox entry read. */
export async function PUT() {
  const a = await vipAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  await markAllEventAlertsRead(a.userId);
  return NextResponse.json({ ok: true });
}
