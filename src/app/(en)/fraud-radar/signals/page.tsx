import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  getSignalsDatasetMeta,
  getSignalsRules,
  getArtifactRuleSummaries,
  contractsPendingState,
  RESEARCH_LEADS_NOTE,
  SCREENING_RECORDS_NOTE,
  CONTRACTS_PENDING_STATE,
  PUBLISHED_ENGINES,
} from "@/lib/fraud-radar/signals-data";
import {
  listSignalRuleSummaries,
  type SignalRuleSummaryRow,
} from "@/lib/fraud-radar/signals-neon";
import { formatCount } from "@/lib/fraud-radar/healthcare-data";
import {
  ResearchLeadNotice,
  NotPublishedYet,
} from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — Research signals index (Phase 6, Payload B1).
 *
 * One section per engine. Every rule is rendered from the rule
 * catalog (the pipeline rule library is the only source of names
 * and definitions) with its summary counts from the Neon summary
 * grain, fail-soft to the publisher's artifact summary file when
 * the Neon grain has not been loaded. Every count renders beside
 * its method and vintage context: the signals version, the rule
 * library version, the peer definition and the input versions.
 *
 * Signals are research leads for human review — never declarations
 * about an entity, never a statement of how likely wrongdoing is,
 * never a grade. There is no composite standing and entities are
 * never ranked against each other on this page: no entity lists
 * appear here at all. The contracts engine renders in its explicit
 * pending state (not_computed_input_not_published) — a labelled
 * "not yet computed" panel, never zeros and never absent.
 */
export const metadata = {
  title: "Fraud Radar — Research Signals: Rule Library by Engine",
  description:
    "The Fraud Radar research-rule library by engine — deterministic rules that compare an entity to a defined peer group, its own history, or its own mix, with evaluated and lead counts, by-construction expectations and input vintages. Research leads for human review, not findings about any entity.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ENGINE_SECTIONS: {
  engine: string;
  title: string;
  body: string;
}[] = [
  {
    engine: "healthcare",
    title: "Healthcare — Medicaid",
    body: "Rules over the HHS Medicaid Provider Spending aggregates (2018–2024), peer groups built from NPPES identity (the NBER mirror of CMS NPPES, August 2026 vintage — labelled that way wherever it is used, never claimed as a CMS download). Money measures use the published treatment that excludes the outlier cells.",
  },
  {
    engine: "care",
    title: "Care programs — Medicare",
    body: "Rules over the CMS Medicare fee-for-service provider utilization aggregates (CY2022–2024). All Medicare dollar figures here are derived — services multiplied by CMS's published average amounts — and are named derived wherever they appear.",
  },
  {
    engine: "grants",
    title: "Government grants & single audits",
    body: "Rules over USAspending federal assistance awards (amounts are award-cumulative snapshots under the attributed fiscal year — obligations, outlays and expenditures kept distinct) and Federal Audit Clearinghouse single audits. An audit finding is an auditor's compliance observation, not a determination about the auditee.",
  },
  {
    engine: "cross",
    title: "Cross-dataset",
    body: "Rules that compare one entity's own figures across two published datasets, joining on exact identifiers (NPI, UEI, EIN) only. Class-S screening records — exact-identifier facts from named extracts — are presented in their own block on entity profiles, never merged with rule leads and never counted alongside them.",
  },
];

