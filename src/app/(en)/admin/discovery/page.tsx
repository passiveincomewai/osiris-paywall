import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { adminEmails } from "@/lib/affiliate/admin";
import { DISCOVERY_SOURCES, discoverySourceLabel } from "@/lib/discovery-sources";

/**
 * Admin — "How did you find out about us?" (discovery) answers.
 *
 * The data: a set-once self-report stored on the User record
 * (discoverySource / discoveryDetail), collected in account settings
 * ("Referred by a friend?" section, POST /api/account/referral —
 * shipped in b1f91ed8). Until now nothing surfaced it to operators.
 * This view is aggregate-first: counts per source, the answer rate,
 * friend-code attribution totals, and the free-text notes members
 * added. No per-user rows, no emails.
 *
 * NOT the same as the main dashboard's "signup sources" section —
 * that is PageView utm/referrer telemetry. This is what members
 * actually said. Gating mirrors the other admin pages (session +
 * ADMIN_EMAILS); the data appears nowhere public.
 */
export const metadata = { title: "Discovery Sources — Admin" };
export const dynamic = "force-dynamic";

export default async function DiscoveryAdminPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) redirect("/admin/login?callbackUrl=/admin/discovery");
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

  const [totalUsers, grouped, attributions, convertedAttributions, detailRows] = await Promise.all([
    db.user.count(),
    db.user.groupBy({ by: ["discoverySource"], _count: { _all: true } }),
    db.referralAttribution.count(),
    db.referralAttribution.count({ where: { convertedAt: { not: null } } }),
    db.user.findMany({
      where: { discoveryDetail: { not: null } },
      select: { discoverySource: true, discoveryDetail: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const counts = new Map<string, number>();
  let answered = 0;
  for (const g of grouped) {
    if (g.discoverySource) {
      counts.set(g.discoverySource, g._count._all);
      answered += g._count._all;
    }
  }
  const unanswered = totalUsers - answered;
  // The settings form can store an empty-string detail; only real notes render.
  const notes = detailRows.filter((r) => r.discoveryDetail && r.discoveryDetail.trim().length > 0);
  const answerRate = totalUsers > 0 ? Math.round((answered / totalUsers) * 1000) / 10 : 0;

  // Every current source key (zero counts shown too — an offered
  // channel nobody picked is a real signal), plus any retired key
  // still stored on older rows, under its raw key.
  const knownKeys = new Set<string>(DISCOVERY_SOURCES.map((s) => s.key));
  const rows = [
    ...DISCOVERY_SOURCES.map((s) => ({ key: s.key, label: s.label, count: counts.get(s.key) ?? 0 })),
    ...[...counts.entries()]
      .filter(([k]) => !knownKeys.has(k))
      .map(([k, count]) => ({ key: k, label: k, count })),
  ].sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...rows.map((r) => r.count));
  const pctOfAnswered = (n: number) => (answered > 0 ? Math.round((n / answered) * 1000) / 10 : 0);

  const stats: { label: string; value: string; sub: string }[] = [
    { label: "ACCOUNTS", value: String(totalUsers), sub: "registered users" },
    { label: "ANSWERED", value: String(answered), sub: `${answerRate}% of accounts` },
    { label: "NOT ANSWERED", value: String(unanswered), sub: "question is optional, set-once" },
    {
      label: "FRIEND-CODE REFERRALS",
      value: String(attributions),
      sub: `${convertedAttributions} later subscribed`,
    },
  ];

  return (
    <div className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-10 text-white">
        <Link href="/admin" className="text-sm text-cyan-300 hover:underline">← Admin dashboard</Link>
        <h1 className="mt-4 text-2xl font-bold">Discovery — how members found WorldEye</h1>
        <p className="mt-2 text-sm text-white/50 leading-relaxed">
          Self-reported answers to “How did you find out about us?”, asked once in account
          settings and stored on the member&rsquo;s record. This is what members said —
          separate from the dashboard&rsquo;s signup-source telemetry (utm/referrer),
          which measures the click, not the answer.
        </p>

        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-[10px] font-mono tracking-[0.18em] text-white/40">{s.label}</div>
              <div className="mt-1.5 text-2xl font-bold">{s.value}</div>
              <div className="mt-0.5 text-xs text-white/40">{s.sub}</div>
            </div>
          ))}
        </div>

        <h2 className="mt-10 text-sm font-mono tracking-[0.18em] text-white/40">ANSWERS BY SOURCE</h2>
        {answered === 0 ? (
          <p className="mt-3 text-sm text-white/50">
            No answers yet. The question sits in Settings → “Referred by a friend?” and is
            optional, so this fills in as members choose to answer.
          </p>
        ) : (
          <div className="mt-3 rounded-2xl border border-white/10 overflow-hidden">
            {rows.map((r, i) => (
              <div
                key={r.key}
                className={`flex items-center gap-4 px-4 py-3 bg-white/[0.02] ${i > 0 ? "border-t border-white/[0.06]" : ""}`}
              >
                <div className="w-44 shrink-0 text-sm text-white/80">{r.label}</div>
                <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyan-400/70"
                    style={{ width: `${Math.round((r.count / maxCount) * 100)}%` }}
                  />
                </div>
                <div className="w-14 shrink-0 text-right text-sm font-semibold">{r.count}</div>
                <div className="w-16 shrink-0 text-right text-xs text-white/40">{pctOfAnswered(r.count)}%</div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-white/35">Percentages are of members who answered, not of all accounts.</p>

        <h2 className="mt-10 text-sm font-mono tracking-[0.18em] text-white/40">FREE-TEXT NOTES</h2>
        {notes.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">No member has added a free-text note yet.</p>
        ) : (
          <>
            <div className="mt-3 rounded-2xl border border-white/10 overflow-hidden">
              {notes.map((r, i) => (
                <div
                  key={i}
                  className={`flex items-baseline gap-3 px-4 py-2.5 bg-white/[0.02] ${i > 0 ? "border-t border-white/[0.06]" : ""}`}
                >
                  <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-white/50">
                    {discoverySourceLabel(r.discoverySource) ?? "—"}
                  </span>
                  <span className="text-sm text-white/75">“{r.discoveryDetail}”</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-white/35">
              The optional “anything to add?” text members saved with their answer — newest
              accounts first, up to 50, with no names or emails shown.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
