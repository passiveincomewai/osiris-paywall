// GET /ref/[code] — referral landing: record click, set attribution cookie.
import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/affiliate/settings";
import { REF_COOKIE, REF_CODE_RE, hashIp, findAffiliateByCode } from "@/lib/affiliate/attribution";
import { awardXP } from "@/lib/affiliate/xp";

export const runtime = "nodejs";

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Cheap bot filter: empty UA or obvious crawlers don't count as visits.
function looksLikeBot(ua: string): boolean {
  if (!ua) return true;
  return /bot|crawl|spider|slurp|mediapartners|ahrefs|semrush|mj12|baidu|yandex|sogou|exabot|facebot|ia_archiver/i.test(ua);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const code = ((await params).code || "").toLowerCase();
  const settings = await getSettings();
  const home = new URL("/", req.url);

  if (!REF_CODE_RE.test(code)) return NextResponse.redirect(home);

  const affiliate = await findAffiliateByCode(code);
  if (!affiliate) return NextResponse.redirect(home);

  const ua = (await headers()).get("user-agent") ?? "";
  const ipHash = hashIp(clientIp(req));

  // Record the click (dedup for XP: one counted visit per hash per day).
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const seen = await db.referralClick.findFirst({
    where: { affiliateProfileId: affiliate.id, ipHash, createdAt: { gte: dayStart } },
    select: { id: true },
  });
  await db.referralClick.create({
    data: {
      affiliateProfileId: affiliate.id,
      ipHash,
      userAgent: ua.slice(0, 300),
      path: "/ref/" + code,
    },
  });

  if (!seen && !looksLikeBot(ua)) {
    await awardXP(affiliate.id, "first_verified_visit", {
      idempotencyKey: `visit:${affiliate.id}:${ipHash}:${dayStart.toISOString().slice(0, 10)}`,
      meta: { code },
    });
  }

  // Attribution cookie: httpOnly, 30-day window, root path.
  (await cookies()).set(REF_COOKIE, affiliate.customCode?.toLowerCase() ?? affiliate.referralCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: settings.attributionWindowDays * 86400,
  });

  const res = NextResponse.redirect(home);
  return res;
}
