"use client";
/**
 * WorldEye Companion — wake word (Phase 4). Additive only.
 *
 * Continuously listens (while armed) for one of the wake phrases below and
 * fires `onWake` so the widget can hand off to the normal one-shot
 * conversation path — there is no second state machine here.
 *
 * Data flow, stated plainly: recognition runs through the browser's Web
 * Speech API. On Chrome that means the *browser vendor's* speech service
 * processes the audio (it is NOT on-device there); on Safari it may be
 * handled by Apple's service or on-device depending on OS settings.
 * WorldEye's own servers never receive, record, or store any audio — this
 * module only ever sees transcript text, and discards everything that
 * isn't a wake-phrase match.
 */

export function wakeWordSupported(): boolean {
  return typeof window !== "undefined" &&
    !!((window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition ||
       (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition);
}

/**
 * The accepted wake phrases, matched against the normalized transcript
 * (see normalizeTranscript). Deliberately small and specific:
 *  - "hey worldeye"   — primary
 *  - "hey world eye"  — recognizers often split the brand into two words
 *  - "ok worldeye"    — familiar assistant-style variant
 * Anything looser (e.g. "hey world") collides with ordinary speech, so it
 * is intentionally NOT accepted.
 */
export const WAKE_PHRASES: readonly string[] = [
  "hey worldeye",
  "hey world eye",
  "ok worldeye",
];

/** Lowercase, strip punctuation, collapse whitespace — the matcher's input form. */
export function normalizeTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pure wake-phrase matcher. True when any accepted phrase appears in the
 * transcript as whole words (padding prevents matching inside larger
 * words, e.g. "hey worldeyes" does not trigger). Case- and
 * punctuation-insensitive via normalizeTranscript.
 */
export function matchWakeWord(transcript: string): boolean {
  if (!transcript) return false;
  const padded = ` ${normalizeTranscript(transcript)} `;
  if (padded === "  ") return false;
  return WAKE_PHRASES.some((p) => padded.includes(` ${p} `));
}

interface WakeResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; [j: number]: { transcript: string } | undefined }>;
}

interface WakeRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: WakeResultEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export type WakeStatus = "listening" | "denied" | "unsupported" | "error";

export interface WakeWordHandle {
  stop(): void;
}

/** Sessions shorter than this count as "died instantly" (e.g. iOS Safari quirks). */
const QUICK_FAIL_MS = 400;
/** Give up after this many consecutive instant deaths instead of looping forever. */
const MAX_QUICK_FAILS = 6;

/**
 * Start continuous wake-word listening. Returns a handle whose stop() is
 * idempotent. Recognition restarts itself after `onend` with exponential
 * backoff for as long as the listener stays armed; it disarms permanently
 * on permission denial, on a wake match (handoff), or when stop() is
 * called.
 */
export function startWakeWordListener(opts: {
  onWake: () => void;
  onStatus?: (status: WakeStatus, detail?: string) => void;
  lang?: string;
}): WakeWordHandle {
  const w = window as unknown as {
    SpeechRecognition?: new () => WakeRecognitionLike;
    webkitSpeechRecognition?: new () => WakeRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) {
    opts.onStatus?.("unsupported");
    return { stop() {} };
  }

  let armed = true;
  let rec: WakeRecognitionLike | null = null;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;
  let backoffAttempt = 0;
  let quickFails = 0;
  let startedAt = 0;

  const clearTimer = () => {
    if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
  };

  const disarm = () => {
    armed = false;
    clearTimer();
    if (rec) { try { rec.abort(); } catch {} rec = null; }
  };

  const scheduleRestart = () => {
    if (!armed) return;
    clearTimer();
    const delay = Math.min(4000, 300 * 2 ** backoffAttempt);
    backoffAttempt = Math.min(backoffAttempt + 1, 5);
    restartTimer = setTimeout(launch, delay);
  };

  const launch = () => {
    if (!armed) return;
    let instance: WakeRecognitionLike;
    try {
      instance = new Ctor();
    } catch {
      scheduleRestart();
      return;
    }
    rec = instance;
    instance.lang = opts.lang ?? "en-US";
    instance.interimResults = true;
    instance.continuous = true;
    instance.maxAlternatives = 1;

    instance.onstart = () => { startedAt = Date.now(); };
    instance.onresult = (e) => {
      // A live session that produces results is healthy: reset backoff.
      backoffAttempt = 0;
      quickFails = 0;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const alt = e.results[i]?.[0];
        if (alt?.transcript && matchWakeWord(alt.transcript)) {
          disarm();
          opts.onWake();
          return;
        }
      }
    };
    instance.onerror = (e) => {
      const err = e.error ?? "";
      if (err === "not-allowed" || err === "service-not-allowed") {
        disarm();
        opts.onStatus?.("denied", "Microphone access was denied");
      }
      // Every other error is followed by onend, which owns the restart.
    };
    instance.onend = () => {
      if (rec === instance) rec = null;
      if (!armed) return;
      const lived = startedAt ? Date.now() - startedAt : QUICK_FAIL_MS + 1;
      startedAt = 0;
      if (lived < QUICK_FAIL_MS) {
        quickFails += 1;
        if (quickFails >= MAX_QUICK_FAILS) {
          disarm();
          opts.onStatus?.("error", "Wake word keeps stopping in this browser — tap the mic instead");
          return;
        }
      } else {
        quickFails = 0;
      }
      scheduleRestart();
    };

    startedAt = 0;
    try {
      instance.start();
      opts.onStatus?.("listening");
    } catch {
      // Already-started / transient start failures retry via backoff.
      scheduleRestart();
    }
  };

  launch();

  return {
    stop() {
      if (!armed && !rec) return;
      disarm();
    },
  };
}
