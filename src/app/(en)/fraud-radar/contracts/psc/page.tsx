import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { listContractsPsc } from "@/lib/fraud-radar/contracts-neon";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import { NotPublishedYet } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — PSC explorer (Phase 5). Rows are PSC × attributed
 * fiscal year from the Neon grain; amounts are award-cumulative
 * snapshot totals under the attributed year.
 */
export const metadata = {
  title: "Fraud Radar — Contract PSC Explorer",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ContractsPscPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; fy?: string; page?: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const fy = sp.fy ? Number.parseInt(sp.fy, 10) || undefined : undefined;
  const data = await listContractsPsc({ q: sp.q, fiscalYear: fy, page, pageSize: 25 });

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/contracts" className="text-sm text-cyan-300 hover:underline">
          ← Federal Contracts
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Explore product &amp; service codes (PSC)</h1>
        <p className="mt-3 max-w-3xl text-white/60 leading-relaxed">
          Contract awards grouped by PSC and attributed fiscal year.
          Amounts are award-cumulative snapshot totals; the attributed
          year is the archive fiscal year of each award&apos;s winning
          snapshot.
        </p>
        <form method="get" className="mt-6 flex flex-wrap gap-3">
          <input name="q" defaultValue={sp.q ?? ""} placeholder="PSC prefix…" className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-white placeholder:text-white/35" />
          <input name="fy" defaultValue={sp.fy ?? ""} placeholder="Attributed FY" className="w-36 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-white placeholder:text-white/35" />
          <button type="submit" className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300">Filter</button>
        </form>
        {data === null ? (
          <div className="mt-10"><NotPublishedYet what="The contracts PSC grain" /></div>
        ) : (
          <section className="mt-8">
            <p className="text-sm text-white/50">{formatCount(data.total)} PSC × year rows · page {page}</p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-white/50">
                    <th className="px-4 py-3 font-medium">PSC</th>
                    <th className="px-4 py-3 font-medium">Attributed FY</th>
                    <th className="px-4 py-3 font-medium">Awards</th>
                    <th className="px-4 py-3 font-medium">Vendors</th>
                    <th className="px-4 py-3 font-medium">Obligated (award-cumulative)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={`${r.psc ?? "no-code-reported"}-${r.attributedFiscalYear}`} className="border-b border-white/5">
                      <td className="px-4 py-3">
                        {r.psc !== null ? (
                          <Link href={`/fraud-radar/contracts/psc/${r.psc}`} className="text-cyan-200 hover:underline">
                            {r.psc}{r.pscDescription ? ` — ${r.pscDescription}` : ""}
                          </Link>
                        ) : (
                          <span className="text-white/60">No PSC code reported</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{r.attributedFiscalYear}</td>
                      <td className="px-4 py-3">{formatCount(r.awards)}</td>
                      <td className="px-4 py-3">{formatCount(r.distinctVendors)}</td>
                      <td className="px-4 py-3">{formatUsd(r.obligatedAwardCumulativeUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
