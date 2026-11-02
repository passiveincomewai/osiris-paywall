import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  getGrantRecipientProfile,
  getGrantsDatasetMeta,
  grantsConfig,
  MEASURE_NOTE,
  FAC_NOTE,
  SCREENING_NOTE,
  SAM_ENTITIES_EXTRACT_VERSION,
  SAM_EXCLUSIONS_EXTRACT_VERSION,
} from "@/lib/fraud-radar/grants-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import { ResearchLeadNotice, NotPublishedYet } from "@/components/fraud-radar/Provenance";
import { ResearchSignalsSection } from "@/components/fraud-radar/ResearchSignals";
import { ProfileNetworkSection } from "@/components/fraud-radar/ProfileNetwork";
import PinToCase from "@/components/fraud-radar/PinToCase";

/**
 * Fraud Radar — grant recipient profile (Phase 4). Identity and
 * totals come from the published grants artifacts; SAM registration
 * facts carry their extract date and are never presented as live
 * status. A missing FAC block is absence (no public single-audit
 * record in the published vintage), never zero findings. The
 * screening block renders its caveats verbatim: SAM-exclusion
 * listings are records in the named extract, and LEIE entries are
 * name candidates for human review — never "matches".
 */
export const metadata = {
  title: "Fraud Radar — Grant Recipient Profile",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function GrantRecipientProfilePage({
  params,
}: {
  params: Promise<{ uei: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const { uei } = await params;
  if (grantsConfig() === null) {
    return (
      <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
        <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
          <Link href="/fraud-radar/grants/recipients" className="text-sm text-cyan-300 hover:underline">
            ← Grant recipient search
          </Link>
          <div className="mt-10">
            <NotPublishedYet what="The grants recipient dataset" />
          </div>
        </div>
      </main>
    );
  }
  const [profile, meta] = await Promise.all([
    getGrantRecipientProfile(uei),
    getGrantsDatasetMeta(),
  ]);
  if (!profile) notFound();
  // Phase 6 (Payload B2): both research-signals sections awaited
  // here so the page's element tree stays synchronously renderable
  // (see the healthcare profile). The cross engine is read by UEI,
  // exactly as the artifacts key it.
  const grantsSignals = await ResearchSignalsSection({
    engine: "grants",
    entityKey: profile.uei,
    heading: "Research signals — grants rules",
  });
  // Phase 10 (Payload B2): the §6.3 Network section — absent when
  // the graphs artifact root is unconfigured.
  const profileNetwork = await ProfileNetworkSection({
    engine: "grants",
    entityKey: profile.uei,
  });
  const crossSignals = await ResearchSignalsSection({
    engine: "cross",
    entityKey: profile.uei,
    heading: "Research signals — cross-dataset",
    note: "Cross-dataset records are keyed exactly as published: screening records by this recipient's UEI, and the FAC ↔ Form 990 discrepancy rule (X-990-01) at the auditee's EIN grain — an auditee whose EIN-grain leads exist does not surface them under a UEI read, and no key is ever inferred to bridge the two.",
  });
  const id = profile.identity;
  const t = profile.totals;
  const samExtract = id.samEntitiesExtractVersion ?? SAM_ENTITIES_EXTRACT_VERSION;
  const exclExtract =
    profile.screening?.samExclusionsExtractVersion ??
    id.samExclusionsExtractVersion ??
    SAM_EXCLUSIONS_EXTRACT_VERSION;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/grants/recipients" className="text-sm text-cyan-300 hover:underline">
          ← Grant recipient search
        </Link>
        <h1 className="mt-6 text-3xl font-bold">
          {id.recipientName ?? `UEI ${profile.uei}`}
        </h1>
        <p className="mt-2 text-white/60">
          UEI {profile.uei}
          {id.city || id.state
            ? ` · ${[id.city, id.state].filter(Boolean).join(", ")}`
            : ""}
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>
        <div className="mt-4">
          <PinToCase engine="grants" entityKey={profile.uei} kind="entity" />
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">SAM registration (extract record)</h2>
          <p className="mt-3 max-w-3xl text-white/60 leading-relaxed">
            {id.samLegalBusinessName
              ? `Legal business name in the SAM entities extract ${samExtract}: ${id.samLegalBusinessName}${id.samDbaName ? ` · doing business as: ${id.samDbaName}` : ""}.`
              : `No SAM entities record for this UEI in the SAM entities extract ${samExtract}.`}{" "}
            SAM facts on this page come from the SAM entities extract{" "}
            {samExtract} — an extract record, not a live registration
            status check.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Award totals (award-cumulative)</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Awards</td>
                  <td className="px-4 py-3">{formatCount(t.awardCount)}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Obligated (award-cumulative)</td>
                  <td className="px-4 py-3">{formatUsd(t.obligatedAwardCumulativeUsd)}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Outlayed (award-cumulative)</td>
                  <td className="px-4 py-3">{formatUsd(t.outlayAwardCumulativeUsd)}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Assistance listings (ALNs)</td>
                  <td className="px-4 py-3">{formatCount(t.distinctAlns)}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Awarding agencies</td>
                  <td className="px-4 py-3">{formatCount(t.distinctAgencies)}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Attributed fiscal years</td>
                  <td className="px-4 py-3">
                    {t.firstAttributedFiscalYear ?? "—"}
                    {t.lastAttributedFiscalYear != null &&
                    t.firstAttributedFiscalYear != null &&
                    t.lastAttributedFiscalYear !== t.firstAttributedFiscalYear
                      ? ` – ${t.lastAttributedFiscalYear}`
                      : ""}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 max-w-3xl text-sm text-white/50 leading-relaxed">
            {MEASURE_NOTE}
          </p>
        </section>

        {profile.alnMix.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Assistance listings (ALN mix)</h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-white/50">
                    <th className="px-4 py-3 font-medium">ALN</th>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Awards</th>
                    <th className="px-4 py-3 font-medium">Obligated (award-cumulative)</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.alnMix.map((a) => (
                    <tr key={a.aln} className="border-b border-white/5">
                      <td className="px-4 py-3">
                        <Link
                          href={`/fraud-radar/grants/aln/${a.aln}`}
                          className="text-cyan-200 hover:underline"
                        >
                          {a.aln}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white/70">{a.alnTitle ?? "—"}</td>
                      <td className="px-4 py-3">{formatCount(a.awards)}</td>
                      <td className="px-4 py-3">{formatUsd(a.obligatedAwardCumulativeUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {profile.topAwards.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Top awards (award-cumulative obligated)</h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-white/50">
                    <th className="px-4 py-3 font-medium">Award (FAIN)</th>
                    <th className="px-4 py-3 font-medium">ALN</th>
                    <th className="px-4 py-3 font-medium">Awarding agency</th>
                    <th className="px-4 py-3 font-medium">Attributed FY</th>
                    <th className="px-4 py-3 font-medium">Obligated (award-cumulative)</th>
                    <th className="px-4 py-3 font-medium">Outlayed (award-cumulative)</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.topAwards.map((a) => (
                    <tr key={a.awardKey} className="border-b border-white/5">
                      <td className="px-4 py-3">{a.fain ?? a.awardKey}</td>
                      <td className="px-4 py-3">
                        {a.aln ? (
                          <Link
                            href={`/fraud-radar/grants/aln/${a.aln}`}
                            className="text-cyan-200 hover:underline"
                          >
                            {a.aln}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/70">{a.awardingAgency ?? "—"}</td>
                      <td className="px-4 py-3">{a.attributedFiscalYear ?? "—"}</td>
                      <td className="px-4 py-3">{formatUsd(a.obligatedAwardCumulativeUsd)}</td>
                      <td className="px-4 py-3">{formatUsd(a.outlayAwardCumulativeUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Subawards (reported)</h2>
          <p className="mt-3 max-w-3xl text-white/60 leading-relaxed">
            Given as a prime recipient: {formatCount(t.subawardsGivenCount)}{" "}
            reported subawards · {formatUsd(t.subawardsGivenAmountUsd)}.
            Received as a subrecipient:{" "}
            {formatCount(t.subawardsReceivedCount)} reported subawards ·{" "}
            {formatUsd(t.subawardsReceivedAmountUsd)}. Counts and amounts
            cover the published reported-subaward files only — subaward
            (FSRS) reporting is incomplete by nature. A zero here is a
            counted zero in those files, not proof that no subawards
            exist; a dash means the figure was not published.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Single audits (FAC)</h2>
          {profile.fac ? (
            <>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-3 text-white/50">Public single audits</td>
                      <td className="px-4 py-3">{formatCount(profile.fac.auditCount)}</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-3 text-white/50">Audit years</td>
                      <td className="px-4 py-3">
                        {profile.fac.firstAuditYear ?? "—"}
                        {profile.fac.lastAuditYear != null &&
                        profile.fac.firstAuditYear != null &&
                        profile.fac.lastAuditYear !== profile.fac.firstAuditYear
                          ? ` – ${profile.fac.lastAuditYear}`
                          : ""}
                      </td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-3 text-white/50">Latest audit type</td>
                      <td className="px-4 py-3">{profile.fac.latestAuditType ?? "—"}</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-3 text-white/50">
                        Federal expenditures, latest audit year (auditee-reported)
                      </td>
                      <td className="px-4 py-3">{formatUsd(profile.fac.latestYearTotalExpendedUsd)}</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-3 text-white/50">Audit findings</td>
                      <td className="px-4 py-3">{formatCount(profile.fac.findingsCount)}</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-3 text-white/50">Repeat audit findings</td>
                      <td className="px-4 py-3">{formatCount(profile.fac.repeatFindingsCount)}</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-3 text-white/50">Questioned-cost flags</td>
                      <td className="px-4 py-3">{formatCount(profile.fac.questionedCostFlagCount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 max-w-3xl text-sm text-white/50 leading-relaxed">
                Audit findings are auditor-reported results of a single
                audit — a research lead for human review, not a Fraud
                Radar determination. Questioned costs appear as flag
                counts only. {FAC_NOTE}
              </p>
            </>
          ) : (
            <p className="mt-3 max-w-3xl text-white/60 leading-relaxed">
              No public single-audit (FAC) record for this recipient in
              the published vintage
              {meta ? ` (${meta.facVersion})` : ""} — usually below the
              single-audit expenditure threshold or not yet submitted.
              This is absence, never zero findings. {FAC_NOTE}
            </p>
          )}
        </section>

        {/* Phase 6 (Payload B2): this recipient's published research
            leads — the grants engine by UEI, then the cross-dataset
            engine read by the same UEI exactly as the artifacts key
            it (screening records are UEI-keyed; the FAC ↔ Form 990
            discrepancy rule X-990-01 is published at the auditee's
            EIN grain, stated in the section's keying note). Both
            sections fail soft to absent when no signals artifact is
            configured. */}
        <div className="mt-10">{grantsSignals}</div>
        <div className="mt-6">{crossSignals}</div>
        {profileNetwork ? <div className="mt-6">{profileNetwork}</div> : null}

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Exclusion screening</h2>
          {profile.screening ? (
            <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/[0.06] p-5 text-sm leading-relaxed">
              {profile.screening.samExclusionListingCount > 0 ? (
                <p className="text-amber-100">
                  {formatCount(profile.screening.samExclusionListingCount)}{" "}
                  listing record
                  {profile.screening.samExclusionListingCount === 1 ? "" : "s"}{" "}
                  for this UEI in the SAM exclusions extract {exclExtract}
                  {profile.screening.samExclusionTypes
                    ? ` · types: ${profile.screening.samExclusionTypes}`
                    : ""}
                  {profile.screening.samExclusionEarliestActiveDate
                    ? ` · earliest active date: ${profile.screening.samExclusionEarliestActiveDate}`
                    : ""}
                  . These are records in the named extract — confirm
                  current status against SAM.gov before any use.
                </p>
              ) : (
                <p className="text-white/70">
                  No listing records for this UEI in the SAM exclusions
                  extract {exclExtract} — a counted zero in that extract,
                  not a live status check and not proof of good standing.
                </p>
              )}
              {profile.screening.leieCandidateCount > 0 ? (
                <p className="mt-3 text-white/70">
                  {formatCount(profile.screening.leieCandidateCount)} LEIE
                  name candidate
                  {profile.screening.leieCandidateCount === 1 ? "" : "s"}{" "}
                  — normalized-name overlaps queued for human review.
                  Name candidates are not identity matches and must never
                  be read as this recipient appearing on the LEIE.
                </p>
              ) : (
                <p className="mt-3 text-white/70">
                  No LEIE name candidates for this recipient in the
                  published screening. Name candidates are a human-review
                  queue, never identity matches.
                </p>
              )}
              <p className="mt-3 text-white/70">{SCREENING_NOTE}</p>
            </div>
          ) : (
            <p className="mt-3 max-w-3xl text-white/60 leading-relaxed">
              No screening block was published for this recipient.{" "}
              {SCREENING_NOTE}
            </p>
          )}
        </section>

        {meta !== null && (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60 leading-relaxed">
            <h2 className="text-base font-semibold text-white">About this data</h2>
            <p className="mt-2">{meta.provenance.usaspending ?? "USAspending Award Data Archive"}</p>
            <p className="mt-2">{meta.provenance.fac ?? "Federal Audit Clearinghouse"}</p>
            <p className="mt-2">{MEASURE_NOTE}</p>
          </section>
        )}
      </div>
    </main>
  );
}
