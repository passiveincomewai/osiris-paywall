import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";

/**
 * WorldEye Fraud Radar — public shell (Phase 1 foundation).
 *
 * Dark by design: with FRAUD_RADAR_ENABLED off this route 404s, so the
 * app is indistinguishable from the pre-Fraud-Radar site (AUDIT §13.3).
 * While dark it is also noindex; the Phase 12 launch payload owns
 * flipping indexation together with the SEO programme (§30).
 *
 * Copy discipline (spec §1/§26 + AUDIT §11): the platform identifies
 * research leads and discrepancies for human review — it never
 * declares fraud — and the whistleblower summary states ONLY the DOJ's
 * published WHIP framework ($10,000–$30,000, discretionary, paid after
 * charges are unsealed). The announced "1% commission" is never
 * presented as a program rule or a promise.
 */
export const metadata = {
  title: "WorldEye Fraud Radar — Government Spending Intelligence",
  description:
    "Research U.S. government spending across Medicaid, Medicare, federal grants and federal contracts with official data, reproducible analysis and source-cited reports.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ENGINES = [
  {
    title: "Healthcare & Care Programs",
    body: "Medicaid and Medicare spending, autism and disability services, adult day care, childcare subsidies, hospice and home health — researched against official HHS and CMS records, provider identities and published exclusions.",
  },
  {
    title: "Government Grants",
    body: "Federal awards, recipients, modifications and subawards from USAspending, cross-checked against Single Audit findings and public nonprofit filings — with obligations, outlays and expenditures kept distinct.",
  },
  {
    title: "Government Contracts",
    body: "Federal contractors, procurement awards and modification histories keyed by UEI, screened in bulk against SAM.gov's published exclusion extracts — every registration status labelled with its extract date.",
  },
];

