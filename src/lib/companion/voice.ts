"use client";
/**
 * WorldEye Companion — browser voice I/O (Phase 1). Additive only.
 * STT via Web Speech API; TTS via speechSynthesis with an energy tap so the
 * avatar pulses while speaking. Graceful degradation everywhere.
 */

export function sttSupported(): boolean {
  return typeof window !== "undefined" &&
    !!((window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition ||
       (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition);
}

/** One-shot speech recognition. Resolves with the transcript. */
export function listenOnce(opts?: { lang?: string; timeoutMs?: number }): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { reject(new Error("Speech recognition not supported in this browser")); return; }
    const rec: SpeechRecognitionLike = new Ctor();
    rec.lang = opts?.lang ?? "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let done = false;
    const finish = (fn: () => void) => { if (!done) { done = true; try { rec.stop(); } catch {} fn(); } };
    const timer = setTimeout(() => finish(() => reject(new Error("Listening timed out"))), opts?.timeoutMs ?? 15000);
    rec.onresult = (e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => {
      const text = e.results[0]?.[0]?.transcript?.trim() ?? "";
      clearTimeout(timer);
      finish(() => (text ? resolve(text) : reject(new Error("Didn't catch that"))));
    };
    rec.onerror = (e: { error?: string }) => {
      clearTimeout(timer);
      finish(() => reject(new Error(e.error === "not-allowed" ? "Microphone blocked — allow mic access and try again" : `Recognition error: ${e.error ?? "unknown"}`)));
    };
    rec.onend = () => { clearTimeout(timer); finish(() => reject(new Error("Didn't catch that"))); };
    try { rec.start(); } catch (err) { clearTimeout(timer); reject(err instanceof Error ? err : new Error("Could not start listening")); }
  });
}

interface SpeechRecognitionLike {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const vs = window.speechSynthesis.getVoices();
  if (!vs.length) return null;
  const pref = [
    /Google US English/i, /Samantha/i, /Aria/i, /Jenny/i, /en-US/i, /English/i,
  ];
  for (const re of pref) {
    const v = vs.find((x) => re.test(x.name) && /en/i.test(x.lang));
    if (v) return v;
  }
  return vs.find((x) => /en/i.test(x.lang)) ?? vs[0] ?? null;
}

/**
 * Speak text. Drives `energyRef` (0..1) with a pseudo-envelope so the avatar
 * pulses while talking. Resolves when done.
 */
export function speak(
  text: string,
  energyRef: React.MutableRefObject<number>,
  opts?: { rate?: number; onDone?: () => void },
): Promise<void> {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) { opts?.onDone?.(); resolve(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = opts?.rate ?? 1.02;
    u.pitch = 0.9;
    let iv: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (iv) clearInterval(iv);
      energyRef.current = 0;
      opts?.onDone?.(); resolve();
    };
    // pseudo-envelope: energy follows syllable-ish rhythm while speaking
    let t = 0;
    iv = setInterval(() => {
      t += 0.09;
      energyRef.current = window.speechSynthesis.speaking
        ? 0.35 + 0.4 * Math.abs(Math.sin(t * 2.1)) * Math.abs(Math.sin(t * 0.7))
        : 0;
    }, 90);
    u.onend = stop; u.onerror = stop;
    // some browsers need voices loaded; nudge once
    if (!window.speechSynthesis.getVoices().length) {
      window.speechSynthesis.onvoiceschanged = () => { const nv = pickVoice(); if (nv) u.voice = nv; };
    }
    window.speechSynthesis.speak(u);
    // safety: never hang longer than 60s
    setTimeout(() => { if (window.speechSynthesis.speaking) window.speechSynthesis.cancel(); stop(); }, 60000);
  });
}

export function stopSpeaking() {
  try { window.speechSynthesis?.cancel(); } catch {}
}
