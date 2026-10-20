import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, teamErrorResponse } from "@/lib/team/api";
import { requireMembership, TeamError } from "@/lib/team/permissions";
import { recordingCapForTier } from "@/lib/team/entitlement";
import { planTierForRow } from "@/lib/plan-tier";

export const runtime = "nodejs";

const LEASE_TTL_MS = 90_000;

/**
 * POST /api/team/recording/lease { orgId, cameraKey } — member+.
 * The org-wide concurrent recording pool: distinct active leases for
 * the org may never exceed the OWNER's recording cap. Transactional.
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { orgId?: string; cameraKey?: string };
    const orgId = String(body.orgId ?? "");
    const cameraKey = String(body.cameraKey ?? "");
    if (!cameraKey) throw new TeamError(400, "cameraKey required");
    const { org } = await requireMembership(orgId, userId, "member");
    if (org.suspended) throw new TeamError(403, "This team is suspended");

    const ownerSub = await db.subscription.findUnique({ where: { userId: org.ownerId } });
    const ownerTier = planTierForRow(ownerSub, process.env);
    const cap = recordingCapForTier(ownerTier);
    if (cap === 0) throw new TeamError(403, "The team owner's plan does not include recording");

    const now = new Date();
    const result = await db.$transaction(async (tx) => {
      await tx.teamRecordingLease.deleteMany({
        where: { organizationId: orgId, expiresAt: { lt: now } },
      });
      const existing = await tx.teamRecordingLease.findUnique({
        where: { organizationId_userId_cameraKey: { organizationId: orgId, userId, cameraKey } },
      });
      const expiresAt = new Date(now.getTime() + LEASE_TTL_MS);
      if (existing) {
        await tx.teamRecordingLease.update({ where: { id: existing.id }, data: { expiresAt } });
        const inUse = await tx.teamRecordingLease.count({ where: { organizationId: orgId } });
        return { ok: true as const, refreshed: true, cap, inUse, expiresAt };
      }
      const inUse = await tx.teamRecordingLease.count({ where: { organizationId: orgId } });
      if (inUse >= cap) return { ok: false as const, cap, inUse };
      await tx.teamRecordingLease.create({
        data: { organizationId: orgId, userId, cameraKey, expiresAt },
      });
      return { ok: true as const, refreshed: false, cap, inUse: inUse + 1, expiresAt };
    });

    if (!result.ok) {
      return NextResponse.json({ error: "pool_full", cap: result.cap, inUse: result.inUse }, { status: 409 });
    }
    return NextResponse.json({
      ok: true,
      refreshed: result.refreshed,
      cap: result.cap,
      inUse: result.inUse,
      expiresAt: result.expiresAt.toISOString(),
    });
  } catch (err) {
    return teamErrorResponse(err);
  }
}

/** DELETE /api/team/recording/lease { orgId, cameraKey } — release own lease. */
export async function DELETE(req: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await req.json().catch(() => ({}))) as { orgId?: string; cameraKey?: string };
    const orgId = String(body.orgId ?? "");
    const cameraKey = String(body.cameraKey ?? "");
    await db.teamRecordingLease.deleteMany({
      where: { organizationId: orgId, userId, cameraKey },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return teamErrorResponse(err);
  }
}
