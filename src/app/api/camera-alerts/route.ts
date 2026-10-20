import { NextRequest, NextResponse } from "next/server";
import { cameraAlertAccess, isVip } from "@/lib/camera-alerts/tier";
import {
  activeRuleCount,
  createRule,
  listEvents,
  listRules,
  markAllEventsRead,
  unreadEventCount,
  MAX_ACTIVE_ALERT_RULES,
} from "@/lib/camera-alerts/service";

export const runtime = "nodejs";

/**
 * VIP camera alerts — the member's rules + alert inbox.
 * GET is open to any signed-in owner (a lapsed VIP can still see their
 * paused rules and why). Creating is VIP-only; the checker also skips
 * non-VIP owners at check time, so a lapse pauses rather than deletes.
 */
export async function GET() {
  const a = await cameraAlertAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  const [rules, events, unreadCount, activeCount] = await Promise.all([
    listRules(a.userId),
    listEvents(a.userId),
    unreadEventCount(a.userId),
    activeRuleCount(a.userId),
  ]);
  return NextResponse.json({
    tier: a.tier,
    vip: isVip(a.tier),
    maxActive: MAX_ACTIVE_ALERT_RULES,
    activeCount,
    rules,
    events,
    unreadCount,
  });
}

export async function POST(req: NextRequest) {
  const a = await cameraAlertAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  if (!isVip(a.tier)) {
    return NextResponse.json(
      { error: "vip", message: "Camera alerts are a VIP Pro feature." },
      { status: 403 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const result = await createRule(a.userId, body as Record<string, unknown>);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ rule: result.value }, { status: 201 });
}

/** Mark every inbox event read (the feed's "mark all read"). */
export async function PUT() {
  const a = await cameraAlertAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  await markAllEventsRead(a.userId);
  return NextResponse.json({ ok: true });
}
