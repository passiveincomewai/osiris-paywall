"use client";

// Admin: Onboarding & Activation. Reads /api/admin/onboarding, which
// aggregates REAL PageView events + Subscription rows (see
// src/lib/analytics/onboarding.ts for the dedupe/honesty rules the
// footnotes below summarize). Nothing here is estimated or simulated.
import { useEffect, useRef, useState } from "react";
import type { OnboardingReport } from "@/lib/analytics/onboarding-types";

const inputCls =
  "rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400/50";
const labelCls = "text-[10px] font-bold tracking-[0.16em] text-white/35 uppercase";

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
function pctFmt(r: number | null | undefined): string {
  if (r == null || !isFinite(r)) return "—";
  return `${(r * 100).toFixed(1)}%`;
}
function durFmt(sec: number | null | undefined): string {
  if (sec == null || !isFinite(sec)) return "—";
  if (sec < 60) return `${Math.round(sec)}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${Math.round(sec % 60)}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
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

function SubTitle({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 mb-2 text-[11px] font-bold tracking-[0.2em] text-white/40 uppercase">{children}</div>;
}

const PRESETS = [
  { key: "24h", label: "Last 24 hours" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom range" },
] as const;

export default function OnboardingActivation() {
  const [preset, setPreset] = useState<string>("30d");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [source, setSource] = useState("");
  const [landing, setLanding] = useState("");
  const [device, setDevice] = useState("");
  const [report, setReport] = useState<OnboardingReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const seqRef = useRef(0);

  useEffect(() => {
    const seq = ++seqRef.current;
    const params = new URLSearchParams({ preset });
    if (preset === "custom") {
      if (!fromDate || !toDate) return; // wait for both dates
      params.set("from", new Date(`${fromDate}T00:00:00.000Z`).toISOString());
      params.set("to", new Date(new Date(`${toDate}T00:00:00.000Z`).getTime() + 86400_000).toISOString());
    }
    if (source) params.set("source", source);
    if (landing) params.set("landing", landing);
    if (device) params.set("device", device);
    setLoading(true);
    fetch(`/api/admin/onboarding?${params.toString()}`)
      .then(async (res) => {
        const j = await res.json().catch(() => ({}));
        if (seq !== seqRef.current) return;
        if (!res.ok) {
          setError(j.error ?? `Failed (${res.status})`);
          setReport(null);
        } else {
          setError("");
          setReport(j as OnboardingReport);
        }
      })
      .catch(() => {
        if (seq !== seqRef.current) return;
        setError("Network error — try again.");
      })
      .finally(() => {
        if (seq === seqRef.current) setLoading(false);
      });
  }, [preset, fromDate, toDate, source, landing, device]);

  const t = report?.totals;
  const maxFunnel = Math.max(1, ...(report?.funnel.map((f) => f.count) ?? [1]));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold text-white">🧭 Onboarding &amp; Activation</div>
        <div className="text-[11px] font-mono text-white/40">
          {report ? `${fmt(t?.sessions ?? 0)} sessions in range` : loading ? "loading…" : ""}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Date range</span>
          <select className={inputCls} value={preset} onChange={(e) => setPreset(e.target.value)}>
            {PRESETS.map((p) => (
              <option key={p.key} value={p.key} className="bg-neutral-900">
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {preset === "custom" && (
          <>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>From</span>
              <input type="date" className={inputCls} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={labelCls}>To</span>
              <input type="date" className={inputCls} value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Traffic source</span>
          <select className={inputCls} value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="" className="bg-neutral-900">All sources</option>
            {(report?.availableSources ?? []).map((s) => (
              <option key={s} value={s} className="bg-neutral-900">
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Landing page</span>
          <select className={inputCls} value={landing} onChange={(e) => setLanding(e.target.value)}>
            <option value="" className="bg-neutral-900">All pages</option>
            {(report?.availableLandings ?? []).map((s) => (
              <option key={s} value={s} className="bg-neutral-900">
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>Device</span>
          <select className={inputCls} value={device} onChange={(e) => setDevice(e.target.value)}>
            <option value="" className="bg-neutral-900">All devices</option>
            <option value="mobile" className="bg-neutral-900">Mobile</option>
            <option value="tablet" className="bg-neutral-900">Tablet</option>
            <option value="desktop" className="bg-neutral-900">Desktop</option>
            <option value="unknown" className="bg-neutral-900">Unknown (pre-tracking)</option>
          </select>
        </label>
      </div>

      {error && <div className="mt-4 text-xs font-mono text-red-300">{error}</div>}
      {loading && !report && <p className="mt-4 text-sm text-white/40">Loading onboarding analytics…</p>}

      {report && !report.hasOnboardingData && (
        <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.04] p-4 text-sm text-white/60">
          No onboarding data yet for this range. Once visitors start receiving the welcome panel and tour,
          impressions, step progress, and conversions will appear here automatically — this section only
          reports real recorded events.
        </div>
      )}

      {report && t && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Stat label="Sessions" value={fmt(t.sessions)} />
            <Stat label="Tour impressions" value={fmt(t.impressions)} sub="sessions shown the welcome panel" />
            <Stat label="Start rate" value={pctFmt(t.startRate)} sub={`${fmt(t.starts)} started`} />
            <Stat label="Completion rate" value={pctFmt(t.completionRate)} sub={`${fmt(t.completions)} finished`} />
            <Stat label="Median time in tour" value={durFmt(t.medianTimeInTutorialSec)} sub={`${fmt(t.timedTutorialSessions)} timed tours`} />
            <Stat label="Skip rate" value={pctFmt(t.skipRate)} sub={`${fmt(t.dismissals)} dismissals`} />
          </div>

          <SubTitle>Activation funnel</SubTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <tbody>
                {report.funnel.map((f) => (
                  <tr key={f.key} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-3 text-white/70 whitespace-nowrap">
                      {f.label}
                      {f.note && <span className="text-white/30"> *</span>}
                    </td>
                    <td className="py-2 pr-3 text-right font-mono text-white">{fmt(f.count)}</td>
                    <td className="py-2 pr-3 text-right font-mono text-white/50 whitespace-nowrap">
                      {f.pctFromPrevious == null ? "—" : `${pctFmt(f.pctFromPrevious)} of previous`}
                    </td>
                    <td className="py-2 w-[38%]">
                      <div className="h-2 rounded-full bg-white/5">
                        <div
                          className="h-2 rounded-full bg-cyan-400/70"
                          style={{ width: `${Math.max(1.5, (f.count / maxFunnel) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SubTitle>Tour steps</SubTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-white/35">
                  <th className="py-1 pr-3 font-semibold">Step</th>
                  <th className="py-1 pr-3 font-semibold text-right">Reached</th>
                  <th className="py-1 pr-3 font-semibold text-right">Completed</th>
                  <th className="py-1 pr-3 font-semibold text-right">Skipped</th>
                  <th className="py-1 font-semibold text-right">Dropped off</th>
                </tr>
              </thead>
              <tbody>
                {report.steps.map((s) => (
                  <tr key={s.step} className="border-b border-white/5 last:border-0">
                    <td className="py-1.5 pr-3 text-white/70">Step {s.step}</td>
                    <td className="py-1.5 pr-3 text-right font-mono text-white/80">{fmt(s.reached)}</td>
                    <td className="py-1.5 pr-3 text-right font-mono text-white/80">{fmt(s.completed)}</td>
                    <td className="py-1.5 pr-3 text-right font-mono text-white/80">{fmt(s.skipped)}</td>
                    <td className="py-1.5 text-right font-mono text-white/80">{fmt(s.droppedOff)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <SubTitle>First feature used (sessions)</SubTitle>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Globe" value={fmt(report.firsts.globe)} />
                <Stat label="Camera" value={fmt(report.firsts.camera)} />
                <Stat label="Flight" value={fmt(report.firsts.flight)} />
                <Stat label="Satellite" value={fmt(report.firsts.satellite)} />
                <Stat label="Layer" value={fmt(report.firsts.layer)} />
                <Stat
                  label="Return visits"
                  value={pctFmt(report.returns.rate)}
                  sub={`${fmt(report.returns.returningVisitors)} of ${fmt(report.returns.signedInVisitors)} signed-in visitors`}
                />
              </div>
              <SubTitle>Conversion moments</SubTitle>
              <p className="text-sm text-white/60">
                Shown to <span className="font-mono text-white">{fmt(t.conversionShown)}</span> sessions ·{" "}
                clicked Pro <span className="font-mono text-white">{fmt(t.conversionClickPro)}</span> ·{" "}
                kept exploring free <span className="font-mono text-white">{fmt(t.conversionDismiss)}</span>
              </p>
              <p className="mt-2 text-sm text-white/60">
                Trials started in range: <span className="font-mono text-white">{fmt(report.subscriptions.trialsStarted)}</span>{" "}
                ({fmt(report.subscriptions.trialsAttributed)} attributed to onboarding-exposed accounts) · Paid
                subscriptions: <span className="font-mono text-white">{fmt(report.subscriptions.paidStarted)}</span>{" "}
                ({fmt(report.subscriptions.paidAttributed)} attributed) — subscription steps are site-wide, see
                footnotes.
              </p>
            </div>

            <div>
              <SubTitle>Session duration by onboarding status</SubTitle>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[430px] text-sm">
                <tbody>
                  {report.durationsByStatus.map((d) => (
                    <tr key={d.key} className="border-b border-white/5 last:border-0">
                      <td className="py-1.5 pr-3 text-white/70">{d.label}</td>
                      <td className="py-1.5 pr-3 text-right font-mono text-white/50">{fmt(d.sessions)} sess.</td>
                      <td className="py-1.5 pr-3 text-right font-mono text-white/80">avg {durFmt(d.avgSec)}</td>
                      <td className="py-1.5 text-right font-mono text-white/80">med {durFmt(d.medianSec)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <SubTitle>Pricing visits by status</SubTitle>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {report.pricingByStatus.map((p) => (
                    <tr key={p.key} className="border-b border-white/5 last:border-0">
                      <td className="py-1.5 pr-3 text-white/70">{p.label}</td>
                      <td className="py-1.5 text-right font-mono text-white/80">{fmt(p.sessions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </div>

          <SubTitle>A/B test — proactive onboarding (B) vs current experience (A)</SubTitle>
          {report.variants.filter((v) => v.variant !== "unknown").some((v) => !v.enoughData) && (
            <div className="mb-3 rounded-xl border border-amber-300/25 bg-amber-300/[0.05] px-4 py-2.5 text-xs text-amber-200/90">
              Not enough data yet — each group needs at least 30 sessions in range before differences mean
              anything. No winner is declared.
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-white/35">
                  <th className="py-1 pr-3 font-semibold">Group</th>
                  <th className="py-1 pr-3 font-semibold text-right">Sessions</th>
                  <th className="py-1 pr-3 font-semibold text-right">Activation</th>
                  <th className="py-1 pr-3 font-semibold text-right">Avg session</th>
                  <th className="py-1 pr-3 font-semibold text-right">Median session</th>
                  <th className="py-1 pr-3 font-semibold text-right">Features / sess.</th>
                  <th className="py-1 pr-3 font-semibold text-right">Pro CTR</th>
                  <th className="py-1 font-semibold text-right">Return rate</th>
                </tr>
              </thead>
              <tbody>
                {report.variants.map((v) => (
                  <tr key={v.variant} className="border-b border-white/5 last:border-0">
                    <td className="py-1.5 pr-3 text-white/70 whitespace-nowrap">
                      {v.label}
                      {!v.enoughData && v.variant !== "unknown" && (
                        <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">small sample</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono text-white/80">{fmt(v.sessions)}</td>
                    <td className="py-1.5 pr-3 text-right font-mono text-white/80">{pctFmt(v.activationRate)}</td>
                    <td className="py-1.5 pr-3 text-right font-mono text-white/80">{durFmt(v.avgDurationSec)}</td>
                    <td className="py-1.5 pr-3 text-right font-mono text-white/80">{durFmt(v.medianDurationSec)}</td>
                    <td className="py-1.5 pr-3 text-right font-mono text-white/80">
                      {v.avgFeaturesPerSession == null ? "—" : v.avgFeaturesPerSession.toFixed(2)}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono text-white/80">{pctFmt(v.proCtr)}</td>
                    <td className="py-1.5 text-right font-mono text-white/80">
                      {pctFmt(v.returnRate)}
                      {v.returnBase > 0 && <span className="text-white/35"> (n={fmt(v.returnBase)})</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-1 border-t border-white/5 pt-3">
            {report.notes.map((n) => (
              <p key={n} className="text-[11px] leading-relaxed text-white/30">
                * {n}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
