"use client";

// ── One-time set-your-name prompt (name rules) ──────────────────────
// Accounts created before usernames were required — or via Google,
// whose profile names contain spaces — may hold a name that fails the
// username rules. They get this prompt after sign-in: set a valid
// username once and it never appears again. It is dismissible for the
// session and NEVER blocks billing or subscription pages.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { isValidUsername, usernameValidationError } from "@/lib/account/names";

const DISMISS_KEY = "we_setname_dismissed";
// Never on billing/subscription surfaces (rule: never lock them out).
const HIDDEN_PREFIXES = ["/settings/subscription", "/pricing", "/checkout", "/api"];

export default function SetNamePrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pathname || HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch { /* ignore */ }
    if (dismissed) return;
    let live = true;
    (async () => {
      try {
        const r = await fetch("/api/user/profile", { cache: "no-store" });
        if (!r.ok) return; // signed out — nothing to prompt
        const d = await r.json();
        if (live && !isValidUsername(d.name)) setVisible(true);
      } catch { /* best-effort */ }
    })();
    return () => {
      live = false;
    };
  }, [pathname]);

  if (!visible) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch { /* ignore */ }
    setVisible(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = usernameValidationError(value);
    if (err) {
      setError(err);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save your username.");
      setVisible(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your username.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[1400] w-[min(480px,calc(100vw-2rem))] rounded-2xl border border-[#D4AF37]/40 bg-[#0a0e17]/97 backdrop-blur-xl shadow-2xl p-5">
      <button onClick={dismiss} aria-label="Not now" className="absolute top-3 right-3 text-white/40 hover:text-white transition">
        <X className="w-4 h-4" />
      </button>
      <h2 className="text-sm font-bold mb-1">Pick your username</h2>
      <p className="text-xs text-white/55 leading-relaxed mb-3">
        WorldEye accounts need a username — it's how you appear on leaderboards and across the site. Letters, numbers, _ or -, no spaces.
      </p>
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. sky_watcher7"
          autoComplete="username"
          className="flex-1 min-w-0 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-sm outline-none focus:border-[#00E5FF]/60"
        />
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