function fmtExpected(n: number | null): string {
  if (n === null) return "not applicable to this rule's form";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function SignalsPage() {
  if (!fraudRadarEnabled()) notFound();

  const [meta, neonSummaries] = await Promise.all([
    getSignalsDatasetMeta(),
    listSignalRuleSummaries(),
  ]);
  const summaries: SignalRuleSummaryRow[] | null =
    neonSummaries ?? (await getArtifactRuleSummaries());
  const summarySource =
    neonSummaries !== null
      ? "the Neon summary grain"
      : summaries !== null
        ? "the publisher's artifact summary file (the Neon summary grain has not been loaded for this deployment yet)"
        : null;

  const rulesFiles = await Promise.all(
    PUBLISHED_ENGINES.map(async (e) => [e, await getSignalsRules(e)] as const),
  );
  const defByCode = new Map<string, { name: string; definition: string }>();
  for (const [, file] of rulesFiles) {
    for (const r of file?.rules ?? []) {
      defByCode.set(r.code, { name: r.name, definition: r.definition });
    }
  }
  const pending = contractsPendingState(meta);
  const nothingPublished = meta === null && summaries === null;

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar" className="text-sm text-cyan-300 hover:underline">
          ← Fraud Radar
        </Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
          Statistical intelligence
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
          Research signals, by engine.
        </h1>
        <p className="mt-4 max-w-3xl text-white/70 leading-relaxed">
          Deterministic, versioned research rules compare an entity to a
          defined peer group, to its own history, to its own internal mix,
          or across datasets. A rule publishes a lead only when three
          conditions hold together: the entity sits in the rule&apos;s
          percentile band within its peer group, its measure clears the
          rule&apos;s effect floor against the peer median, and its
          activity clears the rule&apos;s minimum-activity floor.
        </p>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>
        <p className="mt-4 max-w-3xl rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/70 leading-relaxed">
          {RESEARCH_LEADS_NOTE}
        </p>
        <p className="mt-4 text-sm">
          <Link href="/fraud-radar/signals/methods" className="text-cyan-300 hover:underline">
            How these signals are computed — methods, peer groups and the not-computed vocabulary →
          </Link>
        </p>

        {nothingPublished ? (
          <div className="mt-10">
            <NotPublishedYet what="The research-signals publication" />
          </div>
        ) : (
          <>
            {meta !== null && (
              <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60 leading-relaxed">
                <h2 className="text-base font-semibold text-white">About this publication</h2>
                <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-white/40">Signals version</dt>
                    <dd className="text-white/85">{meta.version}</dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Rule library version</dt>
                    <dd className="text-white/85">{meta.ruleLibraryVersion}</dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Counts source</dt>
                    <dd>{summarySource}</dd>
                  </div>
                  <div>
                    <dt className="text-white/40">Artifact generated</dt>
                    <dd>{meta.generatedAt ? meta.generatedAt.slice(0, 10) : "—"}</dd>
                  </div>
                </dl>
                <p className="mt-3">
                  Expected-by-construction counts are published, not hidden:
                  a percentile band alone would select that share of any
                  peer group even if every entity behaved identically, so
                  each peer rule shows the count its band would produce by
                  construction beside the count it actually published after
                  its floors. Where a rule&apos;s published count is close
                  to its by-construction count, the summary says so — the
                  band is doing most of the selection and reviewers triage
                  within the rule by effect size.
                </p>
              </section>
            )}

            {ENGINE_SECTIONS.map((section) => {
              const rows = (summaries ?? []).filter(
                (s) => s.engine === section.engine,
              );
              return (
                <section key={section.engine} className="mt-12">
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm text-white/60 leading-relaxed">
                    {section.body}
                  </p>
                  {section.engine === "cross" && (
                    <p className="mt-2 max-w-3xl text-sm text-white/60 leading-relaxed">
                      {SCREENING_RECORDS_NOTE}
                    </p>
                  )}
                  {rows.length === 0 ? (
                    <p className="mt-4 text-sm text-white/50 leading-relaxed">
                      No rule summaries for this engine are loaded in this
                      deployment yet. That is a loading state, not a count
                      of zero leads.
                    </p>
                  ) : (
                    <div className="mt-5 space-y-4">
                      {rows.map((s) => {
                        const def = defByCode.get(s.ruleCode);
                        return (
                          <article
                            key={s.ruleCode}
                            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                          >
                            <h3 className="text-base font-semibold">
                              <Link
                                href={`/fraud-radar/signals/rules/${s.ruleCode}`}
                                className="text-cyan-200 hover:underline"
                              >
                                {s.ruleCode} — {def?.name ?? s.ruleName}
                              </Link>
                            </h3>
                            {def && (
                              <p className="mt-2 text-sm text-white/70 leading-relaxed">
                                {def.definition}
                              </p>
                            )}
                            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                              <div>
                                <dt className="text-white/40">Entities evaluated</dt>
                                <dd className="text-white/85">{formatCount(s.entitiesEvaluated)}</dd>
                              </div>
                              <div>
                                <dt className="text-white/40">Research leads published</dt>
                                <dd className="text-white/85">{formatCount(s.leadsPublished)}</dd>
                              </div>
                              <div>
                                <dt className="text-white/40">Above band before the effect floor</dt>
                                <dd className="text-white/85">
                                  {s.aboveBandBeforeEffectFloor === null
                                    ? "not applicable to this rule's form"
                                    : formatCount(s.aboveBandBeforeEffectFloor)}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-white/40">Expected by construction</dt>
                                <dd className="text-white/85">{fmtExpected(s.expectedByConstruction)}</dd>
                              </div>
                            </dl>
                            {s.noiseCaution === true && (
                              <p className="mt-3 rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100/90 leading-relaxed">
                                Noise caution: this rule&apos;s published count
                                is more than half of its expected-by-construction
                                count even after its floors, so the band is
                                doing most of the selection. Treat its leads as
                                a starting point for review and triage by the
                                measure ratio within the rule.
                              </p>
                            )}
                            {s.notComputed && Object.keys(s.notComputed).length > 0 && (
                              <p className="mt-3 text-sm text-white/60 leading-relaxed">
                                Not computed:{" "}
                                {Object.entries(s.notComputed)
                                  .map(([k, v]) => `${k}: ${formatCount(v)}`)
                                  .join(" · ")}
                                . A not-computed state is a labelled state with
                                a reason — never a zero and never an absence of
                                activity.
                              </p>
                            )}
                            <p className="mt-3 text-sm text-white/50 leading-relaxed">
                              Peer definition: {s.peerDefinition}
                            </p>
                            <p className="mt-2 text-sm text-white/50 leading-relaxed">
                              Input versions: {s.inputVersions} · Signals
                              version {s.signalsVersion} · Rule library{" "}
                              {s.ruleLibraryVersion}
                            </p>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}

            <section className="mt-12">
              <h2 className="text-xl font-semibold">Government contracts</h2>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-base font-semibold text-white">
                  Contracts signals — not yet computed
                </h3>
                <p className="mt-2 text-sm font-mono text-amber-200/90">
                  {CONTRACTS_PENDING_STATE}
                </p>
                <p className="mt-2 text-sm text-white/70 leading-relaxed">
                  {pending.note}
                </p>
                <p className="mt-2 text-sm text-white/60 leading-relaxed">
                  Pending rules: {pending.ruleCodes.join(", ")}. Pending
                  screening records: {pending.recordCodes.join(", ")}. No
                  contracts lead count is published for this engine — a
                  count of zero is not implied.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
