"use client";

import { useCallback, useEffect, useState } from "react";

interface Platform {
  platform: string;
  label: string;
  mode: string;
  ceiling: string;
  paused: boolean;
  connectionStatus: string;
  updatedAt: string | null;
}
interface Snapshot {
  payload: unknown;
  createdAt: string;
}
interface ControlEvent {
  id: string;
  actor: string | null;
  action: string;
  platform: string | null;
  payload: unknown;
  createdAt: string;
}
interface StudioState {
  ok: boolean;
  platforms: Platform[];
  globalPaused: boolean;
  snapshots: Record<string, Snapshot>;
  lastSyncAt: string | null;
  events: ControlEvent[];
}
interface OverviewPayload {
  contentByStatus?: Record<string, number>;
  queueDepth?: number;
  openErrors?: number;
  generatedAt?: string;
}
interface QueueItem {
  id?: number | string;
  title?: string;
  platform?: string;
  status?: string;
  scheduledFor?: string | null;
}
interface QueuePayload {
  items?: QueueItem[];
}
interface ErrorItem {
  platform?: string;
  message?: string;
  at?: string;
}
interface ErrorsPayload {
  items?: ErrorItem[];
}

const MODES = ["manual", "hybrid", "autonomous"];
const MODE_RANK: Record<string, number> = { manual: 0, hybrid: 1, autonomous: 2 };

const CONNECTION_LABELS: Record<string, string> = {
  connected_studio_browser: "Connected — Studio (browser)",
  link_dropped: "Link dropped — re-link needed",
  not_connected: "Not connected",
  draft_only: "Drafts only — no posting",
  browser_route_signin_pending: "Browser route — sign-in pending",
  browser_route_parked: "Parked by owner",
};

