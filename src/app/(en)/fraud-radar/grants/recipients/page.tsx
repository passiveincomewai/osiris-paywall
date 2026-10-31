import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  searchGrantRecipients,
  getGrantsDatasetMeta,
  grantsConfig,
  MEASURE_NOTE,
  SCREENING_NOTE,
} from "@/lib/fraud-radar/grants-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import { ResearchLeadNotice, NotPublishedYet } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — grant recipient search (Phase 4). Server-rendered
 * over the published grants artifacts: UEI prefix or recipient name.
 * Amounts are AWARD-CUMULATIVE snapshot totals (see the note below
 * the results); a recipient absent from the published data was not
 * in the published award files — never zero activity.
 */
export const metadata = {
  title: "Fraud Radar — Grant Recipient Search",
  description:
    "Search federal grant recipients by UEI or name and open their award profiles (USAspending generation 2026-10-06).",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function GrantRecipientsSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const configured = grantsConfig() !== null;
  const meta = configured ? await getGrantsDatasetMeta() : null;
  const result =
    configured && q.length > 0
      ? await searchGrantRecipients(q, { page, pageSize: PAGE_SIZE })
      : null;
  const totalPages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/grants" className="text-sm text-cyan-300 hover:underline">
          ← Federal Grants
        </Link>
        <h1 className="mt-6 text-3xl font-bold">Grant recipient search</h1>
        <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
          Search by UEI (full identifier or at least the first 3
          characters) or by recipient name. Ranked by obligated
          award-cumulative totals across{" "}
          {meta ? meta.fiscalYears.join(", ") : "2018–2025"} (attributed
          fiscal years). Amounts are award-cumulative — see the note
          below the results.
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {!configured ? (
          <div className="mt-10">
            <NotPublishedYet what="The grants recipient dataset" />
          </div>
        ) : (
          <>
            <form method="get" className="mt-8 flex flex-wrap gap-3">
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="UEI or recipient name"
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
                    Enter at least 3 characters of a UEI, or a recipient name.
                  </p>
                ) : result.total === 0 ? (
                  <p className="text-white/70">
                    No recipients match “{q}” in the published data.
                    Absence means the recipient does not appear in the
                    published award files — it does not mean zero
                    activity. Awards paid directly to individuals carry
                    no recipient UEI and are not searchable here.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-white/50">
                      {formatCount(result.total)} matching recipients · page{" "}
                      {result.page} of {formatCount(totalPages)}
                    </p>
                    <ul className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10">
                      {result.results.map((s) => (
                        <li key={s.uei} className="px-5 py-4">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <Link
                              href={`/fraud-radar/grants/recipients/${s.uei}`}
                              className="font-semibold text-cyan-200 hover:underline"
                            >
                              {s.recipientName ?? `UEI ${s.uei}`}
                            </Link>
                            <span className="text-sm text-white/85">
                              {formatUsd(s.obligatedAwardCumulativeUsd)} obligated
                              (award-cumulative)
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-white/50">
                            UEI {s.uei}
                            {s.city || s.state
                              ? ` · ${[s.city, s.state].filter(Boolean).join(", ")}`
                              : ""}
                            {` · ${formatCount(s.awardCount)} awards`}
                            {s.facHasPublicRecord === true
                              ? " · has a public FAC single-audit record"
                              : s.facHasPublicRecord === false
                                ? " · no public FAC single-audit record in the published vintage"
                                : ""}
                            {s.samExclusionListed
                              ? " · listed in the SAM exclusions extract 2026-301 — a research lead, not a finding"
                              : ""}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <nav className="mt-5 flex gap-3 text-sm">
                      {page > 1 && (
                        <Link
                          href={`/fraud-radar/grants/recipients?q=${encodeURIComponent(q)}&page=${page - 1}`}
                          className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
                        >
                          ← Previous
                        </Link>
                      )}
                      {page < totalPages && (
                        <Link
                          href={`/fraud-radar/grants/recipients?q=${encodeURIComponent(q)}&page=${page + 1}`}
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
              {MEASURE_NOTE}
            </p>
            <p className="mt-3 max-w-3xl text-sm text-white/50 leading-relaxed">
              {SCREENING_NOTE}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
