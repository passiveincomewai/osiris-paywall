"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Aurora alert signup card for /northern-lights-webcams.
 *
 * Talks to /api/aurora-alerts: signed-out visitors get a sign-in CTA;
 * signed-in users pick from the preset places, see tonight's outlook
 * for each of their subscriptions, and can remove one in a tap. All
 * numbers come from the API (which derives them from NOAA's feed) —
 * this component computes nothing about the sky.
 */

interface TonightJson {
  nightKey: string;
  inProgress: boolean;
  maxKp: number | null;
  meets: boolean;
}

interface PlaceJson {
  slug: string;
  name: string;
  area: string;
  requiredKp: number;
  tonight: TonightJson | null;
}

interface SubJson {
  id: string;
  placeSlug: string;
  placeName: string;
  requiredKp: number;
  active: boolean;
  tonight: TonightJson | null;
}

interface Payload {
  max: number;
  places: PlaceJson[];
  subscriptions: SubJson[];
}

const fmtKp = (kp: number) => {
  const r = Math.round(kp * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};

export default function AuroraAlertsCard() {
  const [state, setState] = useState<"loading" | "anon" | "ready" | "error">("loading");
  const [data, setData] = useState<Payload | null>(null);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/aurora-alerts", { cache: "no-store" });
      if (res.status === 401) {
        setState("anon");
        return;
      }
      if (!res.ok) throw new Error("load");
      setData((await res.json()) as Payload);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const subscribedSlugs = useMemo(
    () => new Set(data?.subscriptions.map((s) => s.placeSlug) ?? []),
    [data],
  );
  const available = useMemo(
    () => (data?.places ?? []).filter((p) => !subscribedSlugs.has(p.slug)),
    [data, subscribedSlugs],
  );
  const areas = useMemo(() => [...new Set(available.map((p) => p.area))], [available]);
  const atCap = (data?.subscriptions.length ?? 0) >= (data?.max ?? 6);

  const subscribe = async () => {
    if (!pick || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/aurora-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeSlug: pick }),
      });
      if (res.status === 409) {
        setNote(`You can watch up to ${data?.max ?? 6} places — remove one first.`);
      } else if (!res.ok) {
        setNote("That didn't save — please try again.");
      } else {
        setPick("");
        await load();
      }
    } catch {
      setNote("That didn't save — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/aurora-alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) setNote("That didn't remove — please try again.");
      else await load();
    } catch {
      setNote("That didn't remove — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-12">
      <h2 className="text-xl md:text-2xl font-bold mb-5">Aurora alerts — one email when it&apos;s worth looking</h2>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <p className="text-sm text-white/55 leading-relaxed max-w-2xl">
          Pick a place and we&apos;ll email you — once that night, only when NOAA&apos;s forecast Kp
          reaches the level that place needs. No spam on quiet nights, and no promises: a display
          still needs darkness and a clear sky. Free for every signed-in account.
        </p>

        {state === "loading" && <p className="text-sm text-white/40 mt-4">Loading your alerts…</p>}

        {state === "error" && (
          <p className="text-sm text-white/50 mt-4">
            Alerts didn&apos;t load just now.{" "}
            <button onClick={() => void load()} className="underline text-white/80">
              Try again
            </button>
          </p>
        )}

        {state === "anon" && (
          <div className="mt-5">
            <a
              href="/signin?callbackUrl=/northern-lights-webcams"
              className="inline-block rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-bold text-black"
            >
              Sign in to set an aurora alert
            </a>
            <p className="text-xs text-white/40 mt-3">New to WorldEye? Creating an account is free.</p>
          </div>
        )}

        {state === "ready" && data && (
          <div className="mt-5">
            {data.subscriptions.length > 0 && (
              <ul className="space-y-2 mb-5">
                {data.subscriptions.map((sub) => (
                  <li
                    key={sub.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                  >
                    <span className="text-sm font-medium text-white/90">{sub.placeName}</span>
                    <span className="text-xs text-white/45">needs about Kp {fmtKp(sub.requiredKp)}</span>
                    <span className="text-xs text-white/45">
                      {sub.tonight
                        ? sub.tonight.maxKp === null
                          ? "tonight: no forecast data"
                          : `tonight: up to Kp ${fmtKp(sub.tonight.maxKp)}${
                              sub.tonight.meets ? " — alert will send" : ""
                            }`
                        : "tonight: forecast unavailable"}
                    </span>
                    <button
                      onClick={() => void remove(sub.id)}
                      disabled={busy}
                      className="ml-auto text-xs font-semibold text-white/60 underline underline-offset-2 hover:text-white disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {!atCap && available.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={pick}
                  onChange={(e) => setPick(e.target.value)}
                  className="rounded-xl border border-white/15 bg-white/[0.05] px-3 py-2.5 text-sm text-white/90 min-w-[220px]"
                  aria-label="Choose a place to watch"
                >
                  <option value="" className="bg-neutral-900">
                    Choose a place…
                  </option>
                  {areas.map((area) => (
                    <optgroup key={area} label={area} className="bg-neutral-900">
                      {available
                        .filter((p) => p.area === area)
                        .map((p) => (
                          <option key={p.slug} value={p.slug} className="bg-neutral-900">
                            {p.name} — needs about Kp {fmtKp(p.requiredKp)}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
                <button
                  onClick={() => void subscribe()}
                  disabled={!pick || busy}
                  className="rounded-xl bg-[#D4AF37] px-5 py-2.5 text-sm font-bold text-black disabled:opacity-40"
                >
                  Watch this place
                </button>
              </div>
            )}

            {atCap && (
              <p className="text-xs text-white/40">
                You&apos;re watching {data.max} places — the most the alerts support. Remove one to
                swap.
              </p>
            )}
            {note && <p className="text-sm text-amber-200/90 mt-3">{note}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