export default async function FraudRadarPage() {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) notFound();

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-16 text-white">
        <p className="text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
          WorldEye Fraud Radar
        </p>
        <h1 className="mt-3 text-3xl sm:text-5xl font-bold leading-tight">
          Government spending intelligence, built on official records.
        </h1>
        <p className="mt-5 max-w-3xl text-base sm:text-lg text-white/70 leading-relaxed">
          Fraud Radar helps investigators, auditors, journalists, attorneys and
          researchers examine public government spending and surface financial
          discrepancies that may warrant further review. Every figure is
          traceable to an official source, every calculation is reproducible,
          and every limitation of the underlying data is shown — not buried.
        </p>
        <p className="mt-4 max-w-3xl rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100/90 leading-relaxed">
          Fraud Radar identifies research leads, discrepancies and statistical
          anomalies. It does not determine that any person or organization has
          committed fraud — that judgment belongs to investigators, auditors
          and the legal process.
        </p>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {ENGINES.map((e) => (
            <article
              key={e.title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <h2 className="text-lg font-semibold">{e.title}</h2>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">{e.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.06] p-6">
          <h2 className="text-xl font-semibold">Now live for research: Medicaid provider spending</h2>
          <p className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed">
            The healthcare engine&apos;s first dataset is published: the HHS Medicaid Provider
            Spending file (2018–2024) — 1,842,123 billing and servicing providers with payment
            histories, procedure-level breakdowns, and screening against the LEIE exclusion
            snapshot. Every figure carries its dataset version and the source&apos;s own
            limitations.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href="/fraud-radar/healthcare"
              className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Open the healthcare engine
            </Link>
            <Link
              href="/fraud-radar/healthcare/providers"
              className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
            >
              Search providers
            </Link>
            <Link
              href="/fraud-radar/healthcare/hcpcs"
              className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
            >
              Explore HCPCS codes
            </Link>
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.06] p-6">
          <h2 className="text-xl font-semibold">Also published: Medicare, hospice &amp; home health</h2>
          <p className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed">
            The care-programs slice of the healthcare engine: CMS Medicare
            fee-for-service utilization by provider and service (2022–2024,
            amounts derived from CMS&apos;s published averages and labelled
            derived), screened against the LEIE, plus the Care Compare
            directories of Medicare-certified hospices and home health
            agencies.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href="/fraud-radar/care"
              className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Open Care Programs
            </Link>
            <Link
              href="/fraud-radar/care/medicare"
              className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
            >
              Search Medicare providers
            </Link>
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
        </section>

        <section className="mt-12 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.06] p-6">
          <h2 className="text-xl font-semibold">Also published: Federal grants &amp; single audits</h2>
          <p className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed">
            The grants engine&apos;s first datasets are published: USAspending
            federal assistance awards (2018–2025, amounts award-cumulative
            under the attributed fiscal year — obligations, outlays and
            expenditures kept distinct), researched by recipient and
            assistance listing, and bridged to Federal Audit
            Clearinghouse single audits, where audit findings and
            questioned-cost flags are research leads for human review.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href="/fraud-radar/grants"
              className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Open Federal Grants
            </Link>
            <Link
              href="/fraud-radar/grants/recipients"
              className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
            >
              Search grant recipients
            </Link>
            <Link
              href="/fraud-radar/grants/aln"
              className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
            >
              Explore assistance listings
            </Link>
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.06] p-6">
          <h2 className="text-xl font-semibold">Also published: Federal contracts &amp; modification histories</h2>
          <p className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed">
            The contracts engine&apos;s first dataset is published: USAspending
            federal contract awards (2018–2025, amounts award-cumulative
            under the attributed fiscal year — obligations, outlays and
            contract ceilings kept distinct), researched by vendor, NAICS
            and PSC, with every award&apos;s full modification history as
            reported. SAM registration and exclusion facts come from the
            dated SAM public extracts — never a live status check, and no
            SAM.gov API is used. The Federal Audit Clearinghouse does not
            cover contracts, so no contracts surface carries FAC data.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href="/fraud-radar/contracts"
              className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Open Federal Contracts
            </Link>
            <Link
              href="/fraud-radar/contracts/vendors"
              className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
            >
              Search contract vendors
            </Link>
            <Link
              href="/fraud-radar/contracts/naics"
              className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
            >
              Explore NAICS codes
            </Link>
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.06] p-6">
          <h2 className="text-xl font-semibold">New: Research signals — statistical intelligence</h2>
          <p className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed">
            Deterministic, versioned research rules compare providers,
            recipients and auditees to defined peer groups, to their own
            history, and across datasets — each lead published with its
            peer definition, its counts (including the count expected by
            construction from the band alone) and its input vintages.
            Research leads for human review, never findings about an
            entity; the contracts rules are defined but not yet computed,
            and are shown in that labelled state.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href="/fraud-radar/signals"
              className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Open Research Signals
            </Link>
            <Link
              href="/fraud-radar/signals/methods"
              className="rounded-lg border border-white/15 px-4 py-2 text-white/85 hover:bg-white/5"
            >
              How signals are computed
            </Link>
          </div>
        </section>

        <section className="mt-12 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.06] p-6">
          <h2 className="text-xl font-semibold">Ask the records: the AI Investigator</h2>
          <p className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed">
            A signed-in research assistant over the same published records as
            the engines above — Medicaid and Medicare providers, grant
            recipients, single audits and research signals. Ask in plain
            language; every figure in an answer is cited to the dataset,
            version and record it came from. It presents research leads for
            human review and does not determine that any person or
            organization has committed wrongdoing.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href="/fraud-radar/investigator"
              className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Open the AI Investigator
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/40 leading-relaxed">
            Sign-in required. The investigator is an account surface, so it is
            not listed among the public pages.
          </p>
        </section>

        <section className="mt-12 rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.06] p-6">
          <h2 className="text-xl font-semibold">Your cases: private research workspaces</h2>
          <p className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed">
            Pin research leads from the provider, recipient and signals
            pages into a private case — each pin freezes the record with
            its method and data vintages exactly as published — keep your
            own evidence and notes alongside, and check statements
            against the published corpus. A case is visible only to you,
            and its status describes your work, never a determination
            about its subjects.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href="/fraud-radar/cases"
              className="rounded-lg bg-cyan-400 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Open your cases
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/40 leading-relaxed">
            Sign-in required. Cases are an account surface, so they are
            not listed among the public pages.
          </p>
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-xl font-semibold">Whistleblower Research Center</h2>
          <p className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed">
            The Justice Department&apos;s Fraud Whistleblower Incentive Program
            (WHIP) publishes a defined framework: a reward of{" "}
            <strong className="text-white">$10,000 to $30,000</strong> for a
            distinct tip that leads to criminal charges in covered areas, paid
            after charges are unsealed and awarded at the Department&apos;s sole
            discretion. Original information can include information derived
            from independent analysis of public data — which is what this
            platform produces. Tips must be submitted through the official
            government portal: Fraud Radar prepares evidence and routes you
            there; it never submits allegations on your behalf and is not
            affiliated with the Department of Justice.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a
                className="text-cyan-300 hover:underline"
                href="https://www.justice.gov/fraud/whistleblower"
                rel="noreferrer"
                target="_blank"
              >
                justice.gov/fraud/whistleblower — the WHIP program
              </a>
            </li>
            <li>
              <a
                className="text-cyan-300 hover:underline"
                href="https://www.justice.gov/fraud/criminal-tip-rewards-pilot-program-faqs"
                rel="noreferrer"
                target="_blank"
              >
                Criminal Tip Rewards Pilot Program — official FAQs
              </a>
            </li>
            <li>
              <a
                className="text-cyan-300 hover:underline"
                href="https://america.gov/fraud"
                rel="noreferrer"
                target="_blank"
              >
                america.gov/fraud — the official reporting portal
              </a>
            </li>
          </ul>
          <p className="mt-4 text-xs text-white/40 leading-relaxed">
            Program rules are set by the Department of Justice and can change;
            always confirm current terms on the official pages above. Larger,
            separate whistleblower tracks (such as False Claims Act qui tam
            actions, which are filed by attorneys) have different requirements
            and are explained separately in the Research Center.
          </p>
        </section>
      </div>
    </main>
  );
}
