import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import AdminNav from "../AdminNav";
import {
  GSC,
  AI_PROBE,
  getAiVisibility,
  getSearchDemand,
} from "@/lib/analytics/seo-dashboard";

export const metadata = { title: "SEO — Admin" };
export const dynamic = "force-dynamic";

/**
 * The unified SEO + AI Search dashboard (SEO Programme Phase 7, with
 * the Phase 8 Search Demand view). One shell, three views over one
 * data layer (src/lib/analytics/seo-dashboard.ts):
 *  - Rankings & Opportunities — the Phase 1 GSC import (dated window,
 *    labelled source; the Search Analytics API is not connected).
 *  - AI Visibility — first-party AI-referrer analytics + the dated
 *    manual probe series. Unconnected sources say "not connected".
 *  - Search Demand — internal search aggregation (Phase 8).
 * Nothing on this page is modelled; unmeasured figures are stated as
 * not measured rather than shown as zeros.
 */

const DAY_PRESETS = [7, 30, 90];
type View = "rankings" | "ai" | "demand";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

const card =
  "rounded-2xl border border-white/10 bg-white/[0.03] p-5";
const th = "text-left text-[11px] uppercase tracking-wider text-white/40 font-semibold px-3 py-2";
const td = "px-3 py-2 text-sm text-white/75 border-t border-white/5";
const h2 = "text-lg font-bold text-white mt-10 mb-3";
const sub = "text-sm text-white/45 leading-relaxed";

export default async function SeoAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; days?: string }>;
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
  const view: View = sp.view === "ai" || sp.view === "demand" ? sp.view : "rankings";
  const days = DAY_PRESETS.includes(Number(sp.days)) ? Number(sp.days) : 30;

  const tabCls = (v: View) =>
    `px-4 py-2 rounded-lg border text-sm transition ${
      view === v
        ? "border-cyan-400/50 text-cyan-200 bg-cyan-400/10"
        : "border-white/15 text-white/70 hover:text-white"
    }`;

  return (
    <div className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">SEO &amp; AI Search</h1>
            <p className="text-sm text-white/45 mt-1">
              One dashboard for rankings, AI visibility and on-site search demand.
              Every number traces to the GSC import, first-party analytics, the
              catalogue, or a dated probe run — nothing is estimated.
            </p>
          </div>
          <AdminNav active="seo" />
        </div>

        <div className="flex gap-2 mt-6">
          <Link href="/admin/seo?view=rankings" className={tabCls("rankings")}>Rankings &amp; Opportunities</Link>
          <Link href={`/admin/seo?view=ai&days=${days}`} className={tabCls("ai")}>AI Visibility</Link>
          <Link href={`/admin/seo?view=demand&days=${days}`} className={tabCls("demand")}>Search Demand</Link>
        </div>

        {view === "rankings" && <RankingsView />}
        {view === "ai" && <AiView days={days} />}
        {view === "demand" && <DemandView days={days} />}
      </div>
    </div>
  );
}

/* ── Rankings & Opportunities (Phase 1 import) ─────────────────── */

