import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  getProviderProfile,
  getDatasetMeta,
  healthcareConfig,
  formatCount,
  formatUsd,
  ymLabel,
  TREATMENT,
  type RoleBlock,
} from "@/lib/fraud-radar/healthcare-data";
import MonthlyChart from "@/components/fraud-radar/MonthlyChart";
import { ResearchSignalsSection } from "@/components/fraud-radar/ResearchSignals";
import {
  ResearchLeadNotice,
  DatasetProvenance,
  NotPublishedYet,
} from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — provider profile (Phase 2). One NPI: identity (NPPES
 * join when published; NPI-only, stated plainly, until then), payment
 * summary in both labelled treatments, the monthly payment series,
 * the HCPCS breakdown, and the exclusion-screening section — framed
 * throughout as research data and leads, never as findings.
 */
export const metadata = {
  title: "Fraud Radar — Provider Profile",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function RoleSection({
  title,
  role,
  counterpartyLabel,
}: {
  title: string;
  role: RoleBlock | null;
  counterpartyLabel: string;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {role === null ? (
        <p className="mt-2 text-sm text-white/60 leading-relaxed">
          No {title.toLowerCase()} records in this dataset. The source reports nothing for this
          provider in this role — including cells HHS suppressed (fewer than 12 claim lines).
          Absence is missing data, never $0.
        </p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-white/40">Reported payments ({TREATMENT.exclLabel.toLowerCase()})</dt>
              <dd className="mt-0.5 text-base font-semibold text-white">
                {formatUsd(role.paidExclOutliersUsd)}
              </dd>
            </div>
            <div>
              <dt className="text-white/40">Reported payments (all reported cells)</dt>
              <dd className="mt-0.5 text-white/85">{formatUsd(role.paidAllCellsUsd)}</dd>
            </div>
            <div>
              <dt className="text-white/40">Flagged outlier cells in this role</dt>
              <dd className="mt-0.5 text-white/85">
                {formatCount(role.outlierCells)} ({formatUsd(role.outlierPaidUsd)})
              </dd>
            </div>
            <div>
              <dt className="text-white/40">Claim lines</dt>
              <dd className="mt-0.5 text-white/85">{formatCount(role.totalClaimLines)}</dd>
            </div>
            <div>
              <dt className="text-white/40">Patients reported*</dt>
              <dd className="mt-0.5 text-white/85">{formatCount(role.totalPatientsReported)}</dd>
            </div>
            <div>
              <dt className="text-white/40">Reported cells</dt>
              <dd className="mt-0.5 text-white/85">{formatCount(role.reportedCells)}</dd>
            </div>
            <div>
              <dt className="text-white/40">{counterpartyLabel}</dt>
              <dd className="mt-0.5 text-white/85">{formatCount(role.distinctCounterparties)}</dd>
            </div>
            <div>
              <dt className="text-white/40">Distinct HCPCS codes</dt>
              <dd className="mt-0.5 text-white/85">{formatCount(role.distinctHcpcsCodes)}</dd>
            </div>
            <div>
              <dt className="text-white/40">Active months</dt>
              <dd className="mt-0.5 text-white/85">
                {formatCount(role.activeMonths)}
                {role.firstMonth && role.lastMonth
                  ? ` (${role.firstMonth.slice(0, 7)} – ${role.lastMonth.slice(0, 7)})`
                  : ""}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-white/40">
            *Patients reported is a volume summed over reported cells; patients repeat across
            cells and months, so it is not a unique-beneficiary count.
          </p>
        </>
      )}
    </section>
  );
}

export default async function ProviderProfilePage({
  params,
}: {
  params: Promise<{ npi: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const { npi } = await params;

  if (healthcareConfig() === null) {
    return (
      <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
        <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 text-white">
          <Link href="/fraud-radar/healthcare/providers" className="text-sm text-cyan-300 hover:underline">
            ← Provider search
          </Link>
          <div className="mt-8">
            <NotPublishedYet what="Provider profiles" />
          </div>
        </div>
      </main>
    );
  }

  const [profile, meta] = await Promise.all([getProviderProfile(npi), getDatasetMeta()]);
  if (profile === null) notFound();
  // Phase 6 (Payload B2): the research-signals section is an async
  // server component; it is awaited here so the page's element tree
  // stays synchronously renderable (the established page-test
  // pattern), exactly as the page's own data reads are awaited.
  const researchSignals = await ResearchSignalsSection({
    engine: "healthcare",
    entityKey: profile.npi,
  });
  const { summary, identity, hcpcs, leie, monthly } = profile;
  const displayName = identity?.displayName ?? profile.stub?.displayName ?? null;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/healthcare/providers" className="text-sm text-cyan-300 hover:underline">
          ← Provider search
        </Link>
        <h1 className="mt-6 text-3xl font-bold leading-tight">
          {displayName ?? `Provider ${profile.npi}`}
        </h1>
        <p className="mt-2 font-mono text-sm text-white/50">
          NPI {profile.npi}
          {summary.hasBilling ? " · Billing" : ""}
          {summary.hasServicing ? " · Servicing" : ""}
          {identity?.practiceState ? ` · ${identity.practiceState}` : ""}
          {identity?.primaryTaxonomy ? ` · ${identity.primaryTaxonomy}` : ""}
        </p>
        {summary.leieListed && (
          <p className="mt-3 inline-block rounded bg-amber-300/15 px-2.5 py-1 text-xs text-amber-200">
            This NPI appears in the LEIE exclusion snapshot — see Screening below. A listing is a
            research lead for human review, not a finding.
          </p>
        )}
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-semibold">Identity</h2>
          {identity ? (
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="text-white/40">Name (NPPES)</dt><dd className="text-white/85">{identity.displayName ?? "—"}</dd></div>
              <div><dt className="text-white/40">Type</dt><dd className="text-white/85">{identity.entityType ?? "—"}</dd></div>
              <div><dt className="text-white/40">Primary taxonomy</dt><dd className="text-white/85">{identity.primaryTaxonomy ?? "—"}</dd></div>
              <div><dt className="text-white/40">Practice location</dt><dd className="text-white/85">
                {[identity.practiceState, identity.practiceZip5].filter(Boolean).join(" ") || "—"}
              </dd></div>
              <div><dt className="text-white/40">Enumerated</dt><dd className="text-white/85">{identity.enumerationDate ?? "—"}</dd></div>
              <div><dt className="text-white/40">NPPES last update</dt><dd className="text-white/85">{identity.lastUpdateDate ?? "—"}</dd></div>
              {identity.deactivationDate && (
                <div><dt className="text-white/40">NPI deactivated</dt><dd className="text-white/85">{identity.deactivationDate}</dd></div>
              )}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-white/60 leading-relaxed">
              Identified by NPI only in this dataset version. The NPPES identity join (legal name,
              taxonomy, practice address) has not been published for it yet — nothing about this
              provider&apos;s identity is inferred from the payment data.
              {summary.leieListedNames
                ? ` The LEIE snapshot lists this NPI under: ${summary.leieListedNames}.`
                : ""}
            </p>
          )}
          <p className="mt-3 text-xs text-white/40">
            NPI registration is not proof of current licensing or program eligibility.
          </p>
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <RoleSection title="Billing role" role={summary.billing} counterpartyLabel="Distinct servicing providers" />
          <RoleSection title="Servicing role" role={summary.servicing} counterpartyLabel="Distinct billing providers" />
        </div>

        {monthly !== null && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-lg font-semibold">Payments by month — billing role</h2>
            <p className="mt-1 text-sm text-white/55">
              The monthly series is published at billing grain; servicing-role payments have no
              monthly breakdown in this dataset.
            </p>
            <div className="mt-4">
              <MonthlyChart
                months={monthly.months}
                paidExclOutliersUsd={monthly.paidExclOutliersUsd}
                paidAllCellsUsd={monthly.paidAllCellsUsd}
              />
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-cyan-300">Monthly figures</summary>
              <div className="mt-3 max-h-96 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50">
                      <th className="px-3 py-2 font-medium">Month</th>
                      <th className="px-3 py-2 font-medium">Paid (excl. outliers)</th>
                      <th className="px-3 py-2 font-medium">Paid (all cells)</th>
                      <th className="px-3 py-2 font-medium">Claim lines</th>
                      <th className="px-3 py-2 font-medium">Patients reported</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.months.map((ym, i) => (
                      <tr key={ym} className="border-b border-white/5">
                        <td className="px-3 py-1.5 text-white/70">{ymLabel(ym)}</td>
                        <td className="px-3 py-1.5">{formatUsd(monthly.paidExclOutliersUsd[i])}</td>
                        <td className="px-3 py-1.5 text-white/70">{formatUsd(monthly.paidAllCellsUsd[i])}</td>
                        <td className="px-3 py-1.5 text-white/70">{formatCount(monthly.totalClaimLines[i])}</td>
                        <td className="px-3 py-1.5 text-white/70">{formatCount(monthly.totalPatientsReported[i])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        )}

        {hcpcs.length > 0 && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-lg font-semibold">HCPCS breakdown — billing role</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Paid (excl. outliers)</th>
                    <th className="px-3 py-2 font-medium">Paid (all cells)</th>
                    <th className="px-3 py-2 font-medium">Claim lines</th>
                    <th className="px-3 py-2 font-medium">Patients reported</th>
                    <th className="px-3 py-2 font-medium">Servicing providers</th>
                    <th className="px-3 py-2 font-medium">Months</th>
                  </tr>
                </thead>
                <tbody>
                  {hcpcs.map((h) => (
                    <tr key={h.hcpcsCode} className="border-b border-white/5">
                      <td className="px-3 py-2">
                        <Link
                          href={`/fraud-radar/healthcare/hcpcs/${encodeURIComponent(h.hcpcsCode)}`}
                          className="font-mono text-cyan-200 hover:underline"
                        >
                          {h.hcpcsCode}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{formatUsd(h.paidExclOutliersUsd)}</td>
                      <td className="px-3 py-2 text-white/70">{formatUsd(h.paidAllCellsUsd)}</td>
                      <td className="px-3 py-2 text-white/70">{formatCount(h.totalClaimLines)}</td>
                      <td className="px-3 py-2 text-white/70">{formatCount(h.totalPatientsReported)}</td>
                      <td className="px-3 py-2 text-white/70">{formatCount(h.distinctServicingNpis)}</td>
                      <td className="px-3 py-2 text-white/70">
                        {h.firstClaimMonth?.slice(0, 7) ?? "—"} – {h.lastClaimMonth?.slice(0, 7) ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Phase 6 (Payload B2): this provider's published research
            leads, read from the signals artifacts — fail-soft to
            absent when no signals artifact is configured. */}
        <div className="mt-6">{researchSignals}</div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-semibold">Screening — exclusion lists</h2>
          {leie.length > 0 || summary.leieListed ? (
            <>
              <p className="mt-2 text-sm text-white/65 leading-relaxed">
                This NPI matches {formatCount(summary.leieRecordCount)} record
                {summary.leieRecordCount === 1 ? "" : "s"} in the LEIE snapshot
                {meta ? ` (version ${meta.sources.leie.version})` : ""} by exact NPI — the strongest
                identifier match available. The claims here span 2018–2024 and the LEIE is a
                current-exclusions snapshot, so payment <em>before</em> an exclusion date is
                expected and is not a finding. Payment after the exclusion month is a research
                lead: exclusion effective dates, waivers and program rules all bear on it, and
                only human review can weigh them.
              </p>
              {leie.map((r, i) => (
                <div key={i} className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-4 text-sm">
                  <div className="font-medium text-white">
                    {[r.busname, [r.firstname, r.lastname].filter(Boolean).join(" ")].filter(Boolean).join(" · ") || "Listed party"}
                  </div>
                  <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                    <div><dt className="text-white/40">Exclusion type</dt><dd className="text-white/85">{r.excltype ?? "—"}</dd></div>
                    <div><dt className="text-white/40">Exclusion date</dt><dd className="text-white/85">{r.excldate ?? "—"}</dd></div>
                    <div><dt className="text-white/40">LEIE general / specialty</dt><dd className="text-white/85">{[r.general, r.specialty].filter(Boolean).join(" / ") || "—"}</dd></div>
                    <div><dt className="text-white/40">LEIE address</dt><dd className="text-white/85">{[r.city, r.state].filter(Boolean).join(", ") || "—"}</dd></div>
                    <div><dt className="text-white/40">Paid after exclusion month — billing (excl. outliers)</dt><dd className="text-white/85">{formatUsd(r.billingPaidAfterExclUsd)}</dd></div>
                    <div><dt className="text-white/40">Paid after exclusion month — servicing (excl. outliers)</dt><dd className="text-white/85">{formatUsd(r.servicingPaidAfterExclUsd)}</dd></div>
                  </dl>
                </div>
              ))}
            </>
          ) : (
            <p className="mt-2 text-sm text-white/65 leading-relaxed">
              This NPI does not appear in the LEIE snapshot used here
              {meta ? ` (version ${meta.sources.leie.version})` : ""}. Only{" "}
              {meta ? formatCount(meta.sources.leie.recordsWithNpi) : "a minority"} of the
              snapshot&apos;s records carry an NPI at all, so an NPI match is the only screening
              this dataset supports — absence here is not a clearance.
            </p>
          )}
          <p className="mt-4 text-sm text-white/55 leading-relaxed">
            SAM.gov exclusions: provider-level matching is deliberately not performed in this
            phase — the Medicaid file carries no UEI or provider names to match on, and this
            platform matches on identifiers, not name similarity. The SAM HHS-agency subset
            {meta
              ? ` (${formatCount(meta.sources.samExclusions.hhsSubsetRows)} records, extract ${meta.sources.samExclusions.version}, extract date ${meta.sources.samExclusions.extractDate})`
              : ""}{" "}
            is carried for the entity-resolution phase, where candidates go to human review —
            never auto-merged.
          </p>
        </section>

        {meta && (
          <div className="mt-6">
            <DatasetProvenance meta={meta} />
          </div>
        )}
      </div>
    </main>
  );
}
