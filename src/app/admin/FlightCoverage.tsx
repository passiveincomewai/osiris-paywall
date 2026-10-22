// Admin: Flight Coverage Diagnostics. Reads the /api/flights route's OWN
// payload in-process (the same module-level cache the public route serves),
// so every number below is one the route genuinely computed — nothing is
// estimated, sampled or simulated. Scope limit, stated in the footnotes:
// this describes the server's CURRENT cached snapshot, not a time series.
import { GET as getFlightsPayload } from "@/app/api/flights/route";
import { deriveFlightCoverage, type ProviderState } from "@/lib/flights/diagnostics";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
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

const STATE_STYLES: Record<ProviderState, { chip: string; text: string }> = {
  ok: { chip: "bg-emerald-400/15 text-emerald-300 border-emerald-300/25", text: "OK" },
  warning: { chip: "bg-amber-400/15 text-amber-200 border-amber-300/25", text: "WARNING" },
  idle: { chip: "bg-white/[0.06] text-white/40 border-white/10", text: "STANDBY" },
  unknown: { chip: "bg-white/[0.06] text-white/40 border-white/10", text: "UNKNOWN" },
};

function ageFmt(sec: number | null): string {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${sec % 60}s ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
}

export default async function FlightCoverage() {
  let vm: ReturnType<typeof deriveFlightCoverage> | null = null;
  try {
    const res = await getFlightsPayload();
    const payload = await res.json();
    if (payload && !payload.error) vm = deriveFlightCoverage(payload, Date.now());
  } catch {
    vm = null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-sm font-bold text-white">✈️ Flight Coverage Diagnostics</div>
        <div className="text-[11px] font-mono text-white/40">
          {vm ? `source: ${vm.sourceRaw || "unknown"} · updated ${ageFmt(vm.lastUpdateAgeSec)}` : ""}
        </div>
      </div>

      {!vm && (
        <div className="rounded-xl border border-amber-300/25 bg-amber-300/[0.05] p-4 text-sm text-amber-200/90">
          Flight data is currently unavailable — /api/flights returned no payload (every provider failed and no
          cached snapshot exists). Diagnostics will appear here as soon as a snapshot loads.
        </div>
      )}

      {vm && (
        <>
          {vm.warnings.length > 0 && (
            <div className="mb-4 space-y-2">
              {vm.warnings.map((w) => (
                <div key={w} className="rounded-xl border border-amber-300/25 bg-amber-300/[0.05] px-4 py-2.5 text-xs text-amber-200/90">
                  {w}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat label="Received" value={fmt(vm.received)} sub="unique records after cross-provider dedupe" />
            <Stat label="Commercial" value={fmt(vm.commercial)} />
            <Stat label="Private" value={fmt(vm.privateCount)} />
            <Stat label="Private jets" value={fmt(vm.jets)} />
            <Stat label="Military" value={fmt(vm.military)} />
            <Stat
              label="Rendered"
              value={fmt(vm.rendered)}
              sub="= classified: the client renders classified aircraft 1:1 (unit-tested, no decimation) — no separate server-side render counter exists"
            />
          </div>

          <div className="mt-6 mb-2 text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase">Exclusions</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat
              label="Dropped — invalid"
              value={vm.droppedInvalid == null ? "—" : fmt(vm.droppedInvalid)}
              sub="tower/ground pseudo-records and records with no position"
            />
            <Stat
              label="Dropped — stale"
              value="—"
              sub="not measured: the route applies no staleness filter, so no aircraft are excluded for age — freshness is bounded by the provider snapshot ages below"
            />
          </div>

          <div className="mt-6 mb-2 text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase">Providers</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <tbody>
                {vm.providers.map((row) => {
                  const s = STATE_STYLES[row.state];
                  return (
                    <tr key={row.key} className="border-b border-white/5 last:border-0">
                      <td className="py-2 pr-3 text-white/70 whitespace-nowrap">{row.label}</td>
                      <td className="py-2 pr-3 text-right font-mono text-white">{row.count == null ? "—" : fmt(row.count)}</td>
                      <td className="py-2 pr-3 text-white/45 text-xs">{row.detail}</td>
                      <td className="py-2 text-right">
                        <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${s.chip}`}>
                          {s.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-1 border-t border-white/5 pt-3">
            <p className="text-[11px] leading-relaxed text-white/30">
              * Last successful update is the timestamp of the snapshot currently being served
              {vm.lastUpdateIso ? ` (${vm.lastUpdateIso})` : ""}. The public route caches for 90 s and reuses
              provider snapshots between refreshes; the ages above say how old each ingredient is.
            </p>
            <p className="text-[11px] leading-relaxed text-white/30">
              * Diagnostics describe this server&apos;s current cached /api/flights snapshot — not a historical
              time series. No provider-health history is stored.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
