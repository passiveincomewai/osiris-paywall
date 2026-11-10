import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import { RESEARCH_LEADS_NOTE } from "@/lib/fraud-radar/investigator/guardrails";
import { REPORT_TEMPLATES } from "@/lib/fraud-radar/reports/templates";
import ReportsClient from "./ReportsClient";

/**
 * WorldEye Fraud Radar — Report Studio index (Phase 9,
 * Payload P9-C; PHASE9 §5.1).
 *
 * The signed-in report workspace: the caller's own reports
 * plus the template gallery rendered from the single
 * registry. Reports are private user data — finished,
 * citable documents generated ONLY from pinned inputs — and
 * this surface is an account surface: deliberately NOT added
 * to fraudRadarPublicPaths(), never sitemap-listed, and
 * noindex. Flag first, like every Fraud Radar page: with
 * FRAUD_RADAR_ENABLED off this route 404s, indistinguishable
 * from non-existence.
 */
export const metadata = {
  title: "Fraud Radar — Report Studio",
  description:
    "Your private Fraud Radar reports: citable documents generated from pinned research inputs, with a reproducibility manifest on every version.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) notFound();

  const templates = REPORT_TEMPLATES.map((t) => ({
    id: t.id,
    version: t.version,
    title: t.title,
    purpose: t.purpose,
    audience: t.audience,
    requiredPins: t.requiredPins,
    optionalPins: t.optionalPins,
    available: t.available,
  }));

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar" className="text-sm text-cyan-300 hover:underline">
          ← Fraud Radar
        </Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
          Report Studio
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
          Your reports.
        </h1>
        <p className="mt-4 max-w-3xl text-white/70 leading-relaxed">
          A report is a finished, citable document generated from inputs
          pinned at a moment in time — a case snapshot, lead snapshots,
          evidence hashes, dataset vintages — never from whatever the live
          data says today. Every version carries a reproducibility
          manifest, and every number in it traces to a pinned input.
          Reports are visible only to you; exports leave this workspace
          only when you download them.
        </p>
        <p className="mt-4 max-w-3xl rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100/90 leading-relaxed">
          {RESEARCH_LEADS_NOTE}
        </p>
        <ReportsClient templates={templates} />
      </div>
    </main>
  );
}
