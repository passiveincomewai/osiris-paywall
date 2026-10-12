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
            className="relative w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl border border-white/10 overflow-hidden flex flex-col"
            style={{
              height: "min(78vh, 640px)",
              background: "radial-gradient(1000px 600px at 50% 0%, #0a1628 0%, #04070d 70%)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}>
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-300/80 uppercase">Companion</div>
              <button onClick={() => setOpen(false)} aria-label="Close"
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-slate-300 text-sm">✕</button>
            </div>

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
                <div className="relative h-44 shrink-0">
                  <HumanoidAvatar state={avatarState} energyRef={energyRef} density={0.5} className="absolute inset-0" />
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
