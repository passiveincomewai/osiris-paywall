"use client";

import { useState } from "react";
import { CalendarPlus, PiggyBank, Trash2 } from "lucide-react";

/* Same preset list as PASS_LABEL_PRESETS in lib/ski/pass-value —
   duplicated here on purpose: that module imports the DB client and
   must never be bundled into a client component. */
const PASS_LABEL_PRESETS = [
  "Ikon",
  "Epic",
  "Mountain Collective",
  "Indy",
  "Powder Pass",
  "Other",
] as const;

/**
 * Pass-value tracker UI (Powder Pass feature #8). All numbers shown
 * come from the server response, which computes them ONLY from what
 * the member typed in (lib/ski/pass-value) — this component never
 * looks up a price and never calls the lib directly (every mutation
 * goes through /api/ski/pass-value and the response re-renders).
 */

export interface PassValueSeasonData {
  label: string;
  costCents: number;
  dayPriceCents: number | null;
}

export interface PassValueDayData {
  id: string;
  skiedOn: string;
  resortSlug: string | null;
}

export interface PassValueSummaryData {
  daysLogged: number;
  costPerDayCents: number | null;
  valueReceivedCents: number | null;
  breakEvenDays: number | null;
  paidForItselfOnDay: number | null;
  daysToBreakEven: number | null;
}

export interface PassValueStateData {
  season: PassValueSeasonData | null;
  days: PassValueDayData[];
  summary: PassValueSummaryData | null;
}

