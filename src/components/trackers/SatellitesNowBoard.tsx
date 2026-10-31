"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  decodeSatelliteRows,
  type SatelliteRow,
} from "@/lib/satellite-payload";

/**
 * "Happening now" board for /satellite-tracker (site-audit Wave 2,
 * R22): the page explained satellite tracking with no live data of
 * its own. This board reads the site's own /api/satellites feed —
 * positions propagated server-side from current TLE data, the same
 * rows the globe's satellite layer renders — and shows the tracked
 * count plus the best-known named objects (the two crewed stations
 * and Hubble) with their propagated positions at the feed's epoch.
 * Failures and empty feeds render honest states.
 */

const REFRESH_MS = 120_000;
const fmt = (n: number) => n.toLocaleString("en-US");

const NOTABLE: Array<{ match: RegExp; label: string }> = [
  { match: /ISS|ZARYA/i, label: "International Space Station" },
  { match: /TIANGONG|CSS/i, label: "Tiangong space station" },
  { match: /HUBBLE|HST/i, label: "Hubble Space Telescope" },
];

export default function SatellitesNowBoard() {
  const [rows, setRows] = useState<SatelliteRow[] | null>(null);
  const [epoch, setEpoch] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    const load = async () => {
      try {
        const res = await fetch("/api/satellites", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const body: unknown = await res.json();
        if (!aliveRef.current) return;
        setRows(decodeSatelliteRows(body));
        const ts = (body as { timestamp?: unknown })?.timestamp;
        setEpoch(typeof ts === "string" ? ts : null);
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

  const notable = NOTABLE.map(({ match, label }) => ({
    label,
    row: rows?.find((r) => match.test(r.name)),
  })).filter((n) => n.row);

  return (
    <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
      {rows === null && !failed && (
        <p className="text-white/50">Loading the live satellite feed…</p>
      )}
      {failed && rows === null && (
        <p className="text-white/60">
          Live satellite data is unavailable right now —{" "}
          <Link href="/" className="text-[#7dd3fc] hover:underline">
            open the globe
          </Link>{" "}
          to see the satellite layer.
        </p>
      )}
      {rows !== null && rows.length === 0 && (
        <p className="text-white/60">
          The satellite feed is reporting no tracked objects at this
          moment. The catalogue reloads continuously — check back
          shortly.
        </p>
      )}
      {rows !== null && rows.length > 0 && (
        <>
          <p className="text-3xl font-bold text-white">
            {fmt(rows.length)}{" "}
            <span className="text-base font-medium text-white/50">
              satellites and objects tracked right now
            </span>
          </p>
          {notable.length > 0 && (
            <ul className="mt-6 divide-y divide-white/5">
              {notable.map(({ label, row }) => (
                <li
                  key={label}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-sm"
                >
                  <span className="font-semibold text-white/90">
                    {label}
                    <span className="ml-2 font-normal text-white/40">
                      {row!.mission}
                    </span>
                  </span>
                  <span className="text-white/60">
                    {Math.abs(row!.lat).toFixed(1)}°
                    {row!.lat >= 0 ? "N" : "S"},{" "}
                    {Math.abs(row!.lng).toFixed(1)}°
                    {row!.lng >= 0 ? "E" : "W"} · {fmt(Math.round(row!.alt))}{" "}
                    km up
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-5 text-xs text-white/35">
            Positions propagated from current TLE orbital data — the
            same feed that powers the globe&apos;s satellite layer
            {epoch
              ? ` (feed epoch ${new Date(epoch).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })})`
              : ""}
            . Refreshes every two minutes.
          </p>
        </>
      )}
    </div>
  );
}
