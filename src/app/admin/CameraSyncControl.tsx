"use client";

// Admin: Camera Network — dry-run request control.
// This button does exactly one thing: record a timestamped dry-run
// request (POST /api/admin/cameras/sync-request). The harvest itself is
// a generation-time tool that runs outside Vercel (tools/sync-cameras.ts,
// docs/camera-sync.md); the runner consumes pending requests on its next
// run and the results return here as the latest dry-run report + sync
// status. The copy below says so, because a button that implied it was
// running a 30k-feed probe from a web page would be lying.
import { useCallback, useEffect, useState } from "react";

interface RequestState {
  pending: { requestedAt: string; requestedBy: string } | null;
  lastSatisfiedAt: string | null;
}

function fmtTs(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function CameraSyncControl() {
  const [state, setState] = useState<RequestState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cameras/sync-request");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setState({ pending: body.pending ?? null, lastSatisfiedAt: body.lastSatisfiedAt ?? null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load request state");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const request = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cameras/sync-request", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setState({ pending: body.pending ?? null, lastSatisfiedAt: body.lastSatisfiedAt ?? null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={request}
          disabled={busy || !!state?.pending}
          className="inline-flex items-center min-h-10 rounded-lg border border-cyan-300/30 bg-cyan-400/10 px-3.5 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Recording…" : state?.pending ? "Dry-run requested" : "Request a dry-run sync"}
        </button>
        <div className="text-[11px] text-white/45">
          {state?.pending
            ? <>Pending since {fmtTs(state.pending.requestedAt)} — the sync runner picks this up on its next run.</>
            : state?.lastSatisfiedAt
              ? <>Last request satisfied {fmtTs(state.lastSatisfiedAt)}. Its report is the “Latest dry run” table when newer than the last write run.</>
              : <>No request outstanding.</>}
        </div>
      </div>
      {error && <div className="mt-2 text-[11px] text-red-300">Request state unavailable: {error}</div>}
      <p className="mt-3 text-[11px] leading-relaxed text-white/35">
        What this button does, exactly: it records a timestamped request in the app&apos;s sync-request file.
        It does not run the harvest — generation is a tools process outside Vercel (a full pass probe-verifies
        ~30k feeds with per-host pacing). The runner (tools/sync-cameras.ts on the catalogue machine) checks
        for pending requests before every run; when a run completes, its report and verdict are committed back
        and appear in this section. Requests recorded on a deployed instance live in that instance&apos;s local
        cache directory; the runner&apos;s own copy is the one it acts on.
      </p>
    </div>
  );
}
