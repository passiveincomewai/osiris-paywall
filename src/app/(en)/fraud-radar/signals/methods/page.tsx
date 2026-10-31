import { notFound } from "next/navigation";
import Link from "next/link";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import {
  getSignalsDatasetMeta,
  RESEARCH_LEADS_NOTE,
  NOT_COMPUTED_STATES,
  CONTRACTS_PENDING_STATE,
} from "@/lib/fraud-radar/signals-data";
import { ResearchLeadNotice } from "@/components/fraud-radar/Provenance";

/**
 * Fraud Radar — Research signals methods (Phase 6, Payload B1).
 *
 * The methods page states, in plain language, how the research
 * rules are computed: the three-part lead test (percentile band +
 * effect floor + activity floor), how peer groups are built (the
 * grouping keys, the fallback rungs, the minimum peer size), the
 * not-computed vocabulary, why by-construction counts are
 * published, the language rules, the dataset vintages, and the
 * honest state of model-assisted analysis (designed, deferred —
 * every rule that has published is a deterministic rule a reviewer
 * can recompute from the published catalog and aggregates).
 */
export const metadata = {
  title: "Fraud Radar — Research Signals Methods",
  description:
    "How Fraud Radar research signals are computed: peer groups and fallback rungs, the band + effect-floor + activity-floor lead test, by-construction counts, the not-computed vocabulary, dataset vintages, and why there are no composite scores.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const NOT_COMPUTED_MEANINGS: Record<string, string> = {
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

export default async function SignalsMethodsPage() {
  if (!fraudRadarEnabled()) notFound();

  const meta = await getSignalsDatasetMeta();

  return (
    <main className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 sm:py-14 text-white">
        <Link href="/fraud-radar/signals" className="text-sm text-cyan-300 hover:underline">
          ← Research signals
        </Link>
        <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
          Methods
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-bold leading-tight">
          How research signals are computed.
        </h1>
        <div className="mt-5">
          <ResearchLeadNotice />
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">What a research lead is — and is not</h2>
          <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
            {RESEARCH_LEADS_NOTE}
          </p>
          <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
            The language rules are plain: signals are called research leads,
            never findings about an entity. No page states or implies how
            likely wrongdoing is for any entity, no entity is described in
            guilt language, and listing-based screening records (an exact
            identifier appearing on a published exclusion list) are facts
            about the listing and its extract date — presented in their own
            block, with their timing caveats, never blended into rule leads.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">The lead test: three conditions together</h2>
          <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
            A peer-comparison rule publishes a lead only when all three
            conditions hold at once:
          </p>
          <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-6 text-white/70 leading-relaxed">
            <li>
              <strong className="text-white">Band.</strong> The entity sits
              at or above the rule&apos;s percentile band within its peer
              group — the 99th percentile by default, the 97.5th only where
              a rule states it and the peer group size supports it.
              Percentiles are empirical percentiles of the peer distribution
              of the same measure, computed over entities that clear the
              activity floor.
            </li>
            <li>
              <strong className="text-white">Effect floor.</strong> The
              entity&apos;s measure is at least the rule&apos;s multiple of
              the peer median — 2.0 times by default; a rule states its own
              multiple where it differs. Peer location is the median and
              peer spread is the median absolute deviation; means and
              standard deviations are not used for money measures, because
              every money distribution here is heavy-tailed.
            </li>
            <li>
              <strong className="text-white">Activity floor.</strong> The
              entity clears a minimum-activity threshold (claim lines,
              services, awards or audits, per rule), so a ratio computed
              from a handful of claims can never become a lead.
            </li>
          </ul>
          <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
            Concentration rules (an entity&apos;s own mix) and own-history
            rules (an entity against its own past) substitute their stated
            share or step thresholds for the band; the conjunction
            principle is identical. No probability values are computed for
            entity signals and none are rendered: at millions of entities,
            trivial differences would look decisive, and a lead here is a
            descriptive extreme with an effect-size floor — stated as such.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Peer groups: construction, rungs, minimum size</h2>
          <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
            Peer statistics are computed per role, per measure, from the
            published aggregates, and are published as data — any lead can
            be re-derived by a reader from the peer-group table and the
            catalog definition. A peer group needs at least{" "}
            <strong className="text-white">30 entities</strong> who clear
            the rule&apos;s activity floor. If the finest grouping does not
            reach 30, a published fallback ladder is walked to a broader
            group; the rung actually used is part of every lead&apos;s
            provenance. If no rung reaches 30, the comparison is not
            computed for that entity — it is never silently imputed from a
            broader group.
          </p>
          <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-6 text-white/70 leading-relaxed">
            <li>
              <strong className="text-white">Medicaid:</strong> primary
              taxonomy × NPPES practice state, computed separately for the
              billing role and the servicing role; then taxonomy nationally;
              then practice state across taxonomies. Taxonomy is the
              provider&apos;s self-reported primary NPPES taxonomy and the
              state is the NPPES practice address — Medicaid itself carries
              no state.
            </li>
            <li>
              <strong className="text-white">Medicare:</strong> provider
              type (the file&apos;s specialty field) × state; then provider
              type nationally.
            </li>
            <li>
              <strong className="text-white">Grants:</strong> the
              recipient&apos;s modal assistance listing (the listing
              carrying the largest share of its awards; recipients whose
              modal listing carries under a quarter of their awards have no
              honest single-listing peer group and are not computed); then
              the listing&apos;s awarding agency. Single-audit rules group
              by audit year × expended-size band instead.
            </li>
            <li>
              <strong className="text-white">Contracts:</strong> defined as
              modal 4-digit industry code, then its 2-digit sector — but not
              yet computed; see the pending state below.
            </li>
          </ul>
          <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
            Peer groups are computed over pooled published periods in this
            version (Medicaid pooled 2018–2024, Medicare pooled
            CY2022–2024, grants pooled attributed FY2018–FY2025); each
            rule&apos;s catalog entry states its pooling.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">By-construction counts, published</h2>
          <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
            A percentile band selects its share of any group by
            construction: the top 1% of 619,087 billing providers is 6,191
            entities even if every provider behaves identically and the
            spread is pure noise. So every peer rule publishes four counts
            together — entities evaluated, entities above the band before
            the effect floor, leads published after all floors, and the
            expected-by-construction count (band share × evaluated
            entities). A rule whose published count is more than half of
            its by-construction count carries a noise caution on the
            signals index: the band is doing most of the selection, and
            reviewers triage within the rule by the measure ratio. These
            rules are a screening net for human review run over millions of
            entities; some leads will be ordinary practice seen from far
            away. That is the expected, disclosed behaviour of the system.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">The not-computed vocabulary</h2>
          <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
            Missing is never zero. A comparison that cannot be made is
            published with one of these labelled states, counted per rule
            on the signals index — a different statement from &quot;no
            research leads&quot;, and the two are never conflated:
          </p>
          <dl className="mt-4 space-y-3">
            {NOT_COMPUTED_STATES.map((s) => (
              <div key={s} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <dt className="font-mono text-sm text-amber-200/90">{s}</dt>
                <dd className="mt-1 text-sm text-white/70 leading-relaxed">
                  {NOT_COMPUTED_MEANINGS[s]}
                </dd>
              </div>
            ))}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <dt className="font-mono text-sm text-amber-200/90">
                contracts engine: {CONTRACTS_PENDING_STATE}
              </dt>
              <dd className="mt-1 text-sm text-white/70 leading-relaxed">
                The contracts rules and the contracts-side screening records
                are defined, but their input aggregates are not yet
                published with a valid record, so the whole engine is in
                this state — rendered as a labelled panel on the signals
                index, never as zero leads and never omitted.
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">No composite scores</h2>
          <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
            There is no composite score in this publication: no sum,
            average or count of an entity&apos;s leads is ever rendered as
            that entity&apos;s standing or grade, and entities are never
            ranked against each other. A single number would hide exactly
            what a reviewer needs — which rule fired, against which peers,
            on which measure, from which input vintages. Each lead travels
            with its own evidence block instead (rule code and library
            version, peer definition and rung, peer size, the entity&apos;s
            measure, the peer median, the percentile band, the input
            versions and the computation date). A rendered lead without
            that block is a defect.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Distribution-shape checks</h2>
          <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
            Leading-digit (Benford-style) tests were assessed per dataset
            and refused as entity evidence everywhere: the published
            figures are sums over suppressed cells, derived amounts built
            from rounded published averages, or award-cumulative snapshots
            mixing every size class — none is the single measurement
            process such a test describes, so a deviation would measure
            the publication process, not an entity. One dataset-level
            diagnostic survives inside the data-quality engine — the
            contracts transaction digit profile compared between vintages,
            where a sudden profile change is a data question about the
            pipeline, never an entity finding.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Models: designed, deferred — deterministic rules ship</h2>
          <p className="mt-3 max-w-3xl text-white/70 leading-relaxed">
            Every rule in the current library is a deterministic rule: a
            reviewer can recompute it from the published catalog over the
            published aggregates. A model-assisted review queue — an
            unsupervised model looking for entities that are jointly
            unusual across several measures within a large peer group, in
            a way no single rule fires on — is designed, including its
            provenance requirements (model and version, feature list,
            per-feature contributions, and a separate label, never blended
            into rule leads). It has not shipped: it publishes only if a
            human-reviewed sample first shows it surfaces review-worthy
            entities the rules missed at acceptable precision, and no such
            review has been run. This version therefore contains zero
            model-derived rows, stated plainly rather than implied.
          </p>
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60 leading-relaxed">
          <h2 className="text-base font-semibold text-white">Dataset vintages</h2>
          {meta ? (
            <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <div>
                <dt className="text-white/40">Signals version (composite of input vintages)</dt>
                <dd className="text-white/85">{meta.version}</dd>
              </div>
              <div>
                <dt className="text-white/40">Rule library version</dt>
                <dd className="text-white/85">{meta.ruleLibraryVersion}</dd>
              </div>
              {Object.entries(meta.engines).map(([name, e]) => (
                <div key={name}>
                  <dt className="text-white/40">Engine: {name}</dt>
                  <dd>
                    {e.state === "published"
                      ? `published — publication ${e.publication ?? "—"}`
                      : `state ${e.state} (labelled, not computed)`}
                  </dd>
                </div>
              ))}
              <div>
                <dt className="text-white/40">Artifact generated</dt>
                <dd>{meta.generatedAt ? meta.generatedAt.slice(0, 10) : "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3">
              The signals publication is not configured for this deployment
              yet, so no vintage can be stated. The inputs, when published,
              are the Medicaid aggregates (2026-02-09), the Medicare
              aggregates (CY2022–2024) and the USAspending generation
              (2026-10-06), under rule library 1.1.0.
            </p>
          )}
          <p className="mt-3">
            A refresh of any input aggregate produces a new signals
            version; prior versions are retained. A rule-definition change
            bumps the rule library version and forces a new signals version
            even if the inputs are unchanged. Medicare amounts are derived
            (services × published averages) and named derived; Medicaid
            money measures use the published outlier-excluding treatment;
            USAspending amounts are award-cumulative snapshots, and a
            ceiling is a maximum, never an obligation.
          </p>
        </section>
      </div>
    </main>
  );
}
