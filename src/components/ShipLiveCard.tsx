"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Anchor, Compass, Gauge, MapPin, Radio } from "lucide-react";
import {
  formatAge,
  formatCoordinates,
  type ShipLiveView,
} from "@/lib/ships/match";

/** Wire shape of GET /api/ships/[ship] — a ShipLiveView, flattened. */
type LivePayload = {
  status: "live" | "not-reporting";
  lat?: number;
  lng?: number;
  speedKnots?: number | null;
  headingDeg?: number | null;
  headingPoint?: string | null;
  destination?: string | null;
  reportedAt?: string;
};

/**
 * The live-position card on a /ships/[ship] page. Server-rendered with
 * an initial view, then polls the narrow public endpoint for just this
 * ship. When the ship is not reporting, the card says exactly that —
 * no coordinates, no last-known position, no itinerary guesses.
 */
export default function ShipLiveCard({
  slug,
  shipName,
  initial,
}: {
  slug: string;
  shipName: string;
  initial: ShipLiveView;
}) {
  const [view, setView] = useState<ShipLiveView>(initial);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/ships/${slug}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const data = (await res.json()) as LivePayload;
        if (cancelled) return;
        if (data.status === "live" && data.reportedAt) {
          setView({
            status: "live",
            name: shipName,
            lat: data.lat ?? 0,
            lng: data.lng ?? 0,
            speedKnots: data.speedKnots ?? null,
            headingDeg: data.headingDeg ?? null,
            headingPoint: data.headingPoint ?? null,
            destination: data.destination ?? null,
            reportedAt: data.reportedAt,
            ageSeconds: Math.max(
              0,
              Math.round((Date.now() - Date.parse(data.reportedAt)) / 1000),
            ),
          });
        } else {
          setView({ status: "not-reporting" });
        }
      } catch {
        // Keep the last known state on a failed poll; the next one retries.
      }
    };
    const pollId = setInterval(poll, 60_000);
    const tickId = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => {
      cancelled = true;
      clearInterval(pollId);
      clearInterval(tickId);
    };
  }, [slug, shipName]);

  if (view.status !== "live") {
    return (
      <section
        aria-label={`${shipName} live position`}
        className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8"
      >
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-amber-300/90">
          <span className="w-2 h-2 rounded-full bg-amber-300/80" />
          NOT CURRENTLY REPORTING
        </p>
        <h2 className="text-xl md:text-2xl font-bold mt-3">
          {shipName} isn&apos;t in the live AIS feed right now
        </h2>
        <p className="text-sm text-white/55 leading-relaxed mt-3 max-w-2xl">
          Ships only appear here while their AIS transponder is broadcasting
          and a receiver is in range. {shipName} may be mid-ocean beyond
          shore receiver coverage, in a coverage gap, or between broadcasts.
          This page never fills the gap with a guessed or last-known
          position — when she reports again, her live position will appear
          here automatically. Meanwhile, the{" "}
          <Link href="/ship-tracker" className="text-[#00E5FF] hover:underline">
            live ship tracker
          </Link>{" "}
          shows the traffic that is reporting.
        </p>
      </section>
    );
  }

  const ageSeconds = Math.max(
    0,
    Math.round((nowMs - Date.parse(view.reportedAt)) / 1000),
  );

  const cells: { icon: typeof MapPin; label: string; value: string }[] = [
    {
      icon: MapPin,
      label: "Position",
      value: formatCoordinates(view.lat, view.lng),
    },
    {
      icon: Gauge,
      label: "Speed over ground",
      value:
        view.speedKnots === null ? "Not broadcast" : `${view.speedKnots} knots`,
    },
    {
      icon: Compass,
      label: "Heading",
      value:
        view.headingDeg === null
          ? "Not broadcast"
          : `${Math.round(view.headingDeg)}° ${view.headingPoint ?? ""}`.trim(),
    },
    {
      icon: Anchor,
      label: "Destination (as broadcast by the ship)",
      value: view.destination ?? "Not broadcast",
    },
  ];

  return (
    <section
      aria-label={`${shipName} live position`}
      className="rounded-3xl border border-[#00E5FF]/25 bg-[#00E5FF]/[0.04] p-6 md:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-emerald-300">
          <span className="relative flex w-2.5 h-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-emerald-400" />
          </span>
          LIVE — REPORTED {formatAge(ageSeconds).toUpperCase()}
        </p>
        <p className="inline-flex items-center gap-1.5 text-xs text-white/40">
          <Radio className="w-3.5 h-3.5" />
          AIS · last report{" "}
          {new Date(view.reportedAt).toLocaleString("en-US", {
            timeZone: "UTC",
            hour12: false,
          })}{" "}
          UTC
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        {cells.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-white/40">
              <c.icon className="w-4 h-4 text-[#00E5FF]" /> {c.label}
            </p>
            <p className="text-lg font-semibold text-white/90 mt-1.5">
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-white/40 leading-relaxed mt-5">
        Position from {shipName}&apos;s own AIS transponder broadcast, via
        WorldEye&apos;s maritime feed. AIS is a safety broadcast, not a
        navigation feed for this page — and the destination shown is the
        one the crew entered, exactly as transmitted.
      </p>
    </section>
  );
}
