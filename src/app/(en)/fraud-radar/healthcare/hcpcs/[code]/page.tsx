import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { getHcpcsSummary } from "@/lib/fraud-radar/healthcare-neon";
import {
  getTopProviders,
  getDatasetMeta,
  formatCount,
  formatUsd,
} from "@/lib/fraud-radar/healthcare-data";
import {
  ResearchLeadNotice,
  DatasetProvenance,
} from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — HCPCS code detail (Phase 2): code totals from the
 * Neon summary grain + the top-50 billing providers for the code from
 * the published artifacts, cross-linked to provider profiles.
 */
export const metadata = {
  title: "Fraud Radar — HCPCS Code",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function HcpcsDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode).toUpperCase();

  const [summary, top, meta] = await Promise.all([
    getHcpcsSummary(code),
    getTopProviders(code),
    getDatasetMeta(),
  ]);
  if (summary === null && top === null) notFound();

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/healthcare/hcpcs" className="text-sm text-cyan-300 hover:underline">
          ← HCPCS explorer
        </Link>
        <h1 className="mt-6 font-mono text-3xl font-bold">HCPCS {code}</h1>
        <p className="mt-2 text-white/60">
          Medicaid Provider Spending{meta ? `, dataset version ${meta.version}` : ""} ·{" "}
          {summary
            ? `${summary.firstClaimMonth?.slice(0, 7) ?? "—"} – ${summary.lastClaimMonth?.slice(0, 7) ?? "—"} · active ${formatCount(summary.activeMonths)} months`
            : "code totals not loaded in this deployment"}
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {summary !== null && (
          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-2xl font-bold">{formatUsd(summary.paidExclOutliersUsd)}</div>
              <div className="mt-1 text-sm text-white/55">reported payments, excluding flagged outlier cells</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-2xl font-bold">{formatUsd(summary.paidAllCellsUsd)}</div>
              <div className="mt-1 text-sm text-white/55">
                reported payments, all reported cells (incl. {formatCount(summary.outlierCells)} flagged
                outlier cells, {formatUsd(summary.outlierPaidUsd)})
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-2xl font-bold">{formatCount(summary.totalClaimLines)}</div>
              <div className="mt-1 text-sm text-white/55">
                claim lines · {formatCount(summary.totalPatientsReported)} patients reported* ·{" "}
                {formatCount(summary.distinctBillingNpis)} billing /{" "}
                {formatCount(summary.distinctServicingNpis)} servicing providers
              </div>
            </div>
          </section>
        )}

        {top !== null && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Top billing providers for {code}</h2>
            <p className="mt-1 text-sm text-white/55">
              Top {top.length} by reported payments (excl. flagged outliers), of{" "}
              {summary ? formatCount(summary.distinctBillingNpis) : "—"} billing providers who
              reported this code.
            </p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="px-4 py-3 font-medium">Provider</th>
                    <th className="px-4 py-3 font-medium">Paid (excl. outliers)</th>
                    <th className="px-4 py-3 font-medium">Paid (all cells)</th>
                    <th className="px-4 py-3 font-medium">Claim lines</th>
                    <th className="px-4 py-3 font-medium">Patients reported</th>
                    <th className="px-4 py-3 font-medium">Servicing providers</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((r) => (
                    <tr key={r.npi} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/fraud-radar/healthcare/providers/${encodeURIComponent(r.npi)}`}
                          className="font-medium text-cyan-200 hover:underline"
                        >
                          {r.displayName ?? r.npi}
                        </Link>
                        <div className="font-mono text-xs text-white/40">NPI {r.npi}</div>
                      </td>
                      <td className="px-4 py-3 text-white/90">{formatUsd(r.paidExclOutliersUsd)}</td>
                      <td className="px-4 py-3 text-white/65">{formatUsd(r.paidAllCellsUsd)}</td>
                      <td className="px-4 py-3 text-white/70">{formatCount(r.totalClaimLines)}</td>
                      <td className="px-4 py-3 text-white/70">{formatCount(r.totalPatientsReported)}</td>
                      <td className="px-4 py-3 text-white/70">{formatCount(r.distinctServicingNpis)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <p className="mt-6 text-xs text-white/40">
          *Patients reported is a volume summed over reported cells, not a unique-beneficiary count.
        </p>
        {meta && (
          <div className="mt-6">
            <DatasetProvenance meta={meta} />
          </div>
        )}
      </div>
    </main>
  );
}
