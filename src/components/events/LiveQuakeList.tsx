"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Waves, Users } from "lucide-react";
import { SIGNIFICANT_MAGNITUDE } from "@/lib/events/earthquakes";

/**
 * The live significant-quakes list on /earthquake-tracker. Polls the very
 * endpoint the globe uses (/api/earthquakes — USGS summary feed) every
 * minute and filters to M4.5+, so this page and the map always agree.
 */

interface ApiQuake {
  id: string;
  lat: number;
  lng: number;
  depth: number | null;
  magnitude: number | null;
  place: string;
  time: number;
  url: string | null;
  tsunami: number | boolean | null;
  felt: number | null;
  alert: string | null;
}

const REFRESH_MS = 60_000;

function agoLabel(time: number, now: number): string {
  const mins = Math.max(0, Math.round((now - time) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

const UTC_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function magClasses(mag: number): string {
  if (mag >= 7) return "bg-red-500/20 text-red-300 border-red-400/40";
  if (mag >= 6) return "bg-orange-500/20 text-orange-300 border-orange-400/40";
  if (mag >= 5) return "bg-amber-500/20 text-amber-300 border-amber-400/40";
  return "bg-white/10 text-white/80 border-white/20";
}

export default function LiveQuakeList() {
  const [quakes, setQuakes] = useState<ApiQuake[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/earthquakes");
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!alive) return;
        const list: ApiQuake[] = (data.earthquakes ?? [])
          .filter(
            (q: ApiQuake) =>
              typeof q.magnitude === "number" && q.magnitude >= SIGNIFICANT_MAGNITUDE,
          )
          .sort((a: ApiQuake, b: ApiQuake) => b.time - a.time);
        setQuakes(list);
        setUpdatedAt(Date.now());
        setFailed(false);
      } catch {
        if (alive) setFailed(true);
      }
    };
    load();
    const t = setInterval(load, REFRESH_MS);
    const clock = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      alive = false;
      clearInterval(t);
      clearInterval(clock);
    };
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
        <p className="text-sm text-white/50">
          Magnitude {SIGNIFICANT_MAGNITUDE} and above · worldwide · last 24 hours
        </p>
        <p className="text-xs font-mono text-white/40">
          Source: USGS
          {updatedAt
            ? ` · updated ${new Date(updatedAt).toLocaleTimeString()}`
            : ""}
          {" · "}refreshes every minute
          {failed ? " · reconnecting…" : ""}
        </p>
      </div>

      {quakes === null ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/40 text-sm">
          Loading the latest earthquakes…
        </div>
      ) : quakes.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/50 text-sm leading-relaxed">
          No magnitude {SIGNIFICANT_MAGNITUDE}+ earthquakes in the last 24
          hours. This list updates itself the moment USGS publishes one.
        </div>
      ) : (
        <div className="space-y-3">
          {quakes.map((q) => (
            <div
              key={q.id}
              className="flex items-stretch gap-4 rounded-3xl border border-white/10 bg-white/[0.02] p-5 hover:border-[#ff8c5a]/40 transition"
            >
              <div
                className={`flex flex-col items-center justify-center rounded-2xl border px-3 py-2 min-w-[76px] ${magClasses(q.magnitude ?? 0)}`}
              >
                <span className="text-[10px] font-mono tracking-widest">MAG</span>
                <span className="text-2xl font-bold leading-none">
                  {(q.magnitude ?? 0).toFixed(1)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/earthquake-tracker/${q.id}`}
                  className="font-semibold text-white/90 hover:text-[#ff8c5a] transition line-clamp-2"
                >
                  {q.place}
                </Link>
                <p className="text-sm text-white/45 mt-1">
                  {agoLabel(q.time, now)} · {UTC_FMT.format(new Date(q.time))} UTC
                  {typeof q.depth === "number" ? ` · depth ${Math.round(q.depth)} km` : ""}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {q.tsunami ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-300 border border-sky-400/30 rounded-full px-2 py-0.5">
                      <Waves className="w-3 h-3" /> Tsunami flag
                    </span>
                  ) : null}
                  {typeof q.felt === "number" && q.felt > 0 ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/60 border border-white/15 rounded-full px-2 py-0.5">
                      <Users className="w-3 h-3" /> {q.felt} felt reports
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col items-end justify-between shrink-0">
                <a
                  href={`/?quake=${encodeURIComponent(q.id)}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-3 py-1.5 hover:bg-[#D4AF37]/10 transition"
                >
                  <Globe className="w-3.5 h-3.5" /> On the globe
                </a>
                <Link
                  href={`/earthquake-tracker/${q.id}`}
                  className="text-xs text-white/40 hover:text-white transition"
                >
                  Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
