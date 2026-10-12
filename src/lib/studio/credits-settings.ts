// ── Studio credits: persisted configuration ──────────────────────────────
// Stored as a singleton AffiliateSettings row (id="studio-credits", data
// Json), following the src/lib/affiliate/settings.ts pattern. Reads merge
// the stored partial over DEFAULT_CREDIT_CONFIG (deep-merging the Record
// fields) and fall back to the defaults whenever the stored value is
// missing, unreadable, or invalid — the credits system must never run on
// a config that fails validation (in particular the 2× cost safety rule).

import { db } from "@/lib/db";
import { audit } from "@/lib/affiliate/admin";
import {
  DEFAULT_CREDIT_CONFIG,
  validateCreditConfig,
  type StudioCreditConfig,
} from "./credits-config";

const SETTINGS_ID = "studio-credits";

function freshDefault(): StudioCreditConfig {
  return {
    creditUsd: DEFAULT_CREDIT_CONFIG.creditUsd,
    monthlyAllowance: DEFAULT_CREDIT_CONFIG.monthlyAllowance,
    safetyOverride: DEFAULT_CREDIT_CONFIG.safetyOverride,
    prices: { ...DEFAULT_CREDIT_CONFIG.prices },
    providerUnitCostUsd: { ...DEFAULT_CREDIT_CONFIG.providerUnitCostUsd },
    providersEnabled: { ...DEFAULT_CREDIT_CONFIG.providersEnabled },
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function mergeConfig(stored: unknown): StudioCreditConfig {
  const base = freshDefault();
  if (!isRecord(stored)) return base;
  const merged: StudioCreditConfig = {
    ...base,
    ...(stored as Partial<StudioCreditConfig>),
    prices: { ...base.prices },
    providerUnitCostUsd: { ...base.providerUnitCostUsd },
    providersEnabled: { ...base.providersEnabled },
  };
  if (isRecord(stored.prices)) {
    merged.prices = { ...base.prices, ...(stored.prices as Partial<StudioCreditConfig["prices"]>) };
  }
  if (isRecord(stored.providerUnitCostUsd)) {
    merged.providerUnitCostUsd = {
      ...base.providerUnitCostUsd,
      ...(stored.providerUnitCostUsd as Partial<StudioCreditConfig["providerUnitCostUsd"]>),
    };
  }
  if (isRecord(stored.providersEnabled)) {
    merged.providersEnabled = {
      ...base.providersEnabled,
      ...(stored.providersEnabled as Partial<StudioCreditConfig["providersEnabled"]>),
    };
  }
  return merged;
}

export async function getCreditConfig(): Promise<StudioCreditConfig> {
  try {
    const row = await db.affiliateSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (row?.data && typeof row.data === "object") {
      const merged = mergeConfig(row.data);
      return validateCreditConfig(merged).ok ? merged : freshDefault();
    }
  } catch {
    // table may not exist yet (migration pending) — use defaults
  }
  return freshDefault();
}

export async function saveCreditConfig(
  cfg: StudioCreditConfig,
  actorUserId?: string,
): Promise<{ ok: true; config: StudioCreditConfig } | { ok: false; errors: string[] }> {
  const validation = validateCreditConfig(cfg);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  await db.affiliateSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, data: cfg as object },
    update: { data: cfg as object },
  });

  // The safety override must be visible in the audit record: if an admin
  // ever prices below the 2× cost floor, this entry is the paper trail.
  await audit("studio.credits.config.update", {
    actorUserId,
    targetType: "StudioCreditConfig",
    targetId: SETTINGS_ID,
    details: { config: cfg as unknown as Record<string, unknown>, safetyOverride: cfg.safetyOverride },
  });

  return { ok: true, config: cfg };
}
