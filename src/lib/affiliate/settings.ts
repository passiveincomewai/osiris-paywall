// ── Program settings: admin-tunable parameters with spec defaults ────────
// Stored as a singleton AffiliateSettings row (id="global"); falls back to
// DEFAULTS when the row is absent so the program works before first admin save.

import { db } from "@/lib/db";
import { RANKS, type RankDef } from "./ranks";

export interface AffiliateProgramSettings {
  ranks: RankDef[];
  overrideL2Pct: number;      // friends-of-friends override
  overrideL3Pct: number;      // third-level override
  attributionWindowDays: number;
  holdingPeriodDays: number;  // commission hold before "available"
  minPayoutCents: number;
  xpTable: Record<string, number>;
}

export const DEFAULT_SETTINGS: AffiliateProgramSettings = {
  ranks: RANKS,
  overrideL2Pct: 5,
  overrideL3Pct: 2,
  attributionWindowDays: 30,
  holdingPeriodDays: 30,
  minPayoutCents: 2500, // $25
  xpTable: {
    join: 100,
    onboarding_complete: 100,
    account_verified: 50,
    first_verified_visit: 25,
    first_paying_referral: 500,
    paying_referral: 150,
    bonus_5_paying: 750,
    bonus_10_paying: 1500,
  },
};

const SETTINGS_ID = "global";

export async function getSettings(): Promise<AffiliateProgramSettings> {
  try {
    const row = await db.affiliateSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (row?.data && typeof row.data === "object") {
      return { ...DEFAULT_SETTINGS, ...(row.data as Partial<AffiliateProgramSettings>) };
    }
  } catch {
    // table may not exist yet (migration pending) — use defaults
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<AffiliateProgramSettings>, actorUserId?: string): Promise<AffiliateProgramSettings> {
  const current = await getSettings();
  const merged = { ...current, ...patch };
  await db.affiliateSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, data: merged as object },
    update: { data: merged as object },
  });
  await db.affiliateAuditLog.create({
    data: { actorUserId, action: "settings.update", targetType: "AffiliateSettings", targetId: SETTINGS_ID, details: patch as object },
  });
  return merged;
}
