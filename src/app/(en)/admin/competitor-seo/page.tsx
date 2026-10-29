import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import { getCompetitorSeoReport } from "@/lib/analytics/competitor-seo";
import AdminNav from "../AdminNav";

export const metadata = { title: "Competitor SEO — Admin" };
export const dynamic = "force-dynamic";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
function pct(a: number, b: number): string {
  if (!b) return "—";
  return `${((100 * a) / b).toFixed(1)}%`;
}

const PRESETS = [7, 30, 90];

export default async function CompetitorSeoAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
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

  const sp = await searchParams;
  const days = PRESETS.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const r = await getCompetitorSeoReport(days);

  return (
    <div className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Competitor SEO</h1>
            <p className="text-sm text-white/45 mt-1">
              How the competitor-intent pages perform — measured with our own
              first-party analytics. Everything on this page is real tracked
              data; nothing is estimated.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((d) => (
              <Link
                key={d}
                href={`/admin/competitor-seo?days=${d}`}
                className={`inline-flex items-center px-3 py-2.5 rounded-lg text-sm border transition ${
                  d === days
                    ? "border-cyan-400/50 text-cyan-200 bg-cyan-400/10"
                    : "border-white/15 text-white/60 hover:text-white"
                }`}
              >
                {d}d
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <AdminNav active="competitor-seo" />
        </div>

        {/* GSC status — honest not-connected state */}
        <section className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/[0.05] p-4 sm:p-6">
          <h2 className="font-bold text-amber-200">Google Search Console: not connected</h2>
          <div className="text-sm text-white/60 leading-relaxed mt-3 space-y-3">
            <p>
              Search impressions, average positions and query data for these
              pages live only in Google Search Console — they cannot be
              measured from our own analytics, so this page never shows them.
              Until GSC is connected, there is <span className="text-white/85">no search
              ranking or impressions data</span>, and the opportunities table below
              uses a first-party engagement signal instead (clearly labeled).
            </p>
            <p>
              <span className="text-white/85 font-semibold">What connecting unlocks:</span>{" "}
              real queries and click-through per competitor page, impression
              growth after each change, and position tracking for targets like
              &ldquo;gods eye view alternative&rdquo; and &ldquo;osiris
              alternative&rdquo;.
            </p>
            <p>
              <span className="text-white/85 font-semibold">The step only Jameson can do:</span>{" "}
              sign in at search.google.com/search-console with the Google
              account for worldeye.app and verify the domain property (DNS TXT
              in Namecheap, where the domain&apos;s DNS already lives). The
              data plumbing can be wired the same day that sign-in happens.
            </p>
          </div>
        </section>

        {/* First-party summary */}
        <section className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: `Landing sessions on competitor pages (${days}d)`, value: fmt(r.competitorSessions), sub: `of ${fmt(r.totalSessions)} sessions sitewide` },
            { label: "Arrived via a search engine", value: fmt(r.searchReferredSessions), sub: `${pct(r.searchReferredSessions, r.competitorSessions)} of competitor landings (referrer on the landing view)` },
            { label: "Reached the globe", value: pct(r.funnel.globeSessions, r.funnel.landingSessions), sub: `sitewide baseline ${pct(Math.round(r.funnel.sitewideGlobeRate * r.totalSessions), r.totalSessions)}` },
            { label: "Signups attributed to a competitor landing", value: fmt(r.signups.reduce((a, s) => a + s.count, 0)), sub: "same-session attribution (house method)" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
              <div className="text-[11px] font-bold tracking-[0.14em] text-white/40 uppercase">{c.label}</div>
              <div className="text-3xl font-bold text-white mt-2 tabular-nums">{c.value}</div>
              <div className="text-xs text-white/40 mt-1">{c.sub}</div>
            </div>
          ))}
        </section>

        {/* Per-page table */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <h2 className="font-bold text-white">Landing pages · last {days} days</h2>
          <p className="text-xs text-white/40 mt-1">
            A session counts under the page it landed on (its first tracked
            view). Tracking began 2026-10-12, and most of these pages shipped
            locally in October 2026 — expect small numbers until the stack is
            deployed and indexed.
          </p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-white/35">
                  <th className="pb-2 pr-3 font-semibold">Page</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Sessions</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Via search</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Reached globe</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Opened a camera</th>
                  <th className="pb-2 font-semibold text-right">Saw pricing</th>
                </tr>
              </thead>
              <tbody>
                {r.byPage.map((p) => (
                  <tr key={p.path} className="border-t border-white/5">
                    <td className="py-2 pr-3">
                      <span className="text-white/80">{p.label}</span>{" "}
                      <span className="font-mono text-xs text-cyan-200/60">{p.path.startsWith("__") ? "" : p.path}</span>
                    </td>
                    <td className="py-2 pr-3 text-right text-white/85 tabular-nums">{fmt(p.sessions)}</td>
                    <td className="py-2 pr-3 text-right text-white/60 tabular-nums">{fmt(p.searchSessions)}</td>
                    <td className="py-2 pr-3 text-right text-white/60 tabular-nums">{fmt(p.globeSessions)} <span className="text-white/30">({pct(p.globeSessions, p.sessions)})</span></td>
                    <td className="py-2 pr-3 text-right text-white/60 tabular-nums">{fmt(p.cameraSessions)}</td>
                    <td className="py-2 text-right text-white/60 tabular-nums">{fmt(p.pricingSessions)}</td>
                  </tr>
                ))}
                {r.byPage.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-white/35 text-sm">
                      No sessions landed on a competitor page in this window yet.
                      The pages are new — this fills in as they are deployed,
                      indexed and linked.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Channels + signups */}
        <div className="mt-8 grid md:grid-cols-2 gap-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <h2 className="font-bold text-white">How competitor-page visitors arrived</h2>
            <table className="w-full text-sm mt-4">
              <tbody>
                {r.channels.map((c) => (
                  <tr key={c.channel} className="border-t border-white/5 first:border-t-0">
                    <td className="py-2 pr-3 text-white/70">{c.channel}</td>
                    <td className="py-2 text-right text-white/85 tabular-nums">{fmt(c.sessions)}</td>
                    <td className="py-2 pl-3 text-right text-white/40 tabular-nums">{pct(c.sessions, r.competitorSessions)}</td>
                  </tr>
                ))}
                {r.channels.length === 0 && (
                  <tr><td className="py-4 text-white/35 text-sm">No competitor-page landings in this window.</td></tr>
                )}
              </tbody>
            </table>
            <p className="text-[11px] text-white/30 mt-3">
              Classified from the landing view&apos;s referrer and UTM fields
              only. &ldquo;Direct / unknown&rdquo; includes typed visits,
              bookmarks, and referrers stripped by apps — it hides some
              social and DM traffic, so treat channel shares as a floor for
              search and social, not an exact split.
            </p>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
            <h2 className="font-bold text-white">Signups by landing page</h2>
            {r.signups.length > 0 ? (
              <table className="w-full text-sm mt-4">
                <tbody>
                  {r.signups.map((s) => (
                    <tr key={s.path} className="border-t border-white/5 first:border-t-0">
                      <td className="py-2 pr-3 font-mono text-xs text-cyan-200/70">{s.path}</td>
                      <td className="py-2 text-right text-white/85 tabular-nums">{fmt(s.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-white/35 mt-4 leading-relaxed">
                No signups in this window attribute to a competitor-page
                landing yet. Attribution is same-session only (the main
                dashboard&apos;s method) — a visitor who lands, leaves, and
                signs up days later from a bookmark counts as direct, so this
                understates the pages&apos; true influence.
              </p>
            )}
          </section>
        </div>

        {/* Opportunities — first-party signal only, honestly labeled */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <h2 className="font-bold text-white">Opportunities</h2>
          <p className="text-xs text-white/40 mt-1 leading-relaxed">
            A real opportunities ranking needs Search Console impressions by
            query — not available until GSC is connected (see above). The
            first-party proxy below flags competitor pages that ARE drawing
            landing sessions but whose visitors rarely reach the globe —
            an intent/content mismatch worth a copy review. It is an
            engagement signal, not search data.
          </p>
          {r.opportunities.length > 0 ? (
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-white/35">
                  <th className="pb-2 pr-3 font-semibold">Page</th>
                  <th className="pb-2 pr-3 font-semibold text-right">Sessions</th>
                  <th className="pb-2 font-semibold text-right">Globe rate</th>
                </tr>
              </thead>
              <tbody>
                {r.opportunities.map((o) => (
                  <tr key={o.path} className="border-t border-white/5">
                    <td className="py-2 pr-3 text-white/75">{o.label}</td>
                    <td className="py-2 pr-3 text-right text-white/70 tabular-nums">{fmt(o.sessions)}</td>
                    <td className="py-2 text-right text-amber-200/80 tabular-nums">{(o.globeRate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-white/35 mt-4">
              Nothing flagged right now — either competitor pages have too few
              landing sessions in this window to judge (the usual case until
              the new pages have been live a while), or their visitors reach
              the globe at a healthy rate.
            </p>
          )}
          {r.capped && (
            <p className="text-[11px] text-amber-200/70 mt-4">
              Note: session scan hit its safety cap — counts for this window
              are a lower bound.
            </p>
          )}
        </section>

        <p className="text-[11px] text-white/30 mt-8">
          Data source: WorldEye first-party PageView analytics (live since
          2026-10-12). Not Google Search Console data. Campaign pages:
          /alternatives + /compare + /gods-eye-view + the three comparison
          blog posts.
        </p>
      </div>
    </div>
  );
}
