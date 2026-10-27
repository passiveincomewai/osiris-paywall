"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle, KeyRound } from "lucide-react";

export default function ResetForm({ token, email }: { token: string; email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "Couldn't reset the password. Try again.");
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  if (!token || !email) {
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-400/10 text-red-200 px-4 py-3 text-sm">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>This reset link is invalid. Request a new one from the sign-in page.</span>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Password updated</h2>
        <p className="text-sm text-white/55 mb-6">You can now sign in with your new password.</p>
        <Link
          href="/signin"
          className="inline-block rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-sm px-8 py-3 tracking-wide hover:brightness-110 transition"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40 transition";

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-400/10 text-red-200 px-4 py-3 text-sm mb-1">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-white/50 uppercase">New password</span>
        <input
          type="password" required autoComplete="new-password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters" className={inputCls}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-white/50 uppercase">Confirm new password</span>
        <input
          type="password" required autoComplete="new-password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your new password" className={inputCls}
        />
      </label>
      <button
        type="submit" disabled={busy}
        className="mt-1 w-full rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-sm py-3 tracking-wide hover:brightness-110 active:scale-[0.99] disabled:opacity-60 transition flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
        Set new password
      </button>
    </form>
  );
}
