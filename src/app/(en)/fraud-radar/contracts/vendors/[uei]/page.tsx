import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  getContractVendorProfile,
  getContractsDatasetMeta,
  contractsConfig,
  MEASURE_NOTE,
  SCREENING_NOTE,
  NO_FAC_NOTE,
  SAM_ENTITIES_EXTRACT_VERSION,
  SAM_EXCLUSIONS_EXTRACT_VERSION,
} from "@/lib/fraud-radar/contracts-data";
import { getGrantRecipientProfile } from "@/lib/fraud-radar/grants-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import { ResearchLeadNotice, NotPublishedYet } from "@/components/fraud-radar/Provenance";
import { ResearchSignalsSection } from "@/components/fraud-radar/ResearchSignals";
import PinToCase from "@/components/fraud-radar/PinToCase";
import { ProfileNetworkSection } from "@/components/fraud-radar/ProfileNetwork";

/**
 * Fraud Radar — contract vendor profile (Phase 5). Identity and
 * totals come from the published contracts artifacts; SAM
 * registration facts carry their extract date and are never
 * presented as live status. The screening block renders its
 * caveats verbatim: SAM-exclusion listings are records in the
 * named extract, and LEIE entries are name candidates for human
 * review — never "matches". There is NO FAC block on a contracts
 * profile (FAC covers federal assistance only); a vendor that is
 * also a grant recipient is LINKED to its grants profile by UEI,
 * with no data merged or copied.
 */
