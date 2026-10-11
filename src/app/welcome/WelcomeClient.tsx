"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Lock, PartyPopper } from "lucide-react";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "waiting"; email: string }
  | { kind: "set-password"; email: string }
  | { kind: "has-password"; email: string }
  | { kind: "done"; email: string };

export default function WelcomeClient() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") ?? "";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setState({ kind: "error", message: "Missing checkout session." });
      return;
    }
    let cancelled = false;
    let attempts = 0;
    async function check() {
      attempts++;
      try {
        const res = await fetch(`/api/checkout/complete?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({ kind: "error", message: data.error || "Couldn't verify your purchase." });
          return;
        }
        if (data.hasPassword === null) {
          // Webhook hasn't created the account yet — poll briefly.
          if (attempts < 10) {
            setState({ kind: "waiting", email: data.email });
            setTimeout(check, 3000);
          } else {
            setState({ kind: "error", message: "Your account is taking longer than expected. Check your email for the claim link, or try again in a minute." });
          }
          return;
        }
        setState(data.hasPassword ? { kind: "has-password", email: data.email } : { kind: "set-password", email: data.email });
      } catch {
        if (!cancelled) setState({ kind: "error", message: "Network error. Please try again." });
      }
    }
    check();
    return () => { cancelled = true; };
  }, [sessionId]);

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (password.length < 8) { setFormError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setFormError("Passwords don't match."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/claim-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't set your password.");
      setState({ kind: "done", email: data.email });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't set your password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05070d] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src="/worldeye-eye.png" alt="WorldEye" className="h-9 w-auto" />
          <span className="text-xl font-bold tracking-tight">World<span className="text-[#00E5FF]">Eye</span> <span className="text-[#D4AF37]">PRO</span></span>
        </div>

        {state.kind === "loading" && (
          <div className="flex flex-col items-center py-10 text-white/60">
            <Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" />
            <p className="mt-4 text-sm">Confirming your purchase…</p>
          </div>
        )}

        {state.kind === "waiting" && (
          <div className="flex flex-col items-center py-10 text-white/60">
            <Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" />
            <p className="mt-4 text-sm text-center">Payment confirmed for <span className="text-white">{state.email}</span>.<br />Setting up your account…</p>
          </div>
        )}

        {state.kind === "error" && (
          <div className="py-6">
            <p className="text-red-400 text-sm">{state.message}</p>
            <Link href="/pricing" className="inline-block mt-6 text-sm text-[#00E5FF] hover:underline">← Back to pricing</Link>
          </div>
        )}

        {state.kind === "set-password" && (
          <form onSubmit={claim}>
            <div className="flex items-center gap-2 text-[#D4AF37] mb-2">
              <PartyPopper className="w-5 h-5" />
              <h1 className="text-lg font-bold">You're Pro!</h1>
            </div>
            <p className="text-sm text-white/55 mb-6">
              Payment confirmed for <span className="text-white">{state.email}</span>.
              Set a password to claim your account — one step and you're in.
            </p>
            <label className="block text-xs font-semibold tracking-wider text-white/40 mb-1.5">PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#00E5FF]/60 mb-3"
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <label className="block text-xs font-semibold tracking-wider text-white/40 mb-1.5">CONFIRM PASSWORD</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#00E5FF]/60"
              placeholder="Repeat your password"
              autoComplete="new-password"
            />
            {formError && <p className="text-red-400 text-sm mt-3">{formError}</p>}
            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold tracking-wide hover:brightness-110 disabled:opacity-60 transition flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-4 h-4" />}
              {saving ? "Creating your account…" : "Claim my Pro account"}
            </button>
          </form>
        )}

        {state.kind === "has-password" && (
          <div className="py-4">
            <div className="flex items-center gap-2 text-[#D4AF37] mb-2">
              <Check className="w-5 h-5" />
              <h1 className="text-lg font-bold">Pro is active</h1>
            </div>
            <p className="text-sm text-white/55 mb-6">
              Your subscription is linked to <span className="text-white">{state.email}</span>.
              Sign in to start exploring.
            </p>
            <Link
              href="/signin"
              className="block text-center w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold tracking-wide hover:brightness-110 transition"
            >
              Sign in
            </Link>
          </div>
        )}

        {state.kind === "done" && (
          <div className="py-4">
            <div className="flex items-center gap-2 text-[#D4AF37] mb-2">
              <Check className="w-5 h-5" />
              <h1 className="text-lg font-bold">Account claimed!</h1>
            </div>
            <p className="text-sm text-white/55 mb-6">
              Your Pro account for <span className="text-white">{state.email}</span> is ready.
            </p>
            <Link
              href="/signin"
              className="block text-center w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold tracking-wide hover:brightness-110 transition"
            >
              Sign in to WorldEye
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
