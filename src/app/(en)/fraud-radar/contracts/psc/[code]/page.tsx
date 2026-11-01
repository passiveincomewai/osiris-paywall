import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { listContractsPscYears } from "@/lib/fraud-radar/contracts-neon";
import { getContractsTopVendors, contractsConfig } from "@/lib/fraud-radar/contracts-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import { NotPublishedYet } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — PSC detail (Phase 5): the code's attributed-year
 * rows from the Neon grain plus its published top vendors (≤ 50)
 * from the artifacts. Amounts are award-cumulative.
 */
export const metadata = {
  title: "Fraud Radar — PSC Detail",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ContractsPscDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const { code } = await params;
  const [years, top] = await Promise.all([
    listContractsPscYears(code),
    getContractsTopVendors("psc", code),
  ]);
  if (years === null && top === null) {
    if (contractsConfig() === null) {
      return (
        <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
          <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
            <Link href="/fraud-radar/contracts/psc" className="text-sm text-cyan-300 hover:underline">← PSC explorer</Link>
            <div className="mt-10"><NotPublishedYet what="The contracts PSC dataset" /></div>
          </div>
        </main>
      );
    }
    notFound();
  }
  const description = years?.find((r) => r.pscDescription)?.pscDescription ?? null;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/contracts/psc" className="text-sm text-cyan-300 hover:underline">← PSC explorer</Link>
        <h1 className="mt-6 text-3xl font-bold">PSC {code}</h1>
        {description && <p className="mt-2 text-white/60">{description}</p>}
        {years !== null && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">By attributed fiscal year</h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-white/50">
                    <th className="px-4 py-3 font-medium">Attributed FY</th>
                    <th className="px-4 py-3 font-medium">Awards</th>
                    <th className="px-4 py-3 font-medium">Vendors</th>
                    <th className="px-4 py-3 font-medium">Obligated (award-cumulative)</th>
                    <th className="px-4 py-3 font-medium">Outlayed (award-cumulative)</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((r) => (
                    <tr key={r.attributedFiscalYear} className="border-b border-white/5">
                      <td className="px-4 py-3 font-semibold">{r.attributedFiscalYear}</td>
                      <td className="px-4 py-3">{formatCount(r.awards)}</td>
                      <td className="px-4 py-3">{formatCount(r.distinctVendors)}</td>
                      <td className="px-4 py-3">{formatUsd(r.obligatedAwardCumulativeUsd)}</td>
                      <td className="px-4 py-3">{formatUsd(r.outlayAwardCumulativeUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {top !== null && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Top vendors in this PSC (published, ≤ 50)</h2>
            <ul className="mt-4 space-y-3">
              {top.map((v) => (
                <li key={v.uei} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <Link href={`/fraud-radar/contracts/vendors/${v.uei}`} className="font-semibold text-cyan-200 hover:underline">
                    {v.name ?? `UEI ${v.uei}`}
                  </Link>
                  <p className="mt-1 text-sm text-white/55">
                    UEI {v.uei}{v.state ? ` · ${v.state}` : ""} · {formatCount(v.awards)} awards ·{" "}
                    {formatUsd(v.totalDollarsObligated)} obligated (award-cumulative)
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
