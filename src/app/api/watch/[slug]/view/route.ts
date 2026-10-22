import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/affiliate/settings";
import { REF_COOKIE, findAffiliateByCode, hashIp } from "@/lib/affiliate/attribution";
import { resolveShareCode } from "@/lib/share/identity";
import { isShareSlug } from "@/lib/clip-share/core";

export const runtime = "nodejs";

// Same cheap bot filter as /ref/[code]: crawlers unfurl the watch page
// for link previews, but they are not views and earn no attribution.
function looksLikeBot(ua: string): boolean {
  if (!ua) return true;
  return /bot|crawl|spider|slurp|mediapartners|ahrefs|semrush|mj12|baidu|yandex|sogou|exabot|facebot|ia_archiver|facebookexternalhit|twitterbot|whatsapp|telegrambot|slackbot|discordbot/i.test(ua);
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Watch-page visit beacon (fired once per page view by the client).
 * Two jobs, both mirroring the /ref/<code> landing exactly:
 *  1. Count the view (humans only, never the owner's own visits).
 *  2. Attribute the visitor to the sharer: record the click against
 *     the sharer's referral profile / share identity and drop the
 *     same httpOnly we_ref cookie a /ref visit drops, so a signup from
 *     this browser links to the sharer through the standard flow.
 * Attribution is fail-soft — a beacon must never break the watch page.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isShareSlug(slug)) return NextResponse.json({ error: "gone" }, { status: 404 });
  const share = await db.clipShare
    .findUnique({ where: { slug }, select: { id: true, userId: true, refCode: true, revokedAt: true } })
    .catch(() => null);
  if (!share || share.revokedAt) return NextResponse.json({ error: "gone" }, { status: 404 });

  const session = await auth().catch(() => null);
  const viewerId = (session?.user as { id?: string } | undefined)?.id;
  if (viewerId && viewerId === share.userId) return NextResponse.json({ ok: true, own: true });

  const ua = req.headers.get("user-agent") ?? "";
  const res = NextResponse.json({ ok: true });
  if (looksLikeBot(ua)) return res;

  await db.clipShare
    .update({ where: { id: share.id }, data: { views: { increment: 1 } } })
    .catch(() => null);

  const code = share.refCode?.toLowerCase();
  if (code) {
    try {
      const settings = await getSettings();
      const ipHash = hashIp(clientIp(req));
      const cookieOpts = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
        maxAge: settings.attributionWindowDays * 86400,
      };

      const affiliate = await findAffiliateByCode(code);
      if (affiliate) {
        await db.referralClick.create({
          data: {
            affiliateProfileId: affiliate.id,
            ipHash,
            userAgent: ua.slice(0, 300),
            path: `/watch/${slug}`,
          },
        });
        res.cookies.set(REF_COOKIE, affiliate.customCode?.toLowerCase() ?? affiliate.referralCode, cookieOpts);
      } else {
        const resolved = await resolveShareCode(code);
        if (resolved?.kind === "claimed") {
          await db.referralClick.create({
            data: {
              affiliateProfileId: resolved.profile.id,
              ipHash,
              userAgent: ua.slice(0, 300),
              path: `/watch/${slug}`,
            },
          });
          res.cookies.set(
            REF_COOKIE,
            resolved.profile.customCode?.toLowerCase() ?? resolved.profile.referralCode,
            cookieOpts,
          );
        } else if (resolved?.kind === "anon") {
          await db.shareClick.create({
            data: {
              shareIdentityId: resolved.identity.id,
              ipHash,
              userAgent: ua.slice(0, 300),
              path: `/watch/${slug}`,
            },
          });
          res.cookies.set(REF_COOKIE, resolved.identity.code, cookieOpts);
        }
      }
    } catch {
      // Attribution is best-effort; the view already counted.
    }
  }
  return res;
}
