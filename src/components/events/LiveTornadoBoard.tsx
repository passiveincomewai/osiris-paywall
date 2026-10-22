"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock3, ExternalLink, Globe, ShieldAlert } from "lucide-react";
import type { TornadoAlert, TornadoReport } from "@/lib/events/tornadoes";

/**
 * The live board on /tornado-tracker: active NWS tornado warnings and
 * watches on top, the SPC's preliminary tornado reports below. Polls
 * /api/tornadoes every two minutes (the endpoint itself caches NWS for
 * 3 minutes and SPC for 30).
 */

const REFRESH_MS = 120_000;

function localTimeLabel(iso: string | null): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date(t));
}

function AlertCard({ alert }: { alert: TornadoAlert }) {
  const isWarning = alert.event !== "Tornado Watch";
  return (
    <div
      className={`rounded-3xl border p-6 ${
        isWarning
          ? "border-red-400/40 bg-red-500/[0.06]"
          : "border-amber-400/40 bg-amber-500/[0.05]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-bold tracking-wide rounded-full px-3 py-1 ${
            isWarning ? "bg-red-500/20 text-red-200" : "bg-amber-500/20 text-amber-200"
          }`}
        >
          {isWarning ? <ShieldAlert className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {alert.event.toUpperCase()}
        </span>
        {alert.tornadoDetection ? (
          <span className="text-[11px] font-medium text-white/70 border border-white/15 rounded-full px-2 py-0.5">
            {alert.tornadoDetection.toLowerCase() === "observed"
              ? "Tornado observed"
              : "Radar indicated"}
          </span>
        ) : null}
        {alert.damageThreat ? (
          <span className="text-[11px] font-medium text-red-200 border border-red-400/30 rounded-full px-2 py-0.5">
            Damage threat: {alert.damageThreat.toLowerCase()}
          </span>
        ) : null}
        {alert.maxHailSizeIn !== null ? (
          <span className="text-[11px] font-medium text-white/60 border border-white/15 rounded-full px-2 py-0.5">
            Hail to {alert.maxHailSizeIn}″
          </span>
        ) : null}
        {alert.maxWindGustMph !== null ? (
          <span className="text-[11px] font-medium text-white/60 border border-white/15 rounded-full px-2 py-0.5">
            Gusts to {alert.maxWindGustMph} mph
          </span>
        ) : null}
      </div>

      <p className="font-semibold text-white/90 leading-snug">
        {alert.headline ?? alert.event}
      </p>
      {alert.areaDesc ? (
        <p className="text-sm text-white/50 mt-1.5">{alert.areaDesc}</p>
      ) : null}
      <p className="text-sm text-white/45 mt-2 flex flex-wrap gap-x-4">
        {alert.senderName ? <span>{alert.senderName}</span> : null}
        {alert.expires ? (
          <span className="inline-flex items-center gap-1">
            <Clock3 className="w-3.5 h-3.5" /> Until {localTimeLabel(alert.expires)}
          </span>
        ) : null}
      </p>

      {(alert.description || alert.instruction) && (
        <details className="mt-4 group">
          <summary className="text-sm text-[#D4AF37] cursor-pointer list-none hover:underline">
            Full alert text & safety instructions
          </summary>
          {alert.description ? (
            <p className="text-sm text-white/60 leading-relaxed mt-3 whitespace-pre-line">
              {alert.description}
            </p>
          ) : null}
          {alert.instruction ? (
            <p className="text-sm text-white/80 leading-relaxed mt-3 whitespace-pre-line border-l-2 border-[#D4AF37]/50 pl-4">
              {alert.instruction}
            </p>
          ) : null}
        </details>
      )}

      <div className="flex items-center gap-3 mt-4">
        <a
          href={alert.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white transition"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Official NWS alert
        </a>
        <a
          href="/?layers=weather"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-3 py-1.5 hover:bg-[#D4AF37]/10 transition"
        >
          <Globe className="w-3.5 h-3.5" /> Weather on the globe
        </a>
      </div>
    </div>
  );
}

export default function LiveTornadoBoard() {
  const [alerts, setAlerts] = useState<TornadoAlert[] | null>(null);
  const [reports, setReports] = useState<TornadoReport[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/tornadoes");
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!alive) return;
        setAlerts(data.alerts ?? []);
        setReports(data.reports ?? []);
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
      {/* ── Live NWS alerts ── */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
        <p className="text-sm text-white/50">
          Tornado warnings & watches in effect right now
        </p>
        <p className="text-xs font-mono text-white/40">
          Source: NOAA / National Weather Service
          {updatedAt ? ` · checked ${new Date(updatedAt).toLocaleTimeString()}` : ""}
          {" · "}checks every 2 minutes
          {failed ? " · reconnecting…" : ""}
        </p>
      </div>

      {alerts === null ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/40 text-sm">
          Checking the National Weather Service…
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/50 text-sm leading-relaxed">
          No tornado warnings or watches are in effect right now. This
          board checks the NWS every two minutes and lights up the moment
          that changes.
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      )}

      {/* ── SPC reported tornadoes ── */}
      <div className="mt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
          <h3 className="text-xl md:text-2xl font-bold">
            Reported tornadoes — <span className="text-[#D4AF37]">last 3 days</span>
          </h3>
          <p className="text-xs font-mono text-white/40">
            Source: NOAA Storm Prediction Center
          </p>
        </div>
        <p className="text-sm text-white/45 leading-relaxed mb-5 max-w-3xl">
          These are <strong className="text-white/70">preliminary local storm
          reports</strong> — accounts from spotters, media, law enforcement and
          survey teams that SPC collects as events unfold. A report means
          someone reported a tornado; it is not a confirmed tornado, and any
          EF rating comes only from a later NWS damage survey.
        </p>

        {reports === null ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/40 text-sm">
            Loading recent reports…
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/50 text-sm leading-relaxed">
            No tornadoes have been reported to SPC in the last three days.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <Link
                key={r.id}
                href={`/tornado-tracker/report/${r.id}`}
                className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.02] p-5 hover:border-[#D4AF37]/40 transition"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white/90">
                    {r.location} — {r.county} County, {r.state}
                  </p>
                  <p className="text-sm text-white/45 mt-0.5">
                    {r.date} · {r.timeUtc.slice(0, 2)}:{r.timeUtc.slice(2)} UTC
                  </p>
                  {r.comments ? (
                    <p className="text-sm text-white/40 mt-1.5 line-clamp-2">{r.comments}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[11px] font-medium text-white/60 border border-white/15 rounded-full px-2.5 py-1">
                  {r.fScale ? `Reported scale: ${r.fScale}` : "Scale not rated"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
