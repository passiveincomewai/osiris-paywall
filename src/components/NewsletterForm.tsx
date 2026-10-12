"use client";

import { useState } from "react";

export default function NewsletterForm({ source = "footer", compact = false }: { source?: string; compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setMsg("");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setState("done");
        setMsg(data.already ? "You're already subscribed." : "Check your inbox to confirm your subscription.");
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
    <form onSubmit={submit} className={compact ? "flex gap-2" : "flex flex-col sm:flex-row gap-3 max-w-md"}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        aria-label="Email address"
        className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#0096FF]/60"
      />
      <button
        type="submit"
        disabled={state === "sending"}
        className="px-5 py-2.5 rounded-xl bg-[#0096FF] hover:bg-[#0aa5ff] text-white text-sm font-semibold transition disabled:opacity-60 whitespace-nowrap"
      >
        {state === "sending" ? "…" : "Subscribe"}
      </button>
      {state === "error" && <p className="text-xs text-red-300/90 sm:basis-full">{msg}</p>}
    </form>
  );
}
