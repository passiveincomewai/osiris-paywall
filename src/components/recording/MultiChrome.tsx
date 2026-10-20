"use client";
/**
 * The multi-record page's presentational pieces: the sign-in gate, the
 * control bar, and the picker. Kept separate from the page so the gate
 * and the cap messaging are render-testable without a browser.
 */
import Link from "next/link";
import {
  addToSelection,
  CAP_MESSAGE,
  MAX_MULTI_CAMERAS,
  capMessage,
  multiCamKindLabel,
  type MultiCamSource,
  type MultiTier,
} from "@/lib/recording/multi";

export function MultiSignInPrompt() {
  return (
    <div className="text-center py-20">
      <div className="text-4xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-white">Sign in to record multiple cameras</h1>
      <p className="mt-3 text-sm text-slate-400 max-w-md mx-auto">
        Multi-camera recording is a WorldEye Pro feature. Sign in first, then build your recording wall — up to {MAX_MULTI_CAMERAS} cameras on Pro, up to 40 on VIP Pro.
      </p>
      <Link
        href="/api/auth/signin?callbackUrl=/recording/multi"
        className="inline-block mt-6 px-8 py-3 rounded-2xl font-mono font-bold text-[#04121f]"
        style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}>
        Sign in
      </Link>
    </div>
  );
}

export function fmtElapsed(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function MultiControlBar({
  selected,
  recording,
  saving,
  errors,
  sessionElapsed,
  canRecord,
  cap = MAX_MULTI_CAMERAS,
  onRecordAll,
  onStopAll,
}: {
  selected: number;
  recording: number;
  saving: number;
  errors: number;
  sessionElapsed: number;
  canRecord: boolean;
  /** The owner's tier cap — the denominator on the selection count. */
  cap?: number;
  onRecordAll: () => void;
  onStopAll: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onRecordAll}
          disabled={!canRecord || recording + saving > 0}
          className="h-10 px-5 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-sm font-mono font-bold disabled:opacity-40 disabled:cursor-not-allowed">
          ● RECORD ALL
        </button>
        <button
          onClick={onStopAll}
          disabled={recording + saving === 0}
          className="h-10 px-5 rounded-xl border border-white/20 text-slate-200 text-sm font-mono font-bold hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed">
          ■ STOP ALL
        </button>
      </div>
      <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
        <span><span className="text-white font-bold">{selected}</span>/{cap} selected</span>
        {recording > 0 && (
          <span className="text-red-300 font-bold animate-pulse">● {recording} recording · {fmtElapsed(sessionElapsed)}</span>
        )}
        {saving > 0 && <span className="text-cyan-300">saving {saving}…</span>}
        {errors > 0 && <span className="text-amber-300">{errors} tile{errors === 1 ? "" : "s"} need{errors === 1 ? "s" : ""} attention</span>}
      </div>
    </div>
  );
}

export type PickerCam = {
  id: string;
  name: string;
  group: string;
  cameraData: Record<string, unknown>;
  source: MultiCamSource;
};

/** One saved-camera row in the picker. */
export function SavedPickerRow({
  cam,
  selected,
  atCap,
  notice,
  capNotice = CAP_MESSAGE,
  onToggle,
}: {
  cam: PickerCam;
  selected: boolean;
  atCap: boolean;
  notice: (msg: string | null) => void;
  /** The refusal for THIS owner's tier, shown when the cap blocks a pick. */
  capNotice?: string;
  onToggle: (id: string, currentlySelected: boolean) => void;
}) {
  const disabled = !selected && atCap;
  const label = multiCamKindLabel(cam.source);
  return (
    <button
      onClick={() => {
        if (disabled) { notice(capNotice); return; }
        notice(null);
        onToggle(cam.id, selected);
      }}
      aria-pressed={selected}
      className={`w-full text-left rounded-xl border p-3 transition-colors ${
        selected
          ? "border-cyan-400/60 bg-cyan-400/10"
          : disabled
            ? "border-white/5 bg-white/[0.02] opacity-60"
            : "border-white/10 bg-white/[0.04] hover:border-white/25"
      }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold text-white truncate">{cam.name}</div>
          <div className="text-[10px] font-mono text-slate-500 truncate">{cam.group}</div>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
          cam.source.kind === "unsupported"
            ? "border-slate-500/40 text-slate-400"
            : "border-emerald-400/40 text-emerald-300"
        }`}>
          {label}
        </span>
      </div>
      {selected && <div className="mt-1 text-[11px] font-mono text-cyan-300">✓ on the wall</div>}
    </button>
  );
}

/** Pure refusal text the page shows; kept here so it renders identically. */
export function capRefusal(
  selection: readonly string[],
  id: string,
  cap: number = MAX_MULTI_CAMERAS,
  tier?: MultiTier,
): string | null {
  const r = addToSelection(selection, id, cap);
  if (r.ok) return null;
  return r.reason === "cap" ? capMessage(cap, tier) : CAP_MESSAGE;
}
