import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPayload, readSnapshot } from "@/lib/cctv-snapshot";
import {
  catalogueCoverage,
  denverDayStartUtc,
  WATCHING_NOW_WINDOW_MS,
} from "@/lib/proof-stats";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Wave 2 F8 — proof counters, computed from the site's own data:
 *  - watchingNow / watchingToday: distinct analytics sessions
 *    (PageView.sessionId) in the last 15 minutes / since Denver
 *    midnight — the same first-party analytics the admin reads.
 *  - countries / sources: distinct values across the live camera
 *    catalogue (payload → snapshot → fast lane, the /api/cctv/showcase
 *    resolution order).
 * A figure that can't be computed is null and the client hides it —
 * nothing here is estimated, cached from a stale source beyond the
 * short memo, or invented. There is deliberately NO camera total: the
 * public camera figure is the owner's standing headline (see
 * lib/proof-stats).
 */

interface CatalogueCamera {
  country?: unknown;
  source?: unknown;
}

async function catalogueCameras(): Promise<CatalogueCamera[] | null> {
  const payload = getPayload();
  if (payload) {
    try {
      const parsed = JSON.parse(payload.json.toString("utf8")) as { cameras?: CatalogueCamera[] };
      if (Array.isArray(parsed.cameras) && parsed.cameras.length) return parsed.cameras;
    } catch {
      /* fall through */
    }
  }
  try {
    const snap = await readSnapshot();
    if (snap) {
      const out: CatalogueCamera[] = [];
      for (const list of Object.values(snap.regions)) {
        for (const cam of list as unknown as CatalogueCamera[]) out.push(cam);
      }
      if (out.length) return out;
    }
  } catch {
    /* no snapshot available */
  }
  try {
    const mod = await import("@/lib/vision/catalogue-fastlane");
    const records = await mod.fastlaneStatics();
    if (Array.isArray(records) && records.length) return records as unknown as CatalogueCamera[];
  } catch {
    /* fast lane unavailable */
  }
  return null;
}

let coverageMemo: { at: number; countries: number; sources: number } | null = null;
const COVERAGE_TTL_MS = 10 * 60_000;

async function coverage(): Promise<{ countries: number; sources: number } | null> {
  if (coverageMemo && Date.now() - coverageMemo.at < COVERAGE_TTL_MS) return coverageMemo;
  const cameras = await catalogueCameras();
  if (!cameras) return null;
  const cov = catalogueCoverage(cameras);
  coverageMemo = { at: Date.now(), countries: cov.countries, sources: cov.sources };
  return coverageMemo;
}

async function sessionCount(since: Date): Promise<number | null> {
  try {
    const groups = await db.pageView.groupBy({
      by: ["sessionId"],
      where: { createdAt: { gte: since } },
    });
    return groups.length;
  } catch {
    return null;
  }
}

export async function GET() {
  const now = new Date();
  const [watchingNow, watchingToday, cov] = await Promise.all([
    sessionCount(new Date(now.getTime() - WATCHING_NOW_WINDOW_MS)),
    sessionCount(denverDayStartUtc(now)),
    coverage(),
  ]);
  return NextResponse.json(
    {
      watchingNow,
      watchingToday,
      countries: cov?.countries ?? null,
      sources: cov?.sources ?? null,
      computedAt: now.toISOString(),
    },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
