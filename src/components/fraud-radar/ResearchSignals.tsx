/**
 * Fraud Radar — the shared "Research signals" profile section
 * (Phase 6, Payload B2).
 *
 * Given an engine + entity key, reads that entity's published
 * research leads from the signals artifact layer (signals-data.ts)
 * and renders each lead with its full provenance block as UI —
 * rule code + plain-language rule name from the catalog, the
 * measured values (entity value, peer median, percentile band),
 * the effect size, the peer definition + rung + n, the detail
 * figures the rule published, and the input versions. Provenance
 * is mandatory UI here, never tooltips-only: a lead rendered
 * without its block is a defect (PHASE6 §2.3).
 *
 * States, all labelled, never blank and never zero-filled:
 *  - artifacts unconfigured for this deployment → the section is
 *    absent and the profile page stands on its own data (the
 *    fail-soft precedent of the care/grants profiles);
 *  - the entity has no published leads → the standing sentence
 *    "no research leads from the current rule library", stated as
 *    the complete statement (absence is not a clearance);
 *  - a rule's comparison for this entity is in a not-computed
 *    state → that state is rendered with its reason sentence,
 *    a different statement from "no research leads".
 * Class-S screening records render in their own sub-block, never
 * merged with rule leads and never counted alongside them.
 * S-06 candidate pairs can never appear here: the data layer
 * filters them from every public entity read, and this component
 * reads only through that layer.
 *
 * Language discipline (PHASE6 §2.1): these are research leads —
 * never declarations about an entity, never a statement of how
 * likely wrongdoing is, never a grade. No count of an entity's
 * leads is rendered as its standing, and nothing here orders
 * entities against each other.
 */
import {
  getEntitySignals,
  getSignalsLoader,
  getSignalsRules,
  signalLeadProvenanceComplete,
  RESEARCH_LEADS_NOTE,
  SCREENING_RECORDS_NOTE,
  type SignalLead,
  type SignalRuleDef,
  type SignalsEngine,
} from "@/lib/fraud-radar/signals-data";
import { formatCount, formatUsd } from "@/lib/fraud-radar/healthcare-data";
import PinToCase from "./PinToCase";

/** Reason sentences for the closed not-computed vocabulary —
 *  the same text the methods page publishes (PHASE6 §3.4). */
export const NOT_COMPUTED_MEANINGS: Record<string, string> = {
  not_computed_peer_group_too_small:
    "No peer group for this entity reached the minimum size of 30 entities on any fallback rung, so no peer comparison was made.",
  not_computed_missing_peer_key:
    "The entity lacks the key a peer group needs (for example no NPPES taxonomy or practice state, or no single assistance listing or industry code carrying at least a quarter of its awards), so it was never force-grouped.",
  not_computed_below_activity_floor:
    "The entity's activity is below the rule's minimum-activity floor. Ratios over tiny denominators are the largest single source of misleading leads, so the comparison is not made.",
  not_computed_suppressed_source:
    "The entity's relevant activity sits below a source suppression floor (the Medicare file suppresses provider-by-service rows with fewer than 11 beneficiaries), so the activity the rule needs is absent from the published source — absent, not zero.",
  not_computed_period_unaligned:
    "Two figures can only be compared where their accounting periods align (the FAC-to-Form-990 rule). Where no aligned period exists, no comparison is made.",
  not_computed_input_not_published:
    "The rule is defined, but its input aggregates are not yet published with a valid record, so nothing has been computed. This is the contracts engine's current state.",
};

const ENGINE_LABELS: Record<SignalsEngine, string> = {
  healthcare: "Healthcare — Medicaid",
  care: "Care — Medicare",
  grants: "Government grants",
  cross: "Cross-dataset",
  contracts: "Contracts",
};

