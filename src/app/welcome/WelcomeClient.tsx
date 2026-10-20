"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Loader2, Lock, PartyPopper, Check } from "lucide-react";
import { readLastCamera, lastCameraHref, type LastCamera } from "@/lib/camera-share";
import { formatTrialEnd } from "@/lib/billing/trial-reminders";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "form";
      email: string;
      /** What they bought, from /api/checkout/complete — a trial user has
       *  NOT been charged yet, and this page must not claim otherwise. */
      plan: string | null;
      trialEndsAt: string | null;
      chargeLabel: string | null;
      /** The purchase email already had an account before this checkout
       *  (the purchase is linked to it server-side by email). */
      existingAccount: boolean;
      hasPassword: boolean;
    }
  | { kind: "done"; email: string };

/** What Pro unlocks, in /pricing's own words (its compare table). */
const UNLOCKED = [
  "Unlimited cameras on the live globe",
  "OI AI Assistant",
  "Satellite imagery view",
  "Live traffic layer",
  "Advanced search filters",
  "OSINT toolkit",
  "Premium intel feeds",
  "Camera Recording Studio",
];

const PLAN_NAMES: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  annual: "Annual",
  enterprise: "Enterprise",
};

function planName(plan: string | null): string | null {
  if (!plan) return null;
  return PLAN_NAMES[plan] ?? plan.charAt(0).toUpperCase() + plan.slice(1);
}

function trialEndLabel(iso: string): string {
  return formatTrialEnd(Math.floor(new Date(iso).getTime() / 1000));
}

/* ------------------------------------------------------------------ */
/* Claim form values + validation — the same rules the claim API       */
/* enforces (src/lib/password-auth.ts), checked here first so a        */
/* mistake flags the field it belongs to instead of costing a round    */
/* trip and a lost form.                                               */
/* ------------------------------------------------------------------ */

export interface ClaimValues {
  username: string;
  phone: string;
  password: string;
  confirm: string;
}

export type ClaimErrors = Partial<Record<keyof ClaimValues, string>>;

export function validateClaimForm(v: ClaimValues): ClaimErrors {
  const errors: ClaimErrors = {};
  const name = v.username.trim();
  if (name.length < 2) errors.username = "Username must be at least 2 characters.";
  else if (name.length > 32) errors.username = "Username must be under 32 characters.";
  const digits = v.phone.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) errors.phone = "Enter a valid phone number.";
  if (v.password.length < 8) errors.password = "Password must be at least 8 characters.";
  else if (v.password.length > 128) errors.password = "Password must be under 128 characters.";
  if (v.password !== v.confirm) errors.confirm = "Passwords don't match.";
  return errors;
}

/* ------------------------------------------------------------------ */
/* "What happens next" — the completion facts as clear steps, not      */
/* one dense paragraph. Every figure comes from /api/checkout/complete */
/* (the live subscription), never restated from memory.                */
/* ------------------------------------------------------------------ */

