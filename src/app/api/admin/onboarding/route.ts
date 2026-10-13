// GET /api/admin/onboarding — Onboarding & Activation report.
// Query params: preset=24h|7d|30d|90d|all|custom, from/to (ISO, custom
// only), source (utmSource), landing (path), device (mobile|tablet|
// desktop|unknown). Aggregation lives in src/lib/analytics/onboarding.ts
// and reads real PageView + Subscription rows only.
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/affiliate/admin";
import { getOnboardingReport } from "@/lib/analytics/onboarding";
import type { OnboardingFilters } from "@/lib/analytics/onboarding-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 86400_000;
const PRESETS: Record<string, number | null> = {
  "24h": DAY,
  "7d": 7 * DAY,
  "30d": 30 * DAY,
  "90d": 90 * DAY,
  all: null,
};
const DEVICES = new Set(["mobile", "tablet", "desktop", "unknown"]);

function forbidden(e: unknown) {
  return NextResponse.json(
    { error: "Forbidden" },
    { status: (e as { status?: number }).status ?? 403 },
  );
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    return forbidden(e);
  }

  const q = req.nextUrl.searchParams;
  const preset = q.get("preset") ?? "30d";
  const now = Date.now();
  let from: Date;
  let to: Date = new Date(now);

  if (preset === "custom") {
    const f = q.get("from");
    const t = q.get("to");
    const fd = f ? new Date(f) : null;
    const td = t ? new Date(t) : null;
    if (!fd || !td || isNaN(fd.getTime()) || isNaN(td.getTime()) || td <= fd) {
      return NextResponse.json(
        { error: "Custom range needs valid from/to with to after from." },
        { status: 400 },
      );
    }
    if (td.getTime() - fd.getTime() > 366 * DAY) {
      return NextResponse.json({ error: "Range too large (max 366 days)." }, { status: 400 });
    }
    from = fd;
    to = td;
  } else if (preset in PRESETS) {
    const span = PRESETS[preset];
    from = span == null ? new Date("2020-01-01T00:00:00.000Z") : new Date(now - span);
  } else {
    return NextResponse.json({ error: `Unknown preset "${preset}".` }, { status: 400 });
  }

  const deviceParam = q.get("device");
  const filters: OnboardingFilters = {
    from: from.toISOString(),
    to: to.toISOString(),
    preset,
    source: q.get("source") || null,
    landing: q.get("landing") || null,
    device: deviceParam && DEVICES.has(deviceParam) ? deviceParam : null,
  };

  const report = await getOnboardingReport(filters);
  return NextResponse.json(report);
}
