"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { Loader2, ShieldCheck } from "lucide-react";

export default function TotpChallengeClient() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/settings";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/totp/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "That code didn't match — try again.");
      // Refresh the session so the jwt callback sees the proof cookie
      // and flips totpVerified BEFORE we navigate — otherwise the
      // middleware would bounce us straight back here on the old token.
      await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
      window.location.assign(callbackUrl.startsWith("/") ? callbackUrl : "/settings");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't match — try again.");
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-7">
      <div className="flex items-center gap-2.5 mb-2">
        <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
        <h1 className="text-lg font-bold">Two-factor check</h1>
      </div>
      <p className="text-sm text-white/55 leading-relaxed mb-5">
        Enter the 6-digit code from your authenticator app — or one of your backup codes if you've lost access to it.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          autoComplete="one-time-code"
          inputMode="text"
          autoFocus
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center text-lg tracking-[0.3em] outline-none focus:border-[#00E5FF]/60"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="w-full px-5 py-3 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Verify"}
        </button>
      </form>
      <button
        onClick={() => signOut({ callbackUrl: "/signin" })}
        className="mt-5 w-full text-center text-xs font-semibold text-white/45 hover:text-white transition"
      >
        Sign out instead
      </button>
    </div>
  );
}
