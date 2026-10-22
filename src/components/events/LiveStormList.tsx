"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, Wind, Gauge, Navigation } from "lucide-react";
import {
  classificationLabel,
  compassDirection,
  groupStormFeatures,
  ktToMph,
  stormDisplayCategory,
  type StormGroup,
} from "@/lib/events/hurricanes";

/**
 * The live active-storms list on /hurricane-tracker. Polls the globe's
 * own /api/hurricanes (NOAA NHC) every five minutes; the NHC updates
 * its advisories on its own cycle, and this list follows automatically.
 */

const REFRESH_MS = 300_000;

function coordLabel(lat: number, lng: number): string {
  const la = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "N" : "S"}`;
  const lo = `${Math.abs(lng).toFixed(1)}°${lng >= 0 ? "E" : "W"}`;
  return `${la}, ${lo}`;
}

function nhcTimeLabel(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return `${new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(t))} UTC`;
}

export default function LiveStormList() {
  const [storms, setStorms] = useState<StormGroup[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/hurricanes");
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!alive) return;
        setStorms(groupStormFeatures(data.features ?? []));
        setUpdatedAt(Date.now());
        setFailed(false);
      } catch {
        if (alive) setFailed(true);
      }
    };
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
        <p className="text-sm text-white/50">
          Every tropical cyclone NHC is tracking right now
        </p>
        <p className="text-xs font-mono text-white/40">
          Source: NOAA National Hurricane Center
          {updatedAt ? ` · checked ${new Date(updatedAt).toLocaleTimeString()}` : ""}
          {" · "}checks every 5 minutes
          {failed ? " · reconnecting…" : ""}
        </p>
      </div>

      {storms === null ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/40 text-sm">
          Checking NHC for active storms…
        </div>
      ) : storms.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/50 text-sm leading-relaxed">
          No active tropical cyclones right now — the Atlantic, eastern
          Pacific and central Pacific are quiet. This list updates itself
          the moment NHC starts tracking a storm.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {storms.map((g) => {
            const c = g.current;
            const cat = stormDisplayCategory(g);
            const dir = compassDirection(c.movementDir);
            return (
              <div
                key={c.stormId}
                className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 hover:border-sky-400/40 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/hurricane-tracker/${c.stormId}`}
                      className="text-xl font-bold text-white/90 hover:text-sky-300 transition"
                    >
                      {classificationLabel(c.classification)} {c.name}
                    </Link>
                    <p className="text-sm text-white/45 mt-0.5">
                      {coordLabel(c.lat, c.lng)}
                      {c.lastUpdate ? ` · NHC update ${nhcTimeLabel(c.lastUpdate)}` : ""}
                    </p>
                  </div>
                  {cat !== null && cat > 0 ? (
                    <span className="shrink-0 text-xs font-bold text-red-300 border border-red-400/40 bg-red-500/10 rounded-full px-3 py-1">
                      CATEGORY {cat}
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-3 gap-3 mt-5 text-center">
                  <div className="rounded-2xl bg-white/[0.03] border border-white/5 py-3">
                    <Wind className="w-4 h-4 mx-auto text-sky-300 mb-1" />
                    <p className="text-sm font-semibold text-white/90">
                      {c.intensityKt !== null
                        ? `${c.intensityKt} kt`
                        : "—"}
                    </p>
                    <p className="text-[11px] text-white/40">
                      {c.intensityKt !== null ? `${ktToMph(c.intensityKt)} mph winds` : "winds"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.03] border border-white/5 py-3">
                    <Gauge className="w-4 h-4 mx-auto text-sky-300 mb-1" />
                    <p className="text-sm font-semibold text-white/90">
                      {c.pressureMb !== null ? `${c.pressureMb} mb` : "—"}
                    </p>
                    <p className="text-[11px] text-white/40">pressure</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.03] border border-white/5 py-3">
                    <Navigation className="w-4 h-4 mx-auto text-sky-300 mb-1" />
                    <p className="text-sm font-semibold text-white/90">
                      {dir ?? "—"}
                      {c.movementSpeedKt !== null ? ` · ${c.movementSpeedKt} kt` : ""}
                    </p>
                    <p className="text-[11px] text-white/40">movement</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-5">
                  <Link
                    href={`/hurricane-tracker/${c.stormId}`}
                    className="text-sm font-medium text-white/80 hover:text-white transition"
                  >
                    Storm details & forecast →
                  </Link>
                  <a
                    href={`/?storm=${encodeURIComponent(c.stormId)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-3 py-1.5 hover:bg-[#D4AF37]/10 transition"
                  >
                    <Globe className="w-3.5 h-3.5" /> On the globe
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
