"use client";

import { useEffect, useState } from "react";

interface Vessel {
  name: string;
  lat: number;
  lng: number;
  speedKn: number | null;
  heading: number | null;
  destination: string | null;
  reportAgeSec: number;
}

interface FerryFeed {
  name: string;
  vessels: Vessel[];
  generatedAt: string;
}

function ageLabel(sec: number): string {
  if (sec < 90) return "just now";
  const m = Math.floor(sec / 60);
  return `${m} min ago`;
}

/**
 * Live ferry positions for one system, from /api/ferries/[system].
 * The honesty contract is part of the UI: AIS reports can be up to
 * ~10 minutes old (the feed drops anything older), the panel shows
 * only vessels reporting right now, and an empty panel says exactly
 * that — it is a vessel tracker, not a sailing schedule.
 */
export default function FerryLivePanel({
  slug,
  systemName,
}: {
  slug: string;
  systemName: string;
}) {
  const [feed, setFeed] = useState<FerryFeed | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/ferries/${slug}`);
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as FerryFeed;
        if (alive) {
          setFeed(json);
          setFailed(false);
        }
      } catch {
        if (alive) setFailed(true);
      }
    };
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [slug]);

  return (
    <div className="rounded-2xl border border-[rgba(130,170,255,0.22)] bg-[rgba(10,20,40,0.55)] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-bold text-white">
          {systemName} — on the water now
        </h3>
        <span className="text-[11px] uppercase tracking-wider text-slate-400">
          Live AIS · refreshes every 30 s
        </span>
      </div>

      {feed === null && !failed && (
        <p className="mt-3 text-sm text-slate-400">
          Listening for {systemName} vessels…
        </p>
      )}
      {failed && (
        <p className="mt-3 text-sm text-slate-400">
          The live feed is unreachable right now. The terminal cameras
          below are unaffected.
        </p>
      )}
      {feed !== null && feed.vessels.length === 0 && (
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          No {systemName} vessels are reporting on AIS right now.
          Ferries appear here only while they are transmitting — a
          boat at the dock with a quiet transponder, or in a coverage
          shadow, is not shown rather than guessed at. Check the
          terminal cameras below for the docks themselves.
        </p>
      )}
      {feed !== null && feed.vessels.length > 0 && (
        <ul className="mt-3 divide-y divide-[rgba(130,170,255,0.12)]">
          {feed.vessels.map((v) => (
            <li
              key={`${v.name}-${v.lat}-${v.lng}`}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
            >
              <span className="font-semibold text-slate-100">{v.name}</span>
              <span className="text-sm text-slate-400">
                {v.speedKn !== null
                  ? v.speedKn < 1
                    ? "at the dock or holding"
                    : `${v.speedKn.toFixed(1)} kn`
                  : "speed not reported"}
                {v.destination ? ` · bound for ${v.destination}` : ""}
                {` · reported ${ageLabel(v.reportAgeSec)}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Positions are the vessels’ own AIS broadcasts, matched by
        fleet name inside the service area. Reports can be up to
        about 10 minutes old — the feed drops anything older — so
        treat this as where the boats were moments ago, and never as
        a sailing schedule: for departure times, use the operator’s
        own status.
      </p>
    </div>
  );
}
