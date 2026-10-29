/**
 * Fraud Radar — shared honesty furniture for the healthcare surfaces:
 * the research-lead notice, the dataset provenance block (rendered
 * wherever figures appear, per spec §5/§22), and the honest
 * not-published-yet state used while artifacts are unconfigured.
 */
import type { DatasetMeta } from "@/lib/fraud-radar/healthcare-data";

export function ResearchLeadNotice() {
  return (
    <p className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100/90 leading-relaxed">
      Everything on these pages is a research lead drawn from official
      public records — discrepancies and listings to review, never a
      determination that any person or organization committed fraud.
    </p>
  );
}

export function DatasetProvenance({ meta }: { meta: DatasetMeta }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/60 leading-relaxed">
      <h2 className="text-base font-semibold text-white">About this data</h2>
      <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div>
          <dt className="text-white/40">Dataset</dt>
          <dd>
            HHS Medicaid Provider Spending by HCPCS, version{" "}
            <span className="text-white/85">{meta.sources.medicaid.version}</span>{" "}
            ({meta.totals.claimMonths}; {meta.sources.medicaid.rows.toLocaleString("en-US")} source rows)
          </dd>
        </div>
        <div>
          <dt className="text-white/40">Exclusion screening</dt>
          <dd>
            LEIE snapshot <span className="text-white/85">{meta.sources.leie.version}</span>{" "}
            ({meta.sources.leie.recordsWithNpi.toLocaleString("en-US")} records carry an NPI); SAM.gov
            exclusions extract <span className="text-white/85">{meta.sources.samExclusions.version}</span>{" "}
            (extract date {meta.sources.samExclusions.extractDate})
          </dd>
        </div>
        <div>
          <dt className="text-white/40">Identity</dt>
          <dd>{meta.identity.note}</dd>
        </div>
        <div>
          <dt className="text-white/40">Artifact generated</dt>
          <dd>{meta.generatedAt.slice(0, 10)} (dataset version {meta.version})</dd>
        </div>
      </dl>
      <p className="mt-3">{meta.suppression}</p>
      <p className="mt-2">{meta.outlierTreatment}</p>
      {meta.notes.map((n) => (
        <p key={n.slice(0, 24)} className="mt-2">{n}</p>
      ))}
    </section>
  );
}

export function NotPublishedYet({ what }: { what: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold text-white">{what} is not published to the app yet</h2>
      <p className="mt-2 text-sm text-white/60 leading-relaxed">
        The pipeline aggregates exist, but this deployment has no artifact
        location configured (FRAUD_RADAR_ARTIFACT_ROOT), so there is
        nothing honest to show. No figures are estimated or substituted.
      </p>
    </div>
  );
}
