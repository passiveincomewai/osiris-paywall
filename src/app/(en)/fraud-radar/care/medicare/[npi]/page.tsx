import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  getCareProviderProfile,
  getCareDatasetMeta,
  careConfig,
  DERIVED_NOTE,
} from "@/lib/fraud-radar/care-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import { ResearchLeadNotice, NotPublishedYet } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — Medicare provider profile (Phase 3). Identity comes
 * from the source file itself (the PUF carries rendering-provider
 * identity); yearly blocks are present only for years CMS published
 * the provider — a missing year is suppressed/unpublished data,
 * never a zero year. The LEIE block is a research lead with its
 * timing caveats stated inline.
 */
export const metadata = {
  title: "Fraud Radar — Medicare Provider Profile",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MedicareProfilePage({
  params,
}: {
  params: Promise<{ npi: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const { npi } = await params;
  if (careConfig() === null) {
    return (
      <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
        <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
          <Link href="/fraud-radar/care/medicare" className="text-sm text-cyan-300 hover:underline">
            ← Medicare provider search
          </Link>
          <div className="mt-10">
            <NotPublishedYet what="The Medicare provider dataset" />
          </div>
        </div>
      </main>
    );
  }
  const [profile, meta] = await Promise.all([
    getCareProviderProfile(npi),
    getCareDatasetMeta(),
  ]);
  if (!profile) notFound();
  const id = profile.identity;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/care/medicare" className="text-sm text-cyan-300 hover:underline">
          ← Medicare provider search
        </Link>
        <h1 className="mt-6 text-3xl font-bold">
          {id.displayName ?? `NPI ${profile.npi}`}
        </h1>
        <p className="mt-2 text-white/60">
          NPI {profile.npi}
          {id.providerType ? ` · ${id.providerType}` : ""}
          {id.credentials ? ` · ${id.credentials}` : ""}
          {id.city || id.state
            ? ` · ${[id.city, id.state].filter(Boolean).join(", ")}${id.zip5 ? ` ${id.zip5}` : ""}`
            : ""}
          {id.entityCode === "O" ? " · Organization" : id.entityCode === "I" ? " · Individual" : ""}
          {id.medicareParticipating
            ? ` · Medicare participation (source): ${id.medicareParticipating}`
            : ""}
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Yearly utilization (derived amounts)</h2>
          {profile.years.length === 0 ? (
            <p className="mt-3 text-white/60">
              CMS published no yearly rows for this provider in the covered
              years.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-white/50">
                    <th className="px-4 py-3 font-medium">Year</th>
                    <th className="px-4 py-3 font-medium">Services</th>
                    <th className="px-4 py-3 font-medium">Beneficiaries (reported)</th>
                    <th className="px-4 py-3 font-medium">Payments (derived)</th>
                    <th className="px-4 py-3 font-medium">Allowed (derived)</th>
                    <th className="px-4 py-3 font-medium">Submitted (derived)</th>
                    <th className="px-4 py-3 font-medium">HCPCS codes</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.years.map((y) => (
                    <tr key={y.year} className="border-b border-white/5">
                      <td className="px-4 py-3 font-semibold">{y.year}</td>
                      <td className="px-4 py-3">{formatCount(y.services)}</td>
                      <td className="px-4 py-3">{formatCount(y.benesReported)}</td>
                      <td className="px-4 py-3">{formatUsd(y.pymtDerivedUsd)}</td>
                      <td className="px-4 py-3">{formatUsd(y.allowedDerivedUsd)}</td>
                      <td className="px-4 py-3">{formatUsd(y.submittedDerivedUsd)}</td>
                      <td className="px-4 py-3">{formatCount(y.hcpcsCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 max-w-3xl text-sm text-white/50 leading-relaxed">
            Years CMS did not publish this provider are absent — including
            years lost to small-cell suppression. An absent year is missing
            data, never a zero year. {DERIVED_NOTE}
          </p>
        </section>

        {profile.hcpcs.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">
              Services breakdown (all covered years, by derived payments)
            </h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-white/50">
                    <th className="px-4 py-3 font-medium">HCPCS</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Services</th>
                    <th className="px-4 py-3 font-medium">Beneficiaries (reported)</th>
                    <th className="px-4 py-3 font-medium">Payments (derived)</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.hcpcs.slice(0, 25).map((h) => (
                    <tr key={h.code} className="border-b border-white/5">
                      <td className="px-4 py-3">
                        <Link
                          href={`/fraud-radar/care/hcpcs/${h.code}`}
                          className="text-cyan-200 hover:underline"
                        >
                          {h.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white/70">{h.description ?? "—"}</td>
                      <td className="px-4 py-3">{formatCount(h.services)}</td>
                      <td className="px-4 py-3">{formatCount(h.benesReported)}</td>
                      <td className="px-4 py-3">{formatUsd(h.pymtDerivedUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {profile.hcpcs.length > 25 && (
              <p className="mt-3 text-sm text-white/50">
                Showing the top 25 of {formatCount(profile.hcpcs.length)}{" "}
                published services by derived payments.
              </p>
            )}
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Exclusion screening</h2>
          {profile.leie ? (
            <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-5 text-sm leading-relaxed">
              <p className="text-amber-100">
                This NPI appears on the HHS-OIG List of Excluded
                Individuals/Entities (LEIE), {profile.leie.recordCount}{" "}
                record{profile.leie.recordCount === 1 ? "" : "s"}
                {profile.leie.excltypes ? ` · authority: ${profile.leie.excltypes}` : ""}
                {profile.leie.earliestExcldate
                  ? ` · earliest exclusion date: ${profile.leie.earliestExcldate}`
                  : ""}
                {profile.leie.listedNames
                  ? ` · listed as: ${profile.leie.listedNames}`
                  : ""}
                .
              </p>
              <p className="mt-3 text-white/70">
                Derived Medicare payments in calendar years after the
                exclusion year:{" "}
                <strong className="text-white">
                  {formatUsd(profile.leie.pymtDerivedAfterExclYearUsd)}
                </strong>
                . Read the caveats before drawing any conclusion: the LEIE
                here is a 2026-10 snapshot screened against CY2022–CY2024
                claims at annual grain — an exclusion effective part-way
                through a year still shows that whole year&apos;s earlier
                payments; identity and exclusion status must be confirmed
                against the live LEIE before any use. A listing is a
                research lead, never a Fraud Radar finding.
              </p>
            </div>
          ) : (
            <p className="mt-3 max-w-3xl text-white/60 leading-relaxed">
              No exact-NPI match in the LEIE snapshot screened for this
              dataset ({meta?.provenance.leie ?? "HHS-OIG LEIE"}). Absence
              from one snapshot is not proof of good standing — verify
              against the live LEIE.
            </p>
          )}
        </section>

        {meta !== null && (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60 leading-relaxed">
            <h2 className="text-base font-semibold text-white">About this data</h2>
            <p className="mt-2">{meta.provenance.medicarePuf}</p>
            <p className="mt-2">{meta.statements.derived}</p>
            <p className="mt-2">{meta.statements.suppression}</p>
          </section>
        )}
      </div>
    </main>
  );
}