export const metadata = {
  title: "Fraud Radar — Contract Vendor Profile",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ContractVendorProfilePage({
  params,
}: {
  params: Promise<{ uei: string }>;
}) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) notFound();
  const { uei } = await params;
  if (contractsConfig() === null) {
    return (
      <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
        <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
          <Link href="/fraud-radar/contracts/vendors" className="text-sm text-cyan-300 hover:underline">
            ← Contract vendor search
          </Link>
          <div className="mt-10">
            <NotPublishedYet what="The contracts vendor dataset" />
          </div>
        </div>
      </main>
    );
  }
  const [profile, meta, grantsProfile] = await Promise.all([
    getContractVendorProfile(uei),
    getContractsDatasetMeta(),
    getGrantRecipientProfile(uei).catch(() => null),
  ]);
  if (!profile) notFound();
  // Phase 10 (Payload B2 completion): the §6.3 Network section —
  // absent when the graphs artifact root is unconfigured.
  const profileNetwork = await ProfileNetworkSection({
    engine: "contracts",
    entityKey: profile.uei,
  });
  // Phase 6 (app tail, re-landed): the contracts research-signals
  // section, awaited here so the page's element tree stays
  // synchronously renderable (the B2 pattern). The contracts
  // engine state is the labelled not-computed state until a
  // contracts signals computation is published — never a count
  // of zero.
  const contractsSignals = await ResearchSignalsSection({
    engine: "contracts",
    entityKey: profile.uei,
    heading: "Research signals — contracts rules",
    note: "Contracts rules (C-01 to C-06) and the contracts-side screening records (S-02, X-MULTI-01) are defined in the Phase 6 design. Where the published signals vintage carries no contracts computation for this vendor, the section states so — a labelled not-computed state, never a count of zero.",
  });
  const id = profile.identity;
  const t = profile.totals;
  const sam = profile.samRegistration;
  const samExtract = sam?.extractVersion ?? SAM_ENTITIES_EXTRACT_VERSION;
  const scr = profile.screening;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/contracts/vendors" className="text-sm text-cyan-300 hover:underline">
          ← Contract vendor search
        </Link>
        <h1 className="mt-6 text-3xl font-bold">
          {id.usaspendingName ?? `UEI ${profile.uei}`}
        </h1>
        <p className="mt-2 text-white/60">
          UEI {profile.uei}
          {id.city || id.state ? ` · ${[id.city, id.state].filter(Boolean).join(", ")}` : ""}
          {id.cageCode ? ` · CAGE ${id.cageCode}` : ""}
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>
        <div className="mt-4">
          <PinToCase engine="contracts" entityKey={profile.uei} kind="entity" />
        </div>
        {id.parentUei && (
          <p className="mt-4 text-sm text-white/55">
            Parent as reported: {id.parentName ?? "—"} (UEI {id.parentUei}).
            Parent identity is displayed as reported only — subsidiary
            awards are never rolled into parent totals.
          </p>
        )}
        {grantsProfile && (
          <p className="mt-4 rounded-xl border border-cyan-300/25 bg-cyan-300/[0.06] px-4 py-3 text-sm text-white/75 leading-relaxed">
            This UEI also appears as a federal grant recipient.{" "}
            <Link
              href={`/fraud-radar/grants/recipients/${profile.uei}`}
              className="text-cyan-200 hover:underline"
            >
              View the grants recipient profile for UEI {profile.uei}
            </Link>{" "}
            — including its Federal Audit Clearinghouse (FAC) single-audit
            record, which lives only there. {NO_FAC_NOTE}
          </p>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold">SAM registration (extract record)</h2>
          <p className="mt-3 max-w-3xl text-white/60 leading-relaxed">
            {sam?.registered
              ? `Legal business name in the SAM entities extract ${samExtract}: ${sam.legalBusinessName ?? "—"}${sam.dbaName ? ` · doing business as: ${sam.dbaName}` : ""}. Registration ${sam.registrationActiveAsOfExtract ? "was active as of the extract date" : "was not active as of the extract date"}${sam.registrationExpirationDate ? ` · expiration as reported: ${sam.registrationExpirationDate}` : ""}.`
              : `No SAM entities record for this UEI in the SAM entities extract ${samExtract} — absence from this extract vintage is a registry-coverage fact, not a status finding.`}{" "}
            SAM facts on this page come from the SAM entities extract{" "}
            {samExtract} — an extract record, not a live registration
            status check. No SAM.gov API is used.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Award totals (award-cumulative)</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Awards</td>
                  <td className="px-4 py-3">{formatCount(t.awards)}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Obligated (award-cumulative)</td>
                  <td className="px-4 py-3">{formatUsd(t.totalDollarsObligated)}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Outlayed (award-cumulative)</td>
                  <td className="px-4 py-3">{formatUsd(t.totalOutlayedAmountForOverallAward)}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">IDV vehicles / orders under IDVs</td>
                  <td className="px-4 py-3">
                    {formatCount(t.idvCount)} / {formatCount(t.orderUnderIdvCount)}
                  </td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Transactions / modifications in window</td>
                  <td className="px-4 py-3">
                    {formatCount(profile.modifications.transactionsInWindow)} /{" "}
                    {formatCount(profile.modifications.modificationsInWindow)}
                  </td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">
                    Sum of federal_action_obligation over the award&apos;s transactions in the published window
                  </td>
                  <td className="px-4 py-3">{formatUsd(profile.modifications.federalActionObligationSumInWindow)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-white/50 leading-relaxed">{MEASURE_NOTE}</p>
        </section>

        {scr && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Screening (research leads)</h2>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-relaxed">
              <p className="text-white/75">
                SAM exclusions extract {scr.samExclusions?.extractVersion ?? SAM_EXCLUSIONS_EXTRACT_VERSION}
                {" "}({scr.samExclusions?.extractDate ?? "2026-10-28"}):{" "}
                {scr.samExclusions && scr.samExclusions.listingCount > 0
                  ? `${formatCount(scr.samExclusions.listingCount)} listing(s) on this exact UEI${scr.samExclusions.earliestActiveDate ? `, earliest active ${scr.samExclusions.earliestActiveDate}` : ""}${scr.samExclusions.exclusionTypes ? ` · types: ${scr.samExclusions.exclusionTypes}` : ""}.`
                  : "no listings on this exact UEI in the named extract (a counted zero over a complete published file)."}
              </p>
              <p className="mt-2 text-white/75">
                LEIE name candidates: {formatCount(scr.leieNameCandidates?.candidateCount ?? 0)} —
                status: {scr.leieNameCandidates?.candidateStatus ?? "candidate — human review"}.
                Name candidates are normalized-name overlaps for human
                review, not identity matches.
              </p>
              <p className="mt-3 text-white/50">{SCREENING_NOTE}</p>
            </div>
          </section>
        )}

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-lg font-semibold">NAICS mix</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {profile.naicsMix.map((r) => (
                <li key={r.naics} className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/fraud-radar/contracts/naics/${r.naics}`} className="text-cyan-200 hover:underline">
                    {r.naics}{r.naicsDescription ? ` — ${r.naicsDescription}` : ""}
                  </Link>
                  <span className="text-white/85">{formatUsd(r.totalDollarsObligated)}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-lg font-semibold">PSC mix</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {profile.pscMix.map((r) => (
                <li key={r.psc} className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/fraud-radar/contracts/psc/${r.psc}`} className="text-cyan-200 hover:underline">
                    {r.psc}{r.pscDescription ? ` — ${r.pscDescription}` : ""}
                  </Link>
                  <span className="text-white/85">{formatUsd(r.totalDollarsObligated)}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Top awards</h2>
          <ul className="mt-4 space-y-3">
            {profile.topAwards.map((a) => (
              <li key={a.awardKey} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <Link
                  href={`/fraud-radar/contracts/awards/${encodeURIComponent(a.awardKey)}`}
                  className="font-semibold text-cyan-200 hover:underline"
                >
                  PIID {a.piid ?? a.awardKey}
                </Link>
                <p className="mt-1 text-sm text-white/55">
                  {a.awardingAgencyName ?? ""} · attributed FY {a.attributedFiscalYear ?? "—"} ·{" "}
                  {formatUsd(a.totalDollarsObligated)} obligated (award-cumulative) ·{" "}
                  {formatCount(a.transactionsInWindow)} transactions in window
                </p>
              </li>
            ))}
          </ul>
        </section>

        {profile.subcontracts && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Reported subcontracts</h2>
            <p className="mt-3 max-w-3xl text-white/60 leading-relaxed">
              Given as prime: {formatCount(profile.subcontracts.givenAsPrime?.count ?? null)} ·{" "}
              {formatUsd(profile.subcontracts.givenAsPrime?.amount ?? null)} — received as
              subcontractor: {formatCount(profile.subcontracts.receivedAsSubcontractor?.count ?? null)} ·{" "}
              {formatUsd(profile.subcontracts.receivedAsSubcontractor?.amount ?? null)}.{" "}
              {profile.subcontracts.note ?? "Counts are over the published reported-subaward files only; FSRS reporting is incomplete by nature."}
            </p>
          </section>
        )}

        {profileNetwork ? <div className="mt-10">{profileNetwork}</div> : null}

        <div className="mt-10">{contractsSignals}</div>

        {meta && (
          <p className="mt-10 text-xs text-white/40">
            Dataset {meta.dataset} version {meta.version} · USAspending
            archive generation 2026-10-06 · SAM entities extract{" "}
            {SAM_ENTITIES_EXTRACT_VERSION} · SAM exclusions extract{" "}
            {SAM_EXCLUSIONS_EXTRACT_VERSION}
          </p>
        )}
      </div>
    </main>
  );
}
