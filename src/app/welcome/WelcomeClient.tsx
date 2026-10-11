"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, PartyPopper, Check } from "lucide-react";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "form"; email: string; name: string; phone: string }
  | { kind: "done"; email: string };

export default function WelcomeClient() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") ?? "";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
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
    (async () => {
      try {
        const res = await fetch(`/api/checkout/complete?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({ kind: "error", message: data.error || "Couldn't verify your purchase." });
          return;
        }
        setState({ kind: "form", email: data.email, name: data.name ?? "", phone: data.phone ?? "" });
        setUsername(data.name ?? "");
        setPhone(data.phone ?? "");
      } catch {
        if (!cancelled) setState({ kind: "error", message: "Network error. Please try again." });
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (username.trim().length < 2) { setFormError("Username must be at least 2 characters."); return; }
    if (username.trim().length > 32) { setFormError("Username must be under 32 characters."); return; }
    if (phone.replace(/\D/g, "").length < 7 || phone.replace(/\D/g, "").length > 15) { setFormError("Enter a valid phone number."); return; }
    if (password.length < 8) { setFormError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setFormError("Passwords don't match."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/claim-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, username: username.trim(), phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't create your account.");
      setState({ kind: "done", email: data.email });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't create your account.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#00E5FF]/60";
  const labelCls = "block text-xs font-semibold tracking-wider text-white/40 mb-1.5";

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

        {state.kind === "error" && (
          <div className="py-6">
            <p className="text-red-400 text-sm">{state.message}</p>
            <Link href="/pricing" className="inline-block mt-6 text-sm text-[#00E5FF] hover:underline">← Back to pricing</Link>
          </div>
        )}

        {state.kind === "form" && (
          <form onSubmit={submit}>
            <div className="flex items-center gap-2 text-[#D4AF37] mb-2">
              <PartyPopper className="w-5 h-5" />
              <h1 className="text-lg font-bold">You're Pro!</h1>
            </div>
            <p className="text-sm text-white/55 mb-6">
              Payment confirmed for <span className="text-white">{state.email}</span>.
              Create your account below — one step and you're in.
            </p>

            <label className={labelCls}>USERNAME</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`${inputCls} mb-3`}
              placeholder="Pick a username"
              autoComplete="username"
              maxLength={32}
            />
            <label className={labelCls}>PHONE NUMBER</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`${inputCls} mb-3`}
              placeholder="+1 555 000 1234"
              autoComplete="tel"
            />
            <label className={labelCls}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputCls} mb-3`}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
            <label className={labelCls}>CONFIRM PASSWORD</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputCls}
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
              {saving ? "Creating your account…" : "Create my Pro account"}
            </button>
          </form>
        )}

        {state.kind === "done" && (
          <div className="py-4">
            <div className="flex items-center gap-2 text-[#D4AF37] mb-2">
              <Check className="w-5 h-5" />
              <h1 className="text-lg font-bold">Account created!</h1>
            </div>
            <p className="text-sm text-white/55 mb-6">
              Welcome aboard, <span className="text-white">{username || state.email}</span>. Your Pro access is ready.
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
