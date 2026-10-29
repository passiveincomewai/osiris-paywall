import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";

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

export default function FraudRadarPage() {
  if (!fraudRadarEnabled()) notFound();

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
