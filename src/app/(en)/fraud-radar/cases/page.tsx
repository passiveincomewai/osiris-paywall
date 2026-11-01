import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { RESEARCH_LEADS_NOTE } from "@/lib/fraud-radar/investigator/guardrails";
import CasesClient from "./CasesClient";

/**
 * WorldEye Fraud Radar — cases (Phase 8, Payload P8-D).
 *
 * The signed-in workspace index: the caller's own cases only,
 * rendered through the P8-A cases API by the client surface.
 * Cases are private work product — pinned research leads with
 * their provenance frozen, the user's own evidence, notes and
 * claim checks — and this surface is an account surface: it is
 * deliberately NOT added to fraudRadarPublicPaths(), never
 * sitemap-listed, and noindex (§5.1). Flag first, like every
 * Fraud Radar page: with FRAUD_RADAR_ENABLED off this route
 * 404s, indistinguishable from non-existence.
 */
export const metadata = {
  title: "Fraud Radar — Your Cases",
  description:
    "Your private Fraud Radar cases: pinned research leads with frozen provenance, evidence, notes and claim checks against the published corpus.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function CasesPage() {
  if (!fraudRadarEnabled()) notFound();

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar" className="text-sm text-cyan-300 hover:underline">
          ← Fraud Radar
        </Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
          Cases
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
          Your research cases.
        </h1>
        <p className="mt-4 max-w-3xl text-white/70 leading-relaxed">
          A case is a private workspace for one research matter: leads
          pinned from the published records with their provenance frozen
          at pin time, your own evidence files, notes, and statements
          checked against the published corpus. Cases are visible only
          to you.
        </p>
        <p className="mt-4 max-w-3xl rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100/90 leading-relaxed">
          {RESEARCH_LEADS_NOTE}
        </p>
        <CasesClient />
      </div>
    </main>
  );
}
