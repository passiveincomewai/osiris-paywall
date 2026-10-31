import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { getRegistryHealth } from "@/lib/fraud-radar/registry-admin";
import { listDataQualityRecords } from "@/lib/fraud-radar/signals-neon";
import {
  getSignalsQuality,
  getAdminCandidateQueue,
  CANDIDATE_STATUS,
  CANDIDATE_QUEUE_NOTE,
} from "@/lib/fraud-radar/signals-data";

/**
 * Fraud Radar admin — Data Source Registry health (spec §5/§32).
 *
 * Gating mirrors the existing admin pages (session + ADMIN_EMAILS).
 * Deliberately NOT flag-gated: operators need this view most when
 * Fraud Radar is dark — it is how they see why. The flag state itself
 * is displayed at the top. Public /fraud-radar routes remain 404
 * while the flag is off regardless of this page.
 */
export const metadata = { title: "Fraud Radar Registry — Admin" };
export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  if (!d) return "—";
  return d.toISOString().slice(0, 10);
}

export default async function FraudRadarAdminPage() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? null;
  if (!email) redirect("/admin/login?callbackUrl=/admin/fraud-radar");
  if (!adminEmails().includes(email)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#050810" }}>
        <div className="max-w-md text-center rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-white">Admin access only</h1>
          <p className="text-sm text-white/50 mt-3 leading-relaxed">
            Signed in as <span className="text-white/80 font-mono">{email}</span>, which is not an admin.
          </p>
          <Link href="/" className="inline-block mt-6 text-sm text-cyan-300 hover:underline">← Back to site</Link>
        </div>
      </div>
    );
  }

  const enabled = fraudRadarEnabled();
  const health = await getRegistryHealth();

  // Phase 6 data quality (Payload B1): per-dataset verdicts from the
  // FrDataQualityRecord grain, fail-soft to the published quality
  // artifact when the grain has not been loaded. Aggregates only —
  // dataset-level states, check counts and defect-register IDs; a
  // quality record validates datasets, never entities, and can never
  // create a research lead. A fail verdict renders as a fail with
  // its counts — visible, never hidden.
  const dqNeon = await listDataQualityRecords();
  const dqArtifact = dqNeon === null ? await getSignalsQuality() : null;
  const dqRows = dqNeon
    ? dqNeon.map((r) => ({
        datasetSlug: r.datasetSlug,
        datasetVersion: r.datasetVersion,
        verdict: r.verdict,
        total: r.checksTotal,
        pass: r.checksPass,
        warn: r.checksWarn,
        fail: r.checksFail,
        error: r.checksError,
        notApplicable: r.checksNotApplicable,
        defectsInForce: r.defectsInForce,
        detailPointer: r.detailPointer,
        filesChecked: r.filesChecked,
        vintageAgeDays: r.vintageAgeDays,
      }))
    : dqArtifact
      ? dqArtifact.datasets.map((d) => ({
          datasetSlug: d.datasetSlug,
          datasetVersion: d.datasetVersion,
          verdict: d.verdict,
          total: d.checkCounts.total,
          pass: d.checkCounts.pass,
          warn: d.checkCounts.warn,
          fail: d.checkCounts.fail,
          error: d.checkCounts.error,
          notApplicable: d.checkCounts.notApplicable,
          defectsInForce: d.defectsInForce,
          detailPointer: d.detailPointer,
          filesChecked: d.filesChecked,
          vintageAgeDays: d.vintageAgeDays,
        }))
      : null;
  const dqSource = dqNeon
    ? "Neon grain (FrDataQualityRecord)"
    : dqArtifact
      ? `published quality artifact, run ${dqArtifact.runDate ?? "—"} (the Neon grain has not been loaded for this deployment yet)`
      : null;

  // Phase 6 candidate queue (Payload B2): S-06 human-review
  // candidate pairs, read ONLY here — behind this page's admin
  // gate — through getAdminCandidateQueue(), the data layer's
  // single reader of the admin queue artifact. No public route
  // renders these records, and the public entity loader filters
  // them from every block. Read-only in v1: the queue is shown,
  // no review workflow (assignment, disposition) is built here —
  // that is Phase 8 cases territory. Every row carries the
  // constant status "candidate — human review"; aggregates below
  // are counts of pairs by published family / key type, never a
  // standing for any entity.
  const candidateQueue = await getAdminCandidateQueue();
  const queueFamilyCounts = new Map<string, number>();
  const queueKeyTypeCounts = new Map<string, number>();
  for (const rec of candidateQueue?.records ?? []) {
    const family = rec.recordKey?.split(":")[0] ?? "unspecified";
    queueFamilyCounts.set(family, (queueFamilyCounts.get(family) ?? 0) + 1);
    const kt = rec.entityKeyType ?? "unspecified";
    queueKeyTypeCounts.set(kt, (queueKeyTypeCounts.get(kt) ?? 0) + 1);
  }

  return (
    <div className="docs-root min-h-screen" style={{ background: "#050810" }}>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-10 text-white">
        {/* No AdminNav entry yet: the shared nav is flag-off isolation
            surface (AUDIT §13.3) — Fraud Radar joins it in the flag-flip
            payload, not before. */}
        <Link href="/admin" className="text-sm text-cyan-300 hover:underline">← Admin dashboard</Link>
        <h1 className="mt-4 text-2xl font-bold">Fraud Radar — Data Source Registry</h1>
        <p className="mt-2 text-sm text-white/50">
          FRAUD_RADAR_ENABLED is{" "}
          <span className={enabled ? "text-emerald-300" : "text-amber-300"}>
            {enabled ? "ON" : "OFF — public surfaces are dark"}
          </span>
          . Registry rows track provenance, freshness and import health for
          every official source (spec §5).
        </p>

        {!health.available ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Registry not available yet</h2>
            <p className="mt-2 text-sm text-white/60 leading-relaxed">
              The FrDataSource / FrImportRun tables could not be read. The
              likely cause is that the <span className="font-mono text-white/80">fraud_radar_registry</span>{" "}
              migration has not been applied to this database yet, or the seed
              has not been run (<span className="font-mono text-white/80">scripts/fraud-radar-seed.mjs</span>).
              No import has been recorded.
            </p>
          </div>
        ) : health.sources.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-lg font-semibold">Registry is empty</h2>
            <p className="mt-2 text-sm text-white/60 leading-relaxed">
              The registry tables exist but hold no sources. Run{" "}
              <span className="font-mono text-white/80">node --experimental-strip-types scripts/fraud-radar-seed.mjs</span>{" "}
              to seed the ten AUDIT §16 sources.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Engine</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Version</th>
                    <th className="px-4 py-3 font-medium">Published</th>
                    <th className="px-4 py-3 font-medium">Imported</th>
                    <th className="px-4 py-3 font-medium">Verified</th>
                  </tr>
                </thead>
                <tbody>
                  {health.sources.map((s) => (
                    <tr key={s.slug} className="border-b border-white/5">
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-white/40 font-mono">{s.slug} · {s.accessType} · {s.cadence}</div>
                        {s.lastError ? (
                          <div className="text-xs text-red-300 mt-1">{s.lastError}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-white/70">{s.engine}</td>
                      <td className="px-4 py-3 text-white/70">{s.status}</td>
                      <td className="px-4 py-3 text-white/70">{s.sourceVersion ?? "—"}</td>
                      <td className="px-4 py-3 text-white/70">{fmtDate(s.lastPublishedAt)}</td>
                      <td className="px-4 py-3 text-white/70">{fmtDate(s.lastImportedAt)}</td>
                      <td className="px-4 py-3 text-white/70">{fmtDate(s.lastVerifiedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="mt-10 text-lg font-semibold">Recent import runs</h2>
            {health.recentRuns.length === 0 ? (
              <p className="mt-2 text-sm text-white/50">
                No import runs recorded yet. Batch pipelines write a run row
                (with row counts, artifact checksum and manifest) on every
                execution.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50">
                      <th className="px-4 py-3 font-medium">Source</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Dataset version</th>
                      <th className="px-4 py-3 font-medium">Rows</th>
                      <th className="px-4 py-3 font-medium">Started</th>
                      <th className="px-4 py-3 font-medium">SHA-256</th>
                    </tr>
                  </thead>
                  <tbody>
                    {health.recentRuns.map((r) => (
                      <tr key={r.id} className="border-b border-white/5">
                        <td className="px-4 py-3 font-mono text-white/80">{r.sourceSlug}</td>
                        <td className="px-4 py-3 text-white/70">{r.status}</td>
                        <td className="px-4 py-3 text-white/70">{r.datasetVersion ?? "—"}</td>
                        <td className="px-4 py-3 text-white/70">{r.rowsProcessed ?? "—"}</td>
                        <td className="px-4 py-3 text-white/70">{r.startedAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                        <td className="px-4 py-3 font-mono text-xs text-white/50">
                          {r.artifactSha256 ? `${r.artifactSha256.slice(0, 12)}…` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <h2 className="mt-12 text-lg font-semibold">Data quality — per-dataset verdicts (Phase 6)</h2>
        <p className="mt-2 text-sm text-white/50 leading-relaxed">
          The data-quality engine re-checks every published dataset after
          any publish: manifest contract, schema, grain uniqueness, null
          discipline, reconciliation identities, defect-register
          accounting, freshness and distribution shift. Verdicts are pass /
          warn / fail check states — never a score. A fail means the
          dataset is not signallable until it is resolved, and it is shown
          here as a fail, with its check counts and defects in force.
        </p>
        {dqRows === null ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold">Data quality not loaded yet</h3>
            <p className="mt-2 text-sm text-white/60 leading-relaxed">
              No FrDataQualityRecord rows could be read and no quality
              artifact is configured for this deployment. That is a loading
              state — no dataset verdict is implied.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-white/50">Source: {dqSource}.</p>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="px-4 py-3 font-medium">Dataset</th>
                    <th className="px-4 py-3 font-medium">Verdict</th>
                    <th className="px-4 py-3 font-medium">Checks (pass / warn / fail / error / n-a)</th>
                    <th className="px-4 py-3 font-medium">Defects in force</th>
                    <th className="px-4 py-3 font-medium">Files checked</th>
                    <th className="px-4 py-3 font-medium">Vintage age (days)</th>
                  </tr>
                </thead>
                <tbody>
                  {dqRows.map((d) => (
                    <tr key={`${d.datasetSlug}@${d.datasetVersion}`} className="border-b border-white/5">
                      <td className="px-4 py-3">
                        <div className="font-medium">{d.datasetSlug}</div>
                        <div className="text-xs text-white/40 font-mono">
                          version {d.datasetVersion} · detail: {d.detailPointer}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${
                          d.verdict === "fail"
                            ? "text-red-300"
                            : d.verdict === "warn"
                              ? "text-amber-300"
                              : d.verdict === "pass"
                                ? "text-emerald-300"
                                : "text-white/70"
                        }`}
                      >
                        {d.verdict}
                        {d.verdict === "fail"
                          ? " — this dataset failed its quality record; its engine's signals pause on it until resolved"
                          : ""}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {d.pass} / {d.warn} / {d.fail} / {d.error} / {d.notApplicable} (of {d.total})
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {d.defectsInForce.length > 0 ? d.defectsInForce.join(", ") : "—"}
                      </td>
                      <td className="px-4 py-3 text-white/70">{d.filesChecked}</td>
                      <td className="px-4 py-3 text-white/70">{d.vintageAgeDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <h2 className="mt-12 text-lg font-semibold">
          Candidate queue — human review (S-06, Phase 6)
        </h2>
        <p className="mt-2 text-sm text-white/50 leading-relaxed">
          {CANDIDATE_QUEUE_NOTE} These pairs exist only in this admin
          view: there is no public route for them, and they never
          render on an entity profile. Read-only in this version — the
          queue is shown for human review; assignment and disposition
          workflow belongs to a later phase. Every row carries the
          constant status &quot;{CANDIDATE_STATUS}&quot;.
        </p>
        {candidateQueue === null ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <h3 className="font-semibold">Candidate queue not loaded yet</h3>
            <p className="mt-2 text-sm text-white/60 leading-relaxed">
              The admin candidate-queue artifact could not be read for
              this deployment (no signals artifact is configured, or the
              queue file is not published yet). That is a loading state —
              no queue count of zero is implied.
            </p>
          </div>
        ) : (
          <>
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-white/40">Candidate pairs in the published queue</dt>
                <dd className="text-white/85">
                  {candidateQueue.count} published · {candidateQueue.records.length} read
                  {candidateQueue.version ? ` · signals version ${candidateQueue.version}` : ""}
                  {candidateQueue.surface ? ` · surface: ${candidateQueue.surface}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-white/40">Status on every row</dt>
                <dd className="text-white/85">{candidateQueue.statusConstant}</dd>
              </div>
              <div>
                <dt className="text-white/40">Pairs by published family</dt>
                <dd className="text-white/85">
                  {[...queueFamilyCounts.entries()]
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-white/40">Pairs by entity key type</dt>
                <dd className="text-white/85">
                  {[...queueKeyTypeCounts.entries()]
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ") || "—"}
                </dd>
              </div>
            </dl>
            <div className="mt-4 max-h-[36rem] overflow-y-auto rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-white/50">
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Pair — side A (published entity key)</th>
                    <th className="px-4 py-3 font-medium">Pair — side B + match basis</th>
                    <th className="px-4 py-3 font-medium">Source / extract versions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidateQueue.records.map((rec) => (
                    <tr
                      key={`${rec.recordKey ?? rec.entityKey}-${rec.entityKey}`}
                      className="border-b border-white/5 align-top"
                    >
                      <td className="px-4 py-3 font-medium text-amber-200/90">
                        {CANDIDATE_STATUS}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-white/85">{rec.entityKey}</div>
                        <div className="text-xs text-white/40">
                          {rec.entityKeyType ?? "key type not stated"}
                          {rec.recordKey ? ` · pair ${rec.recordKey}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {rec.detail ? (
                          <dl className="space-y-1">
                            {Object.entries(rec.detail)
                              .filter(([, v]) => v !== null && v !== undefined)
                              .map(([k, v]) => (
                                <div key={k}>
                                  <dt className="inline font-mono text-xs text-white/40">
                                    {k}:{" "}
                                  </dt>
                                  <dd className="inline">{String(v)}</dd>
                                </div>
                              ))}
                          </dl>
                        ) : (
                          "—"
                        )}
                        <div className="mt-1 text-xs text-white/40">
                          Match basis: the published pair record above —
                          a name/key candidate from the named source
                          tables, not an identity match.
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        <div>{rec.inputVersions}</div>
                        {rec.sourceTable && (
                          <div className="mt-1 text-xs text-white/40">
                            Source tables: {rec.sourceTable}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-white/40">
                          Computed {rec.computedAt.slice(0, 10)} · rule library{" "}
                          {rec.ruleLibraryVersion}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
