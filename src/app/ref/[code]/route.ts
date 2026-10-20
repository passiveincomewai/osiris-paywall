// GET /ref/[code] — referral landing: record click, set attribution cookie.
//
// Codes resolve three ways (lib/share/identity resolveShareCode):
//  - an affiliate code → the original flow (ReferralClick + visit XP);
//  - a CLAIMED anonymous share code → the same affiliate flow, against
//    the owner's profile (the anon code is an alias for their account);
//  - an UNCLAIMED anonymous share code → a ShareClick is recorded and
//    the same we_ref cookie drops with the anon code, so a signup
//    through it is remembered as a pending ShareReferral until the
//    code's owner claims it (then it flushes into a real attribution).
//
// Entity deep links ride through: /ref/<code>?camera=… (also flight /
// quake / storm / fire / event) records the click + cookie, then
// redirects to the globe with the deep-link params intact.
import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/affiliate/settings";
import { REF_COOKIE, REF_CODE_RE, hashIp, findAffiliateByCode } from "@/lib/affiliate/attribution";
import { resolveShareCode } from "@/lib/share/identity";
import { REF_PASSTHROUGH_PARAMS } from "@/lib/share/links";
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

/** The globe URL with any entity deep-link params carried through. */
function landingUrl(req: NextRequest): URL {
  const url = new URL("/", req.url);
  for (const key of REF_PASSTHROUGH_PARAMS) {
    const value = req.nextUrl.searchParams.get(key);
    if (value) url.searchParams.set(key, value);
  }
  return url;
}

type AffiliateLike = { id: string; userId: string; referralCode: string; customCode: string | null };

async function affiliateLanding(
  req: NextRequest,
  affiliate: AffiliateLike,
  code: string,
  settings: Awaited<ReturnType<typeof getSettings>>,
  landing: URL,
) {
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

  // Attribution cookie: httpOnly, 30-day window, root path. For an
  // alias landing the canonical code is what the cookie carries, so
  // the standard signup attribution resolves it directly.
  (await cookies()).set(REF_COOKIE, affiliate.customCode?.toLowerCase() ?? affiliate.referralCode, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: settings.attributionWindowDays * 86400,
  });

  return NextResponse.redirect(landing);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const code = ((await params).code || "").toLowerCase();
  const settings = await getSettings();
  const home = new URL("/", req.url);

  if (!REF_CODE_RE.test(code)) return NextResponse.redirect(home);

  const affiliate = await findAffiliateByCode(code);
  if (affiliate) return affiliateLanding(req, affiliate, code, settings, landingUrl(req));

  const resolved = await resolveShareCode(code);
  if (!resolved) return NextResponse.redirect(home);
  if (resolved.kind === "claimed") {
    return affiliateLanding(req, resolved.profile, code, settings, landingUrl(req));
  }

  // Unclaimed anonymous share code: record the visit against the
  // identity and drop the attribution cookie with the anon code.
  const identity = resolved.identity;
  const ua = (await headers()).get("user-agent") ?? "";
  const ipHash = hashIp(clientIp(req));
  await db.shareClick.create({
    data: {
      shareIdentityId: identity.id,
      ipHash,
      userAgent: ua.slice(0, 300),
      path: "/ref/" + code,
    },
  });

  (await cookies()).set(REF_COOKIE, identity.code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: settings.attributionWindowDays * 86400,
  });

  return NextResponse.redirect(landingUrl(req));
}
