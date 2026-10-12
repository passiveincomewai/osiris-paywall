// ── Daily Content Drops: one featured template per UTC day ──────────────
// Days are UTC date-only (StudioDrop.date is a @db.Date column). Claiming
// a drop pays its XP bonus exactly once per affiliate — the unique
// (dropId, profileId) claim row is the gate, and awardXP's idempotency
// key is the backstop.

import { db } from "@/lib/db";
import { awardXP } from "@/lib/affiliate/xp";
import type { StudioDrop } from "@prisma/client";

/** Pure: the UTC calendar date of `d`, as a Date at UTC midnight. */
export function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Lite template fields the drop UI needs — never the full SVG body. */
export const DROP_TEMPLATE_SELECT = {
  id: true,
  slug: true,
  title: true,
  category: true,
  kind: true,
  format: true,
  width: true,
  height: true,
  assetUrl: true,
  previewUrl: true,
} as const;

export type TodayDrop = StudioDrop & {
  template: {
    id: string;
    slug: string;
    title: string;
    category: string;
    kind: string;
    format: string;
    width: number;
    height: number;
    assetUrl: string | null;
    previewUrl: string | null;
  } | null;
};

/** Today's (UTC) drop, or null when no drop was published for today. */
export async function getTodayDrop(now: Date = new Date()): Promise<TodayDrop | null> {
  const drop = await db.studioDrop.findUnique({
    where: { date: utcDateOnly(now) },
    include: { template: { select: DROP_TEMPLATE_SELECT } },
  });
  return drop as TodayDrop | null;
}

export interface ClaimDropResult {
  drop: TodayDrop | null;
  xpAwarded: number;
  alreadyClaimed: boolean;
}

/**
 * Claim today's drop for an affiliate. No drop today → `{ drop: null }`
 * with zero awards. A repeat claim returns `alreadyClaimed: true` with
 * zero awards; the first claim awards the drop's XP bonus.
 */
export async function claimDrop(
  profileId: string,
  now: Date = new Date(),
): Promise<ClaimDropResult> {
  const drop = await getTodayDrop(now);
  if (!drop) return { drop: null, xpAwarded: 0, alreadyClaimed: false };

  try {
    await db.studioDropClaim.create({
      data: { dropId: drop.id, profileId },
    });
  } catch (e: unknown) {
    // Unique (dropId, profileId): this affiliate already claimed it.
    if (
      (e as { code?: string })?.code === "P2002" ||
      (e instanceof Error && /unique/i.test(e.message))
    ) {
      return { drop, xpAwarded: 0, alreadyClaimed: true };
    }
    throw e;
  }

  let xpAwarded = 0;
  if (drop.xpBonus > 0) {
    const award = await awardXP(profileId, "studio_drop", {
      xp: drop.xpBonus,
      idempotencyKey: `studio:drop:${drop.id}:${profileId}`,
    });
    xpAwarded = award.awarded ? award.xp : 0;
  }

  return { drop, xpAwarded, alreadyClaimed: false };
}

/** Has this affiliate already claimed this drop? */
export async function hasClaimedDrop(profileId: string, dropId: string): Promise<boolean> {
  const claim = await db.studioDropClaim.findUnique({
    where: { dropId_profileId: { dropId, profileId } },
    select: { id: true },
  });
  return claim !== null;
}
