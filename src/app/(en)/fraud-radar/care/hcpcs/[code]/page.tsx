import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { listMedicareHcpcs } from "@/lib/fraud-radar/care-neon";
import {
  getCareTopProviders,
  getCareDatasetMeta,
  DERIVED_NOTE,
} from "@/lib/fraud-radar/care-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import { ResearchLeadNotice, NotPublishedYet } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — Medicare HCPCS code detail (Phase 3): per-year
 * summary from the Neon grain + the top providers by derived
 * payments for the latest covered year, from the artifacts.
 */
export const metadata = {
  title: "Fraud Radar — Medicare HCPCS Detail",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MedicareHcpcsDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const { code: rawCode } = await params;
  const code = rawCode.trim().toUpperCase();
  const [byYear, top, meta] = await Promise.all([
    listMedicareHcpcs({ q: code, pageSize: 100 }),
    getCareTopProviders(code),
    getCareDatasetMeta(),
  ]);
  const rows = (byYear?.rows ?? []).filter((r) => r.hcpcsCode === code);
  if (byYear !== null && rows.length === 0 && top === null) notFound();
  const desc = rows[0]?.hcpcsDesc ?? null;
  const latestYear = meta?.yearsPresent?.[meta.yearsPresent.length - 1] ?? null;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/care/hcpcs" className="text-sm text-cyan-300 hover:underline">
          ← Medicare HCPCS explorer
        </Link>
        <h1 className="mt-6 text-3xl font-bold">
          HCPCS {code}
          {desc ? <span className="text-white/60"> — {desc}</span> : null}
        </h1>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {byYear === null ? (
          <div className="mt-10">
            <NotPublishedYet what="The Medicare HCPCS summary" />
          </div>
        ) : (
          <>
            <section className="mt-10">
              <h2 className="text-xl font-semibold">By year (derived amounts)</h2>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-white/50">
                      <th className="px-4 py-3 font-medium">Year</th>
                      <th className="px-4 py-3 font-medium">Providers</th>
                      <th className="px-4 py-3 font-medium">Services</th>
                      <th className="px-4 py-3 font-medium">Beneficiaries (reported)</th>
                      <th className="px-4 py-3 font-medium">Payments (derived)</th>
                      <th className="px-4 py-3 font-medium">Allowed (derived)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.dataYear} className="border-b border-white/5">
                        <td className="px-4 py-3 font-semibold">{r.dataYear}</td>
                        <td className="px-4 py-3">{formatCount(r.distinctProviders)}</td>
                        <td className="px-4 py-3">{formatCount(r.totalServices)}</td>
                        <td className="px-4 py-3">{formatCount(r.benesReported)}</td>
                        <td className="px-4 py-3">{formatUsd(r.pymtDerivedUsd)}</td>
                        <td className="px-4 py-3">{formatUsd(r.allowedDerivedUsd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 max-w-3xl text-sm text-white/50 leading-relaxed">
                A year missing from this table means CMS did not publish the
                code that year (or suppressed its cells) — missing data,
                never zero. {DERIVED_NOTE}
              </p>
            </section>

            {top !== null && latestYear !== null && (
              <section className="mt-10">
                <h2 className="text-xl font-semibold">
                  Top providers, {latestYear} (derived payments)
                </h2>
                <ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10">
                  {top.map((t) => (
                    <li key={t.npi} className="px-5 py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <Link
                          href={`/fraud-radar/care/medicare/${t.npi}`}
                          className="text-cyan-200 hover:underline"
                        >
                          {t.displayName ?? `NPI ${t.npi}`}
                        </Link>
                        <span className="text-sm text-white/85">
                          {formatUsd(t.pymtDerivedUsd)} derived
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-white/50">
                        NPI {t.npi} · {formatCount(t.services)} services ·{" "}
                        {formatCount(t.benesReported)} beneficiaries (reported)
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
