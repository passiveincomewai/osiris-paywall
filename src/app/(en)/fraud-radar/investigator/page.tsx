import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { fraudRadarAdminPreview } from "@/lib/fraud-radar/access";
import {
  CAVEAT_TEXT,
  INVESTIGATOR_NOT_CONFIGURED_TEXT,
  RESEARCH_LEADS_NOTE,
  VALIDATOR_FALLBACK_NOTICE,
} from "@/lib/fraud-radar/investigator/guardrails";
import InvestigatorClient from "./InvestigatorClient";

/**
 * WorldEye Fraud Radar — AI Investigator (Phase 7, Payload P7-C).
 *
 * A signed-in research surface over the published Fraud Radar
 * records: the assistant answers from read-only tools over the
 * same data layers as the public profile/search pages, and every
 * figure in an answer carries its citation (dataset + version +
 * grain key) back to a tool result. It is a research assistant,
 * not a determiner of wrongdoing — the standing framing below is
 * the guardrails module's own text, rendered verbatim.
 *
 * Dark by design: with FRAUD_RADAR_ENABLED off this route 404s
 * like every Fraud Radar surface. The investigator is an
 * authenticated app surface and is deliberately NOT added to
 * fraudRadarPublicPaths() — it is never a public or sitemap path
 * (PHASE7 §5.1, stated so it is not "fixed" later). The standing
 * copy constants are assembled here, server-side, and passed to
 * the client surface as props: no other module writes
 * investigator copy, and the client bundle imports no server
 * data layer.
 */
export const metadata = {
  title: "Fraud Radar — AI Investigator",
  description:
    "Ask research questions over published U.S. government spending records — Medicaid and Medicare providers, federal grants and single audits — with every figure cited to its dataset, version and grain.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function InvestigatorPage() {
  if (!fraudRadarEnabled() && !(await fraudRadarAdminPreview())) notFound();

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar" className="text-sm text-cyan-300 hover:underline">
          ← Fraud Radar
        </Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
          AI Investigator
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
          Research over the published records, with citations.
        </h1>
        <p className="mt-4 max-w-3xl text-white/70 leading-relaxed">
          The investigator is a research assistant over the public records
          published in Fraud Radar — Medicaid and Medicare provider records,
          federal grant recipients, single audits, and the published research
          signals. It reads the same published data as the profile and search
          pages; it reaches no record those pages cannot reach, and it does
          not determine that any person or organization engaged in wrongdoing.
        </p>
        <p className="mt-4 max-w-3xl rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100/90 leading-relaxed">
          {RESEARCH_LEADS_NOTE}
        </p>
        <p className="mt-4 max-w-3xl text-sm text-white/60 leading-relaxed">
          Conversations are stored under your account, are visible only to
          you, and persist until you delete them. Figures in an answer come
          only from the tool results gathered for that answer; where a draft
          answer&apos;s figures could not be verified against those results,
          the verified results are shown directly as a labelled table instead.
        </p>
        <InvestigatorClient
          copy={{
            researchLeadsNote: RESEARCH_LEADS_NOTE,
            notConfiguredText: INVESTIGATOR_NOT_CONFIGURED_TEXT,
            fallbackNotice: VALIDATOR_FALLBACK_NOTICE,
            caveatText: CAVEAT_TEXT,
          }}
        />
      </div>
    </main>
  );
}
