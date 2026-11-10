import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  listHcpcsSummaries,
  type HcpcsSort,
} from "@/lib/fraud-radar/healthcare-neon";
import {
  getDatasetMeta,
  formatCount,
  formatUsd,
  TREATMENT,
} from "@/lib/fraud-radar/healthcare-data";
import { ResearchLeadNotice } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — HCPCS explorer (Phase 2). Code-level totals from the
 * Neon summary grain (published by the batch pipeline), every figure
 * in both labelled treatments. Reads fail soft: an unloaded grain
 * renders an honest "not loaded yet", never an error or a fake zero.
 */
export const metadata = {
  title: "Fraud Radar — HCPCS Explorer",
  description:
    "Every HCPCS procedure code in the Medicaid Provider Spending file with total payments, claim lines and provider counts.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const SORTS: { key: HcpcsSort; label: string }[] = [
  { key: "paid", label: "Top paid" },
  { key: "lines", label: "Most claim lines" },
  { key: "providers", label: "Most billing providers" },
  { key: "code", label: "Code A–Z" },
];

export default async function HcpcsExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) notFound();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toUpperCase();
  const sort = (SORTS.some((s) => s.key === sp.sort) ? sp.sort : "paid") as HcpcsSort;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const [data, meta] = await Promise.all([
    listHcpcsSummaries({ q: q || undefined, sort, page, pageSize: PAGE_SIZE }),
    getDatasetMeta(),
  ]);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    p.set("sort", sort);
    p.set("page", String(page));
    for (const [k, v] of Object.entries(patch)) p.set(k, v);
    return `/fraud-radar/healthcare/hcpcs?${p.toString()}`;
  };

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/healthcare" className="text-sm text-cyan-300 hover:underline">
          ← Healthcare
        </Link>
        <h1 className="mt-6 text-3xl font-bold">HCPCS explorer</h1>
        <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
          Procedure-code totals across the whole Medicaid Provider Spending file
          {meta ? ` (version ${meta.version})` : ""}. Headline payments{" "}
          {TREATMENT.exclLabel.toLowerCase()}; the all-cells figure is shown alongside, never
          instead — the difference is the 62 flagged source cells, which sit in rows the source
          does not attribute to an identified provider.
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {data === null ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Code summaries are not loaded yet</h2>
            <p className="mt-2 text-sm text-white/60 leading-relaxed">
              The Neon summary grain for this dataset has not been loaded into this deployment
              (operator step: scripts/fraud-radar-load-healthcare.mjs). Nothing is estimated or
              substituted in its place.
            </p>
          </div>
        ) : (
          <>
            <form method="get" className="mt-8 flex flex-wrap items-center gap-3">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Filter by code prefix, e.g. 992…"
                aria-label="Filter HCPCS codes by prefix"
                className="min-w-56 flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/35 focus:border-cyan-300/60 focus:outline-none"
              />
              <input type="hidden" name="sort" value={sort} />
              <button
                type="submit"
                className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Filter
              </button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {SORTS.map((s) => (
                <Link
                  key={s.key}
                  href={qs({ sort: s.key, page: "1" })}
                  className={
                    s.key === sort
                      ? "rounded-lg bg-cyan-400/20 px-3 py-1.5 text-cyan-200"
                      : "rounded-lg border border-white/10 px-3 py-1.5 text-white/60 hover:bg-white/5"
                  }
                >
                  {s.label}
                </Link>
              ))}
            </div>

            <p className="mt-6 text-sm text-white/55">
              {formatCount(data.total)} codes · page {page} of {formatCount(totalPages)}
            </p>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="px-4 py-3 font-medium">HCPCS</th>
                    <th className="px-4 py-3 font-medium">Paid (excl. outliers)</th>
                    <th className="px-4 py-3 font-medium">Paid (all cells)</th>
                    <th className="px-4 py-3 font-medium">Claim lines</th>
                    <th className="px-4 py-3 font-medium">Patients reported</th>
                    <th className="px-4 py-3 font-medium">Billing providers</th>
                    <th className="px-4 py-3 font-medium">Servicing providers</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.hcpcsCode} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <Link
                          href={`/fraud-radar/healthcare/hcpcs/${encodeURIComponent(r.hcpcsCode)}`}
                          className="font-mono font-medium text-cyan-200 hover:underline"
                        >
                          {r.hcpcsCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white/90">{formatUsd(r.paidExclOutliersUsd)}</td>
                      <td className="px-4 py-3 text-white/65">{formatUsd(r.paidAllCellsUsd)}</td>
                      <td className="px-4 py-3 text-white/70">{formatCount(r.totalClaimLines)}</td>
                      <td className="px-4 py-3 text-white/70">{formatCount(r.totalPatientsReported)}</td>
                      <td className="px-4 py-3 text-white/70">{formatCount(r.distinctBillingNpis)}</td>
                      <td className="px-4 py-3 text-white/70">{formatCount(r.distinctServicingNpis)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="mt-4 flex gap-3 text-sm">
              {page > 1 && (
                <Link className="text-cyan-300 hover:underline" href={qs({ page: String(page - 1) })}>
                  ← Previous
                </Link>
              )}
              {page < totalPages && (
                <Link className="text-cyan-300 hover:underline" href={qs({ page: String(page + 1) })}>
                  Next →
                </Link>
              )}
            </nav>
            <p className="mt-6 text-xs text-white/40 leading-relaxed">
              Patients reported is a volume summed over reported cells, not a unique-beneficiary
              count. Totals are sums over reported cells only — HHS suppresses cells with fewer
              than 12 claim lines, so a code absent here was not reported, not necessarily unused.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
