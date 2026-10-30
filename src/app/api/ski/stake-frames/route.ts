import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stakeCamForResort } from "@/data/ski-stake-cams";
import type { StakeFrame } from "@/lib/ski/stake-capture";

export const dynamic = "force-dynamic";

/**
 * Powder #5 rescoped: the latest captured snow-stake night for a
 * resort (frames stored by /api/cron/ski-stake-capture). Public — the
 * frames are stills of the operator's own public webcam. Returns the
 * camera's verified operator metadata alongside, so the client never
 * hard-codes labels. `night` is null until the first in-season capture
 * lands; the page then shows the live still only.
 */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("resort") ?? "";
  const cam = stakeCamForResort(slug);
  if (!cam) return NextResponse.json({ ok: false }, { status: 404 });

  const night = await db.skiStakeNight.findFirst({
    where: { resortSlug: slug },
    orderBy: { nightKey: "desc" },
  });
  const frames = ((night?.frames as unknown as StakeFrame[] | null) ?? []).map(
    f => ({ t: f.t, url: f.url }),
  );

  return NextResponse.json({
    ok: true,
    cam: {
      resortSlug: cam.resortSlug,
      label: cam.label,
      operator: cam.operator,
      feedUrl: cam.feedUrl,
      sourcePage: cam.sourcePage,
    },
    night: night ? { nightKey: night.nightKey, frames } : null,
  });
}
