import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { listGrantsAln } from "@/lib/fraud-radar/grants-neon";
import {
  getGrantsTopRecipients,
  getGrantsDatasetMeta,
  MEASURE_NOTE,
} from "@/lib/fraud-radar/grants-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import { ResearchLeadNotice, NotPublishedYet } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — assistance listing (ALN) detail (Phase 4): yearly
 * attributed totals from the Neon grain plus the top recipients
 * for the listing from the published artifacts. Amounts stay
 * award-cumulative in every year row.
 */
export const metadata = {
  title: "Fraud Radar — Assistance Listing (ALN) Detail",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function GrantsAlnDetailPage({
  params,
}: {
  params: Promise<{ aln: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const { aln: rawAln } = await params;
  const aln = rawAln.trim();
  const [byYear, top, meta] = await Promise.all([
    listGrantsAln({ q: aln, pageSize: 100 }),
    getGrantsTopRecipients(aln),
    getGrantsDatasetMeta(),
  ]);
  const rows = (byYear?.rows ?? [])
    .filter((r) => r.aln === aln)
    .sort((a, b) => a.attributedFiscalYear - b.attributedFiscalYear);
  if (byYear !== null && rows.length === 0 && top === null) notFound();
  const title = rows[0]?.alnTitle ?? null;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/grants/aln" className="text-sm text-cyan-300 hover:underline">
          ← Assistance listings explorer
        </Link>
        <h1 className="mt-6 text-3xl font-bold">
          ALN {aln}
          {title ? <span className="text-white/60"> — {title}</span> : null}
        </h1>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {byYear === null ? (
          <div className="mt-10">
            <NotPublishedYet what="The grants ALN summary" />
          </div>
        ) : (
          <>
            <section className="mt-10">
              <h2 className="text-xl font-semibold">
                By attributed fiscal year (award-cumulative amounts)
              </h2>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-white/50">
                      <th className="px-4 py-3 font-medium">Attributed FY</th>
                      <th className="px-4 py-3 font-medium">Recipients</th>
                      <th className="px-4 py-3 font-medium">Awards</th>
                      <th className="px-4 py-3 font-medium">Obligated (award-cumulative)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.attributedFiscalYear} className="border-b border-white/5">
                        <td className="px-4 py-3 font-semibold">{r.attributedFiscalYear}</td>
                        <td className="px-4 py-3">{formatCount(r.distinctRecipients)}</td>
                        <td className="px-4 py-3">{formatCount(r.awards)}</td>
                        <td className="px-4 py-3">{formatUsd(r.obligatedAwardCumulativeUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 max-w-3xl text-sm text-white/50 leading-relaxed">
                A year missing from this table means no award under this
                listing had its most recent snapshot in that archive
                year — missing data, never zero. {MEASURE_NOTE}
              </p>
            </section>

            {top !== null && (
              <section className="mt-10">
                <h2 className="text-xl font-semibold">
                  Top recipients (all attributed years, award-cumulative obligated)
                </h2>
                <ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10">
                  {top.map((t) => (
                    <li key={t.uei} className="px-5 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link
                          href={`/fraud-radar/grants/recipients/${t.uei}`}
                          className="text-cyan-200 hover:underline"
                        >
                          {t.recipientName ?? `UEI ${t.uei}`}
                        </Link>
                        <span className="text-sm text-white/85">
                          {formatUsd(t.obligatedAwardCumulativeUsd)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-white/50">
                        UEI {t.uei} · {formatCount(t.awards)} awards
                      </p>
                    </li>
                  ))}
                </ul>
                {meta !== null && (
                  <p className="mt-3 text-sm text-white/50">
                    Top recipients are drawn from the published grants
                    artifacts (dataset version {meta.version}).
                  </p>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
