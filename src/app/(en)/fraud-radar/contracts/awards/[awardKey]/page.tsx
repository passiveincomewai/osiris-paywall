import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  getContractAward,
  contractsConfig,
  MEASURE_NOTE,
  CEILINGS_NOTE,
  PARENT_LINKAGE_NOTE,
} from "@/lib/fraud-radar/contracts-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import { ResearchLeadNotice, NotPublishedYet } from "@/components/fraud-radar/Provenance";
import PinToCase from "@/components/fraud-radar/PinToCase";

/**
 * Fraud Radar — contract award detail (Phase 5). The snapshot is
 * the award's winning (latest-modified) transaction row, exactly
 * as published; the modification timeline below it is the FULL
 * published chain, every transaction as reported, chronological —
 * history rows are never re-summed into award totals. Parent
 * linkage renders as published: the as-designed candidate value
 * is labelled as published, and the normalised CONT_IDV_ figure
 * is a labelled diagnostic, never a join — a parent link is
 * rendered only where the published record itself resolves under
 * the as-designed formula.
 */
export const metadata = {
  title: "Fraud Radar — Contract Award Detail & Modification History",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ContractAwardPage({
  params,
}: {
  params: Promise<{ awardKey: string }>;
}) {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) notFound();
  const { awardKey } = await params;
  if (contractsConfig() === null) {
    return (
      <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
        <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
          <Link href="/fraud-radar/contracts" className="text-sm text-cyan-300 hover:underline">
            ← Federal Contracts
          </Link>
          <div className="mt-10">
            <NotPublishedYet what="The contracts award dataset" />
          </div>
        </div>
      </main>
    );
  }
  const award = await getContractAward(awardKey);
  if (!award) notFound();
  const money = award.snapshotMoney;
  const cls = award.classification;
  const parent = award.parent;
  const parentResolvesAsPublished = parent?.candidateResolvesAsDesigned === true;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/contracts" className="text-sm text-cyan-300 hover:underline">
          ← Federal Contracts
        </Link>
        <h1 className="mt-6 text-3xl font-bold break-all">
          PIID {award.piid ?? award.awardKey}
        </h1>
        <p className="mt-2 text-white/60 break-all">
          {award.awardKey} · {award.flag ?? ""} {award.awardType ?? ""} · attributed
          FY {award.attributedFiscalYear ?? "—"}
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>
        <div className="mt-4">
          <PinToCase engine="contracts" entityKey={award.awardKey} kind="entity" />
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Award snapshot (winning row, as published)</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Vendor</td>
                  <td className="px-4 py-3">
                    {award.vendor?.uei ? (
                      <Link href={`/fraud-radar/contracts/vendors/${award.vendor.uei}`} className="text-cyan-200 hover:underline">
                        {award.vendor.name ?? award.vendor.uei}
                      </Link>
                    ) : (
                      (award.vendor?.name ?? "No recipient UEI reported for this award")
                    )}
                  </td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Awarding agency</td>
                  <td className="px-4 py-3">{award.awarding.agencyName ?? "—"}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Obligated (award-cumulative)</td>
                  <td className="px-4 py-3">{formatUsd(money.totalDollarsObligated ?? null)}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Outlayed (award-cumulative)</td>
                  <td className="px-4 py-3">{formatUsd(money.totalOutlayedAmountForOverallAward ?? null)}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Current total value of award</td>
                  <td className="px-4 py-3">{formatUsd(money.currentTotalValueOfAward ?? null)}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Base and all options value (ceiling)</td>
                  <td className="px-4 py-3">{formatUsd(money.baseAndAllOptionsValueCeiling ?? null)}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Potential total value of award (ceiling)</td>
                  <td className="px-4 py-3">{formatUsd(money.potentialTotalValueOfAwardCeiling ?? null)}</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">NAICS / PSC</td>
                  <td className="px-4 py-3">
                    {cls.naics ? (
                      <Link href={`/fraud-radar/contracts/naics/${cls.naics}`} className="text-cyan-200 hover:underline">{String(cls.naics)}</Link>
                    ) : "—"}
                    {" / "}
                    {cls.psc ? (
                      <Link href={`/fraud-radar/contracts/psc/${cls.psc}`} className="text-cyan-200 hover:underline">{String(cls.psc)}</Link>
                    ) : "—"}
                  </td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-white/50">Extent competed / pricing</td>
                  <td className="px-4 py-3">
                    {String(cls.extentCompeted ?? "—")} / {String(cls.pricing ?? "—")}
                    {cls.numberOfOffersReceived != null
                      ? ` · offers received as reported: ${cls.numberOfOffersReceived}`
                      : " · offers received: not reported"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-white/50 leading-relaxed">{MEASURE_NOTE}</p>
          <p className="mt-2 text-sm text-white/50 leading-relaxed">{CEILINGS_NOTE}</p>
          {award.permalink && (
            <p className="mt-2 text-sm">
              <a href={award.permalink} className="text-cyan-300 hover:underline" target="_blank" rel="noreferrer">
                This award on USAspending.gov
              </a>
            </p>
          )}
        </section>

        {parent && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Parent vehicle (as published)</h2>
            <p className="mt-3 max-w-3xl text-white/60 leading-relaxed">
              Parent PIID {parent.piid ?? "—"} (agency {parent.agencyId ?? "—"}).
              As-designed candidate key:{" "}
              <span className="break-all text-white/85">{parent.candidateKey ?? "—"}</span> —
              link state as published: {parent.linkStateAsDesigned ?? "—"}.
              {parentResolvesAsPublished && parent.candidateKey ? (
                <>
                  {" "}
                  <Link
                    href={`/fraud-radar/contracts/awards/${encodeURIComponent(parent.candidateKey)}`}
                    className="text-cyan-200 hover:underline"
                  >
                    Open the parent vehicle award
                  </Link>
                </>
              ) : (
                " No parent link is rendered: the candidate does not resolve under the published (as-designed) formula, and an unresolved candidate stays an unlinked parent reference — never a fabricated join."
              )}
            </p>
            <p className="mt-2 max-w-3xl text-sm text-white/50 leading-relaxed">
              Diagnostic (labelled, never a join): normalised candidate{" "}
              <span className="break-all">{parent.normalisedCandidateKeyDiagnostic ?? "—"}</span>{" "}
              {parent.candidateResolvesNormalisedDiagnostic
                ? "resolves against a published CONT_IDV_ key"
                : "does not resolve either"}.
              {" "}{PARENT_LINKAGE_NOTE}
            </p>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Modification timeline (full, as reported)</h2>
          <p className="mt-3 max-w-3xl text-white/60 leading-relaxed">
            {formatCount(award.modificationBlock?.transactionsInWindow ?? award.timeline.length)}{" "}
            transactions in the published FY2018–FY2025 window,{" "}
            {formatCount(award.modificationBlock?.modificationsInWindow ?? null)} of them
            modifications. Sum of federal_action_obligation over this
            award&apos;s transactions in the published window:{" "}
            {formatUsd(award.modificationBlock?.federalActionObligationSumInWindow ?? null)} —
            a derived in-window flow figure, never merged with the
            snapshot totals above. Rows are displayed as reported,
            including their per-transaction snapshot values.
          </p>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/50">
                  <th className="px-4 py-3 font-medium">Action date</th>
                  <th className="px-4 py-3 font-medium">Modification</th>
                  <th className="px-4 py-3 font-medium">Action type</th>
                  <th className="px-4 py-3 font-medium">Federal action obligation (transaction)</th>
                  <th className="px-4 py-3 font-medium">Obligated snapshot on this row</th>
                </tr>
              </thead>
              <tbody>
                {award.timeline.map((tx) => (
                  <tr key={tx.txnKey ?? `${tx.modificationNumber}-${tx.actionDate}`} className="border-b border-white/5">
                    <td className="px-4 py-3">{tx.actionDate ?? "—"}</td>
                    <td className="px-4 py-3">{tx.modificationNumber ?? "—"}</td>
                    <td className="px-4 py-3">{tx.actionType ?? "Base action"}</td>
                    <td className="px-4 py-3">{formatUsd(tx.federalActionObligation)}</td>
                    <td className="px-4 py-3">{formatUsd(tx.totalDollarsObligated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
