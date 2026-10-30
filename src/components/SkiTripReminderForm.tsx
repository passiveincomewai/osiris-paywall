"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Trash2 } from "lucide-react";
import { formatTripDate } from "@/lib/ski/trip-reminders";

/**
 * Ski trip booking reminders (P9a) — the form on resort pages (fixed
 * resort) and the ski hub (resort picker).
 *
 * A signed-in user picks trip dates + an email; WorldEye emails two
 * book-ahead nudges (45 and 14 days before arrival) via the cron
 * runner. Reminders only — no booking, no prices; the copy says so.
 * Signed-out visitors get a sign-in prompt instead of a dead form.
 * The list below the form is the caller's own reminders (from
 * GET /api/ski/trip-reminders), each deletable in place.
 */

interface ResortOption {
  slug: string;
  name: string;
}

interface Reminder {
  id: string;
  resortSlug: string;
  resortName: string;
  email: string;
  tripStart: string;
  tripEnd: string | null;
  status: string;
  sent45: boolean;
  sent14: boolean;
}

type LoadState = "loading" | "signedOut" | "ready";

export default function SkiTripReminderForm({
  resort,
  resorts,
}: {
  /** Fixed resort (resort pages). Omit on the hub → resort picker. */
  resort?: ResortOption;
  /** Picker options (hub). Ignored when `resort` is set. */
  resorts?: ResortOption[];
}) {
  const [load, setLoad] = useState<LoadState>("loading");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [resortSlug, setResortSlug] = useState(resort?.slug ?? "");
  const [tripStart, setTripStart] = useState("");
  const [tripEnd, setTripEnd] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/ski/trip-reminders");
    if (res.status === 401) {
      setLoad("signedOut");
      return;
    }
    if (!res.ok) {
      setLoad("ready");
      return;
    }
    const data = await res.json();
    setReminders(Array.isArray(data.reminders) ? data.reminders : []);
    if (typeof data.email === "string" && data.email) {
      setEmail((prev) => prev || data.email);
    }
    setLoad("ready");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(confirmed: boolean) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/ski/trip-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resortSlug: resort?.slug ?? resortSlug,
          tripStart,
          tripEnd: tripEnd || undefined,
          email,
          confirmed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "typo_suggestion" && typeof data.suggestion === "string") {
          setSuggestion(data.suggestion);
        } else {
          setError(data.error ?? "Something went wrong — try again.");
        }
        return;
      }
      setSuggestion(null);
      setNotice(
        data.alreadyExists
          ? "That reminder is already set — you're covered."
          : "Reminder set. We'll email you 45 days and 14 days before the trip.",
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/ski/trip-reminders?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not delete that reminder.");
        return;
      }
      setNotice("Reminder deleted.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const mine = reminders.filter(
    (r) => r.status === "active" && (!resort || r.resortSlug === resort.slug),
  );
  const today = new Date().toISOString().slice(0, 10);
  const inputCls =
    "w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#D4AF37]/60 focus:outline-none";
  const labelCls = "block text-xs font-medium text-white/50 mb-1";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 max-w-3xl">
      <p className="flex items-center gap-2 text-xs font-bold tracking-[0.25em] text-[#D4AF37]">
        <BellRing className="w-4 h-4" /> TRIP REMINDERS
      </p>
      <h3 className="text-lg font-bold mt-2">
        {resort ? `Book-ahead reminders for ${resort.name}` : "Book-ahead trip reminders"}
      </h3>
      <p className="text-sm text-white/55 mt-1 leading-relaxed">
        Tell us when you&apos;re going and we&apos;ll email two nudges — 45 days out
        (time to book flights and lodging) and 14 days out (final checks). Reminders
        only: WorldEye doesn&apos;t book anything and there are no prices here —
        booking stays with the resort and the airlines, as it should.
      </p>

      {load === "loading" && <p className="text-sm text-white/40 mt-4">Loading…</p>}

      {load === "signedOut" && (
        <p className="text-sm text-white/60 mt-4">
          <Link href="/signin" className="text-[#D4AF37] underline">
            Sign in
          </Link>{" "}
          to set a trip reminder — reminders hang off your account so you can
          list and delete them any time.
        </p>
      )}

      {load === "ready" && (
        <>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(false);
            }}
          >
            {!resort && (
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor="sr-resort">Resort</label>
                <select
                  id="sr-resort"
                  className={inputCls}
                  value={resortSlug}
                  onChange={(e) => setResortSlug(e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Pick a resort…
                  </option>
                  {(resorts ?? []).map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls} htmlFor="sr-start">Arrival day</label>
              <input
                id="sr-start"
                type="date"
                className={inputCls}
                value={tripStart}
                min={today}
                onChange={(e) => setTripStart(e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="sr-end">Departure day (optional)</label>
              <input
                id="sr-end"
                type="date"
                className={inputCls}
                value={tripEnd}
                min={tripStart || today}
                onChange={(e) => setTripEnd(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="sr-email">Reminder email</label>
              <input
                id="sr-email"
                type="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="sm:col-span-2 text-sm text-red-300" role="alert">
                {error}
              </p>
            )}
            {suggestion && !error && (
              <p className="sm:col-span-2 text-sm text-amber-200">
                Did you mean <span className="text-white">{suggestion}</span>?{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setEmail(suggestion);
                    setSuggestion(null);
                    void submit(false);
                  }}
                >
                  Use it
                </button>{" "}
                ·{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setSuggestion(null);
                    void submit(true);
                  }}
                >
                  No, my address is right
                </button>
              </p>
            )}
            {notice && <p className="sm:col-span-2 text-sm text-emerald-300">{notice}</p>}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
              >
                {busy ? "Saving…" : "Set reminder"}
              </button>
            </div>
          </form>

          {mine.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-xs font-medium text-white/50 mb-2">Your reminders</p>
              <ul className="space-y-2">
                {mine.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-white/75">
                      {resort ? "" : `${r.resortName} · `}
                      {formatTripDate(r.tripStart)}
                      {r.tripEnd ? ` → ${formatTripDate(r.tripEnd)}` : ""}{" "}
                      <span className="text-white/40">({r.email})</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`Delete reminder for ${r.resortName}`}
                      className="text-white/40 hover:text-red-300 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void remove(r.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
