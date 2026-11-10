import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  searchCareProviders,
  getCareDatasetMeta,
  careConfig,
  DERIVED_NOTE,
} from "@/lib/fraud-radar/care-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import { ResearchLeadNotice, NotPublishedYet } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — Medicare provider search (Phase 3). Server-rendered
 * over the published care artifacts: NPI prefix or provider name.
 * Amounts are DERIVED from CMS's published averages and labelled
 * derived; a provider absent from a year was not published for that
 * year (CMS suppression) — never zero activity.
 */
export const metadata = {
  title: "Fraud Radar — Medicare Provider Search",
  description:
    "Search Medicare fee-for-service providers by NPI or name and open their derived payment profiles (CY2022–CY2024).",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function MedicareSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) notFound();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const configured = careConfig() !== null;
  const meta = configured ? await getCareDatasetMeta() : null;
  const result =
    configured && q.length > 0
      ? await searchCareProviders(q, { page, pageSize: PAGE_SIZE })
      : null;
  const totalPages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/care" className="text-sm text-cyan-300 hover:underline">
          ← Care Programs
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Medicare provider search</h1>
        <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
          Search by NPI (full number or at least the first 3 digits) or by
          provider name. Ranked by derived payments across{" "}
          {meta ? meta.yearsPresent.join(", ") : "2022–2024"}. Amounts are
          derived from published averages — see the note below the results.
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {!configured ? (
          <div className="mt-10">
            <NotPublishedYet what="The Medicare provider dataset" />
          </div>
        ) : (
          <>
            <form method="get" className="mt-8 flex flex-wrap gap-3">
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="NPI or provider name"
                className="min-w-64 flex-1 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-white placeholder:text-white/35"
              />
              <button
                type="submit"
                className="rounded-lg bg-cyan-400 px-5 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Search
              </button>
            </form>

            {result !== null && (
              <section className="mt-8">
                {result.error === "too_short" ? (
                  <p className="text-white/70">
                    Enter at least 3 characters of an NPI, or a provider name.
                  </p>
                ) : result.total === 0 ? (
                  <p className="text-white/70">
                    No providers match “{q}” in the published data. Absence
                    means CMS did not publish the provider for these years
                    (including small-cell suppression) — it does not mean
                    zero activity.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-white/50">
                      {formatCount(result.total)} matching providers · page{" "}
                      {result.page} of {formatCount(totalPages)}
                    </p>
                    <ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10">
                      {result.results.map((s) => (
                        <li key={s.npi} className="px-5 py-4">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <Link
                              href={`/fraud-radar/care/medicare/${s.npi}`}
                              className="font-semibold text-cyan-200 hover:underline"
                            >
                              {s.displayName ?? `NPI ${s.npi}`}
                            </Link>
                            <span className="text-sm text-white/85">
                              {formatUsd(s.pymtDerivedTotalUsd)} derived
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-white/50">
                            NPI {s.npi}
                            {s.providerType ? ` · ${s.providerType}` : ""}
                            {s.state ? ` · ${s.state}` : ""}
                            {s.yearsPresent.length > 0
                              ? ` · published ${s.yearsPresent.join(", ")}`
                              : ""}
                            {s.leieListed
                              ? " · appears on the LEIE exclusion list — a research lead, not a finding"
                              : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <nav className="mt-5 flex gap-3 text-sm">
                      {page > 1 && (
                        <Link
                          href={`/fraud-radar/care/medicare?q=${encodeURIComponent(q)}&page=${page - 1}`}
                          className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
                        >
                          ← Previous
                        </Link>
                      )}
                      {page < totalPages && (
                        <Link
                          href={`/fraud-radar/care/medicare?q=${encodeURIComponent(q)}&page=${page + 1}`}
                          className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
                        >
                          Next →
                        </Link>
                      )}
                    </nav>
                  </>
                )}
              </section>
            )}
            <p className="mt-8 max-w-3xl text-sm text-white/50 leading-relaxed">
              {DERIVED_NOTE}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
