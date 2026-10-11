"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, MailCheck, AlertCircle, KeyRound } from "lucide-react";

export default function ForgotForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "Couldn't send the email. Try again.");
        setBusy(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center py-4">
        <MailCheck className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Check your inbox</h2>
        <p className="text-sm text-white/55 leading-relaxed">
          If an account exists for <span className="text-white/85 font-medium">{email}</span>, a reset
          link is on its way. It expires in 1 hour.
        </p>
        <div className="mt-6 text-sm">
          <Link href="/signin" className="text-white/45 hover:text-white transition">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-400/10 text-red-200 px-4 py-3 text-sm mb-1">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-white/50 uppercase">Email</span>
        <input
          type="email" required autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40 transition"
        />
      </label>
      <button
        type="submit" disabled={busy}
        className="mt-1 w-full rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-sm py-3 tracking-wide hover:brightness-110 active:scale-[0.99] disabled:opacity-60 transition flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
        Send reset link
      </button>
      <div className="text-sm text-center">
        <Link href="/signin" className="text-white/45 hover:text-white transition">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}
