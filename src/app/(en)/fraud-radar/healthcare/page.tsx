import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  getDatasetMeta,
  formatCount,
  formatUsd,
  TREATMENT,
} from "@/lib/fraud-radar/healthcare-data";
import { listMonthlyNational } from "@/lib/fraud-radar/healthcare-neon";
import MonthlyChart from "@/components/fraud-radar/MonthlyChart";
import {
  ResearchLeadNotice,
  DatasetProvenance,
  NotPublishedYet,
} from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — Healthcare & Care Programs engine (Phase 2).
 * Dark while FRAUD_RADAR_ENABLED is off (404), like every public
 * Fraud Radar route (AUDIT §13.3).
 */
export const metadata = {
  title: "Fraud Radar — Medicaid Provider Spending",
  description:
    "Research Medicaid provider payments from official HHS records: 1.8M providers, payment histories, HCPCS analysis and exclusion-list screening — every figure traceable to its source.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function HealthcarePage() {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) notFound();

  const [meta, national] = await Promise.all([
    getDatasetMeta(),
    listMonthlyNational(),
  ]);

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar" className="text-sm text-cyan-300 hover:underline">
          ← Fraud Radar
        </Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
          Healthcare &amp; Care Programs
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
          Medicaid provider spending, from the official record.
        </h1>
        <p className="mt-4 max-w-3xl text-white/70 leading-relaxed">
          Every provider that billed or serviced Medicaid claims in the HHS
          Provider Spending file (2018–2024), with payment histories,
          procedure-level breakdowns, and screening against the federal
          exclusion lists — reproducible from the published source, with
          its limitations stated on the page.
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {meta === null ? (
          <div className="mt-10">
            <NotPublishedYet what="The Medicaid dataset" />
          </div>
        ) : (
          <>
            <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-2xl font-bold">{formatCount(meta.totals.providers)}</div>
                <div className="mt-1 text-sm text-white/55">
                  providers in the file ({formatCount(meta.totals.billingProviders)} billing,{" "}
                  {formatCount(meta.totals.servicingProviders)} servicing)
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-2xl font-bold">
                  {formatUsd(meta.totals.programPaidExclOutliersUsd)}
                </div>
                <div className="mt-1 text-sm text-white/55">
                  reported Medicaid payments, billing grain, {TREATMENT.exclLabel.toLowerCase()}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-2xl font-bold">{formatCount(meta.totals.leieListedProviders)}</div>
                <div className="mt-1 text-sm text-white/55">
                  providers whose NPI appears in the LEIE exclusion snapshot — research leads for
                  human review, not findings
                </div>
              </div>
            </section>

            {national !== null && (
              <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h2 className="text-lg font-semibold">
                  Reported payments by month — all providers
                </h2>
                <p className="mt-1 text-sm text-white/55">
                  National totals from the same file, including rows the source does not attribute
                  to an identified billing provider.
                </p>
                <div className="mt-4">
                  <MonthlyChart
                    months={national.map((r) => r.ym)}
                    paidExclOutliersUsd={national.map((r) => r.paidExclOutliersUsd)}
                    paidAllCellsUsd={national.map((r) => r.paidAllCellsUsd)}
                  />
                </div>
              </section>
            )}

            <section className="mt-10 grid gap-4 sm:grid-cols-2">
              <Link
                href="/fraud-radar/healthcare/providers"
                className="rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.06] p-6 hover:bg-cyan-300/[0.1]"
              >
                <h2 className="text-xl font-semibold">Provider search →</h2>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">
                  Look up any of the {formatCount(meta.totals.providers)} providers by NPI
                  {meta.identity.source ? " or name" : ""} and open its payment profile.
                </p>
              </Link>
              <Link
                href="/fraud-radar/healthcare/hcpcs"
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 hover:bg-white/[0.05]"
              >
                <h2 className="text-xl font-semibold">HCPCS explorer →</h2>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">
                  All {formatCount(meta.totals.hcpcsCodes)} procedure codes with totals,
                  provider counts, and the top billing providers per code.
                </p>
              </Link>
            </section>

            <div className="mt-10">
              <DatasetProvenance meta={meta} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
