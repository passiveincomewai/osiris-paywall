"use client";
// Email+password registration. On success we show the "check your inbox"
// state — the account can't sign in until the email is verified.
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Loader2, MailCheck, AlertCircle, UserPlus } from "lucide-react";
import { GoogleIcon } from "@/components/auth/ProviderIcons";
import { trackMetaEvent } from "@/lib/meta-track";
import { markPendingWelcome } from "@/lib/billing/trial-prompt";

export default function SignupForm({ callbackUrl, googleEnabled }: { callbackUrl: string; googleEnabled: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [newsletterOptIn, setNewsletterOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ emailSent: boolean } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, newsletterOptIn }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error ?? "Couldn't create the account. Try again.");
        setBusy(false);
        return;
      }
      // Browser twin of the server's Conversions API CompleteRegistration
      // — the route generated the event id and sent its copy already;
      // firing ours with the same id lets Meta deduplicate the pair.
      if (typeof data.metaEventId === "string") {
        trackMetaEvent("CompleteRegistration", {}, data.metaEventId);
      }
      // Wave 2 F3: flag this device so the trial welcome prompt greets
      // the new account at its first signed-in page view (after the
      // verification link brings them back).
      markPendingWelcome();
      setDone({ emailSent: !!data.emailSent });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  async function resend() {
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <MailCheck className="w-12 h-12 text-[#D4AF37] mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Check your inbox</h2>
        <p className="text-sm text-white/55 leading-relaxed mb-6">
          We sent a verification link to <span className="text-white/85 font-medium">{email}</span>.
          Click it to activate your account, then sign in.
          {done.emailSent === false && (
            <span className="block mt-2 text-amber-200/80">
              Email delivery isn't configured on this server yet — contact support to activate your account.
            </span>
          )}
        </p>
        <button
          onClick={resend}
          className="text-sm text-[#D4AF37] font-semibold hover:brightness-110 transition underline"
        >
          Didn't get it? Resend the link
        </button>
        <div className="mt-6 text-sm">
          <Link
            href={`/signin${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
            className="text-white/45 hover:text-white transition"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40 transition";

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={() => {
              // Wave 2 F3: same welcome flag as the email path — Google
              // signups land signed-in, so the prompt greets them on
              // arrival.
              markPendingWelcome();
              signIn("google", { callbackUrl });
            }}
            className="flex items-center justify-center gap-3 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/[0.07] hover:border-white/20 transition active:scale-[0.99]"
          >
            <GoogleIcon className="w-5 h-5" />
            Continue with Google
          </button>
          <div className="flex items-center gap-4 my-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/35">or with email</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>
        </>
      )}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-400/10 text-red-200 px-4 py-3 text-sm mb-1">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-white/50 uppercase">Name</span>
        <input
          type="text" autoComplete="name" value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ada Lovelace" className={inputCls}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-white/50 uppercase">Email</span>
        <input
          type="email" required autoComplete="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com" className={inputCls}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-white/50 uppercase">Password</span>
        <input
          type="password" required autoComplete="new-password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters" className={inputCls}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold tracking-wide text-white/50 uppercase">Confirm password</span>
        <input
          type="password" required autoComplete="new-password" value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your password" className={inputCls}
        />
      </label>
      <label className="flex items-start gap-3 px-1 cursor-pointer">
        <input
          type="checkbox"
          checked={newsletterOptIn}
          onChange={(e) => setNewsletterOptIn(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#D4AF37]"
        />
        <span className="text-sm text-white/55 leading-snug">
          Email me WorldEye updates — new cameras, features and offers
        </span>
      </label>
      <button
        type="submit" disabled={busy}
        className="mt-1 w-full rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-sm py-3 tracking-wide hover:brightness-110 active:scale-[0.99] disabled:opacity-60 transition flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
        Create account
      </button>
      <p className="text-xs text-white/35 text-center leading-relaxed">
        By creating an account you agree to the <Link href="/terms" className="underline hover:text-white/60">Terms</Link> and{" "}
        <Link href="/privacy" className="underline hover:text-white/60">Privacy Policy</Link>.
      </p>
      <div className="text-sm text-center">
        <Link
          href={`/signin${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
          className="text-white/45 hover:text-white transition"
        >
          Already have an account? <span className="text-[#D4AF37] font-semibold">Sign in</span>
        </Link>
      </div>
    </form>
  );
}
