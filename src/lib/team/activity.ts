// Team activity log — best-effort audit trail. Never throws: a failed
// log write must never fail the action it describes.

import { db } from "@/lib/db";

export async function logTeamActivity(
  orgId: string,
  actorId: string | null,
  type: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.teamActivityLog.create({
      data: {
        organizationId: orgId,
        actorId: actorId ?? null,
        type,
        detail: (detail ?? undefined) as object | undefined,
      },
    });
  } catch (err) {
    console.error("[team] activity log failed:", err);
  }
}
