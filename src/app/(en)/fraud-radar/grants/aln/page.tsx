import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { listGrantsAln } from "@/lib/fraud-radar/grants-neon";
import { MEASURE_NOTE } from "@/lib/fraud-radar/grants-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import { ResearchLeadNotice, NotPublishedYet } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — assistance listing (ALN) explorer (Phase 4). Neon
 * grain: one row per ALN per attributed fiscal year, with
 * award-cumulative amounts. The attributed fiscal year is the
 * archive fiscal year of each award's most recent snapshot — it
 * assigns every award to exactly one year without changing what
 * the amounts mean.
 */
export const metadata = {
  title: "Fraud Radar — Assistance Listings (ALN) Explorer",
  description:
    "Explore federal assistance listings (ALNs) by attributed fiscal year, award counts, recipients and award-cumulative obligated totals (FY2018–FY2025).",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const GRANTS_YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] as const;

export default async function GrantsAlnPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; year?: string; sort?: string; page?: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toUpperCase();
  const yearRaw = Number.parseInt(sp.year ?? "", 10);
  const year = (GRANTS_YEARS as readonly number[]).includes(yearRaw)
    ? yearRaw
    : GRANTS_YEARS[GRANTS_YEARS.length - 1];
  const sort =
    sp.sort === "awards" || sp.sort === "recipients" || sp.sort === "aln"
      ? sp.sort
      : "obligated";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const data = await listGrantsAln({
    fiscalYear: year,
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
    return `/fraud-radar/grants/aln?${p.toString()}`;
  };

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/grants" className="text-sm text-cyan-300 hover:underline">
          ← Federal Grants
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Assistance listings (ALN) explorer</h1>
        <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
          Every assistance listing USAspending published for attributed
          fiscal year {year}, with the recipients funded under it and
          award-cumulative obligated totals.
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {data === null ? (
          <div className="mt-10">
            <NotPublishedYet what="The grants ALN summary" />
          </div>
        ) : (
          <>
            <form method="get" className="mt-8 flex flex-wrap items-end gap-3">
              <label className="text-sm text-white/60">
                ALN prefix
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="e.g. 93."
                  className="mt-1 block rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-white placeholder:text-white/35"
                />
              </label>
              <label className="text-sm text-white/60">
                Attributed fiscal year
                <select
                  name="year"
                  defaultValue={String(year)}
                  className="mt-1 block rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-white"
                >
                  {GRANTS_YEARS.map((y) => (
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
                  <option value="obligated" className="bg-slate-900">Obligated (award-cumulative)</option>
                  <option value="awards" className="bg-slate-900">Awards</option>
                  <option value="recipients" className="bg-slate-900">Recipients</option>
                  <option value="aln" className="bg-slate-900">ALN</option>
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
              {formatCount(data.total)} listings · page {page} of {formatCount(totalPages)}
            </p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-white/50">
                    <th className="px-4 py-3 font-medium">ALN</th>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Recipients</th>
                    <th className="px-4 py-3 font-medium">Awards</th>
                    <th className="px-4 py-3 font-medium">Obligated (award-cumulative)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.aln} className="border-b border-white/5">
                      <td className="px-4 py-3">
                        <Link
                          href={`/fraud-radar/grants/aln/${r.aln}`}
                          className="text-cyan-200 hover:underline"
                        >
                          {r.aln}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white/70">{r.alnTitle ?? "—"}</td>
                      <td className="px-4 py-3">{formatCount(r.distinctRecipients)}</td>
                      <td className="px-4 py-3">{formatCount(r.awards)}</td>
                      <td className="px-4 py-3">{formatUsd(r.obligatedAwardCumulativeUsd)}</td>
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
              A listing missing for a year means no award under that
              listing had its most recent snapshot in that archive year —
              missing data, never zero activity. {MEASURE_NOTE}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
