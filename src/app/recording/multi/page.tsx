"use client";
/**
 * Multi-camera recording (Pro): pick up to 20 cameras — saved ones, or
 * any from the catalogue — and record them all at once, each in its own
 * tile, each producing its own clip in the library.
 *
 * Honest shape of the feature: clips are captured live in this browser
 * and stored on this device. Nothing records while this tab is closed;
 * this is not cloud or 24/7 recording and there are no schedules.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MultiRecordTile, { type TileControls } from "@/components/recording/MultiRecordTile";
import UpgradeScreen from "@/components/recording/UpgradeScreen";
import {
  MultiControlBar,
  MultiSignInPrompt,
  SavedPickerRow,
  capRefusal,
  type PickerCam,
} from "@/components/recording/MultiChrome";
import type { SavedCam } from "@/components/recording/RecordableTile";
import {
  addToSelection,
  classifyMultiCam,
  initialTileSession,
  MAX_MULTI_CAMERAS,
  multiGateView,
  removeFromSelection,
  summarizeBoard,
  tileReducer,
  type TileEvent,
  type TileSession,
} from "@/lib/recording/multi";

const SELECTION_KEY = "we_rec_multi_sel";

type CatalogueCam = Record<string, unknown> & { id: string | number };

const camName = (c: Record<string, unknown>): string =>
  (typeof c.name === "string" && c.name) || (typeof c.title === "string" && c.title) || "Camera";

const camPlace = (c: Record<string, unknown>): string =>
  [c.city, c.country].filter((x): x is string => typeof x === "string" && !!x).join(", ");

export default function MultiRecordPage() {
  const [gate, setGate] = useState<{ loaded: boolean; signedIn: boolean; pro: boolean }>({
    loaded: false, signedIn: false, pro: false,
  });
  const [saved, setSaved] = useState<SavedCam[] | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [board, setBoard] = useState<Record<string, TileSession>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [catalogue, setCatalogue] = useState<CatalogueCam[] | null>(null);
  const [catalogueBusy, setCatalogueBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const controlsRef = useRef(new Map<string, TileControls>());
  const selectionLoaded = useRef(false);

  /* ---------- gate + saved cameras ---------- */
  useEffect(() => {
    (async () => {
      const s = await fetch("/api/recording/status");
      if (!s.ok) { setGate({ loaded: true, signedIn: false, pro: false }); return; }
      const j = await s.json();
      setGate({ loaded: true, signedIn: true, pro: j.pro });
      if (j.pro) {
        const r = await fetch("/api/recording/cameras");
        if (r.ok) setSaved((await r.json()).cameras);
      }
    })();
  }, []);

  /* ---------- selection persistence ---------- */
  useEffect(() => {
    if (!saved || selectionLoaded.current) return;
    selectionLoaded.current = true;
    let stored: string[] = [];
    try {
      const raw = JSON.parse(localStorage.getItem(SELECTION_KEY) ?? "[]");
      if (Array.isArray(raw)) stored = raw.filter((x): x is string => typeof x === "string");
    } catch { /* fresh start */ }
    const valid = new Set(saved.map((c) => c.id));
    const restored = stored.filter((id) => valid.has(id)).slice(0, MAX_MULTI_CAMERAS);
    setSelection(restored.length ? restored : saved.slice(0, Math.min(4, saved.length)).map((c) => c.id));
  }, [saved]);

  useEffect(() => {
    if (!selectionLoaded.current) return;
    try { localStorage.setItem(SELECTION_KEY, JSON.stringify(selection)); } catch {}
    setBoard((b) => {
      const next: Record<string, TileSession> = {};
      for (const id of selection) next[id] = b[id] ?? initialTileSession;
      return next;
    });
  }, [selection]);

  /* ---------- tile sessions ---------- */
  const onEvent = useCallback((id: string, event: TileEvent) => {
    setBoard((b) => (b[id] ? { ...b, [id]: tileReducer(b[id], event) } : b));
  }, []);

  const registerControls = useCallback((id: string, controls: TileControls | null) => {
    if (controls) controlsRef.current.set(id, controls);
    else controlsRef.current.delete(id);
  }, []);

  const summary = useMemo(() => summarizeBoard(board), [board]);

  useEffect(() => {
    if (summary.earliestStart === null) { setSessionElapsed(0); return; }
    const start = summary.earliestStart;
    const iv = setInterval(() => setSessionElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(iv);
  }, [summary.earliestStart]);

  const recordAll = useCallback(() => {
    // Stagger the starts so twenty captures don't all spin up in one frame.
    selection.forEach((id, i) => {
      const s = board[id];
      if (s && s.phase !== "recording" && s.phase !== "saving") {
        setTimeout(() => controlsRef.current.get(id)?.start(), i * 200);
      }
    });
  }, [selection, board]);

  const stopAll = useCallback(() => {
    for (const id of selection) controlsRef.current.get(id)?.stop();
  }, [selection]);

  /* ---------- picking ---------- */
  const toggleSaved = useCallback((id: string, currentlySelected: boolean) => {
    setSelection((sel) => {
      if (currentlySelected) return removeFromSelection(sel, id);
      const r = addToSelection(sel, id);
      if (!r.ok) { setNotice("That's the 20-camera limit — remove one to add another."); return sel; }
      return r.selection;
    });
  }, []);

  const ensureCatalogue = useCallback(async () => {
    if (catalogue || catalogueBusy) return;
    setCatalogueBusy(true);
    try {
      const r = await fetch("/api/cctv?sparse=1");
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j.cameras)) setCatalogue(j.cameras);
      }
    } finally { setCatalogueBusy(false); }
  }, [catalogue, catalogueBusy]);

  const results = useMemo(() => {
    if (!catalogue || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    const savedKeys = new Set(
      (saved ?? []).map((c) => {
        const d = (c.cameraData ?? {}) as Record<string, unknown>;
        return String(d.feed_url ?? d.stream_url ?? "");
      }),
    );
    return catalogue
      .filter((c) => {
        const hay = `${camName(c)} ${camPlace(c)} ${typeof c.region === "string" ? c.region : ""}`.toLowerCase();
        return hay.includes(q);
      })
      .filter((c) => !savedKeys.has(String(c.feed_url ?? c.stream_url ?? "")))
      .slice(0, 24);
  }, [catalogue, query, saved]);

  const addFromCatalogue = useCallback(async (c: CatalogueCam) => {
    if (capRefusal(selection, "__catalogue_new__")) {
      setNotice("That's the 20-camera limit — remove one to add another.");
      return;
    }
    const name = camName(c);
    const r = await fetch("/api/recording/cameras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        cameraData: {
          id: String(c.id),
          stream_url: c.stream_url ?? null,
          feed_url: c.feed_url ?? null,
          external_url: c.external_url ?? null,
          stream_type: c.stream_type ?? null,
          lat: c.lat ?? null,
          lng: c.lng ?? null,
          name,
        },
      }),
    });
    if (!r.ok) { setNotice("That camera couldn't be saved — try another."); return; }
    const j = await r.json().catch(() => ({}));
    const newId: string | undefined = j.camera?.id;
    const lr = await fetch("/api/recording/cameras");
    if (lr.ok) setSaved((await lr.json()).cameras);
    if (newId) {
      setSelection((sel) => {
        const res = addToSelection(sel, newId);
        return res.ok ? res.selection : sel;
      });
    }
  }, [selection]);

  /* ---------- render ---------- */
  const view = multiGateView({ statusLoaded: gate.loaded, signedIn: gate.signedIn, pro: gate.pro });
  if (view === "loading") return <div className="text-slate-400 font-mono text-sm">Loading…</div>;
  if (view === "signin") return <MultiSignInPrompt />;
  if (view === "locked") {
    return <UpgradeScreen priceLine="Multi-camera recording unlocks with WorldEye Pro · Monthly $13.99 · Annual $74.99" />;
  }

  const pickerCams: PickerCam[] = (saved ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    group: c.group,
    cameraData: (c.cameraData ?? {}) as Record<string, unknown>,
    source: classifyMultiCam(c.cameraData),
  }));
  const selectedCams = selection
    .map((id) => (saved ?? []).find((c) => c.id === id))
    .filter((c): c is SavedCam => !!c);
  const atCap = selection.length >= MAX_MULTI_CAMERAS;
  const anyRecordable = selectedCams.some((c) => classifyMultiCam(c.cameraData).kind !== "unsupported");

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Premium recording</div>
        <h1 className="text-3xl font-bold text-white">Multi-camera recording</h1>
        <p className="text-sm text-slate-400 mt-1">
          Record up to {MAX_MULTI_CAMERAS} cameras at once. Every tile records on its own — one camera failing never stops the rest.
        </p>
      </div>

      <MultiControlBar
        selected={selection.length}
        recording={summary.recording}
        saving={summary.saving}
        errors={summary.errors}
        sessionElapsed={sessionElapsed}
        canRecord={anyRecordable}
        onRecordAll={recordAll}
        onStopAll={stopAll}
      />
      {notice && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/50 px-4 py-2 text-sm font-mono text-amber-200">
          {notice}
        </div>
      )}

      {selectedCams.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-10 text-center">
          <div className="text-4xl mb-3">▦</div>
          <div className="text-white font-bold">Your recording wall is empty</div>
          <p className="text-sm text-slate-400 mt-2">Pick cameras below — saved ones, or search the whole catalogue.</p>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill,minmax(min(100%,320px),1fr))" }}>
          {selectedCams.map((c, i) => (
            <MultiRecordTile
              key={c.id}
              cam={c}
              index={i}
              pro
              session={board[c.id] ?? initialTileSession}
              onEvent={onEvent}
              registerControls={registerControls}
            />
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-5">
        <div>
          <div className="text-[11px] font-mono tracking-[0.2em] text-slate-500 uppercase mb-3">
            Your saved cameras · {selection.length}/{MAX_MULTI_CAMERAS} on the wall
          </div>
          {pickerCams.length === 0 ? (
            <p className="text-sm text-slate-500">
              No saved cameras yet — save some from any camera on the main globe, or add them from the catalogue below.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {pickerCams.map((c) => (
                <SavedPickerRow
                  key={c.id}
                  cam={c}
                  selected={selection.includes(c.id)}
                  atCap={atCap}
                  notice={setNotice}
                  onToggle={toggleSaved}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-mono tracking-[0.2em] text-slate-500 uppercase mb-3">Add from the catalogue</div>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); void ensureCatalogue(); }}
            onFocus={() => void ensureCatalogue()}
            placeholder="Search cameras by city, road or name…"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60"
          />
          <div className="mt-2 text-[11px] font-mono text-slate-500">
            Searches a worldwide sample of the catalogue in this browser — for the full catalogue, find the camera on the globe and save it there.
          </div>
          {catalogueBusy && <div className="mt-2 text-xs font-mono text-slate-500">Loading the catalogue sample…</div>}
          {query.trim().length >= 2 && catalogue && results.length === 0 && (
            <div className="mt-2 text-xs font-mono text-slate-500">No matches in the catalogue sample for “{query}”.</div>
          )}
          <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {results.map((c) => {
              const src = classifyMultiCam(c as Record<string, unknown>);
              return (
                <div key={String(c.id)} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate">{camName(c)}</div>
                      <div className="text-[10px] font-mono text-slate-500 truncate">{camPlace(c) || "—"}</div>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono border ${src.kind === "unsupported" ? "border-slate-500/40 text-slate-400" : "border-emerald-400/40 text-emerald-300"}`}>
                      {src.kind === "video" ? "STREAM" : src.kind === "stills" ? "SNAPSHOT" : "PREVIEW ONLY"}
                    </span>
                  </div>
                  <button
                    onClick={() => void addFromCatalogue(c)}
                    className="mt-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#04121f]"
                    style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}>
                    ＋ Save &amp; add
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        Recording captures in this browser, on this device, only while this tab stays open — it is not cloud
        recording, nothing is captured while the tab is closed, and there are no schedules. Stream cameras record
        in real time; snapshot cameras are checked every ~15 seconds and record each newly published frame, so
        their clips play back with steppy motion rather than smooth video. YouTube embeds can't be recorded
        (platform restriction), and a feed whose host refuses in-browser capture will say so on its tile.
        Clips land in <span className="text-slate-300">Clips</span>, on this device, ready to play or download.
      </p>
    </div>
  );
}
