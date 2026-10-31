import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  getSignalsDatasetMeta,
  getSignalsRules,
  getArtifactRuleSummaries,
  listRuleLeads,
  contractsPendingState,
  signalLeadProvenanceComplete,
  CANDIDATE_STATUS,
  CONTRACTS_PENDING_STATE,
  PUBLISHED_ENGINES,
  type SignalRuleDef,
  type SignalsEngine,
} from "@/lib/fraud-radar/signals-data";
import {
  getSignalRuleSummary,
  type SignalRuleSummaryRow,
} from "@/lib/fraud-radar/signals-neon";
import { formatCount } from "@/lib/fraud-radar/healthcare-data";
import { ResearchLeadNotice } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — research rule detail (Phase 6, Payload B1).
 *
 * One page per rule code: the catalog definition verbatim, the peer
 * construction, the counts for every published vintage available
 * (the summary grain carries the current signals version; prior
 * versions are retained in the pipeline publication), the
 * not-computed breakdown, and the largest published leads by the
 * rule's own measure — leads only, each rendered with its
 * provenance summary. Ordering within a rule is by the rule's own
 * effect size (ratio to the peer median where published); it is
 * never a composite across rules and never a standing for the
 * entity. Contracts rule codes render the engine's pending state.
 */
export const metadata = {
  title: "Fraud Radar — Research Rule Detail",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function fmtNum(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function fmtExpected(n: number | null): string {
  if (n === null) return "not applicable to this rule's form";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function SignalRuleDetailPage({
  params,
}: {
  params: Promise<{ ruleCode: string }>;
}) {
  if (!fraudRadarEnabled()) notFound();
  const { ruleCode: rawCode } = await params;
  const ruleCode = decodeURIComponent(rawCode).trim().toUpperCase();
  if (!ruleCode) notFound();

  const meta = await getSignalsDatasetMeta();

  // Contracts codes: the engine is a labelled pending state, and its
  // rule pages say exactly that — never a zero, never a 404 that
  // would imply the rule does not exist.
  if (/^C-\d+$/.test(ruleCode) || ruleCode === "S-02" || ruleCode === "X-MULTI-01") {
    const pending = contractsPendingState(meta);
    if (pending.ruleCodes.includes(ruleCode) || pending.recordCodes.includes(ruleCode)) {
      return (
        <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
          <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
            <Link href="/fraud-radar/signals" className="text-sm text-cyan-300 hover:underline">
              ← Research signals
            </Link>
            <h1 className="mt-6 text-3xl font-bold">{ruleCode} — contracts</h1>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <h2 className="text-base font-semibold">Not yet computed</h2>
              <p className="mt-2 text-sm font-mono text-amber-200/90">
                {CONTRACTS_PENDING_STATE}
              </p>
              <p className="mt-2 text-sm text-white/70 leading-relaxed">{pending.note}</p>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">
                No lead count is published for this rule — a count of zero
                is not implied, and no entity has been evaluated under it.
              </p>
            </div>
          </div>
        </main>
      );
    }
  }

  const rulesFiles = await Promise.all(
    [...PUBLISHED_ENGINES, "contracts" as SignalsEngine].map(async (e) =>
      getSignalsRules(e),
    ),
  );
  let def: SignalRuleDef | null = null;
  for (const file of rulesFiles) {
    const found = file?.rules.find((r) => r.code === ruleCode);
    if (found) {
      def = found;
      break;
    }
  }

  const neonSummary = await getSignalRuleSummary(ruleCode);
  const summary: SignalRuleSummaryRow | null =
    neonSummary ??
    ((await getArtifactRuleSummaries())?.find((s) => s.ruleCode === ruleCode) ??
      null);

  if (!def && !summary && ruleCode !== "S-06") notFound();

  const engine = (summary?.engine ?? def?.engine ?? "cross") as SignalsEngine;
  const isCandidateCode = ruleCode === "S-06";
  const leads = isCandidateCode
    ? []
    : await listRuleLeads(engine, ruleCode, 10);

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/signals" className="text-sm text-cyan-300 hover:underline">
          ← Research signals
        </Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
          Rule detail · engine: {engine}
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
          {ruleCode}
          {def ? ` — ${def.name}` : summary ? ` — ${summary.ruleName}` : ""}
        </h1>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        {def && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Definition</h2>
            <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">{def.definition}</p>
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-white/40">Measure</dt>
                <dd className="text-white/85">{def.measureName ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-white/40">Band</dt>
                <dd className="text-white/85">{def.band ?? "stated in the definition"}</dd>
              </div>
              <div>
                <dt className="text-white/40">Effect floor (ratio to peer median)</dt>
                <dd className="text-white/85">
                  {def.ratioFloor !== null ? `${def.ratioFloor}×` : "stated in the definition"}
                </dd>
              </div>
              <div>
                <dt className="text-white/40">Method</dt>
                <dd className="text-white/85">{def.methodFamily}</dd>
              </div>
              {def.floors &&
                Object.entries(def.floors).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-white/40">Activity floor: {k}</dt>
                    <dd className="text-white/85">{formatCount(v)}</dd>
                  </div>
                ))}
            </dl>
            {def.caveats.length > 0 && (
              <div className="mt-4 space-y-2">
                {def.caveats.map((c) => (
                  <p
                    key={c.code}
                    className="max-w-3xl rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70 leading-relaxed"
                  >
                    <span className="font-mono text-white/50">{c.code}:</span> {c.text}
                  </p>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Peer construction</h2>
          <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
            {def?.peerSpec ?? summary?.peerDefinition ?? "—"}
          </p>
          {summary && def?.peerSpec && summary.peerDefinition !== def.peerSpec && (
            <p className="mt-2 max-w-3xl text-white/60 leading-relaxed">
              As published in the summary grain: {summary.peerDefinition}
            </p>
          )}
          <p className="mt-2 max-w-3xl text-white/60 leading-relaxed">
            Input versions: {def?.inputVersions ?? summary?.inputVersions ?? "—"} · Rule
            library {def?.ruleLibraryVersion ?? summary?.ruleLibraryVersion ?? "—"}
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Counts by published vintage</h2>
          {summary ? (
            <>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-white/50">
                      <th className="px-4 py-3 font-medium">Signals version</th>
                      <th className="px-4 py-3 font-medium">Evaluated</th>
                      <th className="px-4 py-3 font-medium">Above band before effect floor</th>
                      <th className="px-4 py-3 font-medium">Leads published</th>
                      <th className="px-4 py-3 font-medium">Expected by construction</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-3 font-semibold">{summary.signalsVersion}</td>
                      <td className="px-4 py-3">{formatCount(summary.entitiesEvaluated)}</td>
                      <td className="px-4 py-3">
                        {summary.aboveBandBeforeEffectFloor === null
                          ? "not applicable to this rule's form"
                          : formatCount(summary.aboveBandBeforeEffectFloor)}
                      </td>
                      <td className="px-4 py-3">{formatCount(summary.leadsPublished)}</td>
                      <td className="px-4 py-3">{fmtExpected(summary.expectedByConstruction)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-white/50 leading-relaxed">
                One signals version is published to the app at a time; prior
                versions are retained in the pipeline publication and this
                table gains a row per version as new vintages are loaded.
                The expected-by-construction count is the count the
                rule&apos;s band alone would select if every entity behaved
                identically — published so the band&apos;s mechanical share
                is never mistaken for evidence.
              </p>
              {summary.noiseCaution === true && (
                <p className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100/90 leading-relaxed">
                  Noise caution: the published count is more than half of the
                  expected-by-construction count even after the floors, so
                  the band is doing most of the selection on this rule.
                </p>
              )}
              <h3 className="mt-6 text-base font-semibold">Not-computed breakdown</h3>
              {summary.notComputed && Object.keys(summary.notComputed).length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm text-white/70">
                  {Object.entries(summary.notComputed).map(([k, v]) => (
                    <li key={k}>
                      <span className="font-mono text-white/60">{k}</span>: {formatCount(v)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-white/60 leading-relaxed">
                  No not-computed states were recorded for this rule in this
                  vintage — every entity in the rule&apos;s population was
                  evaluated or counted under the rule&apos;s scope conditions
                  stated in the catalog.
                </p>
              )}
            </>
          ) : (
            <p className="mt-3 max-w-3xl text-sm text-white/60 leading-relaxed">
              No summary counts are loaded for this code in this deployment.
              For screening records (codes beginning S-), per-record counts
              are published in the signals manifest rather than the summary
              grain; the records themselves render on entity profiles in
              their own block. Absence of a summary here is a loading state,
              never a count of zero.
            </p>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">
            {isCandidateCode
              ? "Candidate pairs — admin review only"
              : "Largest published leads by this rule's own measure"}
          </h2>
          {isCandidateCode ? (
            <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
              S-06 pairs carry the status &quot;{CANDIDATE_STATUS}&quot; on
              every row. They are candidates for human review — never
              identity matches and never leads — and they are published only
              in the admin review queue. No public list exists for this code,
              by design.
            </p>
          ) : leads === null ? (
            <p className="mt-3 max-w-3xl text-sm text-white/60 leading-relaxed">
              The signals artifact is not configured for this deployment, so
              no leads can be listed here. The counts above stand on the
              summary grain alone.
            </p>
          ) : leads.length === 0 ? (
            <p className="mt-3 max-w-3xl text-sm text-white/60 leading-relaxed">
              No published leads for this rule were found in the configured
              artifact. Where the summary above reports leads, they render
              in full on the entity profiles; this list reads the same
              artifact buckets.
            </p>
          ) : (
            <>
              <p className="mt-3 max-w-3xl text-sm text-white/60 leading-relaxed">
                Ordered for triage by the rule&apos;s own effect size — the
                ratio to the peer median where the rule publishes one,
                otherwise the measure value. This ordering is within this
                rule only; it is not a standing for any entity, and entities
                are never ordered across rules. Each entry carries its
                provenance summary; the full evidence block renders on the
                entity&apos;s profile.
              </p>
              <div className="mt-4 space-y-3">
                {leads.map((lead) => (
                  <article
                    key={`${lead.entityKey}-${lead.code}-${lead.recordKey ?? ""}`}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm"
                  >
                    <p className="font-semibold text-white/90">
                      Entity {lead.entityKey}
                      {lead.entityKeyType ? ` (${lead.entityKeyType})` : ""}
                    </p>
                    <p className="mt-1 text-white/70 leading-relaxed">
                      {lead.measureName}: {fmtNum(lead.measureValue)}
                      {lead.peerMedian !== null &&
                        ` versus a peer-group median of ${fmtNum(lead.peerMedian)}`}
                      {lead.peerN !== null && ` among ${formatCount(lead.peerN)} peers`}
                      {lead.percentileBand && ` (${lead.percentileBand} within that group)`}
                      {lead.ratioToPeerMedian !== null &&
                        ` · ratio to peer median ${fmtNum(lead.ratioToPeerMedian)}×`}
                    </p>
                    <p className="mt-1 text-white/50 leading-relaxed">
                      {lead.peerGroupDefinition
                        ? `Peer group: ${lead.peerGroupDefinition}${lead.peerRung ? ` Rung used: ${lead.peerRung}.` : ""}`
                        : "No peer group for this rule form (own-history or exact-identifier comparison)."}
                    </p>
                    <p className="mt-1 text-white/50 leading-relaxed">
                      Computed {lead.computedAt.slice(0, 10)} · Rule library{" "}
                      {lead.ruleLibraryVersion} · Inputs: {lead.inputVersions} ·
                      Provenance {signalLeadProvenanceComplete(lead) ? "complete" : "incomplete — a defect in this publication"}
                    </p>
                    {lead.caveatCodes.length > 0 && (
                      <p className="mt-1 font-mono text-xs text-white/40">
                        Caveats: {lead.caveatCodes.join(", ")}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
