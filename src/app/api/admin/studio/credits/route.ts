// Admin: Studio credits & cost controls.
// GET returns the current credit config plus this month's usage stats.
// PATCH deep-merges a partial config over the current one, applies the
// explicit safety-override flag, and persists via saveCreditConfig (which
// validates, upserts, and audit-logs — including the override flag).
// Gated by the same ADMIN_EMAILS check as the rest of /admin.
import { NextResponse } from "next/server";
import { requireAdmin, audit } from "@/lib/affiliate/admin";
import type { StudioCreditConfig } from "@/lib/studio/credits-config";
import { getCreditConfig, saveCreditConfig } from "@/lib/studio/credits-settings";
import { getCreditUsageStats } from "@/lib/studio/credits";
import { getAiAdminStats } from "@/lib/studio/ai";

export const runtime = "nodejs";

function forbidden(e: unknown) {
  return NextResponse.json({ error: "Forbidden" }, { status: (e as { status?: number }).status ?? 403 });
}

export async function GET() {
  try { await requireAdmin(); } catch (e) { return forbidden(e); }

  const config = await getCreditConfig();
  const [stats, ai] = await Promise.all([
    getCreditUsageStats(),
    getAiAdminStats(config),
  ]);
  return NextResponse.json({ config, stats: { ...stats, ai } });
}

export async function PATCH(req: Request) {
  let session;
  try { session = await requireAdmin(); } catch (e) { return forbidden(e); }

  const body = (await req.json().catch(() => ({}))) as {
    config?: Partial<StudioCreditConfig>;
    overrideSafety?: boolean;
  };
  const partial: Partial<StudioCreditConfig> = body.config ?? {};
  const overrideSafety = body.overrideSafety === true;

  const current = await getCreditConfig();
  const merged: StudioCreditConfig = {
    ...current,
    ...partial,
    prices: { ...current.prices, ...(partial.prices ?? {}) },
    providerUnitCostUsd: { ...current.providerUnitCostUsd, ...(partial.providerUnitCostUsd ?? {}) },
    providersEnabled: { ...current.providersEnabled, ...(partial.providersEnabled ?? {}) },
    safetyOverride: overrideSafety,
  };

  const result = await saveCreditConfig(merged, session?.user?.id);
  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: 400 });
  }

  // The override is also audit-logged inside saveCreditConfig; this explicit
  // entry makes it unmissable in the log on its own.
  if (overrideSafety) {
    await audit("studio.credits.config.override", {
      actorUserId: session?.user?.id,
      targetType: "StudioCreditConfig",
      details: { safetyOverride: true },
    });
  }

  return NextResponse.json({ config: result.config });
}
