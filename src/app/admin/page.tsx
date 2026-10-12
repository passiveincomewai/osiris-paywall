import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { adminEmails } from "@/lib/affiliate/admin";
import { stripe } from "@/lib/stripe";

export const metadata = { title: "Admin Dashboard — WorldEye" };
export const dynamic = "force-dynamic";

const DAY = 86400_000;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
function money(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtDur(sec: number | null): string {
  if (sec == null || !isFinite(sec)) return "—";
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${Math.round(sec % 60)}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
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

const PLAN_NAMES: Record<string, string> = {
  [process.env.STRIPE_WEEKLY_PRICE_ID ?? ""]: "Weekly",
  [process.env.STRIPE_MONTHLY_PRICE_ID ?? ""]: "Monthly",
  [process.env.STRIPE_ANNUAL_PRICE_ID ?? ""]: "Annual",
  [process.env.STRIPE_ENTERPRISE_PRICE_ID ?? ""]: "Enterprise",
};
const PLAN_MRR_CENTS: Record<string, number> = {
  Weekly: 1729, Monthly: 999, Annual: 500, Enterprise: 8325,
};

async function stripeRevenue() {
  try {
    const s = stripe();
    const since = Math.floor((Date.now() - 30 * DAY) / 1000);
    const invoices = await s.invoices.list({ created: { gte: since }, limit: 100 });
    let total = 0;
    const byDay: Record<string, number> = {};
    for (const inv of invoices.data) {
      if (inv.status === "paid" && inv.amount_paid > 0) {
        total += inv.amount_paid;
        const k = dayKey(new Date(inv.created * 1000));
        byDay[k] = (byDay[k] ?? 0) + inv.amount_paid;
      }
    }
    return { total, byDay, ok: true as const };
  } catch {
    return { total: 0, byDay: {} as Record<string, number>, ok: false as const };
  }
}

export default async function AdminDashboardPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) redirect("/signin?callbackUrl=/admin");
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
          <a href="/" className="inline-block mt-6 text-sm text-cyan-300 hover:underline">← Back to site</a>
        </div>
      </div>
    );
  }

  const now = Date.now();
  const d1 = new Date(now - 1 * DAY), d7 = new Date(now - 7 * DAY), d30 = new Date(now - 30 * DAY);

  const [
    totalUsers, users7d, users30d,
    subs, subStatus,
    pv24h, pv7d, pv30d, pvTotal, uniq24h,
    avgDur,
    topPages, recentUsers,
    dailySignupsRaw, dailyPvRaw,
    rev,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: d7 } } }),
    db.user.count({ where: { createdAt: { gte: d30 } } }),
    db.subscription.findMany({ select: { status: true, stripePriceId: true } }),
    db.subscription.groupBy({ by: ["status"], _count: true }),
    db.pageView.count({ where: { createdAt: { gte: d1 } } }),
    db.pageView.count({ where: { createdAt: { gte: d7 } } }),
    db.pageView.count({ where: { createdAt: { gte: d30 } } }),
    db.pageView.count(),
    db.pageView.groupBy({ by: ["sessionId"], _count: true, where: { createdAt: { gte: d1 } } }).then((r) => r.length),
    db.pageView.aggregate({ _avg: { durationSec: true }, where: { createdAt: { gte: d7 }, durationSec: { not: null } } }),
    db.pageView.groupBy({ by: ["path"], where: { createdAt: { gte: d30 } }, _count: true, orderBy: { _count: { path: "desc" } }, take: 8 }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { email: true, name: true, createdAt: true, emailVerified: true } }),
    db.$queryRaw<{ d: string; c: bigint }[]>`SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') AS d, COUNT(*) AS c FROM "User" WHERE "createdAt" >= ${d30} GROUP BY d ORDER BY d`,
    db.$queryRaw<{ d: string; c: bigint }[]>`SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') AS d, COUNT(*) AS c FROM "PageView" WHERE "createdAt" >= ${d30} GROUP BY d ORDER BY d`,
    stripeRevenue(),
  ]);

  // 30-day label axis
  const labels: string[] = [];
  for (let i = 29; i >= 0; i--) labels.push(dayKey(new Date(now - i * DAY)));
  const suMap = new Map(dailySignupsRaw.map((r) => [r.d, Number(r.c)]));
  const pvMap = new Map(dailyPvRaw.map((r) => [r.d, Number(r.c)]));
  const signupsSeries = labels.map((l) => suMap.get(l) ?? 0);
  const pvSeries = labels.map((l) => pvMap.get(l) ?? 0);
  const revSeries = labels.map((l) => Math.round((rev.byDay[l] ?? 0) / 100));

  const activeSubs = subs.filter((s) => s.status === "active" || s.status === "trialing");
  const mrr = activeSubs.reduce((sum, s) => sum + (PLAN_MRR_CENTS[PLAN_NAMES[s.stripePriceId] ?? ""] ?? 0), 0);
  const planCounts: Record<string, number> = {};
  for (const s of activeSubs) {
    const p = PLAN_NAMES[s.stripePriceId] ?? "Other";
    planCounts[p] = (planCounts[p] ?? 0) + 1;
  }
  const statusMap = new Map(subStatus.map((r) => [r.status, r._count]));

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #0a1a33 0%, #050810 55%, #03040a 100%)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase">WorldEye Ops</div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-xs text-white/40 mt-1">Signed in as {email} · Analytics tracking live since deploy</p>
          </div>
          <div className="flex gap-3 text-sm">
            <a href="/admin/affiliates" className="px-4 py-2 rounded-lg border border-white/15 text-white/70 hover:text-white">Affiliates</a>
            <a href="/" className="px-4 py-2 rounded-lg border border-white/15 text-white/70 hover:text-white">← Site</a>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card label="Total users" value={fmt(totalUsers)} sub={`+${fmt(users7d)} this week · +${fmt(users30d)} / 30d`} />
          <Card label="Paying subscribers" value={fmt(activeSubs.length)} sub={Object.entries(planCounts).map(([p, c]) => `${p}: ${c}`).join(" · ") || "No active subs"} accent="#f7b80c" />
          <Card label="Page views · 24h" value={fmt(pv24h)} sub={`${fmt(uniq24h)} unique sessions · ${fmt(pv7d)} / 7d`} accent="#37e08b" />
          <Card label="Avg. time on site" value={fmtDur(avgDur._avg.durationSec)} sub="per page view · last 7 days" accent="#c084fc" />
          <Card label="Revenue · 30d" value={rev.ok ? money(rev.total) : "—"} sub={rev.ok ? "Paid Stripe invoices" : "Stripe key missing"} accent="#37e08b" />
          <Card label="Est. MRR" value={money(mrr)} sub="Active + trialing subs, monthly equivalent" accent="#f7b80c" />
          <Card label="Trials active" value={fmt(statusMap.get("trialing") ?? 0)} sub={`${fmt(statusMap.get("past_due") ?? 0)} past due`} />
          <Card label="Page views · 30d" value={fmt(pv30d)} sub={`${fmt(pvTotal)} all time`} accent="#38bdf8" />
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">Signups · 30 days</div>
            <Chart data={signupsSeries} labels={labels} color="#38bdf8" />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">Page views · 30 days</div>
            <Chart data={pvSeries} labels={labels} color="#37e08b" />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">Revenue · 30 days ($)</div>
            <Chart data={revSeries} labels={labels} color="#f7b80c" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {/* Top pages */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">Top pages · 30 days</div>
            <table className="w-full text-sm">
              <tbody>
                {topPages.map((r) => (
                  <tr key={r.path} className="border-t border-white/5">
                    <td className="py-2 pr-3 font-mono text-cyan-200/80 truncate max-w-[280px]">{r.path}</td>
                    <td className="py-2 text-right text-white/70 tabular-nums">{fmt(r._count)}</td>
                  </tr>
                ))}
                {topPages.length === 0 && <tr><td className="py-4 text-white/35 text-sm">No page views recorded yet — tracking starts with this deploy.</td></tr>}
              </tbody>
            </table>
          </div>
          {/* Recent signups */}
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
        </div>

        <p className="text-[11px] text-white/30 mt-8 text-center">
          Views &amp; duration are first-party (no cookies, no third parties). Revenue reads live Stripe invoices.
        </p>
      </div>
    </div>
  );
}
