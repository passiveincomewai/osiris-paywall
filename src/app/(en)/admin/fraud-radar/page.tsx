import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { adminEmails } from "@/lib/affiliate/admin";
import { fraudRadarEnabled } from "@/lib/fraud-radar/flag";
import { getRegistryHealth } from "@/lib/fraud-radar/registry-admin";

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
      </div>
    </div>
  );
}
