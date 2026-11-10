import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import { getCareDatasetMeta, DERIVED_NOTE } from "@/lib/fraud-radar/care-data";
import { formatCount } from "@/lib/fraud-radar/healthcare-data";
import { listMedicareYearly } from "@/lib/fraud-radar/care-neon";
import {
  ResearchLeadNotice,
  NotPublishedYet,
} from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — Care Programs (Phase 3): Medicare fee-for-service
 * utilization, hospice and home-health directories, from CMS's
 * official publications. Dark while FRAUD_RADAR_ENABLED is off.
 *
 * Every payment figure on this page is DERIVED from the source's
 * published averages (services × average) and is labelled derived;
 * the source publishes no claim-level amounts. Medicare Advantage
 * is a separate program and is never merged in.
 */
export const metadata = {
  title: "Fraud Radar — Care Programs: Medicare, Hospice & Home Health",
  description:
    "Research Medicare fee-for-service provider utilization, hospice and home health directories from official CMS records — derived amounts labelled, limitations stated, every figure traceable to its source.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CarePage() {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) notFound();

  const [meta, yearly] = await Promise.all([
    getCareDatasetMeta(),
    listMedicareYearly(),
  ]);
  const latest = yearly?.[yearly.length - 1] ?? null;
  const maxPymt = yearly
    ? Math.max(...yearly.map((y) => y.pymtDerivedUsd), 0)
    : 0;

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
          Medicare, hospice and home health — from the official record.
        </h1>
        <p className="mt-4 max-w-3xl text-white/70 leading-relaxed">
          CMS publishes what Medicare fee-for-service paid for, provider by
          provider and service by service — as averages, not claim lines.
          Fraud Radar derives totals from those averages, labels them
          derived everywhere, and screens the providers against the federal
          exclusion list. The hospice and home-health directories are CMS
          Care Compare&apos;s own listings, certification dates included.
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {meta === null && yearly === null ? (
          <div className="mt-10">
            <NotPublishedYet what="The care-program datasets (Medicare utilization, hospice and home-health directories)" />
          </div>
        ) : (
          <>
            {yearly !== null && latest !== null && (
              <section className="mt-10">
                <h2 className="text-xl font-semibold">
                  Medicare fee-for-service, by year (derived)
                </h2>
                <div className="mt-4 space-y-3">
                  {yearly.map((y) => (
                    <div key={y.dataYear} className="flex items-center gap-4">
                      <span className="w-12 text-sm text-white/60">{y.dataYear}</span>
                      <div className="h-6 flex-1 rounded bg-white/5">
                        <div
                          className="h-6 rounded bg-cyan-400/70"
                          style={{
                            width: `${maxPymt > 0 ? Math.max(1, (y.pymtDerivedUsd / maxPymt) * 100) : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-40 text-right text-sm text-white/85">
                        ${(y.pymtDerivedUsd / 1e9).toFixed(1)}B derived
                      </span>
                      <span className="hidden w-44 text-right text-sm text-white/50 sm:block">
                        {formatCount(y.distinctProviders)} providers
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm text-white/50 leading-relaxed">
                  {DERIVED_NOTE}
                </p>
              </section>
            )}

            <section className="mt-10 grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h2 className="text-lg font-semibold">Medicare provider search</h2>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">
                  {meta
                    ? `${formatCount(meta.providers)} providers across ${meta.yearsPresent.join(", ")} — yearly derived amounts, service breakdowns, and exclusion screening on every profile.`
                    : "Provider-level Medicare utilization with yearly derived amounts and exclusion screening."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link
                    href="/fraud-radar/care/medicare"
                    className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
                  >
                    Search Medicare providers
                  </Link>
                  <Link
                    href="/fraud-radar/care/hcpcs"
                    className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
                  >
                    Explore HCPCS codes
                  </Link>
                </div>
              </article>
              <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h2 className="text-lg font-semibold">Care Compare directories</h2>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">
                  {meta
                    ? `${formatCount(meta.directories.hospiceProviders)} CMS-certified hospices and ${formatCount(meta.directories.homeHealthAgencies)} home health agencies (Care Compare ${meta.directories.careCompareVersion} refresh) — the federal certification record for the care settings where licensing and oversight matter most.`
                    : "CMS-certified hospices and home health agencies from Care Compare."}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-sm">
                  <Link
                    href="/fraud-radar/care/hospice"
                    className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
                  >
                    Hospice directory
                  </Link>
                  <Link
                    href="/fraud-radar/care/home-health"
                    className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
                  >
                    Home health directory
                  </Link>
                </div>
              </article>
            </section>

            {meta !== null && (
              <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60 leading-relaxed">
                <h2 className="text-base font-semibold text-white">About this data</h2>
                <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-white/40">Medicare utilization</dt>
                    <dd>{meta.provenance.medicarePuf}</dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Directories</dt>
                    <dd>{meta.provenance.careCompare}</dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Exclusion screening</dt>
                    <dd>{meta.provenance.leie}</dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Dataset version</dt>
                    <dd className="text-white/85">{meta.version}</dd>
                  </div>
                </dl>
                <p className="mt-3">{meta.statements.suppression}</p>
                <p className="mt-2">{meta.statements.benesReported}</p>
                <p className="mt-2">{meta.statements.screening}</p>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
