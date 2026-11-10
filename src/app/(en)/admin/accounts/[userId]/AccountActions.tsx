"use client";

// Admin actions on the account detail page: send a site template email
// and grant a free Pro comp. All enforcement is server-side in
// POST /api/admin/accounts/[userId] (ADMIN_EMAILS check, emailOptOut
// refusal, comp guards) — this component only presents state and shows
// the route's answers, including its refusals, verbatim.
import { useState } from "react";

export type AccountSubState =
  | { kind: "none" }
  | { kind: "comp_active"; periodEndLabel: string }
  | { kind: "comp_inactive" }
  | { kind: "stripe"; label: string };

type Msg = { ok: boolean; text: string } | null;

const btnCls =
  "inline-flex items-center px-4 py-2.5 rounded-lg border text-sm transition disabled:opacity-40 disabled:pointer-events-none";

export default function AccountActions({
  userId,
  hasEmail,
  emailOptOut,
  subState,
}: {
  userId: string;
  hasEmail: boolean;
  emailOptOut: boolean;
  subState: AccountSubState;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [emailMsg, setEmailMsg] = useState<Msg>(null);
  const [grantMsg, setGrantMsg] = useState<Msg>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  async function post(payload: Record<string, unknown>) {
    const res = await fetch(`/api/admin/accounts/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { res, data };
  }

  async function sendTemplate(template: "trial_invite" | "checkin") {
    setBusy(template);
    setEmailMsg(null);
    try {
      const { res, data } = await post({ action: "send_email", template });
      if (res.ok) {
        setEmailMsg({
          ok: true,
          text: template === "trial_invite" ? "Trial invitation sent." : "Check-in email sent.",
        });
      } else {
        setEmailMsg({ ok: false, text: String(data.message ?? data.error ?? "Send failed.") });
      }
    } catch {
      setEmailMsg({ ok: false, text: "Send failed — network error." });
    } finally {
      setBusy(null);
    }
  }

  async function grant(confirm: boolean) {
    setBusy("grant");
    setGrantMsg(null);
    try {
      const { res, data } = await post({ action: "grant_trial", confirm });
      if (res.ok) {
        setNeedsConfirm(false);
        const end = data.currentPeriodEnd
          ? new Date(String(data.currentPeriodEnd)).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "America/Denver",
            })
          : "";
        setGrantMsg({
          ok: true,
          text: `Free Pro granted until ${end}.${data.emailSent ? " The notification email was sent." : " Note: the notification email could not be sent."}`,
        });
      } else if (data.needsConfirm) {
        setNeedsConfirm(true);
        setGrantMsg({ ok: false, text: String(data.message ?? "This account already has comp Pro running.") });
      } else {
        setGrantMsg({ ok: false, text: String(data.message ?? data.error ?? "Grant failed.") });
      }
    } catch {
      setGrantMsg({ ok: false, text: "Grant failed — network error." });
    } finally {
      setBusy(null);
    }
  }

  const emailDisabled = !hasEmail || emailOptOut || busy !== null;

  return (
    <div className="grid gap-4 md:grid-cols-2 mb-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">Send email</div>
        {!hasEmail ? (
          <p className="text-sm text-white/50">This account has no email address.</p>
        ) : emailOptOut ? (
          <p className="text-sm text-amber-300/90">
            This user has opted out of marketing email — sends are refused (the server enforces this too).
          </p>
        ) : (
          <p className="text-sm text-white/50 mb-3">
            Sent through the site's email (WorldEye &lt;noreply@worldeye.app&gt;) and logged.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={emailDisabled}
            onClick={() => sendTemplate("trial_invite")}
            className={`${btnCls} border-cyan-400/40 text-cyan-200 bg-cyan-400/10 hover:bg-cyan-400/20`}
          >
            {busy === "trial_invite" ? "Sending…" : "Send trial invitation"}
          </button>
          <button
            type="button"
            disabled={emailDisabled}
            onClick={() => sendTemplate("checkin")}
            className={`${btnCls} border-white/15 text-white/75 hover:text-white`}
          >
            {busy === "checkin" ? "Sending…" : "Send check-in"}
          </button>
        </div>
        {emailMsg ? (
          <p className={`text-sm mt-3 ${emailMsg.ok ? "text-emerald-300" : "text-amber-300/90"}`}>{emailMsg.text}</p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="text-[11px] font-bold tracking-[0.18em] text-white/40 uppercase mb-3">Give free trial</div>
        {subState.kind === "stripe" ? (
          <p className="text-sm text-white/50 mb-3">
            {subState.label} Comp grants never touch Stripe subscriptions — the server will refuse this.
          </p>
        ) : subState.kind === "comp_active" ? (
          <p className="text-sm text-white/50 mb-3">
            Free Pro (comp) is already running until {subState.periodEndLabel}. Granting adds 10 more days —
            you'll be asked to confirm.
          </p>
        ) : (
          <p className="text-sm text-white/50 mb-3">
            Grants 10 days of Pro through the comp engine (no card, not a Stripe trial) and automatically
            emails the user that Pro is on us, with the exact end date.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null || subState.kind === "stripe"}
            onClick={() => grant(false)}
            className={`${btnCls} border-amber-400/40 text-amber-200 bg-amber-400/10 hover:bg-amber-400/20`}
          >
            {busy === "grant" ? "Working…" : "Give 10 days of Pro free"}
          </button>
          {needsConfirm ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => grant(true)}
              className={`${btnCls} border-red-400/40 text-red-200 bg-red-400/10 hover:bg-red-400/20`}
            >
              Confirm extension (+10 days)
            </button>
          ) : null}
        </div>
        {grantMsg ? (
          <p className={`text-sm mt-3 ${grantMsg.ok ? "text-emerald-300" : "text-amber-300/90"}`}>{grantMsg.text}</p>
        ) : null}
      </div>
    </div>
  );
}
