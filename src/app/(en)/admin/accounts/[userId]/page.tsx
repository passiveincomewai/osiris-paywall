import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { adminEmails } from "@/lib/affiliate/admin";
import { planNameByPriceId } from "@/lib/billing/plans";
import { isCompSubscription } from "@/lib/pro/comp";
import { discoverySourceLabel } from "@/lib/discovery-sources";
import AdminNav from "../../AdminNav";
import AccountActions, { type AccountSubState } from "./AccountActions";

export const metadata = { title: "Account detail — Admin" };
export const dynamic = "force-dynamic";

/** planNameByPriceId values → admin display labels. Same mapping as the
 *  accounts list (kept page-local there; duplicated here deliberately —
 *  the two pages evolve separately and the map is tiny). */
function planLabel(raw: string | undefined): string {
  if (!raw) return "—";
  const standalone: Record<string, string> = {
    enterprise: "Enterprise",
    ambient: "Ambient",
    ski: "Powder Pass",
  };
  if (standalone[raw]) return standalone[raw];
  const tiers: Record<string, string> = { lite: "Lite", pro: "Pro", ultra: "Ultra" };
  const periods: Record<string, string> = { weekly: "Weekly", monthly: "Monthly", annual: "Annual" };
  if (periods[raw]) return `Pro · ${periods[raw]}`;
  const [tier, period] = raw.split("_");
  if (tier && period && tiers[tier] && periods[period]) return `${tiers[tier]} · ${periods[period]}`;
  return raw;
}

