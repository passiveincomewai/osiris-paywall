"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface SlotDef { page: string; pageLabel: string; slot: string; slotLabel: string }
interface Placement { id: string; page: string; slot: string; active: boolean }
interface Video {
  id: string; title: string; description: string | null; features: unknown;
  style: string; orientation: string; durationSec: number | null;
  videoUrl: string; rawUrl: string | null; posterUrl: string | null;
  status: string; affiliateShared: boolean; outdated: boolean;
  createdAt: string; placements: Placement[];
}
interface Job {
  id: string; prompt: string; style: string; orientation: string; status: string;
  progress: string | null; error: string | null; videoId: string | null;
  videoTitle: string | null; createdAt: string; completedAt: string | null;
}
interface State { workerConfigured: boolean; slots: SlotDef[]; jobs: Job[]; videos: Video[] }
interface PlanStep { action: string; [k: string]: unknown }
interface Plan { template: string; title: string; description: string; steps: PlanStep[] }

const STYLES = ["cinematic", "viral-social", "professional", "educational", "minimalist", "enterprise", "product-tutorial"];
const ORIENTATIONS = ["landscape", "portrait", "square"];
const IN_FLIGHT = new Set(["queued", "claimed", "recording", "rendering"]);

async function api(body?: object): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch("/api/admin/demo-studio", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export default function DemoStudioClient() {
  const [state, setState] = useState<State | null>(null);
  const [prompt, setPrompt] = useState("Create a 25-second cinematic video showing WorldEye opening the globe, zooming into Tokyo, opening an available public camera, enabling the flight tracking layer, and zooming back out to Earth.");
  const [style, setStyle] = useState("cinematic");
  const [orientation, setOrientation] = useState("landscape");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    const { ok, data } = await api();
    if (ok) setState(data as unknown as State);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Poll while any job is in flight so the render queue feels live.
  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (state?.jobs.some((j) => IN_FLIGHT.has(j.status))) {
      timer.current = setInterval(() => void load(), 4000);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [state, load]);

  async function generate() {
    setBusy(true); setError(null); setNotice(null);
    const { ok, data } = await api({ action: "createJob", prompt, style, orientation });
    setBusy(false);
    if (!ok) { setError(String(data.error ?? "Could not queue that demonstration.")); setPlan(null); return; }
    setPlan(data.plan as Plan);
    setNotice("Queued — the recording worker will claim it and the finished video will appear in the library below as a draft.");
    void load();
  }

  async function patchVideo(videoId: string, patch: object) {
    const { ok, data } = await api({ action: "updateVideo", videoId, patch });
    if (!ok) setError(String(data.error ?? "Update failed."));
    void load();
  }

  async function place(videoId: string, page: string, slot: string) {
    const { ok, data } = await api({ action: "createPlacement", videoId, page, slot });
    if (!ok) setError(String(data.error ?? "Placement failed."));
    else setNotice("Placed. The video now renders in that slot on the live page.");
    void load();
  }

  async function unplace(placementId: string) {
    await api({ action: "deletePlacement", placementId });
    void load();
  }

  return (
    <div className="mt-6 space-y-8">
      {state && !state.workerConfigured && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          The worker channel is not configured on this deployment (no DEMO_STUDIO_SECRET / STUDIO_AI_SECRET),
          so queued jobs cannot be claimed until it is set in Vercel.
        </div>
      )}
      {notice && <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{notice}</div>}
      {error && <div className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</div>}

      {/* ── Prompt panel + scene plan preview ─────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">New demonstration</h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-[15px] text-white outline-none focus:border-cyan-400/60"
          placeholder="Describe exactly what the video should demonstrate…"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-xs text-white/60">Style
            <select value={style} onChange={(e) => setStyle(e.target.value)} className="ml-2 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white">
              {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-xs text-white/60">Format
            <select value={orientation} onChange={(e) => setOrientation(e.target.value)} className="ml-2 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-sm text-white">
              {ORIENTATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <button
            onClick={() => void generate()}
            disabled={busy}
            className="ml-auto rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {busy ? "Planning…" : "Generate demonstration"}
          </button>
        </div>
        {plan && (
          <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
            <p className="text-sm font-medium text-white">{plan.title}</p>
            <p className="mt-1 text-sm text-white/60">{plan.description}</p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-white/75">
              {plan.steps.map((s, i) => (
                <li key={i}>
                  <span className="font-mono text-cyan-200">{s.action}</span>
                  {typeof s.query === "string" && <> — “{s.query}”</>}
                  {typeof s.layer === "string" && <> — {s.layer}</>}
                  {typeof s.path === "string" && <> — {s.path}</>}
                  {typeof s.seconds === "number" && <> — {s.seconds}s</>}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-white/40">Template: {plan.template}. The worker verifies every step against the real site as it records; a step that fails fails the job with the reason shown in the queue — footage is never substituted.</p>
          </div>
        )}
      </section>

      {/* ── Render queue ──────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Render queue</h2>
        {!state && <p className="mt-3 text-sm text-white/50">Loading…</p>}
        {state && state.jobs.length === 0 && <p className="mt-3 text-sm text-white/50">No demonstrations yet. Describe one above to queue the first recording.</p>}
        <ul className="mt-3 divide-y divide-white/5">
          {state?.jobs.map((j) => (
            <li key={j.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${j.status === "complete" ? "bg-emerald-400/20 text-emerald-200" : j.status === "failed" ? "bg-red-400/20 text-red-200" : "bg-cyan-400/20 text-cyan-200"}`}>{j.status}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-white/85">{j.prompt}</span>
              <span className="text-xs text-white/45">{j.progress ?? ""}</span>
              <span className="text-xs text-white/35">{new Date(j.createdAt).toLocaleString()}</span>
              {j.error && <p className="w-full text-xs text-red-300/90">{j.error}</p>}
            </li>
          ))}
        </ul>
      </section>

      {/* ── Media library ─────────────────────────────────────────── */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/70">Media library</h2>
        {state && state.videos.length === 0 && <p className="mt-3 text-sm text-white/50">Finished demonstrations will appear here as drafts.</p>}
        <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {state?.videos.map((v) => (
            <article key={v.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
              <video src={v.videoUrl} poster={v.posterUrl ?? undefined} controls preload="metadata" className="aspect-video w-full bg-black" />
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">{v.title}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${v.status === "approved" ? "bg-emerald-400/20 text-emerald-200" : "bg-white/10 text-white/60"}`}>{v.status}</span>
                </div>
                {v.description && <p className="text-xs leading-relaxed text-white/55">{v.description}</p>}
                <p className="text-[11px] text-white/40">
                  {v.style} · {v.orientation}{v.durationSec ? ` · ${v.durationSec.toFixed(1)}s` : ""} · {new Date(v.createdAt).toLocaleDateString()}
                  {Array.isArray(v.features) && v.features.length > 0 && <> · {(v.features as string[]).join(", ")}</>}
                </p>
                {v.outdated && <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-200">Flagged as possibly outdated — review before further use.</p>}
                <div className="flex flex-wrap gap-2">
                  {v.status !== "approved" ? (
                    <button onClick={() => void patchVideo(v.id, { status: "approved" })} className="rounded-lg bg-emerald-500/90 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400">Approve</button>
                  ) : (
                    <button onClick={() => void patchVideo(v.id, { status: "draft" })} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">Back to draft</button>
                  )}
                  <button
                    onClick={() => void patchVideo(v.id, { affiliateShared: !v.affiliateShared })}
                    disabled={v.status !== "approved" && !v.affiliateShared}
                    title={v.status !== "approved" ? "Approve the video before sharing it with affiliates" : undefined}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${v.affiliateShared ? "bg-cyan-500 text-black" : "border border-white/20 text-white/80 hover:bg-white/10"} disabled:opacity-40`}
                  >
                    {v.affiliateShared ? "Shared with affiliates ✓" : "Share with affiliates"}
                  </button>
                  <button onClick={() => void patchVideo(v.id, { outdated: !v.outdated })} className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
                    {v.outdated ? "Clear outdated flag" : "Flag outdated"}
                  </button>
                  {v.rawUrl && <a href={v.rawUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">Raw recording</a>}
                </div>
                <PlacementControls video={v} slots={state.slots} onPlace={place} onUnplace={unplace} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function PlacementControls({ video, slots, onPlace, onUnplace }: {
  video: Video;
  slots: SlotDef[];
  onPlace: (videoId: string, page: string, slot: string) => Promise<void>;
  onUnplace: (placementId: string) => Promise<void>;
}) {
  const [choice, setChoice] = useState("");
  const key = (s: SlotDef) => `${s.page}:${s.slot}`;
  return (
    <div className="border-t border-white/5 pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">On the website</p>
      {video.placements.length === 0 && <p className="mt-1 text-xs text-white/40">Not placed anywhere.</p>}
      <ul className="mt-1 space-y-1">
        {video.placements.map((p) => {
          const def = slots.find((s) => s.page === p.page && s.slot === p.slot);
          return (
            <li key={p.id} className="flex items-center justify-between gap-2 text-xs text-white/75">
              <span>{def ? `${def.pageLabel} — ${def.slotLabel}` : `${p.page}:${p.slot}`}</span>
              <button onClick={() => void onUnplace(p.id)} className="text-red-300/80 hover:text-red-200">Remove</button>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex gap-2">
        <select
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-xs text-white"
        >
          <option value="">Add to website — choose a page & slot…</option>
          {slots.map((s) => <option key={key(s)} value={key(s)}>{s.pageLabel} — {s.slotLabel}</option>)}
        </select>
        <button
          disabled={!choice || video.status !== "approved"}
          title={video.status !== "approved" ? "Approve the video before placing it" : undefined}
          onClick={() => { const [page, slot] = choice.split(":"); void onPlace(video.id, page, slot); }}
          className="shrink-0 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-cyan-400 disabled:opacity-40"
        >
          Add to Website
        </button>
      </div>
    </div>
  );
}
