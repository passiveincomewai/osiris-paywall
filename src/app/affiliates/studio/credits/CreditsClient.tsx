"use client";
// Credits & Packs — balance, monthly member allowance status, AI usage
// vs the monthly caps, credit-pack purchases (Stripe Checkout), and the
// full activity ledger. Packs whose Stripe price id the owner hasn't
// configured yet render as "Not on sale yet" — never a dead button.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { EmptyState } from "@/components/affiliate/ui";

const btnPrimary =
  "inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-mono text-sm font-bold text-[#04121f] transition-all disabled:opacity-50";
const btnStyle = { background: "linear-gradient(135deg,#38bdf8,#0096FF)", boxShadow: "0 0 20px rgba(0,150,255,.45)" };

interface Pack {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  blurb: string;
  configured: boolean;
}

interface ActivityRow {
  id: string;
  delta: number;
  reason: string;
  jobId: string | null;
  createdAt: string;
}

interface CreditsData {
  balance: number;
  monthKey: string;
  config: {
    creditUsd: number;
    monthlyAllowance: number;
    aiUserMonthlyCapCredits: number;
  };
  allowance: { amount: number; grantedThisMonth: boolean };
  ai: { monthCredits: number; userCapCredits: number; budgetUsd: number; globalMonthCredits: number };
  packs: Pack[];
  activity: ActivityRow[];
}

const REASON_LABELS: Record<string, string> = {
  monthly_allowance: "Monthly member allowance",
  generation_charge: "Studio generation",
  generation_refund: "Refund — generation not completed",
  pack_purchase: "Credit pack purchase",
};

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function CreditsClient() {
  const [data, setData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/affiliate/studio/credits", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setError(typeof j.error === "string" ? j.error : "Couldn't load your credits.");
      else setData(j as CreditsData);
    } catch {
      setError("Couldn't load your credits.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const q = new URLSearchParams(window.location.search).get("pack");
    if (q === "success") {
      setNotice("Payment received — your credits are being added. They usually appear within a few seconds; refresh if you don't see them yet.");
    } else if (q === "cancelled") {
      setNotice("Checkout cancelled — no charge was made.");
    }
  }, [load]);

  const buy = async (pack: Pack) => {
    setBuyingId(pack.id);
    setError("");
    try {
      const r = await fetch("/api/affiliate/studio/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || typeof j.url !== "string") {
        setError(
          typeof j.message === "string"
            ? j.message
            : "Couldn't start checkout — please try again.",
        );
        setBuyingId(null);
        return;
      }
      window.location.href = j.url;
    } catch {
      setError("Network error — checkout was not started.");
      setBuyingId(null);
    }
  };

  if (loading) return <div className="text-slate-400 font-mono text-sm">Loading your credits…</div>;
  if (!data) return <EmptyState title="Credits unavailable" body={error || "Refresh the page to try again."} />;

  const aiPct =
    data.ai.userCapCredits > 0
      ? Math.min(100, Math.round((data.ai.monthCredits / data.ai.userCapCredits) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-cyan-400 uppercase mb-1">Marketing Studio</div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Credits &amp; Packs</h1>
        <p className="text-sm text-slate-400 mt-1">
          Credits power Studio generation — image renders, personalized videos, and made-to-order AI from Cosmo.
        </p>
      </div>

      {notice && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-200" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-sm text-red-100" role="alert">
          {error}
        </div>
      )}

      {/* Balance + status */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[11px] font-mono tracking-[0.2em] text-slate-400 uppercase">Your balance</div>
          <div className="text-4xl font-bold text-white mt-2 tabular-nums">{data.balance.toLocaleString("en-US")}</div>
          <div className="text-xs text-slate-500 mt-1">credits · 1 credit = ${data.config.creditUsd.toFixed(2)} of generation</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[11px] font-mono tracking-[0.2em] text-slate-400 uppercase">Member allowance</div>
          <div className="text-lg font-bold text-white mt-2">
            {data.allowance.grantedThisMonth ? (
              <>Added for {monthLabel(data.monthKey)} <Check className="w-4 h-4 inline-block align-[-2px]" strokeWidth={3} /></>
            ) : (
              <>Pending for {monthLabel(data.monthKey)}</>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {data.allowance.amount} free credits land in your account every month while your membership is active.
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-[11px] font-mono tracking-[0.2em] text-slate-400 uppercase">AI by Cosmo — this month</div>
          <div className="text-lg font-bold text-white mt-2 tabular-nums">
            {data.ai.monthCredits} / {data.ai.userCapCredits} credits
          </div>
          <div className="h-2 rounded-full bg-white/10 mt-2.5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${aiPct}%`, background: "linear-gradient(90deg,#38bdf8,#0096FF)" }} />
          </div>
          <div className="text-xs text-slate-500 mt-1.5">Your monthly AI allowance resets on the 1st.</div>
        </div>
      </div>

      {/* Packs */}
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-slate-400 uppercase mb-3">Top up — credit packs</div>
        <div className="grid md:grid-cols-3 gap-4">
          {data.packs.map((pack) => (
            <div key={pack.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-base font-bold text-white">{pack.name}</div>
                <div className="text-lg font-bold text-cyan-300">${pack.priceUsd.toFixed(2)}</div>
              </div>
              <div className="text-3xl font-bold text-white mt-2 tabular-nums">
                {pack.credits.toLocaleString("en-US")}
                <span className="text-sm font-mono font-normal text-slate-400"> credits</span>
              </div>
              <div className="text-xs font-mono text-slate-500 mt-1">
                ${(pack.priceUsd / pack.credits).toFixed(3)} per credit
              </div>
              <p className="text-sm text-slate-400 mt-3 leading-relaxed flex-1">{pack.blurb}</p>
              {pack.configured ? (
                <button
                  type="button"
                  onClick={() => void buy(pack)}
                  disabled={buyingId === pack.id}
                  className={`${btnPrimary} mt-4 w-full`}
                  style={btnStyle}
                >
                  {buyingId === pack.id ? "Opening checkout…" : `Buy ${pack.name}`}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-4 w-full inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-mono text-sm font-bold border border-white/10 text-slate-500 cursor-not-allowed"
                >
                  Not on sale yet
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Purchased credits never expire and are credited as soon as Stripe confirms payment. Credits have no cash
          value — see the <Link href="/affiliates/terms" className="underline underline-offset-2">affiliate terms</Link>.
        </p>
      </div>

      {/* Activity */}
      <div>
        <div className="text-[11px] font-mono tracking-[0.25em] text-slate-400 uppercase mb-3">Activity</div>
        {data.activity.length === 0 ? (
          <EmptyState title="No credit activity yet" body="Your allowance, purchases, generations, and refunds will show up here." />
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            {data.activity.map((row, i) => (
              <div
                key={row.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? "border-t border-white/5" : ""}`}
              >
                <div className="min-w-0">
                  <div className="text-sm text-slate-200">{REASON_LABELS[row.reason] ?? row.reason}</div>
                  <div className="text-[11px] font-mono text-slate-500">
                    {new Date(row.createdAt).toLocaleString()}
                  </div>
                </div>
                <div
                  className={`font-mono font-bold tabular-nums ${row.delta >= 0 ? "text-emerald-300" : "text-slate-300"}`}
                >
                  {row.delta >= 0 ? "+" : ""}
                  {row.delta}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
