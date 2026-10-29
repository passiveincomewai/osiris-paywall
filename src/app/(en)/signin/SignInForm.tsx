"use client";
// Unified sign-in form: email+password, magic link (if configured), and one
// button per configured OAuth provider. Precise login errors come from our
// /api/auth/login pre-check; the actual session is still created by Auth.js.
import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Apple, Gamepad2, Loader2, Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { GitHubIcon, GoogleIcon, XIcon, FacebookIcon } from "@/components/auth/ProviderIcons";

export type OAuthProvider = { id: string; label: string };

const ICONS: Record<string, (p: { className?: string }) => ReactNode> = {
  github: GitHubIcon,
  google: GoogleIcon,
  apple: Apple,
  discord: Gamepad2,
  twitter: XIcon,
  facebook: FacebookIcon,
};

const ERROR_COPY: Record<string, string> = {
  verify: "That verification link is invalid or has expired. Sign in and request a fresh one in Settings.",
  // Auth.js's own error code for a failed email sign-in link (expired or
  // already-used token). Without this key those users fell through to the
  // generic "Something went wrong signing in." even though the remedy —
  // request a fresh link — is the form directly below.
  Verification: "That sign-in link is invalid or has expired. Request a new one below.",
  OAuthAccountNotLinked:
    "This email is already linked to a different sign-in method. Use the original method to sign in.",
  CredentialsSignin: "Invalid email or password.",
};

export default function SignInForm({
  oauth,
  emailLink,
  callbackUrl,
  status,
}: {
  oauth: OAuthProvider[];
  emailLink: boolean;
  callbackUrl: string;
  status: { verified: boolean; checkEmail: boolean; error?: string };
}) {
  const [tab, setTab] = useState<"password" | "link">(emailLink ? "link" : "password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReactNode | null>(status.error ? ERROR_COPY[status.error] ?? "Something went wrong signing in." : null);
  const [oauthHint, setOauthHint] = useState<string[] | null>(null);

  async function handlePassword(e: FormEvent) {
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
          setError(data.message ?? "This account uses a social sign-in.");
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

  // (The unverified-account branch and its resend button are gone:
  // since 2026-10-29 sign-in doesn't wait for verification, so the
  // login endpoint never returns "unverified". Verification lives in
  // Settings now and unlocks +5 camera checks.)

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn("resend", { email, callbackUrl, redirect: true });
    } catch {
      setError("Couldn't send the link. Try again.");
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/40 transition";

  return (
    <div>
      {status.verified && (
        <Banner tone="ok" icon={<CheckCircle2 className="w-4 h-4" />}>
          Email verified — 5 extra free camera checks unlocked. Sign in below.
        </Banner>
      )}
      {status.checkEmail && (
        <Banner tone="ok" icon={<Mail className="w-4 h-4" />}>
          Check your inbox for the sign-in link.
        </Banner>
      )}
      {error && (
        <Banner tone="error" icon={<AlertCircle className="w-4 h-4" />}>
          {error}
        </Banner>
      )}

      {/* OAuth buttons */}
      {oauth.length > 0 && (
        <>
          <div className="grid gap-2.5">
            {oauth.map((p) => {
              const Icon = ICONS[p.id] ?? Mail;
              const highlighted = oauthHint?.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => signIn(p.id, { callbackUrl })}
                  className={`flex items-center justify-center gap-3 w-full rounded-xl border px-4 py-3 text-sm font-semibold transition active:scale-[0.99] ${
                    highlighted
                      ? "border-[#D4AF37] bg-[#D4AF37]/15 text-white shadow-[0_0_24px_rgba(212,175,55,0.25)]"
                      : "border-white/10 bg-white/[0.04] text-white/85 hover:bg-white/[0.07] hover:border-white/20"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  Continue with {p.label}
                </button>
              );
            })}
          </div>
          <Divider label="or with email" />
        </>
      )}

      {/* Email tabs */}
      <div className="flex rounded-xl bg-white/[0.04] border border-white/10 p-1 mb-5">
        {(emailLink ? (["password", "link"] as const) : (["password"] as const)).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTab(t); setError(null); }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
              tab === t ? "bg-[#D4AF37] text-black" : "text-white/55 hover:text-white"
            }`}
          >
            {t === "password" ? "Password" : "Email link"}
          </button>
        ))}
      </div>

      {tab === "password" ? (
        <form onSubmit={handlePassword} className="grid gap-3">
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
              type="password" required autoComplete="current-password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" className={inputCls}
            />
          </label>
          <button
            type="submit" disabled={busy}
            className="mt-1 w-full rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-sm py-3 tracking-wide hover:brightness-110 active:scale-[0.99] disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Sign in
          </button>
          <div className="flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-white/45 hover:text-[#D4AF37] transition">
              Forgot password?
            </Link>
            <Link
              href={`/signup${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
              className="text-[#D4AF37] font-semibold hover:brightness-110 transition"
            >
              Create account
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleMagicLink} className="grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-white/50 uppercase">Email</span>
            <input
              type="email" required autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" className={inputCls}
            />
          </label>
          <button
            type="submit" disabled={busy}
            className="mt-1 w-full rounded-xl bg-white/[0.06] border border-white/15 text-white font-bold text-sm py-3 tracking-wide hover:bg-white/[0.09] active:scale-[0.99] disabled:opacity-60 transition flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Email me a sign-in link
          </button>
          <p className="text-xs text-white/35 text-center">
            No password needed — we&apos;ll email you a one-time link.
          </p>
          <div className="text-sm text-center">
            <Link
              href={`/signup${callbackUrl !== "/" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
              className="text-[#D4AF37] font-semibold hover:brightness-110 transition"
            >
              New to WorldEye? Create an account
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

function Banner({ tone, icon, children }: { tone: "ok" | "error"; icon: ReactNode; children: ReactNode }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm mb-5 ${
        tone === "ok"
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
          : "border-red-400/30 bg-red-400/10 text-red-200"
      }`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 my-5">
      <div className="h-px flex-1 bg-white/10" />
      <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-white/35">{label}</span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}
