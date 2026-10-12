import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export const runtime = "nodejs";

/**
 * First-party analytics ingest. Three call shapes:
 *  { path, sessionId, referrer? }            -> new page view row
 *  { path, sessionId, durationSec }          -> attach visible seconds to the
 *                                               most recent view of this session+path
 *  { path, sessionId, event }                -> named interaction event
 *                                               (e.g. "globe_reached" scroll depth)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const path = typeof body.path === "string" ? body.path.slice(0, 300) : "/";
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.slice(0, 80) : "unknown";
    if (path.startsWith("/api/") || path.includes(".")) {
      return NextResponse.json({ ok: true }); // skip api + asset noise
    }
    const session = await auth().catch(() => null);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    if (typeof body.durationSec === "number") {
      const secs = Math.max(0, Math.min(86400, Math.round(body.durationSec)));
      // Attach to the latest matching view that has no duration yet.
      const latest = await db.pageView.findFirst({
        where: { sessionId, path, durationSec: null },
        orderBy: { createdAt: "desc" },
      });
      if (latest) {
        await db.pageView.update({ where: { id: latest.id }, data: { durationSec: secs } });
      } else {
        await db.pageView.create({ data: { path, sessionId, userId, durationSec: secs } });
      }
    } else if (typeof body.event === "string" && body.event.length > 0) {
      await db.pageView.create({
        data: {
          path,
          sessionId,
          userId,
          event: body.event.slice(0, 80),
        },
      });
    } else {
      const utmStr = (v: unknown) => {
        if (typeof v !== "string") return null;
        // Strip anything outside the characters legitimate UTM values use.
        const cleaned = v.replace(/[^A-Za-z0-9\-_./ ]/g, "").slice(0, 120);
        return cleaned.length > 0 ? cleaned : null;
      };
      await db.pageView.create({
        data: {
          path,
          sessionId,
          userId,
          referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null,
          utmSource: utmStr(body.utmSource),
          utmMedium: utmStr(body.utmMedium),
          utmCampaign: utmStr(body.utmCampaign),
          utmContent: utmStr(body.utmContent),
        },
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 }); // never break the page
  }
}
