"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * "Happening now" board for /live-flight-tracker (site-audit Wave 2,
 * R22): the page explained flight tracking at length with no live
 * data of its own, unlike /earthquake-tracker. This board reads
 * the site's own /api/flights feed — the same records the globe's
 * aircraft layer renders — and shows the live tracked count plus
 * the highest airborne commercial flights right now. Every number
 * comes from the payload; failures and empty feeds render honest
 * states, never invented traffic.
 */

type Flight = {
  callsign: string;
  lat: number;
  lng: number;
  alt: number; // metres
  speed_knots: number | null;
  model_name: string;
  grounded?: boolean;
  category?: string;
};

type FlightsPayload = {
  commercial_flights?: Flight[];
  private_flights?: Flight[];
  private_jets?: Flight[];
  military_flights?: Flight[];
  total?: number;
  source?: string;
  timestamp?: string;
};

const REFRESH_MS = 60_000;
const fmt = (n: number) => n.toLocaleString("en-US");

export default function FlightsNowBoard() {
  const [payload, setPayload] = useState<FlightsPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const load = async () => {
      try {
        const res = await fetch("/api/flights", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as FlightsPayload;
        if (!aliveRef.current) return;
        setPayload(data);
        setFailed(false);
      } catch {
        if (aliveRef.current) setFailed(true);
      }
    };
    load();
    timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_MS);
    return () => {
      aliveRef.current = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const all: Flight[] = payload
    ? [
        ...(payload.commercial_flights ?? []),
        ...(payload.private_flights ?? []),
        ...(payload.private_jets ?? []),
        ...(payload.military_flights ?? []),
      ]
    : [];
  const total =
    typeof payload?.total === "number" ? payload.total : all.length;
  const top = (payload?.commercial_flights ?? [])
    .filter((f) => !f.grounded && f.alt > 0)
    .sort((a, b) => b.alt - a.alt)
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
      {payload === null && !failed && (
        <p className="text-white/50">Loading the live flight feed…</p>
      )}
      {failed && payload === null && (
        <p className="text-white/60">
          Live flight data is unavailable right now —{" "}
          <Link href="/" className="text-[#7dd3fc] hover:underline">
            open the globe
          </Link>{" "}
          to see the aircraft layer.
        </p>
      )}
      {payload !== null && total === 0 && (
        <p className="text-white/60">
          The flight feed is reporting no tracked aircraft at this
          moment. Counts update continuously — check back shortly.
        </p>
      )}
      {payload !== null && total > 0 && (
        <>
          <p className="text-3xl font-bold text-white">
            {fmt(total)}{" "}
            <span className="text-base font-medium text-white/50">
              aircraft tracked right now
            </span>
          </p>
          {top.length > 0 && (
            <ul className="mt-6 divide-y divide-white/5">
              {top.map((f) => (
                <li
                  key={`${f.callsign}-${f.lat}-${f.lng}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm"
                >
                  <span className="font-semibold text-white/90">
                    {f.callsign}
                    <span className="ml-2 font-normal text-white/40">
                      {f.model_name}
                    </span>
                  </span>
                  <span className="text-white/60">
                    {fmt(Math.round(f.alt * 3.28084))} ft
                    {typeof f.speed_knots === "number"
                      ? ` · ${Math.round(f.speed_knots)} kt`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 text-xs text-white/35">
            Highest airborne commercial flights in the current feed.
            Live ADS-B data — the same feed that powers the
            globe&apos;s flight layer
            {payload.source ? ` (${payload.source})` : ""}. Refreshes
            every minute.
          </p>
        </>
      )}
    </div>
  );
}
