// Admin: Camera Network — catalogue totals, per-source health, harvest
// status and sync control (expansion Stage E). Every number comes from
// collectCameraDashboard(): this instance's live catalogue cache, the
// saved catalogue as baseline, the source cache's fetch observations,
// and the committed sync artifacts (reports, harvest-health, sync
// status). Nothing is estimated; an input that does not exist renders
// as absent. Scope: the current instance's view, not a time series.
import { collectCameraDashboard } from "@/lib/camera-expansion/dashboard-server";
import type { ReportSummary } from "@/lib/camera-expansion/dashboard";
import type { SourceHealth, SourceHealthStatus } from "@/lib/camera-expansion/health";
import CameraSyncControl from "./CameraSyncControl";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function fmtTs(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="text-[10px] font-bold tracking-[0.18em] text-white/40 uppercase">{label}</div>
      <div className="mt-1.5 text-2xl font-extrabold text-white">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-white/45">{sub}</div>}
    </div>
  );
}

const STATUS_STYLES: Record<SourceHealthStatus, { chip: string; text: string }> = {
  healthy: { chip: "bg-emerald-400/15 text-emerald-300 border-emerald-300/25", text: "HEALTHY" },
  degraded: { chip: "bg-amber-400/15 text-amber-200 border-amber-300/25", text: "DEGRADED" },
  down: { chip: "bg-red-400/15 text-red-300 border-red-300/25", text: "DOWN" },
  unknown: { chip: "bg-white/[0.06] text-white/40 border-white/10", text: "NOT LOADED" },
  gated: { chip: "bg-sky-400/15 text-sky-300 border-sky-300/25", text: "GATED OFF" },
};

