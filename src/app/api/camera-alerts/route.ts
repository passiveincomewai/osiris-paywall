import { NextRequest, NextResponse } from "next/server";
import { cameraAlertAccess, isVip } from "@/lib/camera-alerts/tier";
import {
  activeRuleCount,
  alertCapForTier,
  createRule,
  listEvents,
  listRules,
  markAllEventsRead,
  unreadEventCount,
} from "@/lib/camera-alerts/service";

export const runtime = "nodejs";

/**
 * Camera alerts — the member's rules + alert inbox.
 * GET is open to any signed-in owner (a lapsed member can still see
 * their paused rules and why). Creating follows the caller's tier cap
 * (free 0 · Pro 2 · VIP Pro 10 — alertCapForTier is the single
 * source); the checker runs Pro and VIP owners' rules and skips
 * free owners at check time, so a lapse pauses rather than deletes,
 * and a VIP→Pro downgrade never unplugs rules that already exist.
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
    maxActive: alertCapForTier(a.tier),
    activeCount,
    rules,
    events,
    unreadCount,
  });
}

export async function POST(req: NextRequest) {
  const a = await cameraAlertAccess();
  if (!a.ok) return NextResponse.json({ error: "signin" }, { status: 401 });
  if (alertCapForTier(a.tier) === 0) {
    return NextResponse.json(
      {
        error: "plan",
        message:
          "Camera alerts start with Pro — Pro watches up to 2 cameras; VIP Pro watches up to 10.",
      },
      { status: 403 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const result = await createRule(a.userId, body as Record<string, unknown>, a.tier);
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
