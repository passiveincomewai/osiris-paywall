import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import { getAffiliateAdminDetail } from "@/lib/affiliate/admin-detail";
import { StatCard, SectionTitle, Pill, fmtCents } from "@/components/affiliate/ui";
import { AffiliateControls, AffiliateEmail, PayoutActions } from "./DetailClient";

export const metadata = { title: "Affiliate Detail" };
export const dynamic = "force-dynamic";

function d(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function dt(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";

function statusColor(status: string): string {
  return status === "active" ? "#34d399" : status === "pending" ? "#fbbf24" : "#f87171";
}

export default async function AffiliateDetailPage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = await params;
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || !adminEmails().includes(email)) {
    redirect(`/admin/login?callbackUrl=/admin/affiliates/${profileId}`);
  }
  const detail = await getAffiliateAdminDetail(profileId);
  if (!detail) notFound();

  const { profile, user, subscription, stats } = detail;
  const displayName = user.name || user.email || "Affiliate";

  return (
    <div className="docs-root min-h-screen p-4 md:p-8" style={{ background: "radial-gradient(1200px 600px at 50% -10%, #0a1a33 0%, #050810 55%, #03040a 100%)" }}>
      <div className="max-w-7xl mx-auto">
        <Link href="/admin/affiliates" className="text-sm text-slate-400 hover:text-white">← Affiliate Command</Link>

        {/* Identity header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mt-4 mb-6">
          <div className="min-w-0">
            <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase">Affiliate Detail</div>
            <h1 className="text-2xl md:text-3xl font-bold text-white truncate">{displayName}</h1>
            <div className="text-sm text-slate-400 font-mono mt-1">{user.email}</div>
            <div className="flex gap-1.5 flex-wrap mt-3">
              <Pill color={statusColor(profile.status)}>{profile.status}</Pill>
              <Pill color="#818cf8">{detail.rank.name} · {detail.rank.commissionPct}% commission</Pill>
              {profile.isAmbassador && <Pill color="#fbbf24">Ambassador</Pill>}
              {subscription?.kind === "comp" && subscription.live && (
                <Pill color="#34d399">Free Pro{detail.subscription?.compSource ? ` · ${detail.subscription.compSource}` : ""}</Pill>
              )}
              {subscription?.kind === "paid" && subscription.live && <Pill color="#38bdf8">Paid {subscription.planName}</Pill>}
            </div>
          </div>
          <div className="text-right text-xs font-mono text-slate-500">
            <div>profile {profile.id.slice(0, 8)}…</div>
            <div>user {user.id.slice(0, 8)}…</div>
            <div>affiliate since {d(profile.createdAt)}</div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="Referral clicks" value={String(stats.clicksTotal)} sub={`${stats.clicks30d} in last 30d`} />
          <StatCard label="Signups" value={String(stats.signups)} sub={`${stats.conversions} converted to paid`} accent="#38bdf8" />
          <StatCard label="Conversion rate" value={`${(stats.conversionRate * 100).toFixed(1)}%`} sub="signups → paid" accent="#38bdf8" />
          <StatCard label="Total earned" value={fmtCents(stats.commissionsTotalCents)} sub={`${stats.commissionsCount} commissions`} accent="#34d399" />
          <StatCard label="Pending (holding)" value={fmtCents(stats.commissionsPendingCents)} sub="inside 30-day hold" accent="#fbbf24" />
          <StatCard label="Available" value={fmtCents(stats.commissionsAvailableCents)} sub="payable now" accent="#34d399" />
          <StatCard label="Paid out" value={fmtCents(stats.commissionsPaidCents)} sub={stats.commissionsRequestedCents ? `${fmtCents(stats.commissionsRequestedCents)} in open payout requests` : "via approved payouts"} accent="#34d399" />
          <StatCard label="XP" value={String(profile.xp)} sub={detail.nextRank ? `${detail.progress.xpNeeded} XP to ${detail.nextRank.name}` : "top rank"} accent="#c084fc" />
        </div>

        <div className="grid lg:grid-cols-3 gap-3 md:gap-4 mt-4">
          {/* Identity / account facts */}
          <div className={card}>
            <SectionTitle kicker="Account" title="Identity & referral" />
            <dl className="text-sm space-y-2 text-slate-300">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Referral code</dt><dd className="font-mono text-white">{profile.customCode ?? profile.referralCode}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Referral link</dt><dd className="font-mono text-cyan-300 text-xs break-all text-right">{profile.referralLink}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">User joined</dt><dd>{d(user.createdAt)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Recruited by</dt><dd>{detail.recruitedBy ? <Link className="text-cyan-300 hover:underline" href={`/admin/affiliates/${detail.recruitedBy.id}`}>{detail.recruitedBy.code}</Link> : "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Recruits</dt><dd>{detail.recruits}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Payout</dt><dd className="text-right">{profile.payoutMethod ?? "manual"} · {profile.payoutEmail ?? user.email}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Leaderboard</dt><dd>{profile.leaderboardOptOut ? "opted out" : "listed"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Bio showcase</dt><dd>{profile.showcaseEnabled ? "enabled" : "off"}</dd></div>
            </dl>
            {(detail.creatorApplication || detail.ambassadorApplication) && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <SectionTitle kicker="Social" title="Creator profiles" />
                <div className="text-sm space-y-2 text-slate-300">
                  {detail.creatorApplication && (
                    <div>
                      <span className="text-white font-semibold capitalize">{detail.creatorApplication.platform}</span>{" "}
                      <span className="font-mono text-cyan-300">{detail.creatorApplication.handle}</span>{" "}
                      <span className="text-slate-400">· {detail.creatorApplication.followers.toLocaleString()} followers · {detail.creatorApplication.status}</span>{" "}
                      <a className="text-cyan-400 hover:underline text-xs" href={detail.creatorApplication.profileUrl} target="_blank" rel="noreferrer">profile ↗</a>
                    </div>
                  )}
                  {detail.ambassadorApplication && (
                    <div>
                      <span className="text-white font-semibold capitalize">{detail.ambassadorApplication.platform}</span>{" "}
                      <span className="font-mono text-cyan-300">{detail.ambassadorApplication.handle}</span>{" "}
                      <span className="text-slate-400">· {detail.ambassadorApplication.audience.toLocaleString()} audience · ambassador app: {detail.ambassadorApplication.status}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Subscription / membership */}
          <div className={card}>
            <SectionTitle kicker="Membership" title="WorldEye subscription" />
            {subscription ? (
              <dl className="text-sm space-y-2 text-slate-300">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Type</dt><dd className="text-white">{subscription.kind === "comp" ? "Free Pro (comp)" : "Paid"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Plan</dt><dd>{subscription.planName}</dd></div>
                {subscription.compSource && <div className="flex justify-between gap-3"><dt className="text-slate-500">Comp source</dt><dd className="capitalize">{subscription.compSource}</dd></div>}
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Status</dt><dd>{subscription.status}{subscription.live ? " · live" : " · not active"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Period ends</dt><dd>{d(subscription.currentPeriodEnd)}</dd></div>
                {subscription.cancelAtPeriodEnd && <div className="text-amber-300 text-xs">Cancels at period end</div>}
              </dl>
            ) : (
              <p className="text-sm text-slate-400">No subscription — free tier.</p>
            )}
            <div className="mt-4 pt-4 border-t border-white/10">
              <SectionTitle kicker="Studio" title="Marketing Studio" />
              <dl className="text-sm space-y-2 text-slate-300">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Creations</dt><dd>{stats.studioCreations}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Credit balance</dt><dd>{stats.studioCreditBalance}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Campaigns joined</dt><dd>{stats.campaignsJoined}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Badges</dt><dd>{stats.badges}</dd></div>
              </dl>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10">
              <SectionTitle kicker="Discount" title="Audience discount code" />
              {profile.discount.code ? (
                <dl className="text-sm space-y-2 text-slate-300">
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Code</dt><dd className="font-mono text-white">{profile.discount.code}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Percent off</dt><dd>{profile.discount.pct ?? "—"}% (first payment)</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-slate-500">Stripe</dt><dd>{profile.discount.synced ? `synced ${d(profile.discount.syncedAt)}` : "not synced (intent only)"}</dd></div>
                </dl>
              ) : (
                <p className="text-sm text-slate-400">No code minted yet — one is created on the affiliate's next dashboard load.</p>
              )}
            </div>
          </div>

          {/* Controls + email */}
          <div className="space-y-3 md:space-y-4">
            <AffiliateControls
              profileId={profile.id}
              status={profile.status}
              isAmbassador={profile.isAmbassador}
              subKind={subscription?.kind ?? null}
              subLive={subscription?.live ?? false}
              xp={profile.xp}
            />
            <AffiliateEmail
              profileId={profile.id}
              hasEmail={!!user.email}
              emailOptOut={user.emailOptOut}
              availableCents={stats.commissionsAvailableCents}
            />
          </div>
        </div>

        {/* Attributions */}
        <div className={`${card} mt-4 overflow-x-auto`}>
          <SectionTitle kicker="Funnel" title="Recent attributions" />
          <table className="w-full text-sm min-w-[640px]">
            <thead><tr className="text-left text-[11px] font-mono text-slate-400 uppercase">
              <th className="pb-2">Referred user</th><th className="pb-2">Status</th><th className="pb-2">Plan</th><th className="pb-2">Signed up</th><th className="pb-2">Converted</th><th className="pb-2">Window ends</th>
            </tr></thead>
            <tbody>
              {detail.attributions.map((a) => (
                <tr key={a.id} className="border-t border-white/5 text-slate-300">
                  <td className="py-2 font-mono text-xs">{a.maskedEmail}</td>
                  <td className="py-2"><Pill color={a.status === "converted" ? "#34d399" : "#38bdf8"}>{a.status === "converted" ? "paid" : "signed up"}</Pill></td>
                  <td className="py-2 text-xs">{a.planName ?? "—"}{a.planStatus ? ` · ${a.planStatus}` : ""}</td>
                  <td className="py-2 font-mono text-xs">{d(a.createdAt)}</td>
                  <td className="py-2 font-mono text-xs">{d(a.convertedAt)}</td>
                  <td className="py-2 font-mono text-xs text-slate-500">{d(a.expiresAt)}</td>
                </tr>
              ))}
              {detail.attributions.length === 0 && <tr><td colSpan={6} className="py-4 text-slate-500 text-sm">No attributions yet.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="grid lg:grid-cols-2 gap-3 md:gap-4 mt-4">
          {/* Commission ledger */}
          <div className={`${card} overflow-x-auto`}>
            <SectionTitle kicker="Money" title="Recent commissions" />
            <table className="w-full text-sm min-w-[480px]">
              <thead><tr className="text-left text-[11px] font-mono text-slate-400 uppercase">
                <th className="pb-2">Date</th><th className="pb-2">Lvl</th><th className="pb-2">Amount</th><th className="pb-2">Status</th><th className="pb-2">Invoice</th>
              </tr></thead>
              <tbody>
                {detail.commissions.map((c) => (
                  <tr key={c.id} className="border-t border-white/5 text-slate-300">
                    <td className="py-2 font-mono text-xs">{d(c.createdAt)}</td>
                    <td className="py-2"><Pill>L{c.level}</Pill></td>
                    <td className="py-2 font-mono text-white">{fmtCents(c.amountCents)}</td>
                    <td className="py-2"><Pill color={c.status === "reversed" ? "#f87171" : c.status === "paid" ? "#34d399" : "#38bdf8"}>{c.status}</Pill></td>
                    <td className="py-2 font-mono text-xs text-slate-500">{c.stripeInvoiceId?.slice(-8) ?? "—"}</td>
                  </tr>
                ))}
                {detail.commissions.length === 0 && <tr><td colSpan={5} className="py-4 text-slate-500 text-sm">No commissions yet.</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Payouts + XP */}
          <div className="space-y-3 md:space-y-4">
            <div className={card}>
              <SectionTitle kicker="Money" title="Payout history" />
              <div className="space-y-2">
                {detail.payouts.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2 first:border-0 first:pt-0">
                    <div>
                      <span className="font-mono text-white font-bold">{fmtCents(p.amountCents)}</span>{" "}
                      <Pill color={p.status === "paid" ? "#34d399" : p.status === "rejected" ? "#f87171" : "#fbbf24"}>{p.status}</Pill>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {p.method} · requested {d(p.requestedAt)}
                        {p.decidedAt ? ` · decided ${d(p.decidedAt)}${p.decidedBy ? ` by ${p.decidedBy}` : ""}` : ""}
                        {p.providerRef ? ` · ref ${p.providerRef}` : ""}
                      </div>
                    </div>
                    {(p.status === "requested" || p.status === "approved" || p.status === "processing") && (
                      <PayoutActions payoutId={p.id} status={p.status} />
                    )}
                  </div>
                ))}
                {detail.payouts.length === 0 && <div className="text-slate-500 text-sm">No payout requests yet.</div>}
              </div>
              <p className="text-[11px] text-slate-500 mt-3">Money moves in the payout provider or manually first — then use “Mark paid” with the transaction reference.</p>
            </div>

            <div className={card}>
              <SectionTitle kicker="XP" title="Recent XP activity" />
              <div className="space-y-1.5">
                {detail.xpEvents.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm border-t border-white/5 pt-1.5 first:border-0 first:pt-0">
                    <span className="font-mono text-xs text-slate-300">{e.activity}</span>
                    <span className={`font-mono text-xs ${e.xp >= 0 ? "text-emerald-300" : "text-red-300"}`}>{e.xp >= 0 ? "+" : ""}{e.xp}</span>
                    <span className="font-mono text-xs text-slate-500">{dt(e.createdAt)}</span>
                  </div>
                ))}
                {detail.xpEvents.length === 0 && <div className="text-slate-500 text-sm">No XP events yet.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
