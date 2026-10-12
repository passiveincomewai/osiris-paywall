"use client";
/**
 * WorldEye Companion — in-page widget (replaces the separate /companion page).
 * A floating button opens a bottom sheet with the humanoid avatar, push-to-talk,
 * and transcript. Talks DIRECTLY to the page's OI assistant (no bridge needed),
 * so on iPhone it drives the very globe you're looking at.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import HumanoidAvatar, { type AvatarState } from "./HumanoidAvatar";
import { listenOnce, speak, stopSpeaking, sttSupported } from "@/lib/companion/voice";
import { startWakeWordListener, wakeWordSupported, type WakeStatus } from "@/lib/companion/wake";
import {
  FaceSampler, faceTrackingSupported, GazeSmoother, pointerToGaze,
  NEUTRAL_GAZE, type GazePoint, type GazeState,
} from "@/lib/companion/gaze";
import { type AssistClient } from "@/lib/oi/assist/client";
import { loadEngine, loadKey, saveEngine, saveKey } from "@/lib/oi/client";
import { PROVIDERS, type ProviderId } from "@/lib/oi/providers";

export default function CompanionWidget({ assist }: { assist: AssistClient }) {
  const [open, setOpen] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [provider, setProvider] = useState<ProviderId>("openai");
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const energyRef = useRef(0);
  const feedRef = useRef<HTMLDivElement>(null);

  /* ---- Phase 4: wake word + face tracking (both opt-in, default off) ---- */
  const [showSettings, setShowSettings] = useState(false);
  const [wakeOn, setWakeOn] = useState(false);
  const [wakeStatus, setWakeStatus] = useState<"off" | WakeStatus>("off");
  const [faceOn, setFaceOn] = useState(false);
  const [faceMode, setFaceMode] = useState<"off" | "starting" | "face" | "pointer">("off");
  const [faceNote, setFaceNote] = useState<string | null>(null);
  const gazeRef = useRef<GazeState>({ ...NEUTRAL_GAZE });
  const smoother = useMemo(() => new GazeSmoother(), []);
  const faceSamplerRef = useRef<FaceSampler | null>(null);
  const avatarWrapRef = useRef<HTMLDivElement>(null);

  // Restore the two opt-in toggles (persisted locally, like the OI key).
  useEffect(() => {
    try {
      setWakeOn(localStorage.getItem("osiris.companion.wakeWord") === "1");
      setFaceOn(localStorage.getItem("osiris.companion.faceTracking") === "1");
    } catch {}
  }, []);

  const auth = useMemo(() => {
    const engine = loadEngine();
    if (!engine) return null;
    const key = loadKey(engine.provider);
    return key ? { engine, key } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasKey, open]);

  useEffect(() => { if (open) setHasKey(!!auth); }, [open, auth]);

  // Watch the latest OI entry: when it finishes, speak its text.
  const lastSpoken = useRef<string>("");
  useEffect(() => {
    if (!open) return;
    const entries = assist.entries;
    const last = [...entries].reverse().find((e) => e.role === "oi" && !e.busy);
    if (!last || last.role !== "oi" || lastSpoken.current === last.id) return;
    lastSpoken.current = last.id;
    const text = last.says.join(" ").replace(/^- /gm, "").replace(/\s+/g, " ").trim().slice(0, 500);
    if (!text) return;
    setSpeaking(true);
    setAvatarState("speaking");
    void speak(text, energyRef).finally(() => {
      setSpeaking(false);
      setAvatarState((s) => (s === "speaking" ? "idle" : s));
    });
  }, [open, assist.entries]);

  useEffect(() => {
    if (assist.busy) setAvatarState("thinking");
    else if (!speaking && !listening) setAvatarState("idle");
  }, [assist.busy, speaking, listening]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight });
  }, [assist.entries, open]);

  const sendText = useCallback((text: string) => {
    if (!auth || assist.busy) return;
    setErr(null);
    stopSpeaking();
    setSpeaking(false);
    assist.send(text, "auto", auth);
  }, [auth, assist]);

  const talk = useCallback(async () => {
    if (listening || assist.busy || speaking) return;
    if (!sttSupported()) { setErr("Voice input needs Chrome or Edge"); return; }
    setErr(null);
    setListening(true);
    setAvatarState("listening");
    try {
      const text = await listenOnce();
      setListening(false);
      setAvatarState("idle");
      sendText(text);
    } catch (e) {
      setListening(false);
      setAvatarState("idle");
      setErr(e instanceof Error ? e.message : "Listening failed");
    }
  }, [listening, assist.busy, speaking, sendText]);

  /* Wake word: armed only while the sheet is open and the companion is
     idle (never while a one-shot listen, a reply, or TTS is in flight —
     two recognizers can't coexist, and it must not hear itself). A match
     hands off to the exact same `talk()` path as tapping the mic. */
  const wakeArmed = wakeOn && open;
  useEffect(() => {
    if (!wakeArmed || listening || speaking || assist.busy) return;
    if (!wakeWordSupported()) { setWakeStatus("unsupported"); return; }
    const handle = startWakeWordListener({
      onWake: () => { void talk(); },
      onStatus: (s, detail) => {
        setWakeStatus(s);
        if ((s === "denied" || s === "error") && detail) setErr(detail);
      },
    });
    return () => { handle.stop(); };
  }, [wakeArmed, listening, speaking, assist.busy, talk]);

  /* Face tracking: start the on-device sampler when enabled + sheet open.
     Unsupported detector or a denied camera degrades to pointer gaze —
     labeled as such, never passed off as face tracking. */
  useEffect(() => {
    if (!open || !faceOn) return;
    let cancelled = false;
    setFaceMode("starting");
    const enablePointer = (note: string) => {
      if (cancelled) return;
      setFaceMode("pointer");
      setFaceNote(note);
    };
    if (!faceTrackingSupported()) {
      enablePointer("Face detection isn't built into this browser (Chrome and Edge have it), so the companion follows your pointer instead.");
    } else {
      const sampler = new FaceSampler();
      faceSamplerRef.current = sampler;
      void sampler.start((offset: GazePoint | null) => {
        const now = performance.now();
        if (offset) smoother.faceSample(offset, now);
        gazeRef.current = smoother.snapshot(now);
      }).then((res) => {
        if (cancelled) return;
        if (res.ok) { setFaceMode("face"); setFaceNote(null); }
        else if (res.reason === "denied") enablePointer("Camera access is off, so the companion follows your pointer instead.");
        else if (res.reason === "unsupported") enablePointer("Face detection isn't available in this browser, so the companion follows your pointer instead.");
        else enablePointer("The camera couldn't start, so the companion follows your pointer instead.");
      });
    }
    return () => {
      cancelled = true;
      faceSamplerRef.current?.stop();
      faceSamplerRef.current = null;
      setFaceMode("off");
      setFaceNote(null);
      smoother.reset();
      gazeRef.current = { ...NEUTRAL_GAZE };
    };
  }, [open, faceOn, smoother]);

  /* Keep gaze presence fresh between samples so it expires on schedule. */
  useEffect(() => {
    if (!open || !faceOn) return;
    const iv = setInterval(() => { gazeRef.current = smoother.snapshot(performance.now()); }, 300);
    return () => clearInterval(iv);
  }, [open, faceOn, smoother]);

  /* Pointer gaze (fallback): avatar follows your finger/cursor over the sheet. */
  const onSheetPointerMove = useCallback((e: { clientX: number; clientY: number }) => {
    if (!faceOn || faceMode !== "pointer") return;
    const rect = avatarWrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const now = performance.now();
    smoother.pointerSample(pointerToGaze(e.clientX, e.clientY, rect), now);
    gazeRef.current = smoother.snapshot(now);
  }, [faceOn, faceMode, smoother]);

  const toggleWake = () => {
    const next = !wakeOn;
    setWakeOn(next);
    try { localStorage.setItem("osiris.companion.wakeWord", next ? "1" : "0"); } catch {}
    if (!next) setWakeStatus("off");
    else if (!wakeWordSupported()) setWakeStatus("unsupported");
  };

  const toggleFace = () => {
    const next = !faceOn;
    setFaceOn(next);
    try { localStorage.setItem("osiris.companion.faceTracking", next ? "1" : "0"); } catch {}
  };

  const wakeNote = !wakeWordSupported()
    ? "Wake word isn't supported in this browser yet."
    : wakeStatus === "denied"
      ? "Microphone blocked — allow mic access in your browser, then toggle off and on."
      : wakeStatus === "error"
        ? "Wake word keeps stopping in this browser — tap the mic instead."
        : wakeOn
          ? (listening || speaking || assist.busy ? "On — resumes listening when the companion is idle." : "On — listening for the wake phrase while this sheet is open.")
          : null;

  const faceStatusLine = !faceOn
    ? null
    : faceMode === "face"
      ? "Live — the companion can see you and follows your gaze."
      : faceMode === "pointer"
        ? "Pointer following is active (not face tracking)."
        : faceMode === "starting"
          ? "Starting camera…"
          : null;

  const saveKeyNow = () => {
    const k = keyInput.trim();
    if (!k) return;
    saveKey(provider, k, true);
    saveEngine({ provider, model: "default", remember: true });
    setKeyInput("");
    setHasKey(true);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Companion"
        className="fixed z-[70] rounded-full border flex items-center justify-center transition-transform active:scale-95"
        style={{
          right: "max(16px, env(safe-area-inset-right))",
          bottom: "max(88px, calc(env(safe-area-inset-bottom) + 88px))",
          width: 60, height: 60,
          background: "radial-gradient(circle at 50% 35%, #0e2a4a 0%, #050b16 70%)",
          borderColor: avatarState === "listening" ? "#f87171" : avatarState === "speaking" ? "#38bdf8" : "rgba(56,189,248,.4)",
          boxShadow: `0 0 ${avatarState === "idle" ? 18 : 32}px rgba(56,189,248,.45)`,
        }}>
        <span className="text-2xl" style={{ filter: "drop-shadow(0 0 6px rgba(56,189,248,.8))" }}>👁️</span>
        {(listening || assist.busy || speaking) && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-cyan-400 animate-ping" />
        )}
      </button>

      {/* Bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" role="dialog" aria-label="WorldEye companion">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div
            onPointerMove={onSheetPointerMove}
            className="relative w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl border border-white/10 overflow-hidden flex flex-col"
            style={{
              height: "min(78vh, 640px)",
              background: "radial-gradient(1000px 600px at 50% 0%, #0a1628 0%, #04070d 70%)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}>
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-300/80 uppercase">Companion</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowSettings((s) => !s)} aria-label="Companion settings" aria-expanded={showSettings}
                  className={`w-8 h-8 rounded-full border text-sm ${showSettings ? "bg-cyan-400/20 border-cyan-400/50 text-cyan-200" : "bg-white/5 border-white/10 text-slate-300"}`}>⚙</button>
                <button onClick={() => setOpen(false)} aria-label="Close"
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-slate-300 text-sm">✕</button>
              </div>
            </div>

            {showSettings && (
              <div className="mx-4 mb-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 space-y-3 max-h-60 overflow-y-auto shrink-0">
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-200">Wake word — “Hey WorldEye”</div>
                    <button role="switch" aria-checked={wakeOn} aria-label="Wake word" onClick={toggleWake}
                      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${wakeOn ? "bg-cyan-400/70" : "bg-white/15"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${wakeOn ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-400">
                    Say “Hey WorldEye”, “Hey world eye” or “OK WorldEye” to start talking hands-free.
                    Listening runs through your browser&apos;s speech service, which processes the audio —
                    WorldEye never receives or stores it.
                  </p>
                  {wakeNote && <p className="mt-1 text-[11px] font-mono text-cyan-300/80">{wakeNote}</p>}
                </div>
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-200">Face tracking</div>
                    <button role="switch" aria-checked={faceOn} aria-label="Face tracking" onClick={toggleFace}
                      className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${faceOn ? "bg-cyan-400/70" : "bg-white/15"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${faceOn ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-400">
                    The companion watches for you and follows your gaze. Camera frames are processed
                    on this device and never leave it — nothing is recorded, uploaded, or stored.
                  </p>
                  {faceStatusLine && <p className="mt-1 text-[11px] font-mono text-cyan-300/80">{faceStatusLine}</p>}
                  {faceOn && faceMode === "pointer" && faceNote && (
                    <p className="mt-1 text-[11px] font-mono text-amber-300/90">{faceNote}</p>
                  )}
                </div>
              </div>
            )}

            {hasKey === false ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full text-center">
                  <div className="text-3xl mb-2">👁️</div>
                  <p className="text-sm text-slate-400">Add your AI key once — the same one OI Assist uses. Stored only in this browser.</p>
                  <select value={provider} onChange={(e) => setProvider(e.target.value as ProviderId)}
                    className="mt-4 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
                    {PROVIDERS.filter((p) => p.id !== "demo").map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="API key"
                    className="mt-2 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60" />
                  <button onClick={saveKeyNow} className="mt-3 w-full py-2.5 rounded-xl font-mono font-bold text-[#04121f]"
                    style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}>Activate</button>
                </div>
              </div>
            ) : (
              <>
                <div ref={avatarWrapRef} className="relative h-44 shrink-0">
                  <HumanoidAvatar state={avatarState} energyRef={energyRef} density={0.5} gazeRef={gazeRef} className="absolute inset-0" />
                  <div className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-mono tracking-[0.3em] text-cyan-300/70 uppercase">
                    {listening ? "listening…" : assist.busy ? "thinking…" : speaking ? "speaking…" : "tap the mic"}
                  </div>
                </div>
                <div className="flex justify-center py-1">
                  <button onClick={talk} disabled={assist.busy || speaking} aria-label="Talk"
                    className={`w-14 h-14 rounded-full border-2 text-xl transition-all disabled:opacity-40 ${listening ? "border-red-400 bg-red-500/20 scale-110" : "border-cyan-400/60 bg-cyan-400/10 active:scale-95"}`}
                    style={{ boxShadow: listening ? "0 0 28px rgba(248,113,113,.5)" : "0 0 22px rgba(56,189,248,.35)" }}>
                    {listening ? "◉" : "🎙"}
                  </button>
                </div>
                {wakeOn && wakeStatus === "listening" && !listening && !speaking && !assist.busy && (
                  <div className="text-center text-[10px] font-mono text-cyan-300/80 pb-1" role="status">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse mr-1.5 align-middle" />
                    wake word armed — say “Hey WorldEye”
                  </div>
                )}
                {err && <div className="mx-4 mb-1 text-[11px] font-mono text-red-300 bg-red-950/60 border border-red-500/30 rounded-lg px-3 py-1">{err}</div>}
                <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-0">
                  {assist.entries.length === 0 && (
                    <p className="text-xs text-slate-500 text-center mt-4">Ask anything — try “take me to Tokyo”.</p>
                  )}
                  {assist.entries.map((e) => e.role === "user" ? (
                    <div key={e.id} className="ml-10 rounded-2xl rounded-br-sm bg-cyan-500/15 border border-cyan-400/20 px-3 py-1.5 text-[13px] text-white">{e.text}</div>
                  ) : (
                    <div key={e.id} className="mr-10 space-y-1">
                      {e.says.map((s, i) => (
                        <div key={i} className="rounded-2xl rounded-bl-sm bg-white/[0.06] border border-white/10 px-3 py-1.5 text-[13px] text-slate-200">{s}</div>
                      ))}
                      {e.actions.map((a, i) => (
                        <div key={i} className="text-[10px] font-mono text-slate-500">
                          ⚙ {a.tool} — <span className={a.status === "ok" ? "text-emerald-400" : a.status === "error" ? "text-red-400" : "text-amber-300"}>{a.status}</span>
                        </div>
                      ))}
                      {e.busy && <div className="text-[11px] font-mono text-cyan-300 animate-pulse">●●●</div>}
                      {e.error && <div className="text-[11px] font-mono text-red-300">{e.error}</div>}
                    </div>
                  ))}
                </div>
                <form className="p-3 border-t border-white/10 flex gap-2"
                  onSubmit={(ev) => { ev.preventDefault(); if (typed.trim()) { sendText(typed.trim()); setTyped(""); } }}>
                  <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type instead…"
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60" />
                  <button className="px-4 py-2 rounded-xl text-sm font-mono font-bold text-[#04121f]"
                    style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}>Send</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
