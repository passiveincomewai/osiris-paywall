"use client";

import { useState } from "react";

// The newsletter form. Subscribing is instant (no confirmation email):
// the API validates the address the moment it is submitted — real
// feedback appears right here: a friendly reason when the address can't
// be accepted, or a "did you mean …?" suggestion with one-tap ways to
// use the corrected address or keep the original.
export default function NewsletterForm({
  source = "footer",
  compact = false,
  onSuccess,
}: {
  source?: string;
  compact?: boolean;
  /** Fired once when a subscribe succeeds (including "already subscribed"). */
  onSuccess?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);

  async function submit(address: string, confirmed = false) {
    if (state === "sending") return;
    setState("sending");
    setMsg("");
    setSuggestion(null);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address, source, ...(confirmed ? { confirmed: true } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setState("done");
        setMsg(data.already ? "You're already subscribed." : "You're subscribed — welcome aboard.");
        onSuccess?.();
      } else if (data.suggestion) {
        // Likely typo: offer the correction, never apply it silently.
        setState("error");
        setMsg(data.error ?? "Did you mean this address?");
        setSuggestion(String(data.suggestion));
      } else {
        setState("error");
        setMsg(data.error ?? "Something went wrong.");
      }
    } catch {
      setState("error");
      setMsg("Something went wrong. Try again.");
    }
  }

  if (state === "done") {
    return <p className="text-sm text-emerald-300/90">{msg}</p>;
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(email);
        }}
        className={compact ? "flex gap-2" : "flex flex-col sm:flex-row gap-3 max-w-md"}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSuggestion(null);
          }}
          placeholder="you@example.com"
          aria-label="Email address"
          className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-[#0096FF]/60"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="px-5 py-2.5 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white text-sm font-semibold transition disabled:opacity-60 whitespace-nowrap"
        >
          {state === "sending" ? "…" : "Subscribe"}
        </button>
      </form>
      {state === "error" && suggestion ? (
        <div className="mt-2 text-xs text-amber-200/90">
          <p>{msg}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail(suggestion);
                void submit(suggestion);
              }}
              className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold text-white transition hover:bg-white/20 disabled:opacity-60"
            >
              Use {suggestion}
            </button>
            <button
              type="button"
              onClick={() => void submit(email, true)}
              className="rounded-lg px-3 py-1.5 text-white/60 underline decoration-white/30 underline-offset-2 transition hover:text-white disabled:opacity-60"
            >
              Keep mine — it&rsquo;s correct
            </button>
          </div>
        </div>
      ) : (
        state === "error" && <p className="mt-2 text-xs text-red-300/90">{msg}</p>
      )}
    </div>
  );
}