function StatusChip({ status }: { status: SourceHealthStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide ${s.chip}`}>
      {s.text}
    </span>
  );
}

function ReportTable({ title, report }: { title: string; report: ReportSummary }) {
  const rows: [string, number][] = [
    ["Inspected", report.inspected],
    ["Verified new", report.verifiedNew],
    ["Duplicates — provider id", report.duplicatesByMethod["id"] ?? 0],
    ["Duplicates — URL (full)", report.duplicatesByMethod["url-full"] ?? 0],
    ["Duplicates — URL (host/path)", report.duplicatesByMethod["url-hostpath"] ?? 0],
    ["Duplicates — same location", report.duplicatesByMethod["same-location"] ?? 0],
    ["Duplicates — geo + name", report.duplicatesByMethod["geo-name"] ?? 0],
    ["Duplicates — within the index itself", report.intraDuplicates],
    ["License-held (conditional families)", report.licenseHeld],
    ["License-excluded (Windy class)", report.licenseExcluded],
    ["Invalid feed shape", report.invalidFeed],
    ["Invalid coordinates", report.invalidCoordinates],
    ["Dead on probe", report.dead],
    ["Placeholder frames", report.placeholder],
  ];
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-xs font-bold tracking-wide text-white/80 uppercase">{title}</div>
        <div className="text-[11px] font-mono text-white/40">
          {report.mode} · {fmtTs(report.generatedAt)} · baseline {fmt(report.baselineTotal)} cameras
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 md:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-2 text-[12px]">
            <span className="text-white/45">{label}</span>
            <span className="font-mono text-white/85">{fmt(value)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px]">
        <span className={report.reconciles ? "font-bold text-emerald-300" : "font-bold text-red-300"}>
          {report.reconciles ? "✓ Accounting reconciles — every inspected record is in exactly one bucket" : "✗ ACCOUNTING DOES NOT RECONCILE"}
        </span>
      </div>
      {report.notes.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-white/35">
          {report.notes.map(n => <li key={n}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}

function SourceRow({ s }: { s: SourceHealth }) {
  return (
    <tr className="border-t border-white/5">
      <td className="py-2 pr-3 font-mono text-[12px] text-white/85">{s.label}</td>
      <td className="py-2 pr-3"><StatusChip status={s.status} /></td>
      <td className="py-2 pr-3 text-right font-mono text-[12px] text-white/85">{fmt(s.served)}</td>
      <td className="py-2 pr-3 text-right font-mono text-[12px] text-white/45">{s.expected != null ? fmt(s.expected) : "—"}</td>
      <td className="py-2 text-[11px] leading-snug text-white/45">{s.reason}</td>
    </tr>
  );
}

export default async function CameraNetwork() {
  let data: Awaited<ReturnType<typeof collectCameraDashboard>> | null = null;
  let error: string | null = null;
  try {
    data = await collectCameraDashboard();
  } catch (e) {
    error = e instanceof Error ? e.message : "collection failed";
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-bold text-white">📷 Camera Network — Sources, Health & Harvest Sync</div>
        <div className="text-[11px] font-mono text-white/40">
          {data ? `this instance · collected ${fmtTs(data.generatedAt)}` : ""}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300/25 bg-red-300/[0.05] p-4 text-sm text-red-200/90">
          Camera dashboard collection failed: {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat label="Catalogue (this instance)" value={fmt(data.totals.catalogue)} sub={`across ${data.totals.regions} region sources`} />
            <Stat label="Agency & curated sources" value={fmt(data.totals.nonHarvest)} sub="live-fetched region fetchers" />
            <Stat label="OpenCCTV harvest" value={fmt(data.totals.occ)} sub="probe-verified, generation-committed" />
            <Stat label="FAA WeatherCams" value={fmt(data.totals.faa)} sub="the 'faa' region source" />
            <Stat label="ALERT cameras" value={fmt(data.totals.alert)} sub="separate /api/alert-cameras source" />
            <Stat
              label="Sources down"
              value={fmt(data.health.rollup.down)}
              sub={`${fmt(data.health.rollup.degraded)} degraded · ${fmt(data.health.rollup.gated)} gated off · ${fmt(data.health.rollup.unknown)} not loaded`}
            />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-xs font-bold tracking-wide text-white/80 uppercase">Harvest shards</div>
              <div className="mt-2 space-y-1.5">
                {Object.entries(data.totals.occByShard).map(([shard, count]) => (
                  <div key={shard} className="flex items-baseline justify-between text-[12px]">
                    <span className="font-mono text-white/55">{shard}</span>
                    <span className="font-mono text-white/85">{fmt(count)}</span>
                  </div>
                ))}
              </div>
              {data.harvestStaleness && (
                <p className="mt-3 text-[11px] leading-relaxed text-white/40">
                  Verification age across the harvest: {fmt(data.harvestStaleness.fresh)} fresh (≤7d),{" "}
                  {fmt(data.harvestStaleness.aging)} aging (8–30d), {fmt(data.harvestStaleness.stale)} stale (&gt;30d),{" "}
                  {fmt(data.harvestStaleness.unknownAge)} with no verdict on file.{" "}
                  {fmt(data.harvestStaleness.aliveAtVerification)} cameras held an alive verdict at last probe.
                  Oldest verification: {fmtTs(data.harvestStaleness.oldestProbedAt)}.
                </p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <div className="text-xs font-bold tracking-wide text-white/80 uppercase">Last sync</div>
              {data.sync ? (
                <div className="mt-2 space-y-1.5 text-[12px]">
                  <div className="flex items-baseline justify-between">
                    <span className="text-white/45">When</span>
                    <span className="text-white/85">{fmtTs(data.sync.lastRunAt)} ({data.sync.mode})</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-white/45">Verdict</span>
                    <span className={data.sync.verdict === "ok" ? "font-bold text-emerald-300" : "font-bold text-red-300"}>
                      {data.sync.verdict.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-white/45">{data.sync.detail}</p>
                  {data.sync.counts && (
                    <p className="text-[11px] text-white/40">
                      Inspected {fmt(data.sync.counts.inspected)} · verified new {fmt(data.sync.counts.verifiedNew)} ·{" "}
                      duplicates {fmt(data.sync.counts.duplicates)} · dead {fmt(data.sync.counts.dead)} ·{" "}
                      reconciles {data.sync.counts.reconciles ? "✓" : "✗"}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-[12px] text-white/45">No sync status artifact committed yet.</p>
              )}
              <div className="mt-3">
                <CameraSyncControl />
              </div>
            </div>
          </div>

          {data.latestWrite && (
            <div className="mt-4">
              <ReportTable title="Last harvest run — reconciliation" report={data.latestWrite} />
            </div>
          )}
          {data.latestDryRun && data.latestDryRun.generatedAt !== data.latestWrite?.generatedAt && (
            <div className="mt-4">
              <ReportTable title="Latest dry run — reconciliation" report={data.latestDryRun} />
            </div>
          )}

          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <div className="text-xs font-bold tracking-wide text-white/80 uppercase">
              Source health — problems first
            </div>
            <table className="mt-2 w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="text-left text-[10px] tracking-[0.14em] text-white/35 uppercase">
                  <th className="py-1 pr-3 font-bold">Source</th>
                  <th className="py-1 pr-3 font-bold">Status</th>
                  <th className="py-1 pr-3 text-right font-bold">Served</th>
                  <th className="py-1 pr-3 text-right font-bold">Baseline</th>
                  <th className="py-1 font-bold">Why</th>
                </tr>
              </thead>
              <tbody>
                {data.health.sources.map(s => <SourceRow key={s.id} s={s} />)}
              </tbody>
            </table>
            <p className="mt-3 text-[11px] leading-relaxed text-white/35">
              “Baseline” is the saved catalogue this instance restored from (or this process&apos;s high-water
              mark). A source with a baseline above zero that currently serves zero is DOWN — a silent
              absence, the failure shape that hid DriveBC for months. Health describes this instance since
              it booted; it is not a fleet-wide time series.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
