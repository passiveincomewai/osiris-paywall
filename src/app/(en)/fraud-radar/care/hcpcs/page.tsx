import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import { listMedicareHcpcs } from "@/lib/fraud-radar/care-neon";
import { CARE_YEARS, DERIVED_NOTE } from "@/lib/fraud-radar/care-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import { ResearchLeadNotice, NotPublishedYet } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — Medicare HCPCS explorer (Phase 3). Neon grain:
 * one row per HCPCS code per year, derived amounts labelled.
 */
export const metadata = {
  title: "Fraud Radar — Medicare HCPCS Explorer",
  description:
    "Explore Medicare fee-for-service HCPCS codes by derived payments, services and provider counts (CY2022–CY2024).",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function MedicareHcpcsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; year?: string; sort?: string; page?: string }>;
}) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) notFound();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toUpperCase();
  const yearRaw = Number.parseInt(sp.year ?? "", 10);
  const year = (CARE_YEARS as readonly number[]).includes(yearRaw)
    ? yearRaw
    : CARE_YEARS[CARE_YEARS.length - 1];
  const sort =
    sp.sort === "services" || sp.sort === "providers" || sp.sort === "code"
      ? sp.sort
      : "pymt";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const data = await listMedicareHcpcs({
    year,
    q: q || undefined,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const qs = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams({
      year: String(year),
      sort,
      ...(q ? { q } : {}),
      page: String(page),
    });
    for (const [k, v] of Object.entries(patch)) p.set(k, String(v));
    return `/fraud-radar/care/hcpcs?${p.toString()}`;
  };

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/care" className="text-sm text-cyan-300 hover:underline">
          ← Care Programs
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Medicare HCPCS explorer</h1>
        <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
          Every HCPCS code Medicare fee-for-service published for {year},
          with the providers who rendered it and derived payment totals.
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {data === null ? (
          <div className="mt-10">
            <NotPublishedYet what="The Medicare HCPCS summary" />
          </div>
        ) : (
          <>
            <form method="get" className="mt-8 flex flex-wrap items-end gap-3">
              <label className="text-sm text-white/60">
                Code prefix
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="e.g. 992"
                  className="mt-1 block rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-white placeholder:text-white/35"
                />
              </label>
              <label className="text-sm text-white/60">
                Year
                <select
                  name="year"
                  defaultValue={String(year)}
                  className="mt-1 block rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-white"
                >
                  {CARE_YEARS.map((y) => (
                    <option key={y} value={y} className="bg-slate-900">
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-white/60">
                Sort
                <select
                  name="sort"
                  defaultValue={sort}
                  className="mt-1 block rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-white"
                >
                  <option value="pymt" className="bg-slate-900">Derived payments</option>
                  <option value="services" className="bg-slate-900">Services</option>
                  <option value="providers" className="bg-slate-900">Providers</option>
                  <option value="code" className="bg-slate-900">Code</option>
                </select>
              </label>
              <button
                type="submit"
                className="rounded-lg bg-cyan-400 px-5 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Apply
              </button>
            </form>

            <p className="mt-6 text-sm text-white/50">
              {formatCount(data.total)} codes · page {page} of {formatCount(totalPages)}
            </p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-white/50">
                    <th className="px-4 py-3 font-medium">HCPCS</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Providers</th>
                    <th className="px-4 py-3 font-medium">Services</th>
                    <th className="px-4 py-3 font-medium">Beneficiaries (reported)</th>
                    <th className="px-4 py-3 font-medium">Payments (derived)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.hcpcsCode} className="border-b border-white/5">
                      <td className="px-4 py-3">
                        <Link
                          href={`/fraud-radar/care/hcpcs/${r.hcpcsCode}`}
                          className="text-cyan-200 hover:underline"
                        >
                          {r.hcpcsCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white/70">{r.hcpcsDesc ?? "—"}</td>
                      <td className="px-4 py-3">{formatCount(r.distinctProviders)}</td>
                      <td className="px-4 py-3">{formatCount(r.totalServices)}</td>
                      <td className="px-4 py-3">{formatCount(r.benesReported)}</td>
                      <td className="px-4 py-3">{formatUsd(r.pymtDerivedUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <nav className="mt-5 flex gap-3 text-sm">
              {page > 1 && (
                <Link href={qs({ page: page - 1 })} className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5">
                  ← Previous
                </Link>
              )}
              {page < totalPages && (
                <Link href={qs({ page: page + 1 })} className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5">
                  Next →
                </Link>
              )}
            </nav>
            <p className="mt-8 max-w-3xl text-sm text-white/50 leading-relaxed">
              {DERIVED_NOTE}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
