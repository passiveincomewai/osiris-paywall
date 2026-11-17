"use client";
// Interactive controls for the affiliate detail page. Every button calls
// a real admin endpoint; destructive actions ask for confirmation first.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SectionTitle } from "@/components/affiliate/ui";

async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}

const card = "rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-4 md:p-5";
const btn = "px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors disabled:opacity-40";
const input = "w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-cyan-400/60";

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = async (fn: () => Promise<{ result?: string } | unknown>, confirmText?: string) => {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    setMsg(null);
    try {
      const out = (await fn()) as { result?: string };
      setMsg({ ok: true, text: out?.result ?? "Done" });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(false);
  };
  return { busy, msg, run };
}

export function AffiliateControls({
  profileId, status, isAmbassador, subKind, subLive, xp,
}: {
  profileId: string;
  status: string;
  isAmbassador: boolean;
  subKind: "comp" | "paid" | null;
  subLive: boolean;
  xp: number;
}) {
  const { busy, msg, run } = useAction();
  const [xpVal, setXpVal] = useState("");
  const [xpReason, setXpReason] = useState("");
  const post = (body: Record<string, unknown>) =>
    api(`/api/admin/affiliates/${profileId}/actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  const adjustXp = () => {
    const n = Number(xpVal);
    if (!Number.isFinite(n) || n === 0) return;
    void run(async () => {
      const out = await post({ action: "adjust_xp", xp: n, reason: xpReason });
      setXpVal("");
      setXpReason("");
      return out;
    });
  };

  return (
    <div className={card}>
      <SectionTitle kicker="Admin" title="Controls" />
      {msg && (
        <div className={`mb-3 text-xs font-mono rounded-lg px-3 py-2 border ${msg.ok ? "text-emerald-300 border-emerald-400/40 bg-emerald-400/10" : "text-red-300 border-red-400/40 bg-red-400/10"}`}>
          {msg.text}
        </div>
      )}

      {/* Free membership */}
      <div className="mb-4">
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Free membership (Pro)</div>
        {subKind === "comp" && subLive ? (
          <button disabled={busy} onClick={() => run(() => post({ action: "revoke_comp" }), "Revoke this affiliate's free Pro membership?")}
            className={`${btn} border-red-400/50 text-red-300`}>Revoke free Pro</button>
        ) : subKind === "paid" ? (
          <p className="text-xs text-slate-400">This user pays for Pro — comp grants never override a paid subscription, so there is nothing to grant or revoke here.</p>
        ) : (
          <button disabled={busy} onClick={() => run(() => post({ action: "grant_comp" }))}
            className={`${btn} border-emerald-400/50 text-emerald-300`}>Grant free Pro · 12 months</button>
        )}
        {subKind === "comp" && !subLive && (
          <button disabled={busy} onClick={() => run(() => post({ action: "grant_comp" }))}
            className={`${btn} border-emerald-400/50 text-emerald-300 ml-1.5`}>Re-grant free Pro · 12 months</button>
        )}
      </div>

      {/* Role / status */}
      <div className="mb-4">
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Affiliate role</div>
        <div className="flex gap-1.5 flex-wrap">
          {status !== "active" && (
            <button disabled={busy} onClick={() => run(() => post({ action: "set_status", status: "active" }))}
              className={`${btn} border-emerald-400/50 text-emerald-300`}>Reactivate</button>
          )}
          {status === "active" && (
            <button disabled={busy} onClick={() => run(() => post({ action: "set_status", status: "suspended" }), "Suspend this affiliate? They keep their history and earned commissions, but dashboard/Studio access and new attributions stop until reactivated.")}
              className={`${btn} border-amber-400/50 text-amber-300`}>Suspend</button>
          )}
          {status !== "removed" && (
            <button disabled={busy} onClick={() => run(() => post({ action: "set_status", status: "removed" }), "Remove this affiliate's role? Dashboard and Studio access end, their referral link stops attributing new signups, and new attributions stop. All history, commissions and payouts are preserved and the role can be restored with Reactivate.")}
              className={`${btn} border-red-400/50 text-red-300`}>Remove role</button>
          )}
          {status !== "banned" && (
            <button disabled={busy} onClick={() => run(() => post({ action: "set_status", status: "banned" }), "Ban this affiliate? Same access effects as removal, flagged as a ban (fraud/abuse).")}
              className={`${btn} border-red-400/50 text-red-300`}>Ban</button>
          )}
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">Any status other than “active” blocks the affiliate dashboard, the Marketing Studio, and new referral attributions. History is never deleted.</p>
      </div>

      {/* Ambassador */}
      <div className="mb-4">
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Ambassador</div>
        <button disabled={busy} onClick={() => run(() => post({ action: "set_ambassador", value: !isAmbassador }))}
          className={`${btn} border-yellow-400/50 text-yellow-300`}>
          {isAmbassador ? "Remove ambassador" : "Make ambassador"}
        </button>
        <p className="text-[11px] text-slate-500 mt-1.5">Ambassadors unlock the ambassador template category in the Marketing Studio.</p>
      </div>

      {/* Discount code */}
      <div className="mb-4">
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Discount code</div>
        <button disabled={busy} onClick={() => run(() => post({ action: "reset_discount" }), "Reset this affiliate's discount code? The live Stripe code is deactivated and a fresh code mints at their current rank on their next dashboard load.")}
          className={`${btn} border-white/15 text-slate-300`}>Reset discount code</button>
      </div>

      {/* XP */}
      <div>
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Adjust XP (current: {xp})</div>
        <div className="flex gap-2 flex-wrap">
          <input className={input + " !w-28"} placeholder="+/- XP" value={xpVal} onChange={(e) => setXpVal(e.target.value)} />
          <input className={input + " !w-44"} placeholder="Reason (audit log)" value={xpReason} onChange={(e) => setXpReason(e.target.value)} />
          <button disabled={busy} onClick={adjustXp} className={`${btn} border-violet-400/50 text-violet-300`}>Apply</button>
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">Rank, commission tier and the audience discount % all follow XP automatically. Deductions are clamped at 0 and recorded in the XP ledger.</p>
      </div>
    </div>
  );
}

export function AffiliateEmail({
  profileId, hasEmail, emailOptOut, availableCents,
}: {
  profileId: string;
  hasEmail: boolean;
  emailOptOut: boolean;
  availableCents: number;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");

  const send = async (template: string, extra?: Record<string, unknown>) => {
    setBusy(template);
    setMsg(null);
    try {
      const out = await api(`/api/admin/affiliates/${profileId}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "send_email", template, ...extra }),
      }) as { result?: string };
      setMsg({ ok: true, text: out.result ?? "Email sent" });
      if (template === "custom") { setSubject(""); setBodyText(""); }
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(null);
  };

  const blocked = !hasEmail || emailOptOut;
  const anyBusy = busy !== null;
  const fmt = (c: number) => `$${(c / 100).toFixed(2)}`;

  return (
    <div className={card}>
      <SectionTitle kicker="Contact" title="Email this affiliate" />
      {msg && (
        <div className={`mb-3 text-xs font-mono rounded-lg px-3 py-2 border ${msg.ok ? "text-emerald-300 border-emerald-400/40 bg-emerald-400/10" : "text-red-300 border-red-400/40 bg-red-400/10"}`}>
          {msg.text}
        </div>
      )}
      {!hasEmail ? (
        <p className="text-sm text-slate-400">This account has no email address.</p>
      ) : emailOptOut ? (
        <p className="text-sm text-amber-300/90">
          This user has opted out of marketing email — sends are refused (the server enforces this too).
        </p>
      ) : (
        <p className="text-xs text-slate-400 mb-3">
          Sent through the site's email (WorldEye &lt;noreply@worldeye.app&gt;) and logged.
        </p>
      )}

      <div className="flex gap-1.5 flex-wrap">
        <button disabled={blocked || anyBusy} onClick={() => void send("welcome")}
          className={`${btn} border-cyan-400/50 text-cyan-300`}>
          {busy === "welcome" ? "Sending…" : "Send welcome"}
        </button>
        <button disabled={blocked || anyBusy || availableCents <= 0} onClick={() => void send("payout_available")}
          className={`${btn} border-emerald-400/50 text-emerald-300`}>
          {busy === "payout_available" ? "Sending…" : `Send payout-available (${fmt(availableCents)})`}
        </button>
        <button disabled={blocked || anyBusy} onClick={() => void send("checkin")}
          className={`${btn} border-white/15 text-slate-300`}>
          {busy === "checkin" ? "Sending…" : "Send check-in"}
        </button>
      </div>
      {hasEmail && !emailOptOut && availableCents <= 0 && (
        <p className="text-[11px] text-slate-500 mt-1.5">No available commission balance right now, so the payout email is disabled — the server refuses it at $0 too.</p>
      )}

      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Or write a custom email</div>
        <input className={input + " mb-2"} placeholder="Subject" maxLength={150} value={subject}
          onChange={(e) => setSubject(e.target.value)} disabled={blocked || anyBusy} />
        <textarea className={input} placeholder="Message — plain text; blank lines start a new paragraph." rows={5} maxLength={5000}
          value={bodyText} onChange={(e) => setBodyText(e.target.value)} disabled={blocked || anyBusy} />
        <button disabled={blocked || anyBusy || subject.trim().length === 0 || bodyText.trim().length === 0}
          onClick={() => void send("custom", { subject, body: bodyText })}
          className={`${btn} border-cyan-400/50 text-cyan-300 mt-2`}>
          {busy === "custom" ? "Sending…" : "Send custom email"}
        </button>
        <p className="text-[11px] text-slate-500 mt-1.5">Goes out in the site's email style, logged as admin_affiliate_custom.</p>
      </div>
    </div>
  );
}

