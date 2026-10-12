import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { adminEmails } from "@/lib/affiliate/admin";
import { stripe } from "@/lib/stripe";
import directory from "@/data/camera-directory.json";
import NewsletterBroadcast from "./NewsletterBroadcast";
import CompetitorManager from "./CompetitorManager";
import CreatorApplications from "./CreatorApplications";
import LiveRefresh from "./LiveRefresh";
import { growthDashboardUrl } from "@/lib/growth";

export const metadata = { title: "Admin Dashboard" };
export const dynamic = "force-dynamic";

const DAY = 86400_000;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtDur(sec: number | null | undefined): string {
  if (sec == null || !isFinite(sec)) return "—";
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${Math.round(sec % 60)}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
function pct(a: number, b: number): string {
  if (!b) return "—";
  return `${((100 * a) / b).toFixed(1)}%`;
}
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Minimal SVG area chart, server-rendered. */
function Chart({ data, labels, color, height = 140 }: { data: number[]; labels: string[]; color: string; height?: number }) {
  const W = 560, H = height, P = 8;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => {
    const x = P + (i / Math.max(1, data.length - 1)) * (W - 2 * P);
    const y = H - P - (v / max) * (H - 2 * P - 18);
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${(W - P).toFixed(1)},${H - P} L${P},${H - P} Z`;
  const gid = `g${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
      {pts.map(([x, y], i) =>
        i % Math.ceil(data.length / 8) === 0 ? (
          <text key={i} x={x} y={H - 1} fontSize="9" fill="#5b6b85" textAnchor="middle">
            {labels[i]?.slice(5)}
          </text>
        ) : null
      )}
      <text x={W - P} y={14} fontSize="11" fill={color} textAnchor="end" fontWeight="700">
        {fmt(data[data.length - 1] ?? 0)}
      </text>
    </svg>
  );
}

/**
 * Per-visit strip plot, server-rendered: ONE dot per page view across the
 * last 24 clock hours (UTC-aligned). Dots stack vertically inside 10-minute
 * buckets (wrapping into extra columns when a bucket is tall) so overlapping
 * visits stay individually visible — deliberately NOT an aggregated line.
 * Per-hour totals render as small bars underneath, sharing the same x scale.
 */
function VisitStrip({ visits, startMs }: { visits: { t: number; path: string }[]; startMs: number }) {
  const W = 1120, PADX = 8;
  const SPAN = 24 * 3600_000, HOUR = 3600_000;
  const BUCKETS = 144; // 10-minute buckets across 24h
  const DOT_R = 2.6, PITCH = 6.4, ROW_CAP = 36;
  const buckets: { t: number; path: string }[][] = Array.from({ length: BUCKETS }, () => []);
  for (const v of visits) {
    const i = Math.floor(((v.t - startMs) / SPAN) * BUCKETS);
    if (i >= 0 && i < BUCKETS) buckets[i].push(v);
  }
  const maxStack = Math.max(1, ...buckets.map((b) => b.length));
  const rows = Math.min(maxStack, ROW_CAP);
  const dotAreaH = rows * PITCH + 10;
  const LABEL_H = 16, BAR_MAX = 38, BAR_GAP = 6;
  const H = dotAreaH + LABEL_H + BAR_GAP + BAR_MAX + 4;
  const innerW = W - 2 * PADX;
  const bucketW = innerW / BUCKETS;
  const hourW = innerW / 24;
  const barTop = dotAreaH + LABEL_H + BAR_GAP;
  const hours = Array.from({ length: 24 }, (_, h) =>
    buckets.slice(h * 6, h * 6 + 6).reduce((s, b) => s + b.length, 0)
  );
  const maxHour = Math.max(1, ...hours);
  const hh = (t: number) => `${String(new Date(t).getUTCHours()).padStart(2, "0")}:00`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Hour gridlines + labels (UTC) */}
      {Array.from({ length: 25 }, (_, h) => {
        const x = PADX + h * hourW;
        return (
          <g key={`grid-${h}`}>
            <line x1={x} y1={4} x2={x} y2={dotAreaH} stroke="#ffffff" strokeOpacity="0.05" />
            {h < 24 && h % 2 === 0 && (
              <text x={x + 3} y={dotAreaH + 12} fontSize="9" fill="#5b6b85">{hh(startMs + h * HOUR)}</text>
            )}
          </g>
        );
      })}
      {/* One dot per visit */}
      {buckets.map((b, bi) => {
        const cols = Math.max(1, Math.ceil(b.length / rows));
        return b.map((v, k) => {
          const row = k % rows;
          const col = Math.floor(k / rows);
          const cx = PADX + bi * bucketW + ((col + 0.5) / cols) * bucketW;
          const cy = dotAreaH - 4 - row * PITCH - DOT_R;
          return (
            <circle key={`${bi}-${k}`} cx={cx} cy={cy} r={DOT_R} fill="#37e08b" fillOpacity="0.85">
              <title>{`${new Date(v.t).toISOString().slice(11, 19)} UTC · ${v.path}`}</title>
            </circle>
          );
        });
      })}
      {visits.length === 0 && (
        <text x={W / 2} y={dotAreaH / 2 + 3} fontSize="11" fill="#5b6b85" textAnchor="middle">
          No visits in the last 24 hours
        </text>
      )}
      {/* Per-hour totals */}
      {hours.map((c, h) => {
        const bh = (c / maxHour) * BAR_MAX;
        const bw = hourW * 0.6;
        const x = PADX + h * hourW + (hourW - bw) / 2;
        return (
          <g key={`bar-${h}`}>
            <rect x={x} y={barTop + (BAR_MAX - bh)} width={bw} height={bh} rx="2" fill="#37e08b" fillOpacity="0.28">
              <title>{`${hh(startMs + h * HOUR)} UTC · ${c} visits`}</title>
            </rect>
            {c > 0 && (
              <text x={x + bw / 2} y={barTop + (BAR_MAX - bh) - 3} fontSize="9" fill="#5b6b85" textAnchor="middle">
                {c}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Card({ label, value, sub, accent = "#38bdf8" }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase">{label}</div>
      <div className="mt-2 text-3xl font-extrabold text-white" style={{ textShadow: `0 0 24px ${accent}44` }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-white/45">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <div className="text-[11px] font-bold tracking-[0.22em] text-white/40 uppercase mb-4">{title}</div>
      {children}
    </div>
  );
}

const PLAN_NAMES: Record<string, string> = {
  [process.env.STRIPE_WEEKLY_PRICE_ID ?? ""]: "Weekly",
  [process.env.STRIPE_MONTHLY_PRICE_ID ?? ""]: "Monthly",
  [process.env.STRIPE_ANNUAL_PRICE_ID ?? ""]: "Annual",
  [process.env.STRIPE_ENTERPRISE_PRICE_ID ?? ""]: "Enterprise",
};
// Monthly-revenue equivalent per plan, in cents. Weekly $3.99 → $17.29/mo,
// Monthly $9.99, Annual $59.99/yr → $5.00/mo, Enterprise $999/yr → $83.25/mo.
const PLAN_MRR_CENTS: Record<string, number> = {
  Weekly: 1729, Monthly: 999, Annual: 500, Enterprise: 8325,
};

/**
 * Revenue from Stripe invoices. Paginates through ALL invoices in the window —
 * the old version only read the first 100, silently undercounting at scale.
 */
async function stripeRevenue() {
  try {
    const s = stripe();
    const since = Math.floor((Date.now() - 30 * DAY) / 1000);
    const since7 = Math.floor((Date.now() - 7 * DAY) / 1000);
    let total30 = 0, total7 = 0, pages = 0;
    let refunded30 = 0, refundCount30 = 0;
    const byDay: Record<string, number> = {};
    const byPlan: Record<string, number> = {};
    let startingAfter: string | undefined;
    for (;;) {
      const page = await s.invoices.list({ created: { gte: since }, limit: 100, starting_after: startingAfter });
      pages++;
      for (const inv of page.data) {
        if (inv.status === "paid" && inv.amount_paid > 0) {
          total30 += inv.amount_paid;
          if (inv.created >= since7) total7 += inv.amount_paid;
          const k = dayKey(new Date(inv.created * 1000));
          byDay[k] = (byDay[k] ?? 0) + inv.amount_paid;
          for (const line of inv.lines?.data ?? []) {
            // Stripe v18: price ID lives under pricing.price_details.price
            const pid = line.pricing?.price_details?.price;
            const pname = (pid && PLAN_NAMES[pid]) || "Other";
            byPlan[pname] = (byPlan[pname] ?? 0) + (line.amount ?? 0);
          }
        }
      }
      if (!page.has_more) break;
      startingAfter = page.data[page.data.length - 1]?.id;
      if (!startingAfter || pages > 50) break; // sanity cap: 5,000 invoices
    }
    // Refunds live on the Refunds API, not on Invoice in v18.
    try {
      const refunds = await s.refunds.list({ created: { gte: since }, limit: 100 });
      for (const r of refunds.data) {
        if (r.status === "succeeded") {
          refunded30 += r.amount ?? 0;
          refundCount30++;
        }
      }
    } catch { /* refunds unavailable — leave at 0 */ }
    return { total30, total7, byDay, byPlan, refunded30, refundCount30, ok: true as const };
  } catch {
    return { total30: 0, total7: 0, byDay: {} as Record<string, number>, byPlan: {} as Record<string, number>, refunded30: 0, refundCount30: 0, ok: false as const };
  }
}

type SessionAgg = { sessions: bigint; bounces: bigint; avg_secs: number | null; avg_views: number | null };

export default async function AdminDashboardPage() {
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
            Add it to the <span className="font-mono text-cyan-300">ADMIN_EMAILS</span> environment variable
            in Vercel (comma-separated) and redeploy.
          </p>
          <Link href="/" className="inline-block mt-6 text-sm text-cyan-300 hover:underline">← Back to site</Link>
        </div>
      </div>
    );
  }

  const now = Date.now();
  const d1 = new Date(now - 1 * DAY), d7 = new Date(now - 7 * DAY), d30 = new Date(now - 30 * DAY);
  const d60 = new Date(now - 60 * DAY);
  const d3future = new Date(now + 3 * DAY);

  type SignupSource = { ref: string; c: bigint };
  const [
    totalUsers, users7d, users30d, unverifiedPwUsers, passwordUsers, oauthProviders,
    subs, subStatus, newSubs7d, newSubs30d, canceled30d, trialsEndingSoon, recentSubs,
    trialCohortTotal, trialCohortPaying, pastDueSubs,
    pv24h, pv7d, pv30d, pvTotal,
    uniq24h, uniq30d, sessionAgg,
    topPages, topReferrersRaw, recentUsers, signupSourcesRaw, globeReachedRaw,
    dailySignupsRaw, dailyPvRaw,
    nlTotal, nlVerified, nl7d, nl30d,
    checkoutStatus, checkoutByPlan,
    competitorCount, affiliateCount, pendingCommissions,
    rev,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: d7 } } }),
    db.user.count({ where: { createdAt: { gte: d30 } } }),
    // Email+password accounts that never verified — actionable: resend or prune.
    db.user.count({ where: { emailVerified: null, passwordHash: { not: null } } }),
    db.user.count({ where: { passwordHash: { not: null } } }),
    db.account.groupBy({ by: ["provider"], _count: true }),
    db.subscription.findMany({ select: { status: true, stripePriceId: true } }),
    db.subscription.groupBy({ by: ["status"], _count: true }),
    db.subscription.count({ where: { createdAt: { gte: d7 } } }),
    db.subscription.count({ where: { createdAt: { gte: d30 } } }),
    db.subscription.count({ where: { status: "canceled", updatedAt: { gte: d30 } } }),
    db.subscription.count({ where: { status: "trialing", currentPeriodEnd: { lt: d3future } } }),
    db.subscription.findMany({
      orderBy: { createdAt: "desc" }, take: 8,
      select: { status: true, stripePriceId: true, createdAt: true, user: { select: { email: true } } },
    }),
    // Trial cohort: subscriptions old enough that all trials (1-3d) have resolved.
    // "Paying now" among them = trial/new-sub conversion.
    db.subscription.count({ where: { createdAt: { gte: d60, lt: d7 } } }),
    db.subscription.count({ where: { createdAt: { gte: d60, lt: d7 }, status: "active" } }),
    db.subscription.findMany({
      where: { status: "past_due" }, orderBy: { currentPeriodEnd: "asc" }, take: 10,
      select: { stripePriceId: true, currentPeriodEnd: true, user: { select: { email: true } } },
    }),
    db.pageView.count({ where: { createdAt: { gte: d1 }, event: null } }),
    db.pageView.count({ where: { createdAt: { gte: d7 }, event: null } }),
    db.pageView.count({ where: { createdAt: { gte: d30 }, event: null } }),
    db.pageView.count({ where: { event: null } }),
    // COUNT(DISTINCT) — exact, and far cheaper than groupBy+length at scale.
    db.$queryRaw<{ c: bigint }[]>`SELECT COUNT(DISTINCT "sessionId") AS c FROM "PageView" WHERE "createdAt" >= ${d1}`.then((r) => Number(r[0]?.c ?? 0)),
    db.$queryRaw<{ c: bigint }[]>`SELECT COUNT(DISTINCT "sessionId") AS c FROM "PageView" WHERE "createdAt" >= ${d30}`.then((r) => Number(r[0]?.c ?? 0)),
    db.$queryRaw<SessionAgg[]>`SELECT COUNT(*) AS sessions,
        SUM(CASE WHEN views = 1 THEN 1 ELSE 0 END) AS bounces,
        AVG(secs) AS avg_secs, AVG(views) AS avg_views
      FROM (SELECT "sessionId", COUNT(*) AS views, COALESCE(SUM("durationSec"), 0) AS secs
        FROM "PageView" WHERE "createdAt" >= ${d7} GROUP BY "sessionId") s`.then((r) => r[0]),
    db.pageView.groupBy({ by: ["path"], where: { createdAt: { gte: d30 } }, _count: true, orderBy: { _count: { path: "desc" } }, take: 10 }),
    db.pageView.groupBy({ by: ["referrer"], where: { createdAt: { gte: d30 }, referrer: { not: null } }, _count: true, orderBy: { _count: { referrer: "desc" } }, take: 40 }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { email: true, name: true, createdAt: true, emailVerified: true } }),
    // Signup attribution: for each user created in 30d, take their earliest
    // pageview session, then that session's earliest referrer. sessionStorage
    // persists through the signup flow in the same tab, so same-tab signups
    // attribute correctly. Best-effort — cross-device returns are "direct".
    db.$queryRaw<SignupSource[]>`
      SELECT r.referrer AS ref, COUNT(DISTINCT s."userId") AS c
      FROM (
        SELECT DISTINCT ON (pv."userId") pv."userId", pv."sessionId"
        FROM "PageView" pv
        WHERE pv."userId" IN (SELECT u.id FROM "User" u WHERE u."createdAt" >= ${d30})
        ORDER BY pv."userId", pv."createdAt" ASC
      ) s
      JOIN LATERAL (
        SELECT pv2.referrer FROM "PageView" pv2
        WHERE pv2."sessionId" = s."sessionId" AND pv2.referrer IS NOT NULL
        ORDER BY pv2."createdAt" ASC LIMIT 1
      ) r ON true
      GROUP BY r.referrer ORDER BY c DESC LIMIT 20`,
    db.$queryRaw<SignupSource[]>`
      SELECT r.referrer AS ref, COUNT(DISTINCT g."sessionId") AS c
      FROM (
        SELECT DISTINCT "sessionId" FROM "PageView"
        WHERE event = 'globe_reached' AND "createdAt" >= ${d30}
      ) g
      JOIN LATERAL (
        SELECT pv2.referrer FROM "PageView" pv2
        WHERE pv2."sessionId" = g."sessionId" AND pv2.referrer IS NOT NULL
        ORDER BY pv2."createdAt" ASC LIMIT 1
      ) r ON true
      GROUP BY r.referrer ORDER BY c DESC LIMIT 20`,
    db.$queryRaw<{ d: string; c: bigint }[]>`SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') AS d, COUNT(*) AS c FROM "User" WHERE "createdAt" >= ${d30} GROUP BY d ORDER BY d`,
    db.$queryRaw<{ d: string; c: bigint }[]>`SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') AS d, COUNT(*) AS c FROM "PageView" WHERE "createdAt" >= ${d30} GROUP BY d ORDER BY d`,
    db.newsletterSubscriber.count(),
    db.newsletterSubscriber.count({ where: { verified: true } }),
    db.newsletterSubscriber.count({ where: { createdAt: { gte: d7 } } }),
    db.newsletterSubscriber.count({ where: { createdAt: { gte: d30 } } }),
    db.checkoutAttempt.groupBy({ by: ["status"], where: { createdAt: { gte: d7 } }, _count: true }),
    db.checkoutAttempt.groupBy({ by: ["plan"], where: { createdAt: { gte: d30 } }, _count: true }),
    db.competitor.count(),
    db.affiliateProfile.count(),
    db.commission.aggregate({ _sum: { amountCents: true }, where: { status: "pending" } }),
    stripeRevenue(),
  ]);

  // Creator free-Pro review queue (pending only; actions live in the
  // CreatorApplications client component → /api/admin/creators/[id]).
  const pendingCreatorApps = await db.creatorApplication.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: 50,
    include: { user: { select: { email: true } } },
  });

  // --- Live traffic ---
  // "Live" = distinct sessions with a real page view recently. Interaction
  // events (camera_open, globe_reached, …) are PageView rows WITH event set —
  // they are excluded everywhere here so counts are visits, not interactions.
  const d5min = new Date(now - 5 * 60_000), d30min = new Date(now - 30 * 60_000);
  const [liveNow5, liveNow30] = await Promise.all([
    db.$queryRaw<{ c: bigint }[]>`SELECT COUNT(DISTINCT "sessionId") AS c FROM "PageView" WHERE event IS NULL AND "createdAt" >= ${d5min}`.then((r) => Number(r[0]?.c ?? 0)),
    db.$queryRaw<{ c: bigint }[]>`SELECT COUNT(DISTINCT "sessionId") AS c FROM "PageView" WHERE event IS NULL AND "createdAt" >= ${d30min}`.then((r) => Number(r[0]?.c ?? 0)),
  ]);
  // Per-visit graph: individual page-view rows for the last 24 clock hours
  // (window aligned to UTC hour boundaries so the hour bars/labels are exact).
  // Capped at the 2,000 most recent visits so a traffic spike can't bloat the
  // page; the cap is surfaced in the UI when hit.
  const HOUR_MS = 3600_000;
  const plotEnd = Math.floor(now / HOUR_MS) * HOUR_MS + HOUR_MS;
  const plotStart = plotEnd - 24 * HOUR_MS;
  const visitRows = await db.pageView.findMany({
    where: { createdAt: { gte: new Date(plotStart), lt: new Date(plotEnd) }, event: null },
    orderBy: { createdAt: "desc" },
    take: 2000,
    select: { createdAt: true, path: true },
  });
  const visits = visitRows.reverse().map((v) => ({ t: v.createdAt.getTime(), path: v.path }));
  const visitsCapped = visitRows.length >= 2000;

  // 30-day label axis
  const labels: string[] = [];
  for (let i = 29; i >= 0; i--) labels.push(dayKey(new Date(now - i * DAY)));
  const suMap = new Map(dailySignupsRaw.map((r) => [r.d, Number(r.c)]));
  const pvMap = new Map(dailyPvRaw.map((r) => [r.d, Number(r.c)]));
  const signupsSeries = labels.map((l) => suMap.get(l) ?? 0);
  const pvSeries = labels.map((l) => pvMap.get(l) ?? 0);
  const revSeries = labels.map((l) => Math.round((rev.byDay[l] ?? 0) / 100));

  // --- Subscriptions ---
  const payingSubs = subs.filter((s) => s.status === "active");
  const trialingSubs = subs.filter((s) => s.status === "trialing");
  // Standard MRR: paying subscribers only (trials excluded), monthly equivalent.
  const mrr = payingSubs.reduce((sum, s) => sum + (PLAN_MRR_CENTS[PLAN_NAMES[s.stripePriceId] ?? ""] ?? 0), 0);
  const trialMrrPotential = trialingSubs.reduce((sum, s) => sum + (PLAN_MRR_CENTS[PLAN_NAMES[s.stripePriceId] ?? ""] ?? 0), 0);
  const planCounts: Record<string, number> = {};
  for (const s of payingSubs) {
    const p = PLAN_NAMES[s.stripePriceId] ?? "Other";
    planCounts[p] = (planCounts[p] ?? 0) + 1;
  }
  const statusMap = new Map(subStatus.map((r) => [r.status, r._count]));

  // --- Sessions / engagement ---
  const sessN = Number(sessionAgg?.sessions ?? 0);
  const bounces = Number(sessionAgg?.bounces ?? 0);
  const bounceRate = sessN ? (100 * bounces) / sessN : 0;
  const avgSessSecs = sessionAgg?.avg_secs ?? null;
  const avgPagesPerSess = sessionAgg?.avg_views ?? null;

  // --- Referrers: normalize to hostname, drop self/empty ---
  const refMap = new Map<string, number>();
  for (const r of topReferrersRaw) {
    if (!r.referrer) continue;
    let host = r.referrer;
    try { host = new URL(r.referrer).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
    if (!host || host.includes("worldeye.app")) continue;
    refMap.set(host, (refMap.get(host) ?? 0) + r._count);
  }
  const topReferrers = [...refMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  // --- Signup sources: normalize attributed referrers, join visitor counts ---
  const signupSrcMap = new Map<string, number>();
  for (const r of signupSourcesRaw) {
    if (!r.ref) continue;
    let host = r.ref;
    try { host = new URL(r.ref).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
    if (!host || host.includes("worldeye.app")) continue;
    signupSrcMap.set(host, (signupSrcMap.get(host) ?? 0) + Number(r.c));
  }
  // --- Globe reached: sessions that scrolled past the hero to the globe ---
  const globeMap = new Map<string, number>();
  for (const r of globeReachedRaw) {
    if (!r.ref) continue;
    let host = r.ref;
    try { host = new URL(r.ref).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
    if (!host || host.includes("worldeye.app")) continue;
    globeMap.set(host, (globeMap.get(host) ?? 0) + Number(r.c));
  }
  const attributedSignups = [...signupSrcMap.values()].reduce((a, b) => a + b, 0);
  const directSignups = Math.max(0, users30d - attributedSignups);
  const signupSources = [...signupSrcMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([host, signups]) => ({
      host,
      signups,
      // Directional: attributed signups ÷ pageviews carrying that referrer.
      conv: refMap.get(host) ? pct(signups, refMap.get(host)!) : "—",
    }));

  // --- Subscription economics ---
  const trialConv = pct(trialCohortPaying, trialCohortTotal);
  const churn30d = pct(canceled30d, payingSubs.length + canceled30d);
  const arpu30d = payingSubs.length ? rev.total30 / payingSubs.length : 0; // cents

  // --- Checkout funnel (7d) ---
  const coMap = new Map(checkoutStatus.map((r) => [r.status, r._count]));
  const coStarted = coMap.get("started") ?? 0;
  const coCompleted = coMap.get("completed") ?? 0;
  const coReminded = coMap.get("reminded") ?? 0;
  const coExpired = coMap.get("expired") ?? 0;

  // --- Signup methods ---
  const oauthTotal = oauthProviders.reduce((n, r) => n + r._count, 0);
  const googleUsers = oauthProviders.find((r) => r.provider === "google")?._count ?? 0;

  const generatedAt = new Date(now).toLocaleString("en-US", { timeZone: "America/Denver", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const funnel = [
    { label: "Unique visitors", value: uniq30d, color: "#38bdf8" },
    { label: "Signups", value: users30d, color: "#37e08b", rate: pct(users30d, uniq30d) },
    { label: "Trials started", value: newSubs30d, color: "#f7b80c", rate: pct(newSubs30d, users30d) },
    { label: "Paying now", value: payingSubs.length, color: "#c084fc", rate: pct(payingSubs.length, Math.max(1, newSubs30d)) },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #0a1a33 0%, #050810 55%, #03040a 100%)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase">WorldEye Ops</div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-xs text-white/40 mt-1">Signed in as {email} · Data as of {generatedAt} MDT</p>
          </div>
          <div className="flex gap-3 text-sm">
            {growthDashboardUrl() ? (
              <a href={growthDashboardUrl()!} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg border border-cyan-400/30 text-cyan-300 hover:text-cyan-100">Growth Engine ↗</a>
            ) : null}
            <Link href="/admin/affiliates" className="px-4 py-2 rounded-lg border border-white/15 text-white/70 hover:text-white">Affiliates</Link>
            <Link href="/" className="px-4 py-2 rounded-lg border border-white/15 text-white/70 hover:text-white">← Site</Link>
          </div>
        </div>

        {/* Live traffic */}
        <Section title="Live traffic">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.05] p-5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                </span>
                <div className="text-[11px] font-bold tracking-[0.18em] text-emerald-100/70 uppercase">Live now</div>
              </div>
              <div className="mt-2 text-3xl font-extrabold text-white" style={{ textShadow: "0 0 24px #34d39944" }}>
                {fmt(liveNow5)}
              </div>
              <div className="mt-1 text-xs text-white/45">sessions active in the last 5 minutes</div>
              <LiveRefresh />
            </div>
            <Card label="Active · 30 min" value={fmt(liveNow30)} sub="Distinct sessions, last 30 minutes" accent="#37e08b" />
            <Card label="Page views · 24h" value={fmt(pv24h)} sub="Rolling 24 hours" accent="#37e08b" />
            <Card label="Unique visitors · 24h" value={fmt(uniq24h)} sub="Distinct sessions, rolling 24h" accent="#37e08b" />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-baseline justify-between mb-3">
              <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase">Every visit · last 24 hours</div>
              <div className="text-xs text-white/40">{fmt(visits.length)} visits · one dot each · times in UTC</div>
            </div>
            <VisitStrip visits={visits} startMs={plotStart} />
            <p className="text-[11px] text-white/30 mt-3">
              One dot per page view, stacked inside 10-minute buckets so overlapping visits stay individually visible;
              bars total each hour. Hover a dot for its exact time and page. Page views only — interaction events
              (camera opens, globe reaches) are excluded.{visitsCapped ? " Showing the most recent 2,000 visits." : ""}
            </p>
          </div>
        </Section>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card label="Total users" value={fmt(totalUsers)} sub={`+${fmt(users7d)} / 7d · +${fmt(users30d)} / 30d${unverifiedPwUsers ? ` · ${fmt(unverifiedPwUsers)} unverified` : ""}`} />
          <Card label="Paying subscribers" value={fmt(payingSubs.length)} sub={Object.entries(planCounts).map(([p, c]) => `${p}: ${c}`).join(" · ") || "No paying subs yet"} accent="#f7b80c" />
          <Card label="MRR (est.)" value={money(mrr)} sub={`Paying subs only · ${trialingSubs.length ? money(trialMrrPotential) + " in trials" : "no trials"}`} accent="#f7b80c" />
          <Card label="Trials active" value={fmt(trialingSubs.length)} sub={`${fmt(trialsEndingSoon)} end within 3 days · ${fmt(statusMap.get("past_due") ?? 0)} past due`} />
          <Card label="Revenue · 30d" value={rev.ok ? money(rev.total30) : "—"} sub={rev.ok ? `${money(rev.total7)} in last 7d · paid invoices` : "Stripe key missing"} accent="#37e08b" />
          <Card label="Unique visitors · 30d" value={fmt(uniq30d)} sub={`${fmt(uniq24h)} in last 24h`} accent="#37e08b" />
          <Card label="Avg. session" value={fmtDur(avgSessSecs)} sub={`${bounceRate.toFixed(0)}% bounce · ${avgPagesPerSess ? avgPagesPerSess.toFixed(1) : "—"} pages/session · 7d`} accent="#c084fc" />
          <Card label="Newsletter" value={fmt(nlTotal)} sub={`${fmt(nlVerified)} verified (${pct(nlVerified, nlTotal)}) · +${fmt(nl30d)} / 30d`} accent="#38bdf8" />
        </div>

        {/* Conversion funnel */}
        <Section title="Conversion funnel · last 30 days">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {funnel.map((s, i) => (
                <div key={s.label} className="relative rounded-xl border border-white/10 bg-black/30 p-4 text-center">
                  {i > 0 && (
                    <div className="hidden md:block absolute -left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/40 bg-[#0a1220] border border-white/10 rounded-full px-2 py-0.5 z-10">
                      {s.rate}
                    </div>
                  )}
                  <div className="text-2xl font-extrabold text-white" style={{ textShadow: `0 0 18px ${s.color}55` }}>{fmt(s.value)}</div>
                  <div className="text-[11px] text-white/45 mt-1 uppercase tracking-wider">{s.label}</div>
                  {i > 0 && <div className="md:hidden text-[11px] text-white/40 mt-1">→ {s.rate} convert</div>}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-white/30 mt-3">
              Signup rate = signups ÷ visitors. Trial rate = trials ÷ signups. "Paying now" is the current active count (not a cohort conversion).
            </p>
          </div>
        </Section>

        {/* Acquisition */}
        <Section title="Acquisition · last 30 days">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">Where signups came from</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-white/35">
                  <th className="pb-2 pr-3 font-semibold">Source</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Signups</th>
                  <th className="pb-2 font-semibold text-right">Share</th>
                  <th className="pb-2 font-semibold text-right hidden sm:table-cell">Est. conv.</th>
                </tr>
              </thead>
              <tbody>
                {signupSources.map((s) => (
                  <tr key={s.host} className="border-t border-white/5">
                    <td className="py-2 pr-3 font-mono text-cyan-200/80 truncate max-w-[220px]">{s.host}</td>
                    <td className="py-2 pr-3 text-right text-white/70 tabular-nums">{fmt(s.signups)}</td>
                    <td className="py-2 pr-3 text-right text-white/50 tabular-nums">{pct(s.signups, Math.max(1, attributedSignups))}</td>
                    <td className="py-2 text-right text-white/50 tabular-nums hidden sm:table-cell">{s.conv}</td>
                  </tr>
                ))}
                {directSignups > 0 && (
                  <tr className="border-t border-white/5">
                    <td className="py-2 pr-3 font-mono text-white/50">direct / unattributed</td>
                    <td className="py-2 pr-3 text-right text-white/70 tabular-nums">{fmt(directSignups)}</td>
                    <td className="py-2 pr-3 text-right text-white/50 tabular-nums">{pct(directSignups, Math.max(1, users30d))}</td>
                    <td className="py-2 text-right text-white/30 hidden sm:table-cell">—</td>
                  </tr>
                )}
                {signupSources.length === 0 && directSignups === 0 && (
                  <tr><td className="py-4 text-white/35 text-sm" colSpan={4}>No signups in the last 30 days.</td></tr>
                )}
              </tbody>
            </table>
            <p className="text-[11px] text-white/30 mt-3">
              Attributed via the signup session's landing referrer (same-tab signups). "Est. conv." = attributed signups ÷ pageviews from that referrer — directional, not exact.
            </p>
            {[...globeMap.entries()].length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-2">Reached the globe</div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  {[...globeMap.entries()].sort((a, b) => b[1] - a[1]).map(([host, c]) => (
                    <span key={host} className="text-white/60">
                      <span className="font-mono text-cyan-200/80">{host}</span>
                      {" "}<span className="text-white/85 font-semibold tabular-nums">{fmt(c)}</span>
                      <span className="text-white/35 text-xs"> sessions scrolled past the hero</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Charts */}
        <Section title="Trends · 30 days">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">Signups</div>
              <Chart data={signupsSeries} labels={labels} color="#38bdf8" />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">Page views</div>
              <Chart data={pvSeries} labels={labels} color="#37e08b" />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">Revenue ($)</div>
              <Chart data={revSeries} labels={labels} color="#f7b80c" />
            </div>
          </div>
        </Section>

        {/* Subscription health */}
        <Section title="Subscription health">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">By status</div>
              <table className="w-full text-sm">
                <tbody>
                  {[...statusMap.entries()].sort((a, b) => b[1] - a[1]).map(([st, c]) => (
                    <tr key={st} className="border-t border-white/5">
                      <td className="py-2 pr-3 text-white/75 font-mono">{st}</td>
                      <td className="py-2 text-right text-white/70 tabular-nums">{fmt(c)}</td>
                    </tr>
                  ))}
                  {statusMap.size === 0 && <tr><td className="py-4 text-white/35 text-sm">No subscriptions yet.</td></tr>}
                </tbody>
              </table>
              <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/45 space-y-1">
                <div>New subscriptions: <span className="text-white/80 font-semibold">+{fmt(newSubs7d)}</span> / 7d · <span className="text-white/80 font-semibold">+{fmt(newSubs30d)}</span> / 30d</div>
                <div>
                  Trial cohort conversion: <span className="text-white/80 font-semibold">{trialConv}</span>
                  <span className="text-white/35"> ({fmt(trialCohortPaying)} of {fmt(trialCohortTotal)} subs created 8–60d ago are paying now)</span>
                </div>
                <div>
                  Churn (30d): <span className="text-white/80 font-semibold">{churn30d}</span>
                  <span className="text-white/35"> ({fmt(canceled30d)} canceled ÷ {fmt(payingSubs.length + canceled30d)} paying base)</span>
                </div>
                <div>
                  ARPU (30d): <span className="text-white/80 font-semibold">{rev.ok ? money(Math.round(arpu30d)) : "—"}</span>
                  <span className="text-white/35"> revenue per paying subscriber</span>
                </div>
                {rev.ok && rev.refundCount30 > 0 && (
                  <div>Refunds (30d): <span className="text-white/80 font-semibold">{money(rev.refunded30)}</span>
                  <span className="text-white/35"> across {fmt(rev.refundCount30)} refund{rev.refundCount30 === 1 ? "" : "s"}</span></div>
                )}
                {rev.ok && Object.keys(rev.byPlan).length > 0 && (
                  <div className="pt-1">Revenue by plan (30d):{" "}
                    {Object.entries(rev.byPlan).sort((a, b) => b[1] - a[1]).map(([p, c]) => (
                      <span key={p} className="text-white/80 font-semibold">{p} {money(c)}</span>
                    )).reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, " · ", el] : [el]), [])}
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">Recent subscriptions</div>
              <table className="w-full text-sm">
                <tbody>
                  {recentSubs.map((s) => (
                    <tr key={`${s.user.email}-${s.createdAt.toISOString()}`} className="border-t border-white/5">
                      <td className="py-2 pr-3 text-white/80 truncate max-w-[190px]">{s.user.email ?? "—"}</td>
                      <td className="py-2 pr-3 text-white/50 text-xs whitespace-nowrap">{PLAN_NAMES[s.stripePriceId] ?? "Other"}</td>
                      <td className="py-2 pr-3 text-xs font-mono whitespace-nowrap">
                        <span className={s.status === "active" ? "text-emerald-300" : s.status === "trialing" ? "text-amber-300" : "text-white/40"}>{s.status}</span>
                      </td>
                      <td className="py-2 text-right text-white/40 text-xs whitespace-nowrap">
                        {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  ))}
                  {recentSubs.length === 0 && <tr><td className="py-4 text-white/35 text-sm">No subscriptions yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
          {pastDueSubs.length > 0 && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.03] p-5 mt-4">
              <div className="text-[11px] font-bold tracking-[0.18em] text-amber-300/80 uppercase mb-3">
                Past due — needs attention ({pastDueSubs.length})
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {pastDueSubs.map((s) => (
                    <tr key={s.user.email} className="border-t border-white/5">
                      <td className="py-2 pr-3 text-white/80 truncate max-w-[220px]">{s.user.email ?? "—"}</td>
                      <td className="py-2 pr-3 text-white/50 text-xs whitespace-nowrap">{PLAN_NAMES[s.stripePriceId] ?? "Other"}</td>
                      <td className="py-2 text-right text-white/40 text-xs whitespace-nowrap">
                        period ends {new Date(s.currentPeriodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[11px] text-white/35 mt-3">Stripe retries these automatically; reach out personally if a high-value plan sits here more than a few days.</p>
            </div>
          )}
        </Section>

        {/* Checkout funnel */}
        <Section title="Checkout funnel · last 7 days">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              {[
                { l: "Checkouts started", v: coStarted, c: "#38bdf8" },
                { l: "Completed", v: coCompleted, c: "#37e08b" },
                { l: "Reminded", v: coReminded, c: "#f7b80c" },
                { l: "Expired", v: coExpired, c: "#f87171" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <div className="text-2xl font-extrabold text-white" style={{ textShadow: `0 0 18px ${s.c}55` }}>{fmt(s.v)}</div>
                  <div className="text-[11px] text-white/45 mt-1 uppercase tracking-wider">{s.l}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-white/45 mt-3">
              Checkout conversion: <span className="text-white/85 font-bold">{pct(coCompleted, coStarted)}</span>
              {" "}({fmt(coCompleted)} of {fmt(coStarted)} started)
              {checkoutByPlan.length > 0 && (
                <> · Attempts by plan: {checkoutByPlan.map((r) => `${r.plan ?? "unknown"}: ${fmt(r._count)}`).join(" · ")}</>
              )}
            </p>
          </div>
        </Section>

        {/* Traffic */}
        <Section title="Traffic · 30 days">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">Top referrers</div>
              <table className="w-full text-sm">
                <tbody>
                  {topReferrers.map(([host, c]) => (
                    <tr key={host} className="border-t border-white/5">
                      <td className="py-2 pr-3 font-mono text-cyan-200/80 truncate max-w-[280px]">{host}</td>
                      <td className="py-2 text-right text-white/70 tabular-nums">{fmt(c)}</td>
                    </tr>
                  ))}
                  {topReferrers.length === 0 && <tr><td className="py-4 text-white/35 text-sm">No external referrers recorded yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">Top pages</div>
              <table className="w-full text-sm">
                <tbody>
                  {topPages.map((r) => (
                    <tr key={r.path} className="border-t border-white/5">
                      <td className="py-2 pr-3 font-mono text-cyan-200/80 truncate max-w-[280px]">{r.path}</td>
                      <td className="py-2 text-right text-white/70 tabular-nums">{fmt(r._count)}</td>
                    </tr>
                  ))}
                  {topPages.length === 0 && <tr><td className="py-4 text-white/35 text-sm">No page views recorded yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        {/* Users */}
        <Section title="Users">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">Recent signups</div>
              <table className="w-full text-sm">
                <tbody>
                  {recentUsers.map((u) => (
                    <tr key={u.email} className="border-t border-white/5">
                      <td className="py-2 pr-3 text-white/80 truncate max-w-[220px]">
                        {u.email}
                        {!u.emailVerified && <span className="ml-2 text-[10px] text-amber-300/80">unverified</span>}
                      </td>
                      <td className="py-2 text-right text-white/40 text-xs whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  ))}
                  {recentUsers.length === 0 && <tr><td className="py-4 text-white/35 text-sm">No users yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">How users sign in</div>
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-t border-white/5">
                    <td className="py-2 pr-3 text-white/75">Google OAuth accounts</td>
                    <td className="py-2 text-right text-white/70 tabular-nums">{fmt(googleUsers)}</td>
                  </tr>
                  <tr className="border-t border-white/5">
                    <td className="py-2 pr-3 text-white/75">Email + password accounts</td>
                    <td className="py-2 text-right text-white/70 tabular-nums">{fmt(passwordUsers)}</td>
                  </tr>
                  {oauthProviders.filter((r) => r.provider !== "google").map((r) => (
                    <tr key={r.provider} className="border-t border-white/5">
                      <td className="py-2 pr-3 text-white/75 font-mono">{r.provider}</td>
                      <td className="py-2 text-right text-white/70 tabular-nums">{fmt(r._count)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-white/5">
                    <td className="py-2 pr-3 text-white/75">Total linked OAuth accounts</td>
                    <td className="py-2 text-right text-white/70 tabular-nums">{fmt(oauthTotal)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-[11px] text-white/35 mt-3">
                {fmt(unverifiedPwUsers)} email+password account{unverifiedPwUsers === 1 ? "" : "s"} never verified their email.
              </p>
            </div>
          </div>
        </Section>

        {/* System health */}
        <Section title="System health">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card
              label="Camera catalog"
              value={fmt(directory.totalCameras)}
              sub={`Updated ${new Date(directory.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${directory.countries.length} countries`}
              accent="#37e08b"
            />
            <Card
              label="Competitor pages"
              value={competitorCount > 0 ? `${competitorCount}` : "0 — seed needed"}
              sub={competitorCount > 0 ? "DB-backed comparison pages live" : "Tap “Seed from bundled data” in Competitor Comparisons below"}
              accent={competitorCount > 0 ? "#37e08b" : "#f87171"}
            />
            <Card
              label="Affiliates"
              value={fmt(affiliateCount)}
              sub={`${money(pendingCommissions._sum.amountCents ?? 0)} in pending commissions`}
              accent="#c084fc"
            />
            <Card
              label="Email sender"
              value={process.env.EMAIL_FROM ? "Custom domain" : "Test mode"}
              sub={process.env.EMAIL_FROM ?? "onboarding@resend.dev — only delivers to your own address"}
              accent={process.env.EMAIL_FROM ? "#37e08b" : "#f7b80c"}
            />
          </div>
          <p className="text-[11px] text-white/30 mt-3">
            Abandoned-cart reminders sent in the last 7d: <span className="text-white/60 font-semibold">{fmt(coReminded)}</span> ·
            Checkouts expired unrecovered: <span className="text-white/60 font-semibold">{fmt(coExpired)}</span>
          </p>
        </Section>

        <p className="text-[11px] text-white/30 mt-8 text-center">
          Views, sessions &amp; duration are first-party (no cookies, no third parties). Revenue reads live Stripe invoices (all pages, not just the first 100). MRR counts paying subscribers only, at monthly-equivalent rates.
        </p>

        <div className="mt-4">
          <CreatorApplications
            initial={pendingCreatorApps.map((a) => ({
              id: a.id,
              email: a.user.email,
              platform: a.platform,
              handle: a.handle,
              profileUrl: a.profileUrl,
              followers: a.followers,
              createdAt: a.createdAt.toISOString(),
            }))}
          />
        </div>

        <div className="mt-4">
          <NewsletterBroadcast />
        </div>

        <div className="mt-4">
          <CompetitorManager />
        </div>
      </div>
    </div>
  );
}