function fmtNum(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function isNotComputed(row: SignalLead): boolean {
  return row.status.startsWith("not_computed");
}

/** A published detail figure: money fields (named as money in the
 *  source) render as dollars; everything else renders as the
 *  published value under its published field name. */
function DetailBlock({ detail }: { detail: Record<string, unknown> }) {
  const entries = Object.entries(detail).filter(
    ([, v]) => v !== null && v !== undefined,
  );
  if (entries.length === 0) return null;
  return (
    <dl className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt className="font-mono text-xs text-white/40">{k}</dt>
          <dd className="text-white/85">
            {typeof v === "number"
              ? /usd|_amt$|expended/.test(k)
                ? formatUsd(v)
                : fmtNum(v)
              : String(v)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function LeadArticle({
  lead,
  def,
  engine,
  entityKey,
}: {
  lead: SignalLead;
  def: SignalRuleDef | null;
  /** Pin context (Phase 8, P8-D): identifiers only — the pin
   *  component renders nothing for signed-out visitors. */
  engine: SignalsEngine;
  entityKey: string;
}) {
  const caveatTexts = (def?.caveats ?? []).filter((c) =>
    lead.caveatCodes.includes(c.code),
  );
  const unresolvedCodes = lead.caveatCodes.filter(
    (code) => !caveatTexts.some((c) => c.code === code),
  );
  return (
    <article className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <h3 className="font-semibold text-white/90">
        Research lead — {def ? def.name : lead.code}
      </h3>
      <p className="mt-1 font-mono text-xs text-white/40">
        {lead.code} · rule library {lead.ruleLibraryVersion}
        {lead.recordKey ? ` · record ${lead.recordKey}` : ""}
      </p>
      {def && (
        <p className="mt-2 text-sm text-white/70 leading-relaxed">{def.definition}</p>
      )}
      <p className="mt-2 text-sm text-white/85 leading-relaxed">
        {lead.measureName}: {fmtNum(lead.measureValue)}
        {lead.peerMedian !== null &&
          ` versus a peer-group median of ${fmtNum(lead.peerMedian)}`}
        {lead.peerN !== null && ` among ${formatCount(lead.peerN)} peers`}
        {lead.percentileBand
          ? ` (${lead.percentileBand} within that group)`
          : lead.percentileWithinPeerGroup !== null
            ? ` (percentile ${fmtNum(lead.percentileWithinPeerGroup)} within that group)`
            : ""}
        {lead.ratioToPeerMedian !== null &&
          ` · ratio to peer median ${fmtNum(lead.ratioToPeerMedian)}×`}
        {lead.robustDistanceFromPeerMedian !== null &&
          ` · robust distance from peer median ${fmtNum(lead.robustDistanceFromPeerMedian)}`}
        {lead.peerP90 !== null && ` · peer 90th percentile ${fmtNum(lead.peerP90)}`}
        {lead.peerP99 !== null && ` · peer 99th percentile ${fmtNum(lead.peerP99)}`}
      </p>
      <p className="mt-1 text-sm text-white/55 leading-relaxed">
        {lead.peerGroupDefinition
          ? `Peer group: ${lead.peerGroupDefinition}${lead.peerRung ? ` Rung used: ${lead.peerRung}.` : ""}${lead.peerN !== null ? ` Peer group size: ${formatCount(lead.peerN)}.` : ""}`
          : "No peer group for this rule form (own-history or exact-identifier comparison)."}
      </p>
      {lead.detail && <DetailBlock detail={lead.detail} />}
      <p className="mt-2 text-sm text-white/50 leading-relaxed">
        Computed {lead.computedAt.slice(0, 10)} · Inputs: {lead.inputVersions}
        {lead.sourceTable ? ` · Source: ${lead.sourceTable}` : ""} · Provenance{" "}
        {signalLeadProvenanceComplete(lead)
          ? "complete"
          : "incomplete — a defect in this publication"}
      </p>
      {caveatTexts.map((c) => (
        <p
          key={c.code}
          className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70 leading-relaxed"
        >
          <span className="font-mono text-white/50">{c.code}:</span> {c.text}
        </p>
      ))}
      {unresolvedCodes.length > 0 && (
        <p className="mt-2 font-mono text-xs text-white/40">
          Caveats: {unresolvedCodes.join(", ")}
        </p>
      )}
      <div className="mt-3">
        <PinToCase engine={engine} entityKey={entityKey} ruleCode={lead.code} kind="signal" />
      </div>
    </article>
  );
}

function ScreeningArticle({
  record,
  def,
  engine,
  entityKey,
}: {
  record: SignalLead;
  def: SignalRuleDef | null;
  engine: SignalsEngine;
  entityKey: string;
}) {
  return (
    <article className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-4">
      <h3 className="font-semibold text-white/90">
        Screening record — {def ? def.name : record.code}
      </h3>
      <p className="mt-1 font-mono text-xs text-white/40">
        {record.code} · rule library {record.ruleLibraryVersion}
        {record.recordKey ? ` · record ${record.recordKey}` : ""}
      </p>
      <p className="mt-2 text-sm text-white/85 leading-relaxed">
        {record.measureName}: {fmtNum(record.measureValue)}
      </p>
      {record.detail && <DetailBlock detail={record.detail} />}
      <p className="mt-2 text-sm text-white/50 leading-relaxed">
        Computed {record.computedAt.slice(0, 10)} · Inputs: {record.inputVersions}
        {record.sourceTable ? ` · Source: ${record.sourceTable}` : ""}
      </p>
      {record.caveatCodes.length > 0 && (
        <p className="mt-1 font-mono text-xs text-white/40">
          Caveats: {record.caveatCodes.join(", ")}
        </p>
      )}
      <div className="mt-3">
        <PinToCase engine={engine} entityKey={entityKey} ruleCode={record.code} kind="screening" />
      </div>
    </article>
  );
}

export async function ResearchSignalsSection({
  engine,
  entityKey,
  heading,
  note,
}: {
  engine: SignalsEngine;
  entityKey: string;
  /** Section heading override (profiles with two instances label
   *  each one); defaults to "Research signals — <engine>". */
  heading?: string;
  /** Optional keying note, rendered verbatim under the framing —
   *  e.g. the grants profile states the cross engine's published
   *  grains beside its cross-dataset instance. */
  note?: string;
}) {
  // Fail-soft: no signals artifact configured for this deployment —
  // the section is absent and the profile stands on its own data.
  if (getSignalsLoader() === null) return null;

  const [data, rulesFile] = await Promise.all([
    getEntitySignals(engine, entityKey),
    getSignalsRules(engine),
  ]);
  const defs = new Map((rulesFile?.rules ?? []).map((r) => [r.code, r]));

  const allLeads = data?.leads ?? [];
  const leads = allLeads.filter((r) => r.lead && !isNotComputed(r));
  const notComputed = [
    ...allLeads.filter((r) => !r.lead && isNotComputed(r)),
    ...(data?.screeningRecords ?? []).filter((r) => isNotComputed(r)),
  ];
  const screening = (data?.screeningRecords ?? []).filter(
    (r) => !isNotComputed(r),
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="text-lg font-semibold">
        {heading ?? `Research signals — ${ENGINE_LABELS[engine]}`}
      </h2>
      <p className="mt-2 text-sm text-white/55 leading-relaxed">
        {RESEARCH_LEADS_NOTE}
      </p>
      {note && (
        <p className="mt-2 text-sm text-white/55 leading-relaxed">{note}</p>
      )}

      {leads.length === 0 && notComputed.length === 0 && screening.length === 0 ? (
        <p className="mt-3 text-sm text-white/65 leading-relaxed">
          No research signals in the current vintage for this entity: no
          research leads from the current rule library apply to it in the
          published signals vintage. That is the complete statement —
          absence of a lead is not a clearance, and a comparison that
          could not be computed is labelled as not computed below, never
          shown as zero.
        </p>
      ) : (
        <>
          {leads.length > 0 && (
            <div className="mt-4 space-y-3">
              {leads.map((lead) => (
                <LeadArticle
                  key={`${lead.code}-${lead.recordKey ?? ""}`}
                  lead={lead}
                  def={defs.get(lead.code) ?? null}
                  engine={engine}
                  entityKey={entityKey}
                />
              ))}
            </div>
          )}
          {leads.length === 0 && (notComputed.length > 0 || screening.length > 0) && (
            <p className="mt-3 text-sm text-white/65 leading-relaxed">
              No research leads from the current rule library apply to this
              entity in the published signals vintage. That is the complete
              statement — absence of a lead is not a clearance.
            </p>
          )}
        </>
      )}

      {notComputed.length > 0 && (
        <div className="mt-5">
          <h3 className="text-base font-semibold">
            Comparisons not computed for this entity
          </h3>
          <div className="mt-3 space-y-3">
            {notComputed.map((row) => (
              <div
                key={`${row.code}-${row.recordKey ?? ""}-${row.status}`}
                className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
              >
                <p className="text-sm text-white/85">
                  {defs.get(row.code)?.name ?? row.code}{" "}
                  <span className="font-mono text-xs text-white/40">({row.code})</span>
                </p>
                <p className="mt-1 font-mono text-sm text-amber-200/90">{row.status}</p>
                <p className="mt-1 text-sm text-white/70 leading-relaxed">
                  {NOT_COMPUTED_MEANINGS[row.status] ??
                    "This comparison was not computed for this entity in the current vintage; the state is labelled rather than shown as a figure."}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {screening.length > 0 && (
        <div className="mt-5">
          <h3 className="text-base font-semibold">
            Screening records — exact-identifier listings
          </h3>
          <p className="mt-2 text-sm text-white/55 leading-relaxed">
            {SCREENING_RECORDS_NOTE}
          </p>
          <div className="mt-3 space-y-3">
            {screening.map((record) => (
              <ScreeningArticle
                key={`${record.code}-${record.recordKey ?? ""}`}
                record={record}
                def={defs.get(record.code) ?? null}
                engine={engine}
                entityKey={entityKey}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