function money(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function dollarsToCents(v: string): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

const inputCls =
  "w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#D4AF37]/60 focus:outline-none";
const labelCls = "block text-xs font-semibold tracking-wide text-white/55 mb-1.5";

export default function PassValueTracker({
  initial,
  resorts,
}: {
  initial: PassValueStateData;
  resorts: { slug: string; name: string }[];
}) {
  const [state, setState] = useState<PassValueStateData>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Season form */
  const [preset, setPreset] = useState<string>(() => {
    const l = initial.season?.label;
    if (!l) return "Ikon";
    return (PASS_LABEL_PRESETS as readonly string[]).includes(l) && l !== "Other"
      ? l
      : "Other";
  });
  const [customLabel, setCustomLabel] = useState<string>(() => {
    const l = initial.season?.label;
    return l && !(PASS_LABEL_PRESETS as readonly string[]).includes(l) ? l : "";
  });
  const [cost, setCost] = useState(
    initial.season ? String(initial.season.costCents / 100) : "",
  );
  const [dayPrice, setDayPrice] = useState(
    initial.season?.dayPriceCents != null
      ? String(initial.season.dayPriceCents / 100)
      : "",
  );

  /* Day form */
  const [skiedOn, setSkiedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [resortSlug, setResortSlug] = useState("");

  const resortName = (slug: string | null) =>
    slug ? (resorts.find(r => r.slug === slug)?.name ?? slug) : "No specific resort";

  async function send(method: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ski/pass-value", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json?.message ?? "Something went wrong — please try again.");
        return;
      }
      setState(json as PassValueStateData);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  function saveSeason(e: React.FormEvent) {
    e.preventDefault();
    const label = preset === "Other" ? customLabel.trim() : preset;
    const costCents = dollarsToCents(cost);
    if (!label) return setError("Give your pass a label.");
    if (costCents == null) return setError("Enter what you paid for the pass.");
    let dayPriceCents: number | null = null;
    if (dayPrice.trim() !== "") {
      dayPriceCents = dollarsToCents(dayPrice);
      if (dayPriceCents == null) {
        return setError("Day-ticket price must be a positive amount, or left blank.");
      }
    }
    void send("POST", { kind: "season", label, costCents, dayPriceCents });
  }

  function logDay(e: React.FormEvent) {
    e.preventDefault();
    void send("POST", {
      kind: "day",
      skiedOn,
      resortSlug: resortSlug === "" ? null : resortSlug,
    });
  }

  const s = state.summary;
  const season = state.season;

  return (
    <div className="mt-10 space-y-8">
      {error && (
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {season && s && (
        <section aria-label="Your pass value so far" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-lg font-bold">
            {season.label} — {money(season.costCents)}
          </h2>
          <p className="mt-1 text-xs text-white/40">
            Every figure below is based on your numbers: the pass cost
            {season.dayPriceCents != null
              ? ` and the ${money(season.dayPriceCents)} day-ticket price`
              : ""}{" "}
            you entered. Nothing is looked up or estimated.
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <dt className="text-xs text-white/45">Days logged</dt>
              <dd className="mt-1 text-2xl font-bold">{s.daysLogged}</dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <dt className="text-xs text-white/45">Cost per day so far</dt>
              <dd className="mt-1 text-2xl font-bold">
                {s.costPerDayCents != null ? money(s.costPerDayCents) : "—"}
              </dd>
            </div>
            {s.valueReceivedCents != null && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <dt className="text-xs text-white/45">Value received (your day price × days)</dt>
                <dd className="mt-1 text-2xl font-bold">{money(s.valueReceivedCents)}</dd>
              </div>
            )}
            {s.breakEvenDays != null && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <dt className="text-xs text-white/45">Break-even day</dt>
                <dd className="mt-1 text-2xl font-bold">Day {s.breakEvenDays}</dd>
              </div>
            )}
          </dl>
          {s.paidForItselfOnDay != null ? (
            <p className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-2.5 text-sm font-semibold text-[#e8c55a]">
              <PiggyBank className="h-4 w-4" />
              Your pass paid for itself on day {s.paidForItselfOnDay}.
            </p>
          ) : s.daysToBreakEven != null ? (
            <p className="mt-5 text-sm text-white/60">
              {s.daysToBreakEven} more {s.daysToBreakEven === 1 ? "day" : "days"} at your
              day-ticket price and the pass has paid for itself.
            </p>
          ) : (
            <p className="mt-5 text-sm text-white/60">
              Add the day-ticket price you would otherwise pay (in your pass
              details below) to see value received and your break-even day.
            </p>
          )}
        </section>
      )}

      <section aria-label="Your pass details" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
        <h2 className="text-lg font-bold">{season ? "Your pass details" : "Set up your pass"}</h2>
        <p className="mt-1 text-sm text-white/55">
          Enter your pass and what you actually paid for it. The day-ticket
          price is optional — it is your own typical price, used only for the
          value and break-even figures.
        </p>
        <form onSubmit={saveSeason} className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="pv-preset" className={labelCls}>Pass</label>
            <select id="pv-preset" value={preset} onChange={e => setPreset(e.target.value)} className={inputCls}>
              {PASS_LABEL_PRESETS.map(p => (
                <option key={p} value={p} className="bg-[#0b0f1a]">{p}</option>
              ))}
            </select>
          </div>
          {preset === "Other" && (
            <div>
              <label htmlFor="pv-custom" className={labelCls}>Pass name</label>
              <input id="pv-custom" value={customLabel} onChange={e => setCustomLabel(e.target.value)} maxLength={60} placeholder="e.g. Loveland season pass" className={inputCls} />
            </div>
          )}
          <div>
            <label htmlFor="pv-cost" className={labelCls}>What you paid ($)</label>
            <input id="pv-cost" inputMode="decimal" value={cost} onChange={e => setCost(e.target.value)} placeholder="e.g. 899" className={inputCls} />
          </div>
          <div>
            <label htmlFor="pv-dayprice" className={labelCls}>Your typical day-ticket price ($) — optional</label>
            <input id="pv-dayprice" inputMode="decimal" value={dayPrice} onChange={e => setDayPrice(e.target.value)} placeholder="e.g. 120" className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-50">
              {season ? "Update pass details" : "Save my pass"}
            </button>
          </div>
        </form>
      </section>

      {season && (
        <section aria-label="Log a ski day" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h2 className="text-lg font-bold">Log a ski day</h2>
          <form onSubmit={logDay} className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <label htmlFor="pv-date" className={labelCls}>Date skied</label>
              <input id="pv-date" type="date" value={skiedOn} onChange={e => setSkiedOn(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="pv-resort" className={labelCls}>Resort (optional)</label>
              <select id="pv-resort" value={resortSlug} onChange={e => setResortSlug(e.target.value)} className={inputCls}>
                <option value="" className="bg-[#0b0f1a]">No specific resort</option>
                {resorts.map(r => (
                  <option key={r.slug} value={r.slug} className="bg-[#0b0f1a]">{r.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition disabled:opacity-50">
              <CalendarPlus className="h-4 w-4" /> Log day
            </button>
          </form>

          {state.days.length > 0 ? (
            <ul className="mt-6 divide-y divide-white/[0.06]">
              {[...state.days].reverse().map(d => (
                <li key={d.id} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <span className="text-white/80">
                    {d.skiedOn} · {resortName(d.resortSlug)}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void send("DELETE", { id: d.id })}
                    aria-label={`Remove day ${d.skiedOn}`}
                    className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-red-300 transition disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-white/50">
              No days logged yet — log your first day above and your cost per
              day starts counting down.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
