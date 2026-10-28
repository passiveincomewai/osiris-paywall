"use client";

import { useEffect, useState } from "react";

interface PortShip {
  name: string;
  lat: number;
  lng: number;
  speedKn: number | null;
  heading: number | null;
  destination: string | null;
  reportAgeSec: number;
  status: "in-port" | "in-area";
  distanceKm: number;
}

interface PortFeed {
  name: string;
  ships: PortShip[];
  generatedAt: string;
}

function ageLabel(sec: number): string {
  if (sec < 90) return "just now";
  const m = Math.floor(sec / 60);
  return `${m} min ago`;
}

/**
 * One cruise port's LIVE PRESENCE board, from /api/cruise-ports/[port].
 * The labelling is the product: this shows ships physically in the
 * port area right now (AIS passenger-type vessels inside the board
 * radius, reports no older than the feed's 10-minute window). It is
 * never presented as a departure board — no schedule data backs
 * this site, and the panel says so on its face.
 */
export default function CruisePortBoard({
  slug,
  portName,
}: {
  slug: string;
  portName: string;
}) {
  const [feed, setFeed] = useState<PortFeed | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/cruise-ports/${slug}`);
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as PortFeed;
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
          In port right now — {portName}
        </h3>
        <span className="text-[11px] uppercase tracking-wider text-slate-400">
          Live AIS presence · refreshes every 30 s
        </span>
      </div>

      {feed === null && !failed && (
        <p className="mt-3 text-sm text-slate-400">
          Listening for ships at {portName}…
        </p>
      )}
      {failed && (
        <p className="mt-3 text-sm text-slate-400">
          The live feed is unreachable right now. The port cameras
          below are unaffected.
        </p>
      )}
      {feed !== null && feed.ships.length === 0 && (
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          No cruise ships are reporting inside the {portName} port
          area right now. Ships appear here while they are
          transmitting within the port’s radius — a berthed ship with
          a quiet transponder, or one whose type broadcast has not
          been received yet, is not shown rather than guessed at.
        </p>
      )}
      {feed !== null && feed.ships.length > 0 && (
        <ul className="mt-3 divide-y divide-[rgba(130,170,255,0.12)]">
          {feed.ships.map((s) => (
            <li
              key={`${s.name}-${s.lat}-${s.lng}`}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
            >
              <span className="font-semibold text-slate-100">
                {s.name}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                    s.status === "in-port"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-sky-500/20 text-sky-300"
                  }`}
                >
                  {s.status === "in-port" ? "In port" : "Underway in port area"}
                </span>
              </span>
              <span className="text-sm text-slate-400">
                {s.speedKn !== null && s.speedKn >= 1
                  ? `${s.speedKn.toFixed(1)} kn`
                  : "stopped"}
                {s.destination ? ` · bound for ${s.destination}` : ""}
                {` · reported ${ageLabel(s.reportAgeSec)}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        This is a live presence board, not a departure board: it
        lists the passenger vessels transmitting inside the port
        area right now, from their own AIS broadcasts (up to about
        10 minutes old — the feed drops anything older). No sailing
        times are shown, because no schedule feed backs them — for
        departure times, use the cruise line or the port authority.
      </p>
    </div>
  );
}