export function WelcomeNextSteps({
  email,
  plan,
  trialEndsAt,
  chargeLabel,
}: {
  email: string;
  plan: string | null;
  trialEndsAt: string | null;
  chargeLabel: string | null;
}) {
  const name = planName(plan);
  const steps: { title: string; body: string }[] = trialEndsAt
    ? [
        {
          title: `Your ${name ? `${name} ` : ""}free trial is on`,
          body: `Running for ${email} — no charge until ${trialEndLabel(trialEndsAt)}.`,
        },
        {
          title: "We email you before the first charge",
          body: "A reminder lands in your inbox ahead of the trial ending, so the first charge never comes as a surprise.",
        },
        ...(chargeLabel
          ? [
              {
                title: `First charge: ${chargeLabel}`,
                body: `On ${trialEndLabel(trialEndsAt)}, unless you cancel before then.`,
              },
            ]
          : []),
        {
          title: "Covered by a 7-day money-back guarantee",
          body: "Email us within 7 days of that first charge for a full refund, no questions asked.",
        },
      ]
    : [
        {
          title: "Payment confirmed",
          body: `Your ${name ?? "Pro"} plan is active for ${email}${chargeLabel ? ` — ${chargeLabel}` : ""}.`,
        },
        {
          title: "One step left",
          body: "Set a password below and you're signed in — no second checkout, no extra charge.",
        },
        {
          title: "You're in control",
          body: "Manage or cancel your subscription anytime in Settings.",
        },
        {
          title: "Covered by a 7-day money-back guarantee",
          body: "Email us within 7 days of this charge for a full refund, no questions asked.",
        },
      ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 mb-6">
      <p className="text-xs font-semibold tracking-wider text-white/40 mb-3">WHAT HAPPENS NEXT</p>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[11px] font-bold text-[#D4AF37]">
              {i + 1}
            </span>
            <span className="text-sm">
              <span className="font-semibold text-white">{s.title}</span>
              <span className="block text-white/55">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The claim form itself. A real <form> with a real submit button —    */
/* Enter works, and the button is sticky at the bottom of the card     */
/* on small screens so it can never sit below the fold unnoticed.      */
/* Field rules are printed under each field UP FRONT; validation       */
/* errors land on the field they belong to.                            */
/* ------------------------------------------------------------------ */

export function ClaimFormView({
  existingAccount,
  hasPassword,
  values,
  errors,
  serverError,
  saving,
  onChange,
  onSubmit,
}: {
  existingAccount: boolean;
  hasPassword: boolean;
  values: ClaimValues;
  errors: ClaimErrors;
  serverError: string | null;
  saving: boolean;
  onChange: (field: keyof ClaimValues, value: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  const inputCls =
    "w-full rounded-xl bg-white/5 border px-4 py-3 text-sm outline-none focus:border-[#00E5FF]/60";
  const borderCls = (bad?: string) => (bad ? "border-red-400/60" : "border-white/10");
  const labelCls = "block text-xs font-semibold tracking-wider text-white/40 mb-1.5";
  const hintCls = "text-xs text-white/35 mt-1.5";
  const errCls = "text-red-400 text-xs mt-1.5";

  const field = (
    key: keyof ClaimValues,
    label: ReactNode,
    hint: string,
    input: ReactNode,
  ) => (
    <div className="mb-4">
      <label className={labelCls} htmlFor={`claim-${key}`}>
        {label}
      </label>
      {input}
      {errors[key] ? (
        <p id={`claim-${key}-error`} role="alert" className={errCls}>
          {errors[key]}
        </p>
      ) : (
        <p id={`claim-${key}-hint`} className={hintCls}>
          {hint}
        </p>
      )}
    </div>
  );

  const describedBy = (key: keyof ClaimValues) =>
    errors[key] ? `claim-${key}-error` : `claim-${key}-hint`;

  return (
    <form onSubmit={onSubmit} noValidate>
      {existingAccount && (
        <div className="rounded-2xl border border-[#00E5FF]/25 bg-[#00E5FF]/[0.06] p-4 mb-5">
          <p className="text-sm font-semibold text-white">This email already has a WorldEye account</p>
          <p className="text-sm text-white/60 mt-1">
            Your purchase is already linked to that account —{" "}
            {hasPassword
              ? "sign in and Pro is on. The form below just updates your display name, phone, and password."
              : "you usually sign in with Google, and Pro is already on. The form below adds a password to your account and updates your details."}
          </p>
          <Link
            href="/signin"
            className="inline-block mt-3 rounded-xl border border-[#00E5FF]/40 px-4 py-2 text-sm font-semibold text-[#00E5FF] hover:bg-[#00E5FF]/10 transition"
          >
            Sign in instead →
          </Link>
        </div>
      )}

      {field(
        "username",
        "USERNAME",
        "Your display name across WorldEye — 2 to 32 characters.",
        <input
          id="claim-username"
          value={values.username}
          onChange={(e) => onChange("username", e.target.value)}
          className={`${inputCls} ${borderCls(errors.username)}`}
          placeholder="Pick a username"
          autoComplete="username"
          maxLength={32}
          aria-invalid={!!errors.username}
          aria-describedby={describedBy("username")}
        />,
      )}

      {field(
        "phone",
        <>
          PHONE NUMBER <span className="text-white/30">(required)</span>
        </>,
        "7–15 digits. Saved to your account profile — you can change it anytime in Settings.",
        <input
          id="claim-phone"
          type="tel"
          value={values.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          className={`${inputCls} ${borderCls(errors.phone)}`}
          placeholder="+1 555 000 1234"
          autoComplete="tel"
          aria-invalid={!!errors.phone}
          aria-describedby={describedBy("phone")}
        />,
      )}

      {field(
        "password",
        "PASSWORD",
        "At least 8 characters (up to 128).",
        <input
          id="claim-password"
          type="password"
          value={values.password}
          onChange={(e) => onChange("password", e.target.value)}
          className={`${inputCls} ${borderCls(errors.password)}`}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          aria-describedby={describedBy("password")}
        />,
      )}

      {field(
        "confirm",
        "CONFIRM PASSWORD",
        "Repeat the password exactly — we'll flag it here if they differ.",
        <input
          id="claim-confirm"
          type="password"
          value={values.confirm}
          onChange={(e) => onChange("confirm", e.target.value)}
          className={`${inputCls} ${borderCls(errors.confirm)}`}
          placeholder="Repeat your password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirm}
          aria-describedby={describedBy("confirm")}
        />,
      )}

      {serverError && (
        <p role="alert" className="text-red-400 text-sm mt-1">
          {serverError}
        </p>
      )}

      <div className="sticky bottom-3 mt-5">
        <button
          type="submit"
          disabled={saving}
          className="w-full min-h-[52px] py-3.5 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold tracking-wide hover:brightness-110 disabled:opacity-60 transition flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(212,175,55,0.35)]"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-4 h-4" />}
          {saving
            ? "Creating your account…"
            : existingAccount
              ? "Update my account & continue"
              : "Create my Pro account"}
        </button>
      </div>
    </form>
  );
}

export default function WelcomeClient() {
  const params = useSearchParams();
  const sessionId = params.get("session_id") ?? "";
  const [state, setState] = useState<State>({ kind: "loading" });
  const [values, setValues] = useState<ClaimValues>({ username: "", phone: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<ClaimErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [lastCamera, setLastCamera] = useState<LastCamera | null>(null);

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
        setState({
          kind: "form",
          email: data.email,
          plan: data.plan ?? null,
          trialEndsAt: data.trialEndsAt ?? null,
          chargeLabel: data.chargeLabel ?? null,
          existingAccount: !!data.existingAccount,
          hasPassword: !!data.hasPassword,
        });
        setValues((v) => ({ ...v, username: data.name ?? "", phone: data.phone ?? "" }));
      } catch {
        if (!cancelled) setState({ kind: "error", message: "Network error. Please try again." });
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  function onChange(field: keyof ClaimValues, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    // Clear a field's error as soon as it's edited — the message did its job.
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    const fieldErrors = validateClaimForm(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/auth/claim-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          username: values.username.trim(),
          phone: values.phone,
          password: values.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't create your account.");
      // Close the loop: the claim just set this password, so sign them in
      // with it right away — no detour through /signin before the globe.
      // If sign-in fails for any reason, the done screen falls back to
      // the ordinary sign-in button.
      try {
        const result = await signIn("credentials", {
          email: data.email,
          password: values.password,
          redirect: false,
        });
        setSignedIn(!!result?.ok && !result?.error);
      } catch {
        setSignedIn(false);
      }
      setLastCamera(readLastCamera());
      setState({ kind: "done", email: data.email });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Couldn't create your account.");
    } finally {
      setSaving(false);
    }
  }

  const labelCls = "block text-xs font-semibold tracking-wider text-white/40 mb-1.5";

  return (
    // .docs-root releases the global viewport lock (html/body overflow
    // hidden for the fullscreen globe) — without it this card is clipped
    // to the first screen on a phone and the submit button, below the
    // fold, can never be scrolled to. Same fix as /settings + /affiliates.
    <div className="docs-root min-h-screen bg-[#05070d] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src="/worldeye-eye.png" alt="WorldEye" width={600} height={432} className="h-9 w-auto" />
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
          <>
            <div className="flex items-center gap-2 text-[#D4AF37] mb-4">
              <PartyPopper className="w-5 h-5" />
              <h1 className="text-lg font-bold">You&rsquo;re Pro!</h1>
            </div>
            <WelcomeNextSteps
              email={state.email}
              plan={state.plan}
              trialEndsAt={state.trialEndsAt}
              chargeLabel={state.chargeLabel}
            />
            <ClaimFormView
              existingAccount={state.existingAccount}
              hasPassword={state.hasPassword}
              values={values}
              errors={errors}
              serverError={serverError}
              saving={saving}
              onChange={onChange}
              onSubmit={submit}
            />
          </>
        )}

        {state.kind === "done" && (
          <div className="py-4">
            <div className="flex items-center gap-2 text-[#D4AF37] mb-2">
              <Check className="w-5 h-5" />
              <h1 className="text-lg font-bold">{signedIn ? "You're in — Pro is on!" : "Account created!"}</h1>
            </div>
            <p className="text-sm text-white/55 mb-5">
              Welcome aboard, <span className="text-white">{values.username || state.email}</span>.{" "}
              {signedIn
                ? "You're signed in and your Pro access is already active."
                : "Your Pro access is ready — sign in with the password you just set."}
            </p>

            <p className={labelCls}>WHAT YOU JUST UNLOCKED</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mb-6">
              {UNLOCKED.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px] text-white/70">
                  <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-300" />
                  {f}
                </li>
              ))}
            </ul>

            {signedIn ? (
              <>
                <Link
                  href={lastCameraHref(lastCamera)}
                  className="block text-center w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold tracking-wide hover:brightness-110 transition"
                >
                  {lastCamera ? "Return to the camera you were watching" : "Open the live globe"}
                </Link>
                <p className="text-center text-xs text-white/35 mt-4">
                  Manage or cancel your subscription anytime in{" "}
                  <Link href="/settings" className="underline hover:text-white/60 transition">Settings</Link>.
                </p>
              </>
            ) : (
              <Link
                href="/signin"
                className="block text-center w-full py-3.5 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold tracking-wide hover:brightness-110 transition"
              >
                Sign in to WorldEye
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