export function PayoutActions({ payoutId, status }: { payoutId: string; status: string }) {
  const { busy, msg, run } = useAction();
  const act = (action: string) =>
    run(async () => {
      let providerRef: string | undefined;
      if (action === "mark_paid") {
        providerRef = prompt("Provider reference (transaction id):") || undefined;
        if (!providerRef) throw new Error("A provider reference is required to mark paid");
      }
      await api("/api/admin/affiliates/payouts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ payoutId, action, providerRef }),
      });
      return { result: `Payout ${action.replace("_", " ")}` };
    }, action === "reject" ? "Reject this payout request? Its commissions return to the affiliate's available balance." : undefined);

  return (
    <div className="flex items-center gap-1.5">
      {msg && <span className={`text-[11px] font-mono ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</span>}
      {status === "requested" && (
        <>
          <button disabled={busy} onClick={() => act("approve")} className={`${btn} border-emerald-400/50 text-emerald-300`}>Approve</button>
          <button disabled={busy} onClick={() => act("reject")} className={`${btn} border-red-400/50 text-red-300`}>Reject</button>
        </>
      )}
      {(status === "approved" || status === "processing") && (
        <button disabled={busy} onClick={() => act("mark_paid")} className={`${btn} border-cyan-400/50 text-cyan-300`}>Mark paid</button>
      )}
    </div>
  );
}
