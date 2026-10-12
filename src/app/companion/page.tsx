"use client";
/**
 * WorldEye Companion — the humanoid (Phase 1). All new files; nothing existing touched.
 *
 * Voice-driven avatar wired to the existing OI assist agent: push-to-talk,
 * spoken replies, audio-reactive particles, and map tool calls routed over
 * a BroadcastChannel (executed when the main globe tab is open — Phase 3
 * adds the in-page listener).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import HumanoidAvatar, { type AvatarState } from "@/components/companion/HumanoidAvatar";
import { listenOnce, speak, stopSpeaking, sttSupported } from "@/lib/companion/voice";
import { companionSite, isGlobeLinked } from "@/lib/companion/site-bridge";
import { useAssist } from "@/lib/oi/assist/client";
import { loadEngine, loadKey, saveEngine, saveKey } from "@/lib/oi/client";
import { PROVIDERS, type ProviderId } from "@/lib/oi/providers";

export default function CompanionPage() {
  const energyRef = useRef(0);
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [typed, setTyped] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [provider, setProvider] = useState<ProviderId>("openai");
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [globeLinked, setGlobeLinked] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const auth = useMemo(() => {
    const engine = loadEngine();
    if (!engine) return null;
    const key = loadKey(engine.provider);
    return key ? { engine, key } : null;
  }, [hasKey]);

  useEffect(() => {
    setHasKey(!!auth);
    if (auth) setProvider(auth.engine.provider as ProviderId);
  }, [auth]);

  useEffect(() => {
    const iv = setInterval(() => setGlobeLinked(isGlobeLinked()), 2000);
    return () => clearInterval(iv);
  }, []);

  const assist = useAssist({
    site: useMemo(() => companionSite(), []),
    startForecast: async () => ({ ok: false as const, error: "Forecasts live on the main site — ask me there." }),
    forecastSummary: () => null,
    onReply: (text) => {
      const clean = text.replace(/^- /gm, "").replace(/\s+/g, " ").trim().slice(0, 600);
      if (!clean) return;
      setSpeaking(true);
      setAvatarState("speaking");
      void speak(clean, energyRef).finally(() => {
        setSpeaking(false);
        setAvatarState("idle");
      });
    },
  });

  useEffect(() => {
    if (assist.busy) setAvatarState("thinking");
    else if (!speaking && !listening) setAvatarState("idle");
  }, [assist.busy, speaking, listening]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [assist.entries]);

  const sendText = useCallback(async (text: string) => {
    if (!auth || assist.busy) return;
    setErr(null);
    stopSpeaking();
    // Tell the model whether it can actually drive the globe right now.
    const prefix = globeLinked
      ? ""
      : "[The main globe tab is not open, so map-driving tools will fail. If the user asks to move the map or open cameras, tell them to open worldeye.app in another tab first.]\n";
    assist.send(prefix + text, "auto", auth);
  }, [auth, assist, globeLinked]);

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
      void sendText(text);
    } catch (e) {
      setListening(false);
      setAvatarState("idle");
      setErr(e instanceof Error ? e.message : "Listening failed");
    }
  }, [listening, assist.busy, speaking, sendText]);

  const saveKeyNow = () => {
    const k = keyInput.trim();
    if (!k) return;
    saveKey(provider, k, true);
    saveEngine({ provider, model: "default", remember: true });
    setKeyInput("");
    setHasKey(true);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "radial-gradient(1200px 800px at 50% 20%, #071224 0%, #03060d 70%)" }}>
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <img src="/worldeye-eye.png" alt="WorldEye" className="h-7 w-auto" />
          <span className="font-wordmark text-white text-sm">World<span className="text-[#0096FF]">Eye</span> <span className="text-slate-400">Companion</span></span>
        </Link>
        <div className={`text-[10px] font-mono px-2 py-1 rounded-full border ${globeLinked ? "border-emerald-400/40 text-emerald-300" : "border-white/15 text-slate-500"}`}>
          {globeLinked ? "● GLOBE LINKED" : "○ GLOBE NOT OPEN"}
        </div>
      </header>

      {hasKey === false ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
            <div className="text-3xl mb-3">👁️</div>
            <h1 className="text-white font-bold text-lg">Wake the companion</h1>
            <p className="text-sm text-slate-400 mt-2">It uses your own AI key — the same one as OI Assist on the main site. Stored only in this browser.</p>
            <select value={provider} onChange={(e) => setProvider(e.target.value as ProviderId)}
              className="mt-4 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm">
              {PROVIDERS.filter((p) => p.id !== "demo").map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="API key"
              className="mt-2 w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60" />
            <button onClick={saveKeyNow} className="mt-3 w-full py-2.5 rounded-xl font-mono font-bold text-[#04121f]"
              style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}>
              Activate
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Avatar stage */}
          <div className="relative flex-1 min-h-[42vh] md:min-h-0">
            <HumanoidAvatar state={avatarState} energyRef={energyRef} className="absolute inset-0" />
            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-3">
              <div className="text-xs font-mono tracking-[0.3em] text-cyan-300/80 uppercase">
                {listening ? "listening…" : assist.busy ? "thinking…" : speaking ? "speaking…" : "idle"}
              </div>
              <button
                onClick={talk}
                disabled={assist.busy || speaking}
                className={`w-20 h-20 rounded-full border-2 font-mono text-2xl transition-all disabled:opacity-40 ${listening ? "border-red-400 bg-red-500/20 scale-110" : "border-cyan-400/60 bg-cyan-400/10 hover:scale-105"}`}
                style={{ boxShadow: listening ? "0 0 40px rgba(248,113,113,.5)" : "0 0 30px rgba(56,189,248,.35)" }}
                aria-label="Talk">
                {listening ? "◉" : "🎙"}
              </button>
              {err && <div className="text-xs font-mono text-red-300 bg-red-950/60 border border-red-500/30 rounded-lg px-3 py-1">{err}</div>}
            </div>
          </div>
          {/* Transcript */}
          <div className="md:w-[380px] border-t md:border-t-0 md:border-l border-white/10 flex flex-col min-h-0">
            <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[24vh]">
              {assist.entries.length === 0 && (
                <p className="text-sm text-slate-500 text-center mt-8">Tap the mic and ask anything.<br />Try "take me to Tokyo" with the globe open.</p>
              )}
              {assist.entries.map((e) => e.role === "user" ? (
                <div key={e.id} className="ml-8 rounded-2xl rounded-br-sm bg-cyan-500/15 border border-cyan-400/20 px-3 py-2 text-sm text-white">{e.text}</div>
              ) : (
                <div key={e.id} className="mr-8 space-y-1">
                  {e.says.map((s, i) => (
                    <div key={i} className="rounded-2xl rounded-bl-sm bg-white/[0.06] border border-white/10 px-3 py-2 text-sm text-slate-200">{s}</div>
                  ))}
                  {e.actions.map((a, i) => (
                    <div key={i} className="text-[11px] font-mono text-slate-500">
                      ⚙ {a.tool} — <span className={a.status === "ok" ? "text-emerald-400" : a.status === "error" ? "text-red-400" : "text-amber-300"}>{a.status}</span>
                      {a.summary ? ` · ${a.summary.slice(0, 80)}` : ""}
                    </div>
                  ))}
                  {e.busy && <div className="text-xs font-mono text-cyan-300 animate-pulse">●●●</div>}
                  {e.error && <div className="text-xs font-mono text-red-300">{e.error}</div>}
                </div>
              ))}
            </div>
            <form className="p-3 border-t border-white/10 flex gap-2"
              onSubmit={(ev) => { ev.preventDefault(); if (typed.trim()) { void sendText(typed.trim()); setTyped(""); } }}>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Type instead…"
                className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60" />
              <button className="px-4 py-2 rounded-xl text-sm font-mono font-bold text-[#04121f]"
                style={{ background: "linear-gradient(135deg,#38bdf8,#0096FF)" }}>Send</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
