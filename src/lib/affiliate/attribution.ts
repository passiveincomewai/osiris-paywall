// ── Referral attribution: cookie → click → user link ─────────────────────
// Flow: /ref/[code] records a click + sets httpOnly cookie "we_ref".
// On signup (sync-signup) or checkout, the server resolves the cookie into
// a ReferralAttribution row. One user can only ever be attributed once
// (self-referral is rejected).

import { createHash } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSettings } from "./settings";

export const REF_COOKIE = "we_ref";
// Companion cookie carrying the ReferralClick row id recorded at /ref
// time, so a later signup attribution can name the exact click it came
// from (ReferralAttribution.clickId) — that's what makes per-tracking-
// link signup counts real instead of estimated.
export const REF_CLICK_COOKIE = "we_ref_click";
export const REF_CODE_RE = /^[a-z0-9_-]{3,32}$/i;

export function hashIp(ip: string): string {
  return createHash("sha256").update(`we|${ip}`).digest("hex").slice(0, 32);
}

export async function getRefCookie(): Promise<string | null> {
  try {
    return (await cookies()).get(REF_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function getRefClickCookie(): Promise<string | null> {
  try {
    return (await cookies()).get(REF_CLICK_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function findAffiliateByCode(code: string) {
  if (!REF_CODE_RE.test(code)) return null;
  const norm = code.toLowerCase();
  return db.affiliateProfile.findFirst({
    where: {
      OR: [{ referralCode: norm }, { customCode: norm }],
      status: "active",
    },
    select: { id: true, userId: true, referralCode: true, customCode: true },
  });
}

/**
 * Core link: attribute a user to an affiliate profile id. Idempotent,
 * self-referral safe. Used by the Stripe webhook (checkout metadata).
 * `clickId` (the ReferralClick row recorded at /ref time, carried by
 * the we_ref_click cookie) is stored when it names a click belonging to
 * this affiliate — it powers per-tracking-link signup stats.
 */
export async function linkAttribution(referredUserId: string, affiliateProfileId: string, clickId?: string | null) {
  const existing = await db.referralAttribution.findUnique({ where: { referredUserId } });
  if (existing) return existing;

  const affiliate = await db.affiliateProfile.findUnique({
    where: { id: affiliateProfileId },
    select: { id: true, userId: true, status: true },
  });
  if (!affiliate || affiliate.status !== "active") return null;
  if (affiliate.userId === referredUserId) return null;

  let verifiedClickId: string | null = null;
  if (clickId) {
    const click = await db.referralClick.findUnique({
      where: { id: clickId },
      select: { affiliateProfileId: true },
    }).catch(() => null);
    if (click?.affiliateProfileId === affiliate.id) verifiedClickId = clickId;
  }

  const settings = await getSettings();
  const now = new Date();
  try {
    const attr = await db.referralAttribution.create({
      data: {
        affiliateProfileId: affiliate.id,
        referredUserId,
        clickId: verifiedClickId,
        expiresAt: new Date(now.getTime() + settings.attributionWindowDays * 86400_000),
      },
    });
    await db.affiliateProfile.updateMany({
      where: { userId: referredUserId, recruitedByProfileId: null },
      data: { recruitedByProfileId: affiliate.id },
    });
    return attr;
  } catch (e: unknown) {
    if (e instanceof Error && /unique/i.test(e.message)) {
      return db.referralAttribution.findUnique({ where: { referredUserId } });
    }
    throw e;
  }
}

/**
 * Link a newly seen user to the affiliate from their referral cookie.
 * Safe to call repeatedly: unique(referredUserId) makes it a no-op after
 * the first link. Returns the attribution (new or existing) or null.
 */
export async function attributeUserToAffiliate(referredUserId: string, refCode?: string | null) {
  const code = (refCode ?? (await getRefCookie()))?.toLowerCase();
  if (!code) return null;

  const existing = await db.referralAttribution.findUnique({ where: { referredUserId } });
  if (existing) return existing;

  const affiliate = await findAffiliateByCode(code);
  if (!affiliate) return null;
  return linkAttribution(referredUserId, affiliate.id, await getRefClickCookie());
}

/** Valid (unexpired) attribution for a user, if any. */
export async function getAttributionForUser(referredUserId: string) {
  const attr = await db.referralAttribution.findUnique({
    where: { referredUserId },
    include: { affiliate: { select: { id: true, userId: true, status: true, xp: true } } },
  });
  if (!attr) return null;
  if (attr.expiresAt < new Date()) return null;
  if (attr.affiliate.status !== "active") return null;
  return attr;
}
