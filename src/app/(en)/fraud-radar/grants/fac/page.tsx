import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { getGrantsDatasetMeta, FAC_NOTE } from "@/lib/fraud-radar/grants-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import { listFacYearly } from "@/lib/fraud-radar/grants-neon";
import { ResearchLeadNotice, NotPublishedYet } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — FAC single-audit overview (Phase 4). The yearly
 * grain covers PUBLIC single audits only (is_public=true); records
 * withheld at source appear as a count and nothing else. Findings
 * are audit findings — auditor-reported results — never
 * "violations", and questioned costs are flag counts only: the
 * source publishes no questioned-cost dollar amounts.
 */
export const metadata = {
  title: "Fraud Radar — Single Audits (FAC): What a Finding Is and Is Not",
  description:
    "Federal Audit Clearinghouse single audits explained: what a single audit is, what an audit finding is and is not, and yearly public-report counts with questioned-cost flag counts (never amounts).",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function GrantsFacPage() {
  if (!fraudRadarEnabled()) notFound();

  const [meta, yearly] = await Promise.all([
    getGrantsDatasetMeta(),
    listFacYearly(),
  ]);
  const withheld = meta?.fac?.withheldCount ?? null;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/grants" className="text-sm text-cyan-300 hover:underline">
          ← Federal Grants
        </Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
          Federal Audit Clearinghouse
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
          Single audits: what a finding is — and is not.
        </h1>
        <p className="mt-4 max-w-3xl text-white/70 leading-relaxed">
          A single audit is the independent audit most organizations
          that spend substantial federal funds must undergo each year:
          an auditor examines the organization&apos;s financial
          statements and its compliance with the requirements of its
          federal programs, and reports the results to the Federal
          Audit Clearinghouse (FAC). Fraud Radar republishes the FAC&apos;s
          public record so researchers can see where auditors raised
          questions — and follow up with the underlying reports.
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        <section className="mt-10 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-lg font-semibold">What an audit finding is</h2>
            <p className="mt-2 text-sm text-white/60 leading-relaxed">
              An audit finding is an auditor-reported result: a control
              weakness, a compliance exception, or costs the auditor
              questioned, recorded against a specific program in a
              specific audit year. Repeat findings are findings carried
              from a prior audit. Findings are the starting point for
              the auditee&apos;s corrective action and the awarding
              agency&apos;s follow-up.
            </p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-lg font-semibold">What an audit finding is not</h2>
            <p className="mt-2 text-sm text-white/60 leading-relaxed">
              A finding is not a determination of fraud, not a sanction,
              and not a final judgment about any cost: agencies resolve
              findings through their own management decisions, and many
              findings concern documentation or process rather than
              money. Fraud Radar calls them audit findings — never
              violations — and presents them as research leads for
              human review.
            </p>
          </article>
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60 leading-relaxed">
          <h2 className="text-base font-semibold text-white">
            Questioned costs are flags, not amounts
          </h2>
          <p className="mt-2">
            The FAC source records whether a finding questioned costs —
            a yes/no flag. It publishes no questioned-cost dollar
            column, so no questioned-cost amounts appear anywhere on
            Fraud Radar and none are inferred from finding text. Counts
            below are counts of findings carrying the flag.
          </p>
          <p className="mt-2">
            {withheld !== null ? (
              <>
                {formatCount(withheld)} FAC records in the published
                vintage carry is_public=false and are withheld at
                source: only this count is published, never their
                contents. Every aggregate on this page covers public
                reports only.{" "}
              </>
            ) : (
              <>
                FAC records that carry is_public=false are withheld at
                source: only their count is ever published, never their
                contents. Every aggregate on this page covers public
                reports only.{" "}
              </>
            )}
            Absence of a public single-audit record for an organization
            usually means it fell below the single-audit expenditure
            threshold or has not yet submitted — absence, never zero
            findings.
          </p>
        </section>

        {yearly === null && meta === null ? (
          <div className="mt-10">
            <NotPublishedYet what="The FAC single-audit summary" />
          </div>
        ) : yearly !== null ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">
              Public single audits, by audit year
            </h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-white/50">
                    <th className="px-4 py-3 font-medium">Audit year</th>
                    <th className="px-4 py-3 font-medium">Reports</th>
                    <th className="px-4 py-3 font-medium">Auditees</th>
                    <th className="px-4 py-3 font-medium">Expended (auditee-reported)</th>
                    <th className="px-4 py-3 font-medium">Audit findings</th>
                    <th className="px-4 py-3 font-medium">Repeat findings</th>
                    <th className="px-4 py-3 font-medium">Questioned-cost flags</th>
                  </tr>
                </thead>
                <tbody>
                  {yearly.map((y) => (
                    <tr key={y.auditYear} className="border-b border-white/5">
                      <td className="px-4 py-3 font-semibold">{y.auditYear}</td>
                      <td className="px-4 py-3">{formatCount(y.reports)}</td>
                      <td className="px-4 py-3">{formatCount(y.distinctAuditees)}</td>
                      <td className="px-4 py-3">{formatUsd(y.totalExpendedUsd)}</td>
                      <td className="px-4 py-3">{formatCount(y.findingsCount)}</td>
                      <td className="px-4 py-3">{formatCount(y.repeatFindingsCount)}</td>
                      <td className="px-4 py-3">{formatCount(y.questionedCostFlagCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 max-w-3xl text-sm text-white/50 leading-relaxed">
              {FAC_NOTE}
            </p>
          </section>
        ) : (
          <div className="mt-10">
            <NotPublishedYet what="The FAC single-audit summary" />
          </div>
        )}

        {meta !== null && (
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60 leading-relaxed">
            <h2 className="text-base font-semibold text-white">About this data</h2>
            <p className="mt-2">{meta.provenance.fac ?? "Federal Audit Clearinghouse"}</p>
            <p className="mt-2">
              FAC vintage {meta.facVersion} · grants dataset version{" "}
              {meta.version}.
            </p>
            <p className="mt-2">{FAC_NOTE}</p>
          </section>
        )}
      </div>
    </main>
  );
}
