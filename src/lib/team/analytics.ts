// Team server events — written into the in-house PageView analytics
// table with the "server-event" session marker (the same table the
// /admin dashboards already read). Never throws.

import { db } from "@/lib/db";

export type TeamEventName =
  | "invitation_created"
  | "invitation_accepted"
  | "invitation_expired"
  | "member_removed"
  | "seats_purchased"
  | "seats_downgraded"
  | "team_checkout_initiated"
  | "team_checkout_completed"
  | "team_subscription_canceled";

export async function recordTeamEvent(
  event: TeamEventName | string,
  userId: string | null,
  // orgId is accepted for call-site context; PageView has no org column,
  // so it is folded into the path marker only via the fixed "/team" path.
  _orgId?: string | null,
): Promise<void> {
  try {
    await db.pageView.create({
      data: { path: "/team", sessionId: "server-event", userId: userId ?? null, event },
    });
  } catch (err) {
    console.error("[team] analytics event failed:", err);
  }
}
