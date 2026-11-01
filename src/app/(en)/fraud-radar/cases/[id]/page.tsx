import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { RESEARCH_LEADS_NOTE } from "@/lib/fraud-radar/investigator/guardrails";
import CaseDetailClient from "./CaseDetailClient";

/**
 * WorldEye Fraud Radar — case workspace (Phase 8, Payload
 * P8-D, PHASE8 §5.1). One case, five sections — leads
 * (snapshots), evidence (vault), claims (verifications),
 * notes, activity — rendered by the client surface entirely
 * through the P8-A/B/C case APIs. Owner-only: the API answers
 * 404 for another user's case exactly as for a nonexistent
 * one, and the client renders that as a plain not-found state
 * (no existence leak). Like the list page, this is an account
 * surface: never in fraudRadarPublicPaths(), noindex, and
 * flag-gated first so flag-off is non-existence.
 */
export const metadata = {
  title: "Fraud Radar — Case",
  description:
    "A private Fraud Radar case workspace: pinned research leads with frozen provenance, evidence, notes and claim checks.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const { id } = await params;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/cases" className="text-sm text-cyan-300 hover:underline">
          ← Your cases
        </Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
          Case workspace
        </p>
        <p className="mt-4 max-w-3xl rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100/90 leading-relaxed">
          {RESEARCH_LEADS_NOTE}
        </p>
        <CaseDetailClient caseId={id} />
      </div>
    </main>
  );
}