function fmtDenver(d: Date): string {
  return d.toLocaleString("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDenverDay(d: Date): string {
  return d.toLocaleDateString("en-US", {
    timeZone: "America/Denver",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function money(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

/** The comp source word inside a synthetic comp id ("comp_<source>_<userId>"). */
function compSourceOf(stripeSubscriptionId: string, userId: string): string {
  const mid = stripeSubscriptionId.slice("comp_".length, stripeSubscriptionId.length - userId.length - 1);
  return mid || "comp";
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;

function denverPartsOf(d: Date): { y: string; m: string; day: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver", hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return { y: get("year"), m: get("month"), day: get("day") };
}

function niceCeil(v: number): number {
  if (v <= 1) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

type ActivityAgg = {
  views: bigint;
  visits: bigint;
  opens: bigint;
  last_seen: Date | null;
};

type FirstView = {
  path: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  createdAt: Date;
};

type RecentView = { path: string; createdAt: Date };
type RecentOpen = { path: string; cameraId: string | null; cameraName: string | null; createdAt: Date };
type SessionRow = {
  sessionId: string;
  first_seen: Date;
  last_seen: Date;
  views: bigint;
  opens: bigint;
  device: string | null;
};
type DailyRow = { k: string; views: bigint; opens: bigint };
type TopCameraRow = { cameraId: string; name: string | null; opens: bigint };

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="text-xl md:text-2xl font-extrabold text-white tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-white/45 mt-0.5">{label}</div>
      {sub ? <div className="text-[11px] text-white/35 mt-1">{sub}</div> : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 mb-4">
      <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">{title}</div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-bold tracking-[0.14em] text-white/35 uppercase">{k}</dt>
      <dd className="text-white/75 mt-0.5 break-words">{v}</dd>
    </div>
  );
}

/**
 * Views + camera opens per Denver day, last 30 days — grouped bars in
 * the same hand-rolled SVG idiom as the admin dashboard charts (no
 * chart dependency). Exact values ride in each bar's <title>; the two
 * series totals sit in the legend line above the chart.
 */
function EngagementChart({ days }: { days: { key: string; label: string; views: number; opens: number }[] }) {
  const W = 1120, H = 252;
  const LEFT = 40, RIGHT = 10, TOP = 14, BOTTOM = 36;
  const plotW = W - LEFT - RIGHT, plotH = H - TOP - BOTTOM;
  const max = Math.max(1, ...days.map((d) => Math.max(d.views, d.opens)));
  const ceil = niceCeil(max);
  const y = (v: number) => TOP + plotH - (v / ceil) * plotH;
  const dayW = plotW / days.length;
  const bw = Math.max(2, dayW * 0.34);
  const totalViews = days.reduce((s, d) => s + d.views, 0);
  const totalOpens = days.reduce((s, d) => s + d.opens, 0);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50 mb-2">
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: "#38bdf8" }} />Page views · {totalViews.toLocaleString("en-US")}</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5" style={{ background: "#37e08b" }} />Camera opens · {totalOpens.toLocaleString("en-US")}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Bar chart: page views and camera opens per day over the last 30 days">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line x1={LEFT} y1={y(ceil * f)} x2={W - RIGHT} y2={y(ceil * f)} stroke="#ffffff" strokeOpacity={f === 0 ? 0.14 : 0.05} />
            <text x={LEFT - 6} y={y(ceil * f) + 3} fontSize="10" fill="#5b6b85" textAnchor="end">
              {Math.round(ceil * f).toLocaleString("en-US")}
            </text>
          </g>
        ))}
        <text transform={`rotate(-90 13 ${TOP + plotH / 2})`} x={13} y={TOP + plotH / 2} fontSize="10" fill="#5b6b85" textAnchor="middle">
          Count
        </text>
        {days.map((d, i) => {
          const cx = LEFT + i * dayW + dayW / 2;
          return (
            <g key={d.key}>
              <rect x={cx - bw - 1} y={y(d.views)} width={bw} height={Math.max(0, y(0) - y(d.views))} rx="2" fill="#38bdf8" fillOpacity="0.9">
                <title>{`${d.label} · ${d.views} page views`}</title>
              </rect>
              <rect x={cx + 1} y={y(d.opens)} width={bw} height={Math.max(0, y(0) - y(d.opens))} rx="2" fill="#37e08b" fillOpacity="0.9">
                <title>{`${d.label} · ${d.opens} camera opens`}</title>
              </rect>
              {(i % 5 === 0 || i === days.length - 1) && (
                <text x={cx} y={H - 18} fontSize="9.5" fill="#5b6b85" textAnchor="middle">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
        <text x={LEFT + plotW / 2} y={H - 2} fontSize="10" fill="#5b6b85" textAnchor="middle">
          Day (Denver time)
        </text>
      </svg>
    </div>
  );
}

type TimelineEvent = { at: Date; label: string; detail?: string };

export default async function AdminAccountDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) redirect("/admin/login");
  if (!adminEmails().includes(email)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#050810" }}>
        <div className="max-w-md text-center rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-white">Admin access only</h1>
          <p className="text-sm text-white/50 mt-3 leading-relaxed">
            Signed in as <span className="text-white/80 font-mono">{email}</span>, which is not an admin.
          </p>
          <Link href="/" className="inline-block mt-6 text-sm text-cyan-300 hover:underline">← Back to site</Link>
        </div>
      </div>
    );
  }

  const { userId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      emailOptOut: true,
      supporter: true,
      discoverySource: true,
      discoveryDetail: true,
      createdAt: true,
      subscription: {
        select: {
          status: true,
          stripePriceId: true,
          stripeSubscriptionId: true,
          stripeCustomerId: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      affiliateProfile: {
        select: { id: true, referralCode: true, customCode: true, status: true, xp: true },
      },
    },
  });

  if (!user) {
    return (
      <div className="docs-root min-h-screen" style={{ background: "#050810" }}>
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
          <div className="mb-8">
            <AdminNav active="accounts" />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/40">
            No account with that ID exists. <Link href="/admin/accounts" className="text-cyan-300 hover:underline">Back to accounts</Link>
          </div>
        </div>
      </div>
    );
  }

  // Activity is assembled over every session that ever carried this
  // userId (signed-in rows) plus those sessions' anonymous rows: the
  // session is the join key, so the pre-signup landing view in the same
  // tab counts — exactly like the dashboard's signup attribution. All
  // aggregates are bounded single queries, never row dumps.
  const chartSince = new Date(Date.now() - 31 * DAY_MS);
  const [
    aggRows, firstRows, signInCount, lastSignIn, referredBy,
    recentViews, recentOpens, sessionRows, dailyRows, topCameraRows,
    signInEvents, emailHistory, savedCameraCount, collectionCount,
    recordingCount, savedViewCount, donationAgg, recentDonations,
  ] = await Promise.all([
    db.$queryRaw<ActivityAgg[]>`
      WITH linked AS (SELECT DISTINCT "sessionId" FROM "PageView" WHERE "userId" = ${userId})
      SELECT
        COUNT(*) FILTER (WHERE event IS NULL) AS views,
        COUNT(DISTINCT "sessionId") AS visits,
        COUNT(*) FILTER (WHERE event = 'camera_open') AS opens,
        MAX("createdAt") AS last_seen
      FROM "PageView"
      WHERE "sessionId" IN (SELECT "sessionId" FROM linked)`,
    db.$queryRaw<FirstView[]>`
      WITH linked AS (SELECT DISTINCT "sessionId" FROM "PageView" WHERE "userId" = ${userId})
      SELECT path, referrer, "utmSource", "utmMedium", "utmCampaign", "createdAt"
      FROM "PageView"
      WHERE event IS NULL AND "sessionId" IN (SELECT "sessionId" FROM linked)
      ORDER BY "createdAt" ASC
      LIMIT 1`,
    db.userSignInEvent.count({ where: { userId } }),
    db.userSignInEvent.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, deviceLabel: true, approximateLocation: true },
    }),
    db.referralAttribution.findUnique({
      where: { referredUserId: userId },
      select: {
        createdAt: true,
        affiliate: {
          select: {
            referralCode: true,
            customCode: true,
            user: { select: { email: true, name: true } },
          },
        },
      },
    }),
    db.$queryRaw<RecentView[]>`
      WITH linked AS (SELECT DISTINCT "sessionId" FROM "PageView" WHERE "userId" = ${userId})
      SELECT path, "createdAt"
      FROM "PageView"
      WHERE event IS NULL AND "sessionId" IN (SELECT "sessionId" FROM linked)
      ORDER BY "createdAt" DESC
      LIMIT 20`,
    db.$queryRaw<RecentOpen[]>`
      WITH linked AS (SELECT DISTINCT "sessionId" FROM "PageView" WHERE "userId" = ${userId})
      SELECT path, "cameraId", "cameraName", "createdAt"
      FROM "PageView"
      WHERE event = 'camera_open' AND "sessionId" IN (SELECT "sessionId" FROM linked)
      ORDER BY "createdAt" DESC
      LIMIT 20`,
    db.$queryRaw<SessionRow[]>`
      WITH linked AS (SELECT DISTINCT "sessionId" FROM "PageView" WHERE "userId" = ${userId})
      SELECT pv."sessionId" AS "sessionId",
        MIN(pv."createdAt") AS first_seen,
        MAX(pv."createdAt") AS last_seen,
        COUNT(*) FILTER (WHERE pv.event IS NULL) AS views,
        COUNT(*) FILTER (WHERE pv.event = 'camera_open') AS opens,
        (SELECT pv2.device FROM "PageView" pv2
          WHERE pv2."sessionId" = pv."sessionId" AND pv2.device IS NOT NULL
          ORDER BY pv2."createdAt" DESC LIMIT 1) AS device
      FROM "PageView" pv
      WHERE pv."sessionId" IN (SELECT "sessionId" FROM linked)
      GROUP BY pv."sessionId"
      ORDER BY last_seen DESC
      LIMIT 10`,
    db.$queryRaw<DailyRow[]>`
      WITH linked AS (SELECT DISTINCT "sessionId" FROM "PageView" WHERE "userId" = ${userId})
      SELECT TO_CHAR("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Denver', 'YYYY-MM-DD') AS k,
        COUNT(*) FILTER (WHERE event IS NULL) AS views,
        COUNT(*) FILTER (WHERE event = 'camera_open') AS opens
      FROM "PageView"
      WHERE "sessionId" IN (SELECT "sessionId" FROM linked) AND "createdAt" >= ${chartSince}
      GROUP BY k ORDER BY k`,
    db.$queryRaw<TopCameraRow[]>`
      WITH linked AS (SELECT DISTINCT "sessionId" FROM "PageView" WHERE "userId" = ${userId})
      SELECT "cameraId" AS "cameraId", MAX("cameraName") AS name, COUNT(*) AS opens
      FROM "PageView"
      WHERE event = 'camera_open' AND "cameraId" IS NOT NULL
        AND "sessionId" IN (SELECT "sessionId" FROM linked)
      GROUP BY "cameraId"
      ORDER BY opens DESC
      LIMIT 10`,
    db.userSignInEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { createdAt: true, deviceLabel: true, approximateLocation: true },
    }),
    db.lifecycleEmailLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { template: true, kind: true, subject: true, status: true, createdAt: true },
    }),
    db.savedCamera.count({ where: { userId } }),
    db.cameraCollection.count({ where: { userId } }),
    db.clipMeta.count({ where: { userId } }),
    db.savedView.count({ where: { userId } }),
    db.donation.aggregate({ where: { userId }, _count: true, _sum: { amountCents: true } }),
    db.donation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { amountCents: true, frequency: true, createdAt: true },
    }),
  ]);

  const agg = aggRows[0];
  const views = Number(agg?.views ?? 0);
  const visits = Number(agg?.visits ?? 0);
  const opens = Number(agg?.opens ?? 0);
  const lastSeen = agg?.last_seen ?? null;
  const first = firstRows[0] ?? null;

  const profile = user.affiliateProfile;
  let affiliateStats: { referrals: number; converted: number; commissions: number; earnedCents: number; pendingCents: number } | null = null;
  let referralsList: { userId: string; name: string | null; email: string | null; joinedAt: Date; convertedAt: Date | null }[] = [];
  if (profile) {
    const [referrals, converted, commAll, commPending, attributions] = await Promise.all([
      db.referralAttribution.count({ where: { affiliateProfileId: profile.id } }),
      db.referralAttribution.count({ where: { affiliateProfileId: profile.id, convertedAt: { not: null } } }),
      db.commission.aggregate({ where: { affiliateProfileId: profile.id }, _sum: { amountCents: true }, _count: true }),
      db.commission.aggregate({ where: { affiliateProfileId: profile.id, status: "pending" }, _sum: { amountCents: true } }),
      db.referralAttribution.findMany({
        where: { affiliateProfileId: profile.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { referredUserId: true, createdAt: true, convertedAt: true },
      }),
    ]);
    affiliateStats = {
      referrals,
      converted,
      commissions: commAll._count,
      earnedCents: commAll._sum.amountCents ?? 0,
      pendingCents: commPending._sum.amountCents ?? 0,
    };
    if (attributions.length > 0) {
      const referredUsers = await db.user.findMany({
        where: { id: { in: attributions.map((a) => a.referredUserId) } },
        select: { id: true, name: true, email: true },
      });
      const byId = new Map(referredUsers.map((u) => [u.id, u]));
      referralsList = attributions.map((a) => ({
        userId: a.referredUserId,
        name: byId.get(a.referredUserId)?.name ?? null,
        email: byId.get(a.referredUserId)?.email ?? null,
        joinedAt: a.createdAt,
        convertedAt: a.convertedAt,
      }));
    }
  }

  const sub = user.subscription;
  const comp = isCompSubscription(sub);
  const isGift = !!sub && sub.stripeSubscriptionId.startsWith("gift_");
  let giftRow: {
    planKey: string; status: string; buyerEmail: string; redeemedAt: Date | null;
    stripeSubscriptionId: string | null;
  } | null = null;
  if (isGift && sub) {
    giftRow = await db.giftSubscription.findUnique({
      where: { id: sub.stripeSubscriptionId.slice("gift_".length) },
      select: { planKey: true, status: true, buyerEmail: true, redeemedAt: true, stripeSubscriptionId: true },
    });
  }
  const priceNames = planNameByPriceId(process.env);
  const planText = !sub
    ? "Free"
    : comp
      ? "Pro (comp grant)"
      : planLabel(priceNames[sub.stripePriceId]);
  const sourceText = !sub
    ? "—"
    : comp
      ? `Comp grant via the site's comp engine (source: ${compSourceOf(sub.stripeSubscriptionId, user.id)}) — not a Stripe subscription`
      : isGift
        ? "Gift subscription (prepaid by a buyer, redeemed onto this account) — the entitlement row is synthetic; the real Stripe subscription is on the gift record"
        : "Stripe subscription (state synced from Stripe by webhook)";

  const subState: AccountSubState = !sub
    ? { kind: "none" }
    : comp
      ? sub.status === "active" && sub.currentPeriodEnd > new Date()
        ? { kind: "comp_active", periodEndLabel: fmtDenverDay(sub.currentPeriodEnd) }
        : { kind: "comp_inactive" }
      : { kind: "stripe", label: `${planText} — a Stripe subscription (status: ${sub.status.replace(/_/g, " ")}).` };

  const discoveryLabel = discoverySourceLabel(user.discoverySource);
  const utmBits = first
    ? [
        first.utmSource ? `source: ${first.utmSource}` : null,
        first.utmMedium ? `medium: ${first.utmMedium}` : null,
        first.utmCampaign ? `campaign: ${first.utmCampaign}` : null,
      ].filter(Boolean)
    : [];

  // 30 Denver days, oldest → newest (dedupe guards the fall-back day).
  const dailyByKey = new Map(dailyRows.map((r) => [r.k, r]));
  const chartDays: { key: string; label: string; views: number; opens: number }[] = [];
  {
    const seen = new Set<string>();
    for (let i = 29; i >= 0; i--) {
      const p = denverPartsOf(new Date(Date.now() - i * DAY_MS));
      const key = `${p.y}-${p.m}-${p.day}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const r = dailyByKey.get(key);
      chartDays.push({
        key,
        label: `${MONTHS_SHORT[Number(p.m) - 1]} ${Number(p.day)}`,
        views: Number(r?.views ?? 0),
        opens: Number(r?.opens ?? 0),
      });
    }
  }
  const chartHasActivity = chartDays.some((d) => d.views > 0 || d.opens > 0);

  // ── Activity timeline ─────────────────────────────────────────────
  // Every event below is a real stored row or timestamp; nothing is
  // inferred. Merged newest-first and capped at 30.
  const timeline: TimelineEvent[] = [];
  timeline.push({ at: user.createdAt, label: "Account created" });
  if (user.emailVerified) timeline.push({ at: user.emailVerified, label: "Email verified" });
  if (first) {
    timeline.push({
      at: first.createdAt,
      label: "First recorded page view",
      detail: first.path + (first.referrer?.trim() ? ` · referrer: ${first.referrer}` : ""),
    });
  }
  if (referredBy) {
    timeline.push({
      at: referredBy.createdAt,
      label: "Joined through an affiliate link",
      detail: `code ${referredBy.affiliate.customCode ?? referredBy.affiliate.referralCode}`,
    });
  }
  if (sub) {
    if (comp) {
      timeline.push({
        at: sub.currentPeriodStart,
        label: `Comp Pro period started (source: ${compSourceOf(sub.stripeSubscriptionId, user.id)})`,
        detail: `free until ${fmtDenverDay(sub.currentPeriodEnd)}`,
      });
    } else if (isGift) {
      timeline.push({
        at: giftRow?.redeemedAt ?? sub.createdAt,
        label: "Gift subscription redeemed onto this account",
        detail: giftRow ? `plan: ${giftRow.planKey}` : undefined,
      });
    } else {
      timeline.push({
        at: sub.currentPeriodStart,
        label: `Current ${planText} period started`,
        detail: `status: ${sub.status.replace(/_/g, " ")}`,
      });
    }
  }
  for (const e of signInEvents) {
    timeline.push({
      at: e.createdAt,
      label: "Signed in",
      detail: e.deviceLabel + (e.approximateLocation ? ` · ${e.approximateLocation}` : ""),
    });
  }
  for (const e of emailHistory) {
    timeline.push({
      at: e.createdAt,
      label: `Email sent — ${e.subject}`,
      detail: `${e.template} · ${e.kind}`,
    });
  }
  for (const d of recentDonations) {
    timeline.push({
      at: d.createdAt,
      label: `Donated ${money(d.amountCents)}`,
      detail: d.frequency === "monthly" ? "monthly donation" : "one-time donation",
    });
  }
  for (const r of referralsList.slice(0, 10)) {
    timeline.push({
      at: r.joinedAt,
      label: "Referred a new signup",
      detail: r.email ?? r.userId,
    });
    if (r.convertedAt) {
      timeline.push({ at: r.convertedAt, label: "A referred user converted", detail: r.email ?? r.userId });
    }
  }
  timeline.sort((a, b) => b.at.getTime() - a.at.getTime());
  const timelineTop = timeline.slice(0, 30);

  const stripeCustomerUrl = sub && !comp && !isGift
    ? `https://dashboard.stripe.com/customers/${sub.stripeCustomerId}`
    : null;
  const stripeSubUrl = sub && !comp && !isGift
    ? `https://dashboard.stripe.com/subscriptions/${sub.stripeSubscriptionId}`
    : giftRow?.stripeSubscriptionId
      ? `https://dashboard.stripe.com/subscriptions/${giftRow.stripeSubscriptionId}`
      : null;

  return (
    <div className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-5">
          <Link href="/admin/accounts" className="text-sm text-cyan-300 hover:underline">← All accounts</Link>
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 mt-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white break-words">{user.name?.trim() || user.email || "Account"}</h1>
              <p className="text-sm text-white/60 font-mono break-all mt-0.5">{user.email ?? "—"}</p>
            </div>
            {user.emailVerified ? (
              <span className="shrink-0 text-[11px] font-bold tracking-wide uppercase rounded-full border border-emerald-400/30 text-emerald-300 px-2.5 py-1">
                Verified
              </span>
            ) : (
              <span className="shrink-0 text-[11px] font-bold tracking-wide uppercase rounded-full border border-amber-400/30 text-amber-300 px-2.5 py-1">
                Unverified
              </span>
            )}
          </div>
          <p className="text-xs text-white/35 mt-2">Account ID <span className="font-mono">{user.id}</span> · Times in Denver time.</p>
        </div>

        <div className="mb-8">
          <AdminNav active="accounts" />
        </div>

        <Card title="Account">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <Row k="Signed up" v={fmtDenver(user.createdAt)} />
            <Row k="Email verified" v={user.emailVerified ? fmtDenver(user.emailVerified) : "Not verified"} />
            <Row k="Marketing email" v={user.emailOptOut ? "Opted out" : "Allowed"} />
            <Row k="Last seen on site" v={lastSeen ? fmtDenver(lastSeen) : "No recorded visits"} />
            <Row
              k="Supporter"
              v={donationAgg._count > 0
                ? `Yes — ${donationAgg._count.toLocaleString("en-US")} donation${donationAgg._count === 1 ? "" : "s"}, ${money(donationAgg._sum.amountCents ?? 0)} total`
                : user.supporter ? "Flagged supporter (no donation rows linked)" : "No"}
            />
          </dl>
        </Card>

        <Card title="How they found us">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <Row
              k="Self-reported (settings)"
              v={discoveryLabel ? (
                <>
                  {discoveryLabel}
                  {user.discoveryDetail ? <span className="text-white/50"> — {user.discoveryDetail}</span> : null}
                </>
              ) : "Not recorded"}
            />
            <Row k="First recorded page view" v={first ? fmtDenver(first.createdAt) : "Not recorded"} />
            <Row k="First page viewed" v={first ? <span className="font-mono text-[13px]">{first.path}</span> : "Not recorded"} />
            <Row
              k="Referrer of first view"
              v={first ? (first.referrer?.trim() ? <span className="font-mono text-[13px]">{first.referrer}</span> : "Direct / none recorded") : "Not recorded"}
            />
          </dl>
          {first && utmBits.length > 0 ? (
            <p className="text-xs text-white/40 mt-3">First-touch UTM — {utmBits.join(" · ")}</p>
          ) : null}
          <p className="text-[11px] text-white/30 mt-3">
            "First recorded" = the earliest page view in any session linked to this account (including the
            same-tab visit they signed up from). If they first visited on another device or browser, it is
            not recorded — nothing here is guessed.
          </p>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <Stat label="Visits (sessions)" value={visits.toLocaleString("en-US")} />
          <Stat label="Page views" value={views.toLocaleString("en-US")} />
          <Stat label="Camera opens" value={opens.toLocaleString("en-US")} />
          <Stat
            label="Sign-ins"
            value={signInCount.toLocaleString("en-US")}
            sub={lastSignIn ? `Last: ${fmtDenver(lastSignIn.createdAt)} · ${lastSignIn.deviceLabel}${lastSignIn.approximateLocation ? ` · ${lastSignIn.approximateLocation}` : ""}` : "No sign-ins recorded"}
          />
          <Stat label="Current plan" value={planText} sub={sub ? `Status: ${sub.status.replace(/_/g, " ")}` : "No subscription record"} />
          <Stat
            label={sub?.status === "trialing" ? "Trial ends" : "Period ends"}
            value={sub ? fmtDenverDay(sub.currentPeriodEnd) : "—"}
            sub={sub?.cancelAtPeriodEnd ? "Cancels at period end" : undefined}
          />
        </div>

        <Card title="Plan & subscription — full record">
          {sub ? (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                <Row k="Plan" v={planText} />
                <Row k="Status" v={sub.status.replace(/_/g, " ")} />
                <Row k="Source" v={sourceText} />
                <Row k="Price ID" v={<span className="font-mono text-[12px]">{sub.stripePriceId}</span>} />
                <Row
                  k="Stripe subscription ID"
                  v={comp || isGift
                    ? <span className="font-mono text-[12px]">{sub.stripeSubscriptionId} <span className="text-white/35">(synthetic — not a Stripe object)</span></span>
                    : <span className="font-mono text-[12px]">{sub.stripeSubscriptionId}</span>}
                />
                <Row
                  k="Stripe customer ID"
                  v={comp || isGift
                    ? <span className="font-mono text-[12px]">{sub.stripeCustomerId} <span className="text-white/35">(synthetic)</span></span>
                    : <span className="font-mono text-[12px]">{sub.stripeCustomerId}</span>}
                />
                <Row k="Period" v={`${fmtDenverDay(sub.currentPeriodStart)} → ${fmtDenverDay(sub.currentPeriodEnd)}`} />
                {sub.status === "trialing" ? (
                  <Row k="Trial ends" v={`${fmtDenverDay(sub.currentPeriodEnd)} (the mirror has no separate trial-end field; a trialing subscription's period end is its trial end)`} />
                ) : null}
                <Row k="Cancels at period end" v={sub.cancelAtPeriodEnd ? "Yes" : "No"} />
                {comp ? (
                  <Row k="Comp ends" v={`${fmtDenverDay(sub.currentPeriodEnd)} (source: ${compSourceOf(sub.stripeSubscriptionId, user.id)})`} />
                ) : null}
                <Row k="Record created" v={fmtDenver(sub.createdAt)} />
                <Row k="Record last synced" v={fmtDenver(sub.updatedAt)} />
                {giftRow ? (
                  <>
                    <Row k="Gift plan key" v={giftRow.planKey} />
                    <Row k="Gift status" v={giftRow.status} />
                    <Row k="Gift buyer" v={giftRow.buyerEmail} />
                    <Row k="Gift redeemed" v={giftRow.redeemedAt ? fmtDenver(giftRow.redeemedAt) : "—"} />
                  </>
                ) : null}
              </dl>
              {(stripeCustomerUrl || stripeSubUrl) ? (
                <div className="flex flex-wrap gap-2 mt-4">
                  {stripeCustomerUrl ? (
                    <a href={stripeCustomerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1.5 rounded-lg border border-white/15 text-xs text-cyan-200 hover:bg-white/5">
                      Open customer in Stripe ↗
                    </a>
                  ) : null}
                  {stripeSubUrl ? (
                    <a href={stripeSubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center px-3 py-1.5 rounded-lg border border-white/15 text-xs text-cyan-200 hover:bg-white/5">
                      Open subscription in Stripe ↗
                    </a>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-white/50">No subscription record — this account is on the free plan and has never had a paid, trial, comp or gift subscription row.</p>
          )}
        </Card>

        <AccountActions
          userId={user.id}
          hasEmail={!!user.email}
          emailOptOut={user.emailOptOut}
          subState={subState}
        />

        <Card title="Engagement — last 30 days">
          {chartHasActivity ? (
            <EngagementChart days={chartDays} />
          ) : (
            <p className="text-sm text-white/50">No recorded page views or camera opens in the last 30 days.</p>
          )}
        </Card>

        <Card title="Recent activity">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <div className="text-xs font-bold text-white/55 mb-2">Latest page views</div>
              {recentViews.length > 0 ? (
                <ul className="space-y-1.5">
                  {recentViews.map((v, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="font-mono text-white/70 break-all">{v.path}</span>
                      <span className="shrink-0 text-white/35 text-xs">{fmtDenver(v.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white/40">No page views recorded.</p>
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-white/55 mb-2">Latest camera opens</div>
              {recentOpens.length > 0 ? (
                <ul className="space-y-1.5">
                  {recentOpens.map((o, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="min-w-0">
                        <span className="text-white/75 break-words">{o.cameraName?.trim() ? o.cameraName : o.cameraId ?? "Camera"}</span>
                        {o.cameraId ? <span className="block font-mono text-[11px] text-white/30 break-all">{o.cameraId}</span> : null}
                      </span>
                      <span className="shrink-0 text-white/35 text-xs">{fmtDenver(o.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white/40">No camera opens recorded. (Camera identity is stamped on opens only since the camera-id instrumentation shipped; older opens have no camera recorded.)</p>
              )}
              <p className="text-[11px] text-white/30 mt-3">Camera names are the labels recorded at the moment of the open.</p>
            </div>
          </div>
        </Card>

        <Card title="Recent sessions">
          {sessionRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-white/35">
                    <th className="py-1 pr-3 font-bold">Session</th>
                    <th className="py-1 pr-3 font-bold">First seen</th>
                    <th className="py-1 pr-3 font-bold">Last seen</th>
                    <th className="py-1 pr-3 font-bold text-right">Views</th>
                    <th className="py-1 pr-3 font-bold text-right">Opens</th>
                    <th className="py-1 font-bold">Device</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionRows.map((s) => (
                    <tr key={s.sessionId} className="border-t border-white/5 text-white/70">
                      <td className="py-1.5 pr-3 font-mono text-[12px]">{s.sessionId.slice(0, 8)}…</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{fmtDenver(s.first_seen)}</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">{fmtDenver(s.last_seen)}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{Number(s.views).toLocaleString("en-US")}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{Number(s.opens).toLocaleString("en-US")}</td>
                      <td className="py-1.5">{s.device ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-white/50">No sessions recorded for this account.</p>
          )}
        </Card>

        <Card title="Top cameras">
          {topCameraRows.length > 0 ? (
            <ol className="space-y-1.5">
              {topCameraRows.map((c, i) => (
                <li key={c.cameraId} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0 text-white/75">
                    <span className="text-white/35 mr-2">{i + 1}.</span>
                    {c.name?.trim() ? c.name : c.cameraId}
                    {c.name?.trim() ? <span className="block font-mono text-[11px] text-white/30 break-all ml-5">{c.cameraId}</span> : null}
                  </span>
                  <span className="shrink-0 text-white/50 tabular-nums">{Number(c.opens).toLocaleString("en-US")} opens</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-white/50">No camera opens with a recorded camera ID yet.</p>
          )}
          <p className="text-[11px] text-white/30 mt-3">Counted over sessions linked to this account; names are the labels recorded when each camera was opened.</p>
        </Card>

        <Card title="Library & recordings">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Saved cameras" value={savedCameraCount.toLocaleString("en-US")} />
            <Stat label="Collections" value={collectionCount.toLocaleString("en-US")} />
            <Stat label="Recordings (clips)" value={recordingCount.toLocaleString("en-US")} />
            <Stat label="Saved views" value={savedViewCount.toLocaleString("en-US")} />
          </div>
        </Card>

        <Card title="Affiliate">
          {profile && affiliateStats ? (
            <>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                <Row k="Referral code" v={<span className="font-mono text-[13px]">{profile.customCode ?? profile.referralCode}</span>} />
                <Row k="Affiliate status" v={profile.status} />
                <Row k="Referrals" v={`${affiliateStats.referrals.toLocaleString("en-US")} joined · ${affiliateStats.converted.toLocaleString("en-US")} converted`} />
                <Row
                  k="Tracked commissions"
                  v={`${affiliateStats.commissions.toLocaleString("en-US")} · ${money(affiliateStats.earnedCents)} total · ${money(affiliateStats.pendingCents)} pending`}
                />
              </dl>
              {referralsList.length > 0 ? (
                <div className="mt-4">
                  <div className="text-xs font-bold text-white/55 mb-2">People they referred (latest {referralsList.length})</div>
                  <ul className="space-y-1.5">
                    {referralsList.map((r) => (
                      <li key={r.userId} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[13px]">
                        <Link href={`/admin/accounts/${r.userId}`} className="text-cyan-200/90 hover:underline break-all">
                          {r.name?.trim() || r.email || r.userId}
                          {r.name?.trim() && r.email ? <span className="text-white/40"> · {r.email}</span> : null}
                        </Link>
                        <span className="shrink-0 text-white/35 text-xs">
                          joined {fmtDenverDay(r.joinedAt)} · {r.convertedAt ? <span className="text-emerald-300/80">converted {fmtDenverDay(r.convertedAt)}</span> : "not converted"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-white/40 mt-3">No referrals yet.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-white/50">Not an affiliate.</p>
          )}
          {referredBy ? (
            <p className="text-sm text-white/60 mt-3">
              Joined through affiliate{" "}
              <span className="font-mono text-[13px] text-cyan-200/80">{referredBy.affiliate.customCode ?? referredBy.affiliate.referralCode}</span>
              {referredBy.affiliate.user.email ? <> ({referredBy.affiliate.user.email})</> : null} on {fmtDenverDay(referredBy.createdAt)}.
            </p>
          ) : (
            <p className="text-sm text-white/40 mt-3">No referring affiliate recorded.</p>
          )}
        </Card>

        <Card title="Email history — what the site has sent them">
          {emailHistory.length > 0 ? (
            <ul className="space-y-2">
              {emailHistory.map((e, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[13px] border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <span className="min-w-0">
                    <span className="text-white/75 break-words">{e.subject}</span>
                    <span className="block text-[11px] text-white/35">
                      <span className="font-mono">{e.template}</span> · {e.kind} · {e.status}
                    </span>
                  </span>
                  <span className="shrink-0 text-white/35 text-xs">{fmtDenver(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/50">No lifecycle or admin emails have been sent to this account.</p>
          )}
        </Card>

        <Card title="Activity timeline">
          <ul className="space-y-0">
            {timelineTop.map((e, i) => (
              <li key={i} className="relative pl-5 pb-3 last:pb-0">
                <span className="absolute left-0 top-[7px] w-2 h-2 rounded-full bg-cyan-400/60" />
                {i < timelineTop.length - 1 ? <span className="absolute left-[3.5px] top-[17px] bottom-0 w-px bg-white/10" /> : null}
                <div className="text-[13px] text-white/80 break-words">{e.label}</div>
                <div className="text-[11px] text-white/35">
                  {fmtDenver(e.at)}{e.detail ? ` · ${e.detail}` : ""}
                </div>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-white/30 mt-3">Newest first, latest {timelineTop.length} events. Every entry is a stored record — sign-ins, emails, donations, referrals and subscription periods as the database holds them.</p>
        </Card>
      </div>
    </div>
  );
}
