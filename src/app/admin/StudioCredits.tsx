"use client";

// Admin: Studio credits & cost controls. Loads the credit config + this
// month's usage stats from /api/admin/studio/credits, edits pricing /
// allowance / provider unit costs / provider enablement, and PATCHes back.
// Validation lives server-side (saveCreditConfig); any errors come back as
// { errors: string[] } and are shown inline. The safety-override checkbox is
// sent as a top-level flag and is audit-logged on save.
import { useEffect, useState } from "react";
import type { CreditKind, StudioCreditConfig } from "@/lib/studio/credits-config";

interface CreditUsageStats {
  monthKey: string;
  consumedByKind: Record<string, { credits: number; jobs: number }>;
  failedThisMonth: number;
  recentFailed: Array<{
    id: string;
    profileId: string;
    kind: string;
    status: string;
    creditCost: number;
    error: string | null;
    createdAt: string;
  }>;
}

const KINDS: { kind: CreditKind; label: string }[] = [
  { kind: "image_render", label: "Image render" },
  { kind: "video_personalize", label: "Video personalize" },
  { kind: "video_template", label: "Video template" },
];

const inputCls = "w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-400/50";
const labelCls = "block text-[11px] font-mono uppercase tracking-[0.15em] text-white/35 mb-1";

function num(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export default function StudioCredits() {
  const [config, setConfig] = useState<StudioCreditConfig | null>(null);
  const [stats, setStats] = useState<CreditUsageStats | null>(null);
  const [overrideSafety, setOverrideSafety] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/studio/credits");
        const j = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setLoadError(j.error ?? `Failed to load (${res.status})`);
          return;
        }
        setConfig(j.config as StudioCreditConfig);
        setStats(j.stats as CreditUsageStats);
        setOverrideSafety((j.config as StudioCreditConfig).safetyOverride === true);
      } catch {
        if (!cancelled) setLoadError("Network error — try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    setErrors([]);
    setMsg("");
    try {
      const res = await fetch("/api/admin/studio/credits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { ...config, safetyOverride: overrideSafety }, overrideSafety }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (Array.isArray(j.errors) && j.errors.length > 0) {
          setErrors(j.errors.map((e: unknown) => String(e)));
        } else {
          setErrors([j.error ?? `Save failed (${res.status})`]);
        }
        return;
      }
      setConfig(j.config as StudioCreditConfig);
      setOverrideSafety((j.config as StudioCreditConfig).safetyOverride === true);
      setMsg("Credit configuration saved.");
    } catch {
      setErrors(["Network error — try again."]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold text-white">💳 Studio credits — cost controls</div>
        {stats && <div className="text-[11px] font-mono text-white/40">month: {stats.monthKey}</div>}
      </div>

      {loading ? (
        <p className="text-sm text-white/40">Loading credit configuration…</p>
      ) : loadError ? (
        <div className="text-xs font-mono text-red-300">{loadError}</div>
      ) : !config ? (
        <p className="text-sm text-white/40">No credit configuration available.</p>
      ) : (
        <>
          {msg && <div className="mb-3 text-xs font-mono text-cyan-300">{msg}</div>}
          {errors.length > 0 && (
            <ul className="mb-3 list-disc pl-5 text-xs font-mono text-red-300 space-y-1">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <label className={labelCls}>Value of 1 credit (USD)</label>
              <input
                type="number" step="0.01" min="0" className={inputCls}
                value={config.creditUsd}
                onChange={(e) => setConfig({ ...config, creditUsd: num(e.target.value) })}
              />
            </div>
            <div>
              <label className={labelCls}>Monthly allowance (credits / user)</label>
              <input
                type="number" step="1" min="0" className={inputCls}
                value={config.monthlyAllowance}
                onChange={(e) => setConfig({ ...config, monthlyAllowance: num(e.target.value) })}
              />
            </div>
          </div>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.15em] text-white/35">
                  <th className="py-2 pr-3 font-semibold">Job kind</th>
                  <th className="py-2 pr-3 font-semibold">Price (credits)</th>
                  <th className="py-2 pr-3 font-semibold">Provider unit cost (USD)</th>
                  <th className="py-2 pr-3 font-semibold">Revenue / job (USD)</th>
                  <th className="py-2 font-semibold">Provider enabled</th>
                </tr>
              </thead>
              <tbody>
                {KINDS.map(({ kind, label }) => (
                  <tr key={kind} className="border-t border-white/5">
                    <td className="py-2.5 pr-3">
                      <div className="text-white font-semibold">{label}</div>
                      <div className="text-[11px] text-white/40 font-mono">{kind}</div>
                    </td>
                    <td className="py-2.5 pr-3">
                      <input
                        type="number" step="1" min="0" className={`${inputCls} w-28`}
                        value={config.prices[kind]}
                        onChange={(e) => setConfig({ ...config, prices: { ...config.prices, [kind]: num(e.target.value) } })}
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <input
                        type="number" step="0.01" min="0" className={`${inputCls} w-28`}
                        value={config.providerUnitCostUsd[kind]}
                        onChange={(e) => setConfig({ ...config, providerUnitCostUsd: { ...config.providerUnitCostUsd, [kind]: num(e.target.value) } })}
                      />
                    </td>
                    <td className="py-2.5 pr-3 text-white/60 tabular-nums">
                      ${((config.prices[kind] ?? 0) * config.creditUsd).toFixed(2)}
                    </td>
                    <td className="py-2.5">
                      <input
                        type="checkbox"
                        checked={config.providersEnabled[kind]}
                        onChange={(e) => setConfig({ ...config, providersEnabled: { ...config.providersEnabled, [kind]: e.target.checked } })}
                        className="h-4 w-4 accent-emerald-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.04] p-4 mb-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={overrideSafety}
                onChange={(e) => setOverrideSafety(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-amber-400"
              />
              <span>
                <span className="block text-sm font-bold text-amber-200">Safety override</span>
                <span className="block text-xs text-amber-100/60 mt-0.5">
                  ⚠️ Allow a configuration that may lose money on paid providers — logged. By default a price must
                  cover at least 2× the provider unit cost; enabling this bypasses that check, and the override
                  is written to the audit log.
                </span>
              </span>
            </label>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#04121f] disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#6ee7b7,#34d399)" }}>
            {saving ? "Saving…" : "Save credit configuration"}
          </button>

          {stats && (
            <div className="mt-6 border-t border-white/5 pt-4">
              <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">
                Usage · {stats.monthKey}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.15em] text-white/35">
                        <th className="py-2 pr-3 font-semibold">Kind</th>
                        <th className="py-2 pr-3 font-semibold text-right">Credits</th>
                        <th className="py-2 font-semibold text-right">Jobs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.consumedByKind).map(([kind, v]) => (
                        <tr key={kind} className="border-t border-white/5">
                          <td className="py-2 pr-3 text-white/75 font-mono text-xs">{kind}</td>
                          <td className="py-2 pr-3 text-right text-white/70 tabular-nums">{v.credits.toLocaleString("en-US")}</td>
                          <td className="py-2 text-right text-white/70 tabular-nums">{v.jobs.toLocaleString("en-US")}</td>
                        </tr>
                      ))}
                      {Object.keys(stats.consumedByKind).length === 0 && (
                        <tr><td className="py-3 text-white/35 text-sm" colSpan={3}>No credits consumed this month.</td></tr>
                      )}
                    </tbody>
                  </table>
                  <p className="text-xs text-white/45 mt-3">
                    Failed jobs this month: <span className="text-white/85 font-semibold">{stats.failedThisMonth.toLocaleString("en-US")}</span>
                  </p>
                </div>
                <div>
                  <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-2">Recent failed jobs</div>
                  {stats.recentFailed.length === 0 ? (
                    <p className="text-sm text-white/35">No recent failed jobs.</p>
                  ) : (
                    <ul className="space-y-2">
                      {stats.recentFailed.map((f) => (
                        <li key={f.id} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-xs">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="font-mono text-red-300">{f.kind}</span>
                            <span className="text-white/40 whitespace-nowrap">
                              {new Date(f.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              {" · "}{f.creditCost} credits
                            </span>
                          </div>
                          {f.error && <div className="text-white/50 mt-1 break-words">{f.error.length > 160 ? `${f.error.slice(0, 160)}…` : f.error}</div>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] text-white/30 mt-4">
            Prices are charged in credits; the credit&apos;s USD value converts them to revenue. Keep each price at
            least 2× its provider unit cost (in USD terms) unless you deliberately override the safety check above.
          </p>
        </>
      )}
    </div>
  );
}
