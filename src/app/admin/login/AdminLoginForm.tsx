"use client";
// Dedicated admin sign-in: email+password (with the same /api/auth/login
// pre-check as the public form) plus Continue with Google for admins whose
// accounts are Google-linked. Lands on /admin (or the given admin callback).
import { useState, type FormEvent, type ReactNode } from "react";
import { signIn } from "next-auth/react";
import { Loader2, Lock, AlertCircle, ShieldCheck } from "lucide-react";
import { GoogleIcon } from "@/components/auth/ProviderIcons";

const inputCls =
  "w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#0096FF]/60 focus:ring-1 focus:ring-[#0096FF]/40 transition";

export default function AdminLoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReactNode>(null);
  const [oauthHint, setOauthHint] = useState<string[] | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOauthHint(null);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (data.error === "no_password") {
          setOauthHint(data.providers ?? []);
          setError("This account uses Google sign-in — use the button below.");
        } else {
          setError(data.error ?? "Invalid email or password.");
        }
        setBusy(false);
        return;
      }
      // Pre-check passed — complete the real sign-in through Auth.js.
      await signIn("credentials", { email, password, callbackUrl, redirect: true });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl })}
        className={`flex items-center justify-center gap-3 w-full rounded-xl border px-4 py-3 text-sm font-semibold transition active:scale-[0.99] ${
          oauthHint?.includes("google")
            ? "border-[#0096FF] bg-[#0096FF]/15 text-white shadow-[0_0_24px_rgba(0,150,255,0.25)]"
            : "border-white/10 bg-white/[0.04] text-white/85 hover:bg-white/[0.07] hover:border-white/20"
        }`}
      >
        <GoogleIcon className="w-5 h-5" />
        Continue with Google
      </button>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/35">
          or with credentials
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className="grid gap-3">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-400/10 text-red-200 px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-white/50 uppercase">Email</span>
          <input
            type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com" className={inputCls}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-white/50 uppercase">Password</span>
          <input
            type="password" required autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" className={inputCls}
          />
        </label>
        <button
          type="submit" disabled={busy}
          className="mt-1 w-full rounded-xl bg-gradient-to-b from-[#0aa5ff] to-[#0096FF] text-white font-bold text-sm py-3 tracking-wide hover:brightness-110 active:scale-[0.99] disabled:opacity-60 transition flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Sign in to admin
        </button>
      </form>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/30">
        <Lock className="w-3 h-3" />
        Only addresses in the admin allowlist can enter.
      </p>
    </div>
  );
}
