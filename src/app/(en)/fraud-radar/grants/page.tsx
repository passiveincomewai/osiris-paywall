import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  getGrantsDatasetMeta,
  MEASURE_NOTE,
  FAC_NOTE,
} from "@/lib/fraud-radar/grants-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import {
  listGrantsYearly,
  listGrantsAln,
  listGrantsAgency,
  listFacYearly,
} from "@/lib/fraud-radar/grants-neon";
import {
  ResearchLeadNotice,
  NotPublishedYet,
} from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — Federal Grants (Phase 4): USAspending federal
 * assistance awards plus the FAC single-audit bridge. Dark while
 * FRAUD_RADAR_ENABLED is off.
 *
 * Every USAspending amount on this page is an AWARD-CUMULATIVE
 * snapshot total for the overall award, shown under the attributed
 * fiscal year (the archive fiscal year of each award's most recent
 * snapshot). Amounts are never fiscal-year obligations, outlays or
 * expenditures — the definitions are rendered with the figures.
 * FAC figures cover public single audits only; questioned costs
 * appear as flag counts, never amounts.
 */
export const metadata = {
  title: "Fraud Radar — Federal Grants: USAspending Awards & Single Audits",
  description:
    "Research federal assistance awards by recipient, assistance listing (ALN) and agency from official USAspending records, with FAC single-audit coverage — award-cumulative amounts and attributed fiscal years defined on the page.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function GrantsPage() {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) notFound();

  const [meta, yearly, facYearly] = await Promise.all([
    getGrantsDatasetMeta(),
    listGrantsYearly(),
    listFacYearly(),
  ]);
  const latestYear =
    yearly && yearly.length > 0
      ? yearly[yearly.length - 1].fiscalYear
      : null;
  const [topAln, topAgency] =
    latestYear !== null
      ? await Promise.all([
          listGrantsAln({ fiscalYear: latestYear, pageSize: 10 }),
          listGrantsAgency({ fiscalYear: latestYear, pageSize: 10 }),
        ])
      : [null, null];
  const nothingPublished =
    meta === null && yearly === null && facYearly === null;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar" className="text-sm text-cyan-300 hover:underline">
          ← Fraud Radar
        </Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
          Government Grants
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
          Federal grants, from the official record.
        </h1>
        <p className="mt-4 max-w-3xl text-white/70 leading-relaxed">
          Every federal assistance award in the USAspending Award Data
          Archive (generation 2026-10-06), deduplicated to one row per
          award, researched by recipient, assistance listing (ALN) and
          awarding agency — and bridged to the Federal Audit
          Clearinghouse (FAC) single audits that examine how recipients
          spent federal funds. Obligations, outlays and expenditures
          are kept distinct throughout.
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {nothingPublished ? (
          <div className="mt-10">
            <NotPublishedYet what="The grants datasets (USAspending awards, FAC single audits)" />
          </div>
        ) : (
          <>
            {yearly !== null && (
              <section className="mt-10">
                <h2 className="text-xl font-semibold">
                  Awards by attributed fiscal year (award-cumulative amounts)
                </h2>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-white/50">
                        <th className="px-4 py-3 font-medium">Attributed FY</th>
                        <th className="px-4 py-3 font-medium">Awards</th>
                        <th className="px-4 py-3 font-medium">Recipients</th>
                        <th className="px-4 py-3 font-medium">Obligated (award-cumulative)</th>
                        <th className="px-4 py-3 font-medium">Outlayed (award-cumulative)</th>
                        <th className="px-4 py-3 font-medium">Reported subawards</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearly.map((y) => (
                        <tr key={y.fiscalYear} className="border-b border-white/5">
                          <td className="px-4 py-3 font-semibold">{y.fiscalYear}</td>
                          <td className="px-4 py-3">{formatCount(y.awards)}</td>
                          <td className="px-4 py-3">{formatCount(y.distinctRecipients)}</td>
                          <td className="px-4 py-3">{formatUsd(y.obligatedAwardCumulativeUsd)}</td>
                          <td className="px-4 py-3">{formatUsd(y.outlayAwardCumulativeUsd)}</td>
                          <td className="px-4 py-3">
                            {formatCount(y.subawardsCount)} · {formatUsd(y.subawardAmountUsd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-sm text-white/50 leading-relaxed">
                  {MEASURE_NOTE} Reported subawards are counted over the
                  published reported-subaward files for each fiscal year;
                  subaward (FSRS) reporting is incomplete by nature, so a
                  subaward count is a count of reports, not a census.
                </p>
              </section>
            )}

            <section className="mt-10 grid gap-4 sm:grid-cols-2">
              {topAln !== null && latestYear !== null && (
                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h2 className="text-lg font-semibold">
                    Top assistance listings, FY{latestYear} (attributed)
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {topAln.rows.map((r) => (
                      <li key={r.aln} className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link
                          href={`/fraud-radar/grants/aln/${r.aln}`}
                          className="text-cyan-200 hover:underline"
                        >
                          {r.aln}
                          {r.alnTitle ? ` — ${r.alnTitle}` : ""}
                        </Link>
                        <span className="text-white/85">
                          {formatUsd(r.obligatedAwardCumulativeUsd)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 text-sm">
                    <Link
                      href="/fraud-radar/grants/aln"
                      className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300 inline-block"
                    >
                      Explore assistance listings
                    </Link>
                  </div>
                </article>
              )}
              {topAgency !== null && latestYear !== null && (
                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h2 className="text-lg font-semibold">
                    Top awarding agencies, FY{latestYear} (attributed)
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {topAgency.rows.map((r) => (
                      <li key={r.agency} className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-white/85">{r.agency}</span>
                        <span className="text-white/85">
                          {formatUsd(r.obligatedAwardCumulativeUsd)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-white/50 leading-relaxed">
                    Agency rows use the same attributed fiscal year and
                    award-cumulative amounts as the yearly grain above.
                  </p>
                </article>
              )}
            </section>

            <section className="mt-10 grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h2 className="text-lg font-semibold">Recipient search</h2>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">
                  {meta
                    ? `${formatCount(meta.recipients)} recipients and ${formatCount(meta.awards)} awards — identity, award totals, ALN mix, top awards, single-audit coverage and exclusion screening on every profile.`
                    : "Recipient profiles with award totals, ALN mix, top awards, single-audit coverage and exclusion screening."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link
                    href="/fraud-radar/grants/recipients"
                    className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
                  >
                    Search grant recipients
                  </Link>
                  <Link
                    href="/fraud-radar/grants/fac"
                    className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
                  >
                    Single audits (FAC)
                  </Link>
                </div>
              </article>
              {facYearly !== null && (
                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h2 className="text-lg font-semibold">
                    Single audits (FAC), public reports
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {facYearly.slice(-3).map((f) => (
                      <li key={f.auditYear} className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-white/85">Audit year {f.auditYear}</span>
                        <span className="text-white/60">
                          {formatCount(f.reports)} reports · {formatCount(f.findingsCount)}{" "}
                          audit findings · {formatCount(f.questionedCostFlagCount)}{" "}
                          questioned-cost flags
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-white/50 leading-relaxed">
                    {FAC_NOTE}
                  </p>
                </article>
              )}
            </section>

            {meta !== null && (
              <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60 leading-relaxed">
                <h2 className="text-base font-semibold text-white">About this data</h2>
                <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-white/40">Awards</dt>
                    <dd>{meta.provenance.usaspending ?? "USAspending Award Data Archive"}</dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Single audits</dt>
                    <dd>{meta.provenance.fac ?? "Federal Audit Clearinghouse"}</dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Dataset version</dt>
                    <dd className="text-white/85">
                      {meta.version} (FAC {meta.facVersion})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Coverage</dt>
                    <dd>
                      Attributed fiscal years {meta.fiscalYears.join(", ")}
                      {meta.fac
                        ? ` · FAC audit years ${meta.fac.auditYears.join(", ")}`
                        : ""}
                    </dd>
                  </div>
                </dl>
                {meta.fac?.withheldCount != null && (
                  <p className="mt-3">
                    {formatCount(meta.fac.withheldCount)} FAC records carry
                    is_public=false and are withheld at source: only this
                    count is published, never their contents. Aggregates
                    on these pages cover public reports only.
                  </p>
                )}
                {Object.values(meta.statements).map((s) => (
                  <p key={s.slice(0, 24)} className="mt-2">{s}</p>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
