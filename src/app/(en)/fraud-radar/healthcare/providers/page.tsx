import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  searchProviders,
  getDatasetMeta,
  formatCount,
  formatUsd,
  healthcareConfig,
} from "@/lib/fraud-radar/healthcare-data";
import { ResearchLeadNotice, NotPublishedYet } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — provider search (Phase 2). Server-rendered over the
 * published search-stub artifacts: by NPI prefix, and by provider name
 * once the NPPES identity join is published. Results rank by reported
 * payments (excl. flagged outliers); a provider's absent role shows
 * "—", never $0 — absence (incl. HHS suppression) is not zero.
 */
export const metadata = {
  title: "Fraud Radar — Medicaid Provider Search",
  description:
    "Search 1.8M Medicaid billing and servicing providers by NPI or name and open their payment profiles.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function ProviderSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const configured = healthcareConfig() !== null;
  const meta = configured ? await getDatasetMeta() : null;
  const result =
    configured && q.length > 0
      ? await searchProviders(q, { page, pageSize: PAGE_SIZE })
      : null;
  const totalPages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/healthcare" className="text-sm text-cyan-300 hover:underline">
          ← Healthcare
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Provider search</h1>
        <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
          Search by NPI (full number or at least the first 3 digits)
          {meta?.identity.source
            ? ", or by provider name. "
            : ". Provider names join this dataset with the NPPES identity file; until then providers are identified by NPI. "}
          Ranked by reported payments, excluding flagged outlier cells.
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {!configured ? (
          <div className="mt-8">
            <NotPublishedYet what="Provider search" />
          </div>
        ) : (
          <>
            <form method="get" className="mt-8 flex flex-wrap gap-3">
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="NPI or provider name…"
                aria-label="Search by NPI or provider name"
                className="min-w-64 flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/35 focus:border-cyan-300/60 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Search
              </button>
            </form>

            {result !== null && (
              <section className="mt-8">
                {result.error === "too_short" && (
                  <p className="text-sm text-amber-200">
                    Enter at least 3 characters — an NPI prefix or the start of a name — to search.
                  </p>
                )}
                {result.error === "unavailable" && result.mode === "name" && (
                  <p className="text-sm text-amber-200">
                    Name search is not available yet: the NPPES identity join has not been
                    published for this dataset version. NPI search works now.
                  </p>
                )}
                {result.error === undefined && result.total === 0 && (
                  <p className="text-sm text-white/60">
                    No providers match “{q}” in dataset version {meta?.version}. A provider can be
                    absent because the source never reported it — including cells HHS suppressed
                    (fewer than 12 claim lines) — which is not the same as zero activity.
                  </p>
                )}
                {result.total > 0 && (
                  <>
                    <p className="text-sm text-white/55">
                      {formatCount(result.total)} matching provider{result.total === 1 ? "" : "s"} ·
                      page {result.page} of {formatCount(totalPages)} · dataset {meta?.version}
                    </p>
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-white/50">
                            <th className="px-4 py-3 font-medium">Provider</th>
                            <th className="px-4 py-3 font-medium">Roles</th>
                            <th className="px-4 py-3 font-medium">Paid as billing (excl. outliers)</th>
                            <th className="px-4 py-3 font-medium">Paid as servicing (excl. outliers)</th>
                            <th className="px-4 py-3 font-medium">LEIE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.results.map((s) => (
                            <tr key={s.npi} className="border-b border-white/5 hover:bg-white/[0.02]">
                              <td className="px-4 py-3">
                                <Link
                                  href={`/fraud-radar/healthcare/providers/${encodeURIComponent(s.npi)}`}
                                  className="font-medium text-cyan-200 hover:underline"
                                >
                                  {s.displayName ?? s.npi}
                                </Link>
                                <div className="font-mono text-xs text-white/40">
                                  NPI {s.npi}
                                  {s.practiceState ? ` · ${s.practiceState}` : ""}
                                  {s.primaryTaxonomy ? ` · ${s.primaryTaxonomy}` : ""}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-white/70">
                                {[s.hasBilling ? "Billing" : null, s.hasServicing ? "Servicing" : null]
                                  .filter(Boolean)
                                  .join(" + ")}
                              </td>
                              <td className="px-4 py-3 text-white/85">{formatUsd(s.billingPaidExclUsd)}</td>
                              <td className="px-4 py-3 text-white/85">{formatUsd(s.servicingPaidExclUsd)}</td>
                              <td className="px-4 py-3">
                                {s.leieListed ? (
                                  <span className="rounded bg-amber-300/15 px-2 py-0.5 text-xs text-amber-200">
                                    Listed — review
                                  </span>
                                ) : (
                                  <span className="text-white/35">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <nav className="mt-4 flex gap-3 text-sm">
                      {page > 1 && (
                        <Link
                          className="text-cyan-300 hover:underline"
                          href={`/fraud-radar/healthcare/providers?q=${encodeURIComponent(q)}&page=${page - 1}`}
                        >
                          ← Previous
                        </Link>
                      )}
                      {page < totalPages && (
                        <Link
                          className="text-cyan-300 hover:underline"
                          href={`/fraud-radar/healthcare/providers?q=${encodeURIComponent(q)}&page=${page + 1}`}
                        >
                          Next →
                        </Link>
                      )}
                    </nav>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