function RankingsView() {
  const g = GSC;
  return (
    <div>
      <div className={`${card} mt-6`}>
        <p className="text-sm text-white/70 leading-relaxed">
          <strong className="text-white">Source:</strong> {g.source} · Property {g.property} ·{" "}
          Window <strong className="text-white">{g.windowStart} → {g.windowEnd}</strong> (the
          property&apos;s full history at import time — no previous-period comparison exists yet).
        </p>
        <p className="text-sm text-white/45 mt-2 leading-relaxed">{g.reconciliation}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {[
          { label: "Clicks (window)", value: fmt(g.headline.clicks) },
          { label: "Impressions", value: fmt(g.headline.impressions) },
          { label: "Avg CTR", value: `${g.headline.avgCtrPct}%` },
          { label: "Avg position", value: String(g.headline.avgPosition) },
        ].map((s) => (
          <div key={s.label} className={card}>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-white/45 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <p className={`${sub} mt-3`}>
        Branded split: {g.branded.note} Opportunity rows below are non-branded only.
      </p>

      <h2 className={h2}>Position bands (non-branded queries)</h2>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full">
          <thead><tr><th className={th}>Band</th><th className={th}>Queries</th><th className={th}>Impressions</th><th className={th}>Clicks</th></tr></thead>
          <tbody>
            {g.buckets.map((b) => (
              <tr key={b.label}>
                <td className={td}>{b.label}</td><td className={td}>{fmt(b.queries)}</td>
                <td className={td}>{fmt(b.impressions)}</td><td className={td}>{fmt(b.clicks)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className={h2}>Opportunity queue — top 25 by score</h2>
      <p className={sub}>
        Score = impressions × position proximity × intent value, from the import.
        Target pages are intent-map assignments — {g.joinNote}
      </p>
      <div className="overflow-x-auto rounded-2xl border border-white/10 mt-3">
        <table className="w-full">
          <thead><tr>
            <th className={th}>Query</th><th className={th}>Impr</th><th className={th}>Pos</th>
            <th className={th}>Clicks</th><th className={th}>Band</th><th className={th}>Target page</th><th className={th}>Flags</th>
          </tr></thead>
          <tbody>
            {g.topOpportunities.map((o) => (
              <tr key={o.query}>
                <td className={`${td} text-white/90`}>{o.query}</td>
                <td className={td}>{fmt(o.impressions)}</td>
                <td className={td}>{o.position}</td>
                <td className={td}>{fmt(o.clicks)}</td>
                <td className={td}>{o.bucket.replace(/_/g, " ")}</td>
                <td className={td}><Link className="text-cyan-300 hover:underline" href={o.targetPage}>{o.targetPage}</Link></td>
                <td className={td}>
                  {o.zeroClickImpressions ? "0 clicks on impressions · " : ""}
                  {o.cannibalization ? "cannibalisation cluster" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className={h2}>Page leaders (Pages sheet, ≥40 impressions)</h2>
      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full">
          <thead><tr><th className={th}>Page</th><th className={th}>Impressions</th><th className={th}>Clicks</th><th className={th}>Avg position</th></tr></thead>
          <tbody>
            {g.pageLeaders.map((p) => (
              <tr key={p.page}>
                <td className={`${td} text-white/90`}>{p.page}</td>
                <td className={td}>{fmt(p.impressions)}</td>
                <td className={td}>{fmt(p.clicks)}</td>
                <td className={td}>{p.position}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className={h2}>Completed optimizations (Phase 3 log)</h2>
      <div className="space-y-3">
        {g.phase3Log.map((item) => (
          <div key={item.item} className={card}>
            <p className="text-white/90 font-medium">#{item.item} — {item.title}</p>
            <p className="text-sm text-white/55 mt-1">{item.change}</p>
            <p className="text-sm text-white/45 mt-1">Baseline: {item.baseline}</p>
            <p className="text-sm text-white/45">Shipped: {item.shipped} · Judgement: {item.judgement}</p>
          </div>
        ))}
      </div>
      <p className={`${sub} mt-3`}>{g.phase3Note}</p>
      <p className={`${sub} mt-2`}>{g.deviceNote}</p>
    </div>
  );
}

/* ── AI Visibility ─────────────────────────────────────────────── */

async function AiView({ days }: { days: number }) {
  let report: Awaited<ReturnType<typeof getAiVisibility>> | null = null;
  let error: string | null = null;
  try {
    report = await getAiVisibility(days);
  } catch {
    error = "Referrer analytics are unavailable right now (database read failed) — no figures are shown rather than invented ones.";
  }
  return (
    <div>
      <div className="flex gap-2 mt-6">
        {DAY_PRESETS.map((d) => (
          <Link key={d} href={`/admin/seo?view=ai&days=${d}`}
            className={`px-3 py-1.5 rounded-lg border text-sm ${d === days ? "border-cyan-400/50 text-cyan-200 bg-cyan-400/10" : "border-white/15 text-white/70"}`}>
            {d}d
          </Link>
        ))}
      </div>

      {error && <div className={`${card} mt-6`}><p className="text-sm text-amber-200/80">{error}</p></div>}

      {report && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {[
              { label: `AI referral sessions (${days}d)`, value: fmt(report.totalSessions) },
              { label: "AI referral page views", value: fmt(report.totalPageviews) },
              { label: "Accounts first-touched by AI", value: fmt(report.attributedAccounts) },
              { label: "…of which trialing / paid", value: `${fmt(report.attributedTrials)} / ${fmt(report.attributedPaid)}` },
            ].map((s) => (
              <div key={s.label} className={card}>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/45 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <p className={`${sub} mt-3`}>
            Referral sessions, page views, and attributed customers are separate
            measurements. AI-engine <em>impressions</em> and <em>citations</em> are not
            observable from first-party data — citations are measured by the probe
            series below, impressions are not measured.
          </p>

          <h2 className={h2}>By engine (first-party referrer analytics)</h2>
          {report.engines.length === 0 ? (
            <p className={sub}>No AI-referrer sessions in this window.</p>
          ) : (
            <div className="space-y-3">
              {report.engines.map((e) => (
                <div key={e.engine} className={card}>
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="text-white/90 font-medium">{e.engine}</p>
                    <p className="text-sm text-white/55">{fmt(e.sessions)} sessions · {fmt(e.pageviews)} page views</p>
                  </div>
                  {e.topLandings.length > 0 && (
                    <p className="text-sm text-white/45 mt-2">
                      Top landings: {e.topLandings.map((l) => `${l.path} (${fmt(l.sessions)})`).join(" · ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <h2 className={h2}>Probe series (manual, dated)</h2>
      <p className={sub}>{AI_PROBE.seriesNote}</p>
      <div className="space-y-3 mt-3">
        {AI_PROBE.runs.map((run) => (
          <div key={run.date} className={card}>
            <p className="text-white/90 font-medium">
              {run.date} — {run.engine}: mentioned on {run.mentioned} of {run.questions} questions ({run.mentionPct}%)
            </p>
            <p className="text-sm text-white/45 mt-1">
              {run.buckets.map((b) => `${b.label} ${b.mentioned}/${b.questions}`).join(" · ")}
            </p>
            <p className="text-sm text-white/45 mt-1">Cited pages: {run.citedPages.join("; ")}</p>
          </div>
        ))}
      </div>

      <h2 className={h2}>Not connected</h2>
      <div className="space-y-2">
        {GSC.notConnected.map((n) => (
          <div key={n} className={card}><p className="text-sm text-white/55">{n}</p></div>
        ))}
      </div>
    </div>
  );
}

/* ── Search Demand (Phase 8) ───────────────────────────────────── */

async function DemandView({ days }: { days: number }) {
  let section: Awaited<ReturnType<typeof getSearchDemand>> | null = null;
  let error: string | null = null;
  try {
    section = await getSearchDemand(days);
  } catch {
    error = "Search-demand aggregation is unavailable right now (database read failed) — no figures are shown rather than invented ones.";
  }
  return (
    <div>
      <div className="flex gap-2 mt-6">
        {DAY_PRESETS.map((d) => (
          <Link key={d} href={`/admin/seo?view=demand&days=${d}`}
            className={`px-3 py-1.5 rounded-lg border text-sm ${d === days ? "border-cyan-400/50 text-cyan-200 bg-cyan-400/10" : "border-white/15 text-white/70"}`}>
            {d}d
          </Link>
        ))}
      </div>

      {error && <div className={`${card} mt-6`}><p className="text-sm text-amber-200/80">{error}</p></div>}

      {section && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            {[
              { label: `Searches (${days}d)`, value: fmt(section.report.totalSearches) },
              { label: "Zero-result searches", value: fmt(section.report.zeroResultSearches) },
              { label: "Distinct searched terms", value: fmt(section.report.uniqueTokens) },
              {
                label: "Search → camera-open success",
                value: section.report.success.ratePct === null ? "not measured" : `${section.report.success.ratePct}%`,
              },
            ].map((s) => (
              <div key={s.label} className={card}>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/45 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          <p className={`${sub} mt-3`}>
            Terms are the instrumentation&apos;s normalized tokens (never raw typed text).
            Success = a camera_open in the same session at or after the session&apos;s first
            search ({fmt(section.report.success.sessionsWithCameraOpen)} of{" "}
            {fmt(section.report.success.searchSessions)} search sessions).
            {section.capped ? " Row cap reached — figures are a lower bound." : ""}
          </p>

          <h2 className={h2}>Most searched — demand vs catalogue inventory</h2>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full">
              <thead><tr><th className={th}>Term (token)</th><th className={th}>Searches</th><th className={th}>Zero-result</th><th className={th}>Catalogue place</th><th className={th}>Cameras</th></tr></thead>
              <tbody>
                {section.vsInventory.map((r) => (
                  <tr key={r.token}>
                    <td className={`${td} text-white/90`}>{r.token}</td>
                    <td className={td}>{fmt(r.searches)}</td>
                    <td className={td}>{fmt(r.zeroResultSearches)}</td>
                    <td className={td}>{r.place ?? "— no catalogue match"}</td>
                    <td className={td}>{r.cameras === null ? "—" : fmt(r.cameras)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className={h2}>Zero-result terms (every search returned nothing)</h2>
          {section.report.zeroResults.length === 0 ? (
            <p className={sub}>None in this window.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full">
                <thead><tr><th className={th}>Term (token)</th><th className={th}>Searches</th><th className={th}>Last searched</th></tr></thead>
                <tbody>
                  {section.report.zeroResults.map((r) => (
                    <tr key={r.token}>
                      <td className={`${td} text-white/90`}>{r.token}</td>
                      <td className={td}>{fmt(r.searches)}</td>
                      <td className={td}>{r.lastSearchedAt.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={`${sub} mt-3`}>
            Reading rule: a zero-result term that names a place the catalogue DOES hold
            points at search matching, not missing cameras; a term with no catalogue
            match is a candidate for the geo-page queue only when the inventory gate
            also passes. Recommendations feed the programme — nothing here publishes
            a page by itself.
          </p>

          <h2 className={h2}>Weekly trend</h2>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full">
              <thead><tr><th className={th}>Week of (Mon, UTC)</th><th className={th}>Searches</th><th className={th}>Zero-result</th></tr></thead>
              <tbody>
                {section.report.weekly.map((w) => (
                  <tr key={w.weekStart}>
                    <td className={td}>{w.weekStart}</td>
                    <td className={td}>{fmt(w.searches)}</td>
                    <td className={td}>{fmt(w.zeroResultSearches)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
