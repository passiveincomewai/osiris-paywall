import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { adminEmails } from "@/lib/affiliate/admin";
import { planNameByPriceId } from "@/lib/billing/plans";
import { isCompSubscription } from "@/lib/pro/comp";
import { discoverySourceLabel } from "@/lib/discovery-sources";
import AdminNav from "../../AdminNav";

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
      discoverySource: true,
      discoveryDetail: true,
      createdAt: true,
      subscription: {
        select: {
          status: true,
          stripePriceId: true,
          stripeSubscriptionId: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
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
  const [aggRows, firstRows, signInCount, lastSignIn, referredBy] = await Promise.all([
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
  ]);

  const agg = aggRows[0];
  const views = Number(agg?.views ?? 0);
  const visits = Number(agg?.visits ?? 0);
  const opens = Number(agg?.opens ?? 0);
  const lastSeen = agg?.last_seen ?? null;
  const first = firstRows[0] ?? null;

  const profile = user.affiliateProfile;
  let affiliateStats: { referrals: number; converted: number; commissions: number; earnedCents: number; pendingCents: number } | null = null;
  if (profile) {
    const [referrals, converted, commAll, commPending] = await Promise.all([
      db.referralAttribution.count({ where: { affiliateProfileId: profile.id } }),
      db.referralAttribution.count({ where: { affiliateProfileId: profile.id, convertedAt: { not: null } } }),
      db.commission.aggregate({ where: { affiliateProfileId: profile.id }, _sum: { amountCents: true }, _count: true }),
      db.commission.aggregate({ where: { affiliateProfileId: profile.id, status: "pending" }, _sum: { amountCents: true } }),
    ]);
    affiliateStats = {
      referrals,
      converted,
      commissions: commAll._count,
      earnedCents: commAll._sum.amountCents ?? 0,
      pendingCents: commPending._sum.amountCents ?? 0,
    };
  }

  const sub = user.subscription;
  const comp = isCompSubscription(sub);
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
      : "Stripe subscription (state synced from Stripe by webhook)";

  const discoveryLabel = discoverySourceLabel(user.discoverySource);
  const utmBits = first
    ? [
        first.utmSource ? `source: ${first.utmSource}` : null,
        first.utmMedium ? `medium: ${first.utmMedium}` : null,
        first.utmCampaign ? `campaign: ${first.utmCampaign}` : null,
      ].filter(Boolean)
    : [];

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

        <Card title="Plan & subscription">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            <Row k="Plan" v={planText} />
            <Row k="Status" v={sub ? sub.status.replace(/_/g, " ") : "none"} />
            <Row k="Period" v={sub ? `${fmtDenverDay(sub.currentPeriodStart)} → ${fmtDenverDay(sub.currentPeriodEnd)}` : "—"} />
            <Row k="Source" v={sourceText} />
          </dl>
        </Card>

        <Card title="Affiliate">
          {profile && affiliateStats ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
              <Row k="Referral code" v={<span className="font-mono text-[13px]">{profile.customCode ?? profile.referralCode}</span>} />
              <Row k="Affiliate status" v={profile.status} />
              <Row k="Referrals" v={`${affiliateStats.referrals.toLocaleString("en-US")} joined · ${affiliateStats.converted.toLocaleString("en-US")} converted`} />
              <Row
                k="Tracked commissions"
                v={`${affiliateStats.commissions.toLocaleString("en-US")} · ${money(affiliateStats.earnedCents)} total · ${money(affiliateStats.pendingCents)} pending`}
              />
            </dl>
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
      </div>
    </div>
  );
}
