"use client";

/**
 * /settings/subscription — subscription management that stays on
 * WorldEye. Current plan + figures come from GET /api/billing/manage
 * (DB row + live Stripe where the DB lacks a figure); plan switches run
 * through POST /api/billing/switch. A switch whose prorated charge the
 * card on file can't cover stays PENDING (old plan untouched) and is
 * paid right here via components/InvoicePayForm; a completed switch is
 * confirmed by polling until the webhook has written the new plan back
 * — the page never fakes the result. The ONLY exits to Stripe are the
 * ones Jameson kept: the small cancel button at the foot (and the
 * past-due payment-method fix), both through the pre-existing
 * portal-session flow.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Crown, Loader2 } from "lucide-react";
import {
  switchTerms,
  fmtManageDate,
  fmtMoney,
  type ManageView,
  type ManageOption,
  type ManagePendingSwitch,
} from "@/lib/billing/manage";
import { startPlanCheckout, TRIAL_PLAN_OPTIONS } from "@/lib/billing/trial-checkout";
import TrialButton from "@/components/TrialButton";
import InvoicePayForm from "@/components/InvoicePayForm";

const btnGold =
  "px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-60 inline-flex items-center justify-center gap-2";
const btnGhost =
  "px-5 py-2.5 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition disabled:opacity-60";

export default function SubscriptionClient() {
  const [view, setView] = useState<ManageView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ManageOption | null>(null);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  // A switch whose prorated charge still needs paying (the old plan is
  // untouched until it is). Set from the switch response, or adopted
  // from the manage view when Stripe already holds one pending.
  const [paySwitch, setPaySwitch] = useState<ManagePendingSwitch | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (): Promise<ManageView | null> => {
    try {
      const res = await fetch("/api/billing/manage", { cache: "no-store" });
      if (!res.ok) throw new Error("load");
      const data = (await res.json()) as ManageView;
      setView(data);
      return data;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const v = await load();
      if (!v) setLoadError("Couldn't load your subscription. Refresh to try again.");
    })();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  // Adopt a switch Stripe already holds as pending (e.g. the member
  // confirmed, the card failed, and they came back later) so the pay
  // card is waiting for them. Clears itself once the plan has flipped.
  useEffect(() => {
    if (!view) return;
    if (view.pendingSwitch) {
      setPaySwitch((prev) => prev ?? view.pendingSwitch);
    } else if (view.current && paySwitch && view.current.plan === paySwitch.targetPlan) {
      setPaySwitch(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // The exact pre-existing portal flow (the old Manage button's) — now
  // only behind the cancel button and the past-due payment fix.
  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setPortalLoading(false);
    }
  }

  // The webhook writes the new plan to the DB — poll until it lands.
  function startPoll(target: string) {
    setUpdating(target);
    let tries = 0;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      tries += 1;
      const v = await load();
      if (v?.current?.plan === target || tries >= 10) {
        if (pollRef.current) clearInterval(pollRef.current);
        setUpdating(null);
        if (v?.current?.plan === target) {
          setPaySwitch(null);
        } else if (!v || v.current?.plan !== target) {
          setSwitchError("Switch saved with Stripe — your new plan will appear here within a minute.");
        }
      }
    }, 2000);
  }

  async function confirmSwitch() {
    if (!confirming) return;
    setSwitching(true);
    setSwitchError(null);
    try {
      const res = await fetch("/api/billing/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: confirming.plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't switch your plan. Nothing was changed.");
      const target = confirming;
      setConfirming(null);
      if (data.state === "payment_required") {
        // The card on file didn't cover the prorated difference. The
        // OLD plan is still fully active — show the on-page payment
        // form for the exact amount due; paying it completes the
        // switch, and the poll below (onPaid) watches for the flip.
        setPaySwitch({
          targetPlan: target.plan,
          targetName: target.name,
          amountDue: data.amountDue ?? 0,
          currency: data.currency ?? "usd",
          clientSecret: data.clientSecret ?? null,
          hostedUrl: data.hostedInvoiceUrl ?? null,
        });
        return;
      }
      startPoll(target.plan);
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : "Couldn't switch your plan. Nothing was changed.");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition mb-6">
        <ArrowLeft className="w-4 h-4" /> Account settings
      </Link>
      <div className="flex items-center gap-2 mb-6">
        <Crown className="w-6 h-6 text-[#D4AF37]" />
        <h1 className="text-2xl font-bold tracking-tight">Manage subscription</h1>
      </div>

      {loadError && <p className="text-red-400 text-sm">{loadError}</p>}
      {!view && !loadError && (
        <div className="flex items-center gap-3 text-white/50 py-10">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading your subscription…
        </div>
      )}

      {view?.kind === "none" && (
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="font-bold mb-1">You&rsquo;re on the free plan</h2>
          <p className="text-sm text-white/55 mb-5">
            Upgrade to Pro for unlimited cameras, the OI assistant, satellite view, live traffic, and the full intel toolkit.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {view.options.map((o) => (
              <div key={o.plan} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <p className="font-bold">{o.name}</p>
                <p className="text-lg font-bold mt-1">
                  {o.price}
                  <span className="text-sm text-white/45 font-normal">{o.per}</span>
                </p>
                <p className="text-xs text-[#D4AF37] font-semibold">Just {o.perDay} a day</p>
                <p className="text-xs text-white/45 mt-1 mb-4">{o.note}</p>
                {(() => {
                  const t = TRIAL_PLAN_OPTIONS.find((x) => x.plan === o.plan);
                  return t ? (
                    <TrialButton
                      label={t.cta}
                      days={t.trialDays === 3 ? 3 : 10}
                      onClick={() => startPlanCheckout(o.plan)}
                      className="w-full"
                    />
                  ) : (
                    <button onClick={() => startPlanCheckout(o.plan)} className={`${btnGold} w-full`}>
                      Start free trial
                    </button>
                  );
                })()}
              </div>
            ))}
          </div>
        </section>
      )}

      {view && view.kind !== "none" && view.current && (
        <>
          <section className="rounded-3xl border border-[#D4AF37]/25 bg-white/[0.03] p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">
                {view.current.planName}
                {!view.current.planName.endsWith("Pro") && (
                  <>
                    {" "}
                    <span className="text-[#D4AF37]">PRO</span>
                  </>
                )}
              </h2>
              <span
                className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                  view.current.pastDue
                    ? "bg-red-400/10 text-red-300 border-red-400/30"
                    : "bg-emerald-400/10 text-emerald-300 border-emerald-400/30"
                }`}
              >
                {view.current.trialing
                  ? "Free trial"
                  : view.current.pastDue
                    ? "Past due"
                    : view.current.status.replace("_", " ")}
              </span>
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-white/55">Price</dt>
                <dd className="font-semibold">{view.current.priceLabel || "—"}</dd>
              </div>
              {view.current.trialing && view.current.trialEndsAt && (
                <div className="flex items-center justify-between">
                  <dt className="text-white/55">Trial ends</dt>
                  <dd>{fmtManageDate(view.current.trialEndsAt)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-white/55">
                  {view.current.cancelAtPeriodEnd
                    ? "Access until"
                    : view.current.trialing
                      ? "First charge"
                      : "Next charge"}
                </dt>
                <dd>
                  {fmtManageDate(view.current.periodEnd)}
                  {view.current.priceLabel ? ` · ${view.current.priceLabel}` : ""}
                </dd>
              </div>
              {view.current.cancelAtPeriodEnd && (
                <p className="text-xs text-white/40">
                  Your subscription is set to cancel at the end of this period — Pro stays on until then.
                </p>
              )}
            </dl>

            {view.current.pastDue && (
              <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-400/[0.06] p-4">
                <p className="text-sm font-semibold text-red-200">Your last payment didn&rsquo;t go through</p>
                <p className="text-sm text-white/60 mt-1">
                  Update your payment method to keep Pro on. Payment details are handled by Stripe&rsquo;s secure portal.
                </p>
                <button onClick={openPortal} disabled={portalLoading} className={`${btnGold} mt-3`}>
                  {portalLoading ? "Opening…" : "Update payment method in Stripe"}
                </button>
              </div>
            )}
          </section>

          {paySwitch && view.kind === "self-serve" && (
            <section className="rounded-3xl border border-[#D4AF37]/40 bg-[#D4AF37]/[0.05] p-6 mb-4">
              <h2 className="font-bold mb-1">Finish switching to {paySwitch.targetName}</h2>
              <p className="text-sm text-white/60 mb-1">
                Your {view.current.planName} plan is still fully active — nothing has changed yet.
                {" "}{fmtMoney(paySwitch.amountDue, paySwitch.currency)} is due to complete the switch
                (the new plan&rsquo;s price minus credit for the unused part of your current plan).
                Pay it here and {paySwitch.targetName} starts immediately.
              </p>
              {updating ? (
                <p className="flex items-center gap-2 text-sm text-white/60 mt-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Payment received — updating your plan…
                </p>
              ) : (
                <div className="mt-4">
                  <InvoicePayForm
                    clientSecret={paySwitch.clientSecret}
                    hostedUrl={paySwitch.hostedUrl}
                    amountLabel={fmtMoney(paySwitch.amountDue, paySwitch.currency)}
                    onPaid={() => paySwitch.targetPlan && startPoll(paySwitch.targetPlan)}
                  />
                </div>
              )}
              <button
                onClick={() => setPaySwitch(null)}
                className="text-xs text-white/40 underline underline-offset-2 hover:text-white/70 transition mt-4"
              >
                Not now — I&rsquo;ll finish this later
              </button>
              <p className="text-xs text-white/35 mt-1">
                The switch stays saved with Stripe and this card will be here when you come back.
              </p>
            </section>
          )}

          {(view.kind === "enterprise" || view.kind === "comp") && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="font-bold mb-1">
                {view.kind === "enterprise" ? "Enterprise plans are managed directly" : "This Pro access isn't billed through Stripe"}
              </h2>
              <p className="text-sm text-white/55">
                {view.kind === "enterprise"
                  ? "Your plan is arranged with us off-platform — to change or cancel it, email "
                  : "It was granted without a Stripe subscription, so there's nothing to switch or cancel here. Questions: email "}
                <a href={`mailto:${view.supportEmail}`} className="text-[#00E5FF] hover:underline">
                  {view.supportEmail}
                </a>
                .
              </p>
            </section>
          )}

          {view.kind === "self-serve" && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="font-bold mb-1">Switch plan</h2>
              <p className="text-sm text-white/55 mb-5">
                Switch right here, without leaving the site. If a prorated difference is due today,
                you pay it on this page — your current plan stays active until the switch completes.
              </p>

              {updating && (
                <p className="flex items-center gap-2 text-sm text-white/60 mb-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Updating your plan…
                </p>
              )}
              {switchError && (
                <p role="alert" className="text-sm text-red-400 mb-4">
                  {switchError}
                </p>
              )}

              {!confirming ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {view.options
                    .filter((o) => !o.current)
                    .map((o) => (
                      <div
                        key={o.plan}
                        className={`rounded-2xl border p-4 ${
                          o.plan === "annual"
                            ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.04]"
                            : "border-white/10 bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold">{o.name}</p>
                          {o.relation === "upgrade" ? (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                              Upgrade
                            </span>
                          ) : o.relation === "downgrade" ? (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/[0.04] text-white/40 border border-white/10">
                              Downgrade
                            </span>
                          ) : o.plan === "annual" ? (
                            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                              Best value
                            </span>
                          ) : null}
                        </div>
                        <p className="text-lg font-bold mt-1">
                          {o.price}
                          <span className="text-sm text-white/45 font-normal">{o.per}</span>
                        </p>
                        <p className="text-xs text-[#D4AF37] font-semibold">Just {o.perDay} a day</p>
                        {o.dueTodayCents != null && !view.current!.trialing && (
                          <p className="text-xs text-white/45 mt-1">
                            {o.dueTodayCents > 0
                              ? `${fmtMoney(o.dueTodayCents)} due today if you switch`
                              : "No charge today if you switch"}
                          </p>
                        )}
                        <button
                          onClick={() => { setConfirming(o); setSwitchError(null); }}
                          disabled={!!updating}
                          className={`${btnGold} w-full mt-4`}
                        >
                          Switch to {o.name}
                        </button>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/[0.04] p-5">
                  <h3 className="font-bold mb-3">
                    Switch to {confirming.name} — {confirming.price}
                    {confirming.per}?
                  </h3>
                  {(() => {
                    const terms = switchTerms(view.current!, confirming, confirming.dueTodayCents);
                    return (
                      <ul className="space-y-2 text-sm text-white/70 mb-5">
                        {[terms.effectiveLine, terms.moneyLine, terms.nextChargeLine].map((line) => (
                          <li key={line} className="flex items-start gap-2">
                            <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-300" />
                            {line}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                  {switchError && (
                    <p role="alert" className="text-sm text-red-400 mb-3">
                      {switchError}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button onClick={confirmSwitch} disabled={switching} className={btnGold}>
                      {switching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Switching…
                        </>
                      ) : (
                        `Confirm switch to ${confirming.name}`
                      )}
                    </button>
                    <button onClick={() => setConfirming(null)} disabled={switching} className={btnGhost}>
                      Keep {view.current.planName}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          <footer className="mt-8 flex items-center justify-between">
            <p className="text-xs text-white/30">Invoices and payment details live in Stripe&rsquo;s portal.</p>
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="text-xs text-white/40 underline underline-offset-2 hover:text-red-300 transition disabled:opacity-60"
            >
              {portalLoading ? "Opening…" : "Cancel subscription"}
            </button>
          </footer>
        </>
      )}
    </main>
  );
}
