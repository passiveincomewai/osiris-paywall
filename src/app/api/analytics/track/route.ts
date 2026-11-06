import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import {
  parseVariant,
  parseDevice,
  parseVisitorId,
  parseEventDetail,
  parseSearchDetail,
  parseCameraId,
  parseCameraName,
  SEARCH_PERFORMED_EVENT,
  deviceClassFromUserAgent,
} from "@/lib/analytics/ingest-fields";

export const runtime = "nodejs";

/**
 * First-party analytics ingest. Three call shapes:
 *  { path, sessionId, referrer? }            -> new page view row
 *  { path, sessionId, durationSec }          -> attach visible seconds to the
 *                                               most recent view of this session+path
 *  { path, sessionId, event }                -> named interaction event
 *                                               (e.g. "globe_reached" scroll depth)
 *
 * Any shape may also carry:
 *  variant: "A" | "B"   onboarding A/B group (client-assigned; validated.
 *           When the payload omits it, the route reads the `we_onb_group`
 *           cookie persisted by src/lib/onboarding/storage.ts — the
 *           client's trackAnalyticsEvent() sends no body variant, so the
 *           cookie is the primary channel.)
 *  device:  "mobile" | "tablet" | "desktop" (client-reported; validated,
 *           else derived from the User-Agent header)
 *  visitorId: the persistent first-party visitor ID (random UUID minted
 *           client-side by src/lib/analytics/visitor-id.ts, localStorage
 *           `we_vid`; validated to canonical UUID shape, else null).
 *           Unlike the per-visit sessionId it survives across visits, so
 *           return-visit reporting can group one visitor's rows across
 *           days. Rows from clients that send no (or a malformed) ID
 *           store null, like pre-visitorId history.
 *  detail:  for events only — one machine token stored as `event:detail`
 *           (e.g. onboarding step number, feature_first_use feature key).
 *           Exception: the `search_performed` event carries a structured
 *           "<resultCount>_<query token>" detail, validated by
 *           parseSearchDetail (see lib/analytics/search-event.ts).
 *  cameraId / cameraName: for the `camera_open` event ONLY — the id of
 *           the camera the visitor opened plus an ingest-time name
 *           snapshot, validated by parseCameraId/parseCameraName and
 *           stored in the dedicated PageView columns (the :detail suffix
 *           cannot carry a real camera id). Sent by any other event, or
 *           malformed, they are ignored — the row stores NULL, exactly
 *           like pre-instrumentation history. Powers the "pick up where
 *           you left off" rail; render-time resolution via /api/cctv?id=
 *           stays authoritative over the name snapshot.
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
    const variant =
      parseVariant(body.variant) ?? parseVariant(req.cookies.get("we_onb_group")?.value);
    const device = parseDevice(body.device) ?? deviceClassFromUserAgent(req.headers.get("user-agent"));
    const visitorId = parseVisitorId(body.visitorId);

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
        await db.pageView.create({ data: { path, sessionId, visitorId, userId, durationSec: secs, variant, device } });
      }
    } else if (typeof body.event === "string" && body.event.length > 0) {
      const detail =
        body.event === SEARCH_PERFORMED_EVENT
          ? parseSearchDetail(body.detail)
          : parseEventDetail(body.detail);
      const event = (detail ? `${body.event}:${detail}` : body.event).slice(0, 80);
      // Camera identity is meaningful on camera_open rows only; any
      // other event carrying these fields has them ignored (NULL stored).
      const camera =
        body.event === "camera_open"
          ? { cameraId: parseCameraId(body.cameraId), cameraName: parseCameraName(body.cameraName) }
          : null;
      await db.pageView.create({
        data: {
          path,
          sessionId,
          visitorId,
          userId,
          event,
          variant,
          device,
          ...(camera ? { cameraId: camera.cameraId, cameraName: camera.cameraName } : {}),
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
          visitorId,
          userId,
          variant,
          device,
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
