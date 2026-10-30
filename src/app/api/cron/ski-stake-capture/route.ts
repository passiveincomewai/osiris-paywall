import { NextRequest, NextResponse } from "next/server";
import { del, put } from "@vercel/blob";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { SKI_STAKE_CAMS } from "@/data/ski-stake-cams";
import {
  denverClock,
  frameSignature,
  isExpiredNight,
  isJpeg,
  shouldStoreFrame,
  stakeNightKey,
  type StakeFrame,
} from "@/lib/ski/stake-capture";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron (hourly): Powder #5 rescoped — snow-stake overnight
 * capture. For each operator-labelled stake camera (src/data/ski-stake-
 * cams.ts), fetch the operator's still inside the Denver night window
 * (16:00 → 10:00) and store it to Blob when the frame actually changed,
 * so the resort page can replay the night as a frame sequence. Nights
 * older than the retention window are purged (rows + frames). Auth is
 * the house cron pattern: CRON_SECRET as a Bearer token (Vercel sends
 * it automatically); when the secret is unset the route still runs,
 * exactly like the other ski crons.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const now = new Date();

  // Purge expired nights first (few rows ever exist: ≤3 resorts × 3).
  let purged = 0;
  const rows = await db.skiStakeNight.findMany({
    select: { id: true, nightKey: true, frames: true },
  });
  for (const row of rows) {
    if (!isExpiredNight(row.nightKey, now)) continue;
    const frames = (row.frames as unknown as StakeFrame[] | null) ?? [];
    const urls = frames.map(f => f.url).filter(Boolean);
    if (urls.length) await del(urls).catch(() => null);
    await db.skiStakeNight.delete({ where: { id: row.id } }).catch(() => null);
    purged++;
  }

  const nightKey = stakeNightKey(now);
  const results: Record<string, string> = {};
  if (nightKey) {
    for (const cam of SKI_STAKE_CAMS) {
      try {
        const res = await fetch(cam.feedUrl, {
          signal: AbortSignal.timeout(10_000),
          headers: { "user-agent": "WorldEye stake capture (worldeye.app)" },
        });
        if (!res.ok) {
          results[cam.resortSlug] = `fetch-${res.status}`;
          continue;
        }
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (!isJpeg(bytes)) {
          results[cam.resortSlug] = "not-jpeg";
          continue;
        }
        const sig = frameSignature(bytes);
        const night = await db.skiStakeNight.findUnique({
          where: {
            resortSlug_nightKey: { resortSlug: cam.resortSlug, nightKey },
          },
        });
        const frames = (night?.frames as unknown as StakeFrame[] | null) ?? [];
        if (!shouldStoreFrame(frames, sig)) {
          results[cam.resortSlug] = "unchanged";
          continue;
        }
        const stamp = denverClock(now).replace(":", "");
        const blob = await put(
          `ski-stakes/${cam.resortSlug}/${nightKey}/${stamp}.jpg`,
          Buffer.from(bytes),
          { access: "public", contentType: "image/jpeg" },
        );
        const next: StakeFrame[] = [
          ...frames,
          { t: now.toISOString(), url: blob.url, sig },
        ];
        const data = { frames: next as unknown as Prisma.InputJsonValue };
        if (night) {
          await db.skiStakeNight.update({ where: { id: night.id }, data });
        } else {
          await db.skiStakeNight.create({
            data: { resortSlug: cam.resortSlug, nightKey, ...data },
          });
        }
        results[cam.resortSlug] = "stored";
      } catch {
        results[cam.resortSlug] = "error";
      }
    }
  }

  return NextResponse.json({ ok: true, nightKey, purged, results });
}