function connectionLabel(s: string): string {
  return CONNECTION_LABELS[s] ?? s.replace(/_/g, " ");
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function syncAge(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ContentStudioClient() {
  const [state, setState] = useState<StudioState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/content-studio/state").catch(() => null);
    if (!res || !res.ok) {
      setLoadError("Could not load content engine state.");
      return;
    }
    setLoadError(null);
    setState((await res.json()) as StudioState);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (body: Record<string, unknown>, okMessage: string) => {
      setBusy(true);
      setActionError(null);
      setNotice(null);
      const res = await fetch("/api/admin/content-studio/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => null);
      const data = (await res?.json().catch(() => ({}))) as { error?: string } | null;
      setBusy(false);
      if (!res || !res.ok) {
        setActionError(data?.error ?? "That change was rejected.");
        return;
      }
      setNotice(okMessage);
      void load();
    },
    [load],
  );

  if (loadError) {
    return <p className="mt-8 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{loadError}</p>;
  }
  if (!state) {
    return <p className="mt-8 text-sm text-white/50">Loading content engine state…</p>;
  }

  const overview = (state.snapshots.overview?.payload ?? null) as OverviewPayload | null;
  const queue = (state.snapshots.queue?.payload ?? null) as QueuePayload | null;
  const errors = (state.snapshots.errors?.payload ?? null) as ErrorsPayload | null;
  const hasSnapshot = state.lastSyncAt !== null;
  const contentTotal = overview?.contentByStatus
    ? Object.values(overview.contentByStatus).reduce((a, b) => a + b, 0)
    : null;

  const card = "rounded-xl border border-white/10 bg-white/[0.03] p-4";
  const cardLabel = "text-[11px] uppercase tracking-[0.15em] text-white/45";
  const emptyNote = <p className="mt-2 text-sm text-white/45">No engine snapshot yet — the engine has not synced.</p>;

  return (
    <div className="mt-6 space-y-6">
      {/* Global control strip */}
      <section className={`flex flex-wrap items-center justify-between gap-4 ${card} ${state.globalPaused ? "border-red-400/40" : ""}`}>
        <div>
          <p className={cardLabel}>Publishing kill switch</p>
          <p className="mt-1 text-sm text-white/75">
            {state.globalPaused ? (
              <span className="font-semibold text-red-300">GLOBAL PAUSE IS ON — the engine will not publish to any platform.</span>
            ) : (
              "Global pause is off. Per-platform modes and pauses below still apply."
            )}
          </p>
          <p className="mt-1 text-xs text-white/40">
            Engine last synced: {hasSnapshot ? `${syncAge(state.lastSyncAt)} (${fmtTime(state.lastSyncAt)})` : "never — controls still apply on first sync"}
          </p>
        </div>
        {state.globalPaused ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act({ action: "global_resume" }, "Global pause lifted. The engine resumes under the per-platform modes below.")}
            className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 disabled:opacity-50"
          >
            Resume everything
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void act({ action: "global_pause" }, "Global pause ON. The engine will not publish anywhere until this is lifted.")}
            className="rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-medium text-red-200 disabled:opacity-50"
          >
            Pause everything
          </button>
        )}
      </section>

      {notice ? <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</p> : null}
      {actionError ? <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{actionError}</p> : null}

      {/* Overview cards — engine snapshot data only */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={card}>
          <p className={cardLabel}>Content items</p>
          {overview && contentTotal !== null ? (
            <>
              <p className="mt-2 text-3xl font-semibold">{contentTotal}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(overview.contentByStatus ?? {}).map(([k, v]) => (
                  <span key={k} className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/60">
                    {k}: {v}
                  </span>
                ))}
              </div>
            </>
          ) : (
            emptyNote
          )}
        </div>
        <div className={card}>
          <p className={cardLabel}>Queue depth</p>
          {overview && typeof overview.queueDepth === "number" ? (
            <p className="mt-2 text-3xl font-semibold">{overview.queueDepth}</p>
          ) : (
            emptyNote
          )}
        </div>
        <div className={card}>
          <p className={cardLabel}>Open errors</p>
          {overview && typeof overview.openErrors === "number" ? (
            <p className={`mt-2 text-3xl font-semibold ${overview.openErrors > 0 ? "text-red-300" : ""}`}>{overview.openErrors}</p>
          ) : (
            emptyNote
          )}
        </div>
        <div className={card}>
          <p className={cardLabel}>Engine sync</p>
          <p className="mt-2 text-lg font-medium">{hasSnapshot ? syncAge(state.lastSyncAt) : "No sync yet"}</p>
          <p className="mt-1 text-xs text-white/40">
            {hasSnapshot
              ? "Snapshot sections: " + Object.keys(state.snapshots).join(", ")
              : "Set CONTENT_ENGINE_SECRET in Vercel Production so the VM engine can sync (a Studio-secret fallback also works)."}
          </p>
        </div>
      </section>

      {/* Platforms */}
      <section className={card}>
        <h2 className="text-base font-semibold">Platforms</h2>
        <p className="mt-1 text-sm text-white/50">
          Modes are enforced twice: here, and again by the engine before every claim. Ceilings are programme rules —
          Reddit stays manual forever; TikTok caps at hybrid.
        </p>
        <div className="mt-4 divide-y divide-white/5">
          {state.platforms.map((p) => {
            const ceilingRank = MODE_RANK[p.ceiling] ?? 0;
            return (
              <div key={p.platform} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <div className="min-w-44 flex-1">
                  <p className="text-sm font-medium">
                    {p.label}
                    {p.paused ? <span className="ml-2 rounded-full border border-red-400/40 px-2 py-0.5 text-[11px] text-red-300">paused</span> : null}
                  </p>
                  <p className="mt-0.5 text-xs text-white/45">{connectionLabel(p.connectionStatus)}</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-white/50">
                  Mode
                  <select
                    value={p.mode}
                    disabled={busy}
                    onChange={(e) =>
                      void act(
                        { action: "set_mode", platform: p.platform, mode: e.target.value },
                        `${p.label} mode set to ${e.target.value}. The engine applies it on its next sync.`,
                      )
                    }
                    className="rounded-lg border border-white/15 bg-[#0a101c] px-2 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {MODES.map((m) => (
                      <option key={m} value={m} disabled={MODE_RANK[m] > ceilingRank}>
                        {m}
                        {MODE_RANK[m] > ceilingRank ? ` (above ${p.ceiling} ceiling)` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="text-xs text-white/35">ceiling: {p.ceiling}</span>
                {p.paused ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act({ action: "resume_platform", platform: p.platform }, `${p.label} resumed.`)}
                    className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200 disabled:opacity-50"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act({ action: "pause_platform", platform: p.platform }, `${p.label} paused. The engine will not claim work for it.`)}
                    className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/75 disabled:opacity-50"
                  >
                    Pause
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Queue from snapshot */}
      <section className={card}>
        <h2 className="text-base font-semibold">Content queue</h2>
        {!queue ? (
          <p className="mt-2 text-sm text-white/45">No queue snapshot yet — the engine has not synced.</p>
        ) : queue.items && queue.items.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-130 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-white/40">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Platform</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2">Scheduled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {queue.items.map((item, i) => (
                  <tr key={String(item.id ?? i)}>
                    <td className="py-2 pr-3 text-white/85">{item.title ?? `Item ${item.id ?? ""}`}</td>
                    <td className="py-2 pr-3 text-white/60">{item.platform ?? "—"}</td>
                    <td className="py-2 pr-3 text-white/60">{item.status ?? "—"}</td>
                    <td className="py-2 text-white/60">{item.scheduledFor ? fmtTime(item.scheduledFor) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/45">Queue is empty in the latest snapshot.</p>
        )}
      </section>

      {/* Errors from snapshot */}
      <section className={card}>
        <h2 className="text-base font-semibold">Open errors</h2>
        {!errors ? (
          <p className="mt-2 text-sm text-white/45">No error snapshot yet — the engine has not synced.</p>
        ) : errors.items && errors.items.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm">
            {errors.items.map((e, i) => (
              <li key={i} className="rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2">
                <span className="font-medium text-red-200">{e.platform ?? "engine"}</span>
                <span className="text-white/70"> — {e.message ?? "unspecified error"}</span>
                <span className="block text-xs text-white/35">{fmtTime(e.at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-white/45">No open errors in the latest snapshot.</p>
        )}
      </section>

      {/* Recent control events */}
      <section className={card}>
        <h2 className="text-base font-semibold">Recent control changes</h2>
        {state.events.length === 0 ? (
          <p className="mt-2 text-sm text-white/45">No control changes yet. Mode and pause changes made here will appear in this log.</p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-sm">
            {state.events.map((ev) => (
              <li key={ev.id} className="flex flex-wrap gap-x-3 text-white/65">
                <span className="text-white/35">{fmtTime(ev.createdAt)}</span>
                <span className="font-medium text-white/85">{ev.action}</span>
                <span>{ev.platform ?? "all platforms"}</span>
                <span className="text-white/35">{ev.actor ?? ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
