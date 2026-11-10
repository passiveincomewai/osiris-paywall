import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  getContractsDatasetMeta,
  MEASURE_NOTE,
  CEILINGS_NOTE,
  NO_FAC_NOTE,
  PARENT_LINKAGE_NOTE,
} from "@/lib/fraud-radar/contracts-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import {
  listContractsYearly,
  listContractsNaics,
  listContractsAgency,
} from "@/lib/fraud-radar/contracts-neon";
import {
  ResearchLeadNotice,
  NotPublishedYet,
} from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — Federal Contracts (Phase 5): USAspending contract
 * awards, vendors and modification histories. Dark while
 * FRAUD_RADAR_ENABLED is off.
 *
 * Every USAspending amount on this page is an AWARD-CUMULATIVE
 * snapshot total for the overall award, shown under the attributed
 * fiscal year (the archive fiscal year of each award's most recent
 * snapshot). Amounts are never fiscal-year obligations. Ceilings
 * are not obligations, and FAC does not cover contracts — both
 * stated on the page, next to the figures they qualify.
 */
export const metadata = {
  title: "Fraud Radar — Federal Contracts: USAspending Awards, Vendors & Modifications",
  description:
    "Research federal contract awards by vendor, NAICS, PSC and agency from official USAspending records — award-cumulative amounts, full modification histories, ceilings kept distinct from obligations.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) notFound();

  const [meta, yearly] = await Promise.all([
    getContractsDatasetMeta(),
    listContractsYearly(),
  ]);
  const latestYear =
    yearly && yearly.length > 0 ? yearly[yearly.length - 1].fiscalYear : null;
  const [topNaics, topAgency] =
    latestYear !== null
      ? await Promise.all([
          listContractsNaics({ fiscalYear: latestYear, pageSize: 10 }),
          listContractsAgency({ fiscalYear: latestYear, pageSize: 10 }),
        ])
      : [null, null];
  const nothingPublished = meta === null && yearly === null;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar" className="text-sm text-cyan-300 hover:underline">
          ← Fraud Radar
        </Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
          Government Contracts
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
          Federal contracts, from the official record.
        </h1>
        <p className="mt-4 max-w-3xl text-white/70 leading-relaxed">
          Every federal contract award in the USAspending Award Data
          Archive (generation 2026-10-06, fiscal years 2018–2025),
          deduplicated to one row per award, researched by vendor,
          NAICS code, product/service code (PSC) and awarding agency —
          with each award&apos;s full modification history published as
          reported. Obligations, outlays and contract ceilings are
          kept distinct throughout.
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {nothingPublished ? (
          <div className="mt-10">
            <NotPublishedYet what="The contracts dataset (USAspending contract awards)" />
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
                        <th className="px-4 py-3 font-medium">Vendors</th>
                        <th className="px-4 py-3 font-medium">Obligated (award-cumulative)</th>
                        <th className="px-4 py-3 font-medium">Outlayed (award-cumulative)</th>
                        <th className="px-4 py-3 font-medium">Transactions in window</th>
                        <th className="px-4 py-3 font-medium">Modifications in window</th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearly.map((y) => (
                        <tr key={y.fiscalYear} className="border-b border-white/5">
                          <td className="px-4 py-3 font-semibold">{y.fiscalYear}</td>
                          <td className="px-4 py-3">{formatCount(y.awards)}</td>
                          <td className="px-4 py-3">{formatCount(y.distinctVendors)}</td>
                          <td className="px-4 py-3">{formatUsd(y.obligatedAwardCumulativeUsd)}</td>
                          <td className="px-4 py-3">{formatUsd(y.outlayAwardCumulativeUsd)}</td>
                          <td className="px-4 py-3">{formatCount(y.transactions)}</td>
                          <td className="px-4 py-3">{formatCount(y.modifications)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-sm text-white/50 leading-relaxed">{MEASURE_NOTE}</p>
                <p className="mt-2 text-sm text-white/50 leading-relaxed">
                  Modification history: a contract award changes over its
                  life through numbered modifications (base action
                  &quot;0&quot;, then P00001 and onward) — funding actions,
                  option exercises, administrative changes and
                  terminations. Each award page publishes that full chain
                  as reported. History rows are displayed as reported and
                  are never re-summed into award totals; the only
                  transaction-grain figure published is each award&apos;s
                  labelled in-window sum of federal_action_obligation
                  over the FY2018–FY2025 window.
                </p>
              </section>
            )}

            <section className="mt-10 grid gap-4 sm:grid-cols-2">
              {topNaics !== null && latestYear !== null && (
                <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <h2 className="text-lg font-semibold">
                    Top NAICS codes, FY{latestYear} (attributed)
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {topNaics.rows.map((r) => (
                      <li key={r.naics ?? "no-code-reported"} className="flex flex-wrap items-baseline justify-between gap-2">
                        {r.naics !== null ? (
                          <Link
                            href={`/fraud-radar/contracts/naics/${r.naics}`}
                            className="text-cyan-200 hover:underline"
                          >
                            {r.naics}
                            {r.naicsDescription ? ` — ${r.naicsDescription}` : ""}
                          </Link>
                        ) : (
                          <span className="text-white/60">No NAICS code reported</span>
                        )}
                        <span className="text-white/85">
                          {formatUsd(r.obligatedAwardCumulativeUsd)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 text-sm">
                    <Link
                      href="/fraud-radar/contracts/naics"
                      className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300 inline-block"
                    >
                      Explore NAICS codes
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
                <h2 className="text-lg font-semibold">Vendor search</h2>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">
                  {meta
                    ? `${formatCount(meta.vendors)} vendors and ${formatCount(meta.awards)} awards — identity, SAM registration (extract-dated), exclusion screening, award totals, NAICS/PSC mix, top awards and reported subcontracts on every profile.`
                    : "Vendor profiles with SAM registration (extract-dated), exclusion screening, award totals, NAICS/PSC mix, top awards and reported subcontracts."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link
                    href="/fraud-radar/contracts/vendors"
                    className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
                  >
                    Search contract vendors
                  </Link>
                  <Link
                    href="/fraud-radar/contracts/psc"
                    className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
                  >
                    Explore PSC codes
                  </Link>
                </div>
              </article>
              <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h2 className="text-lg font-semibold">What these figures are — and are not</h2>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">{CEILINGS_NOTE}</p>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">{NO_FAC_NOTE}</p>
              </article>
            </section>

            {meta !== null && (
              <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60 leading-relaxed">
                <h2 className="text-base font-semibold text-white">About this data</h2>
                <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-white/40">Dataset version</dt>
                    <dd className="text-white/85">{meta.version} (USAspending archive generation)</dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Coverage</dt>
                    <dd>
                      Attributed fiscal years {meta.fiscalYears.join(", ")} ·
                      FY2026 archive files exist but run light from FPDS
                      reporting lag and are excluded from this vintage.
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Awards / transactions</dt>
                    <dd>
                      {formatCount(meta.awards)} awards ·{" "}
                      {formatCount(meta.totals.transactionsInWindow)} published
                      transactions · {formatCount(meta.totals.modificationsInWindow)}{" "}
                      modifications in window
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Sampling &amp; screening extracts</dt>
                    <dd>
                      SAM entities extract 2026-10-05 · SAM exclusions
                      extract 2026-301 (2026-10-28) · LEIE 2026-10 —
                      extract records, never live status; no SAM.gov API
                      is used.
                    </dd>
                  </div>
                </dl>
                <p className="mt-3">{PARENT_LINKAGE_NOTE}</p>
                {Object.values(meta.measureDefinitions).map((s) => (
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
