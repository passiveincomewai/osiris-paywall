"use client";

/**
 * Live service-status island for a transit route page. The schedule
 * content around it is server-rendered from GTFS; the ALERT state is
 * fetched from /api/transit/alerts at view time so a detour posted
 * an hour ago never sits baked into a static page. While loading —
 * and for no-JS/crawler renders — the section simply shows its
 * heading and the checking line; nothing here invents a status.
 */
import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { alertTone, alertUntilMs, type AlertLike } from "@/lib/transit/explorer";

interface AlertsPayload {
  supported?: boolean;
  alerts?: AlertLike[];
}

export default function RouteAlertsLive({
  agencyId,
  agencyName,
  routeShort,
}: {
  agencyId: string;
  agencyName: string;
  routeShort: string;
}) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "unsupported" }
    | { kind: "error" }
    | { kind: "ready"; alerts: AlertLike[] }
  >({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    fetch(`/api/transit/alerts?agency=${encodeURIComponent(agencyId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("alerts"))))
      .then((j: AlertsPayload) => {
        if (!alive) return;
        if (j.supported === false) return setState({ kind: "unsupported" });
        const mine = (j.alerts ?? []).filter((a) => a.routes.includes(routeShort));
        setState({ kind: "ready", alerts: mine });
      })
      .catch(() => alive && setState({ kind: "error" }));
    return () => {
      alive = false;
    };
  }, [agencyId, routeShort]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="font-mono text-[11px] font-medium tracking-[0.25em] text-[#0096FF] mb-2">
        LIVE SERVICE STATUS
      </p>
      {state.kind === "loading" && (
        <p className="text-sm text-white/50">Checking the {agencyName} alerts feed…</p>
      )}
      {state.kind === "error" && (
        <p className="text-sm text-white/50">
          The live alerts feed didn&apos;t answer — the schedule below is the published
          timetable.
        </p>
      )}
      {state.kind === "unsupported" && (
        <p className="text-sm text-white/50">
          {agencyName} doesn&apos;t publish a live alerts feed here — the schedule below is
          the published timetable.
        </p>
      )}
      {state.kind === "ready" && state.alerts.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-white/70">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          No active service alerts for Route {routeShort} right now.
        </p>
      )}
      {state.kind === "ready" &&
        state.alerts.map((a) => {
          const tone = alertTone(a.effect);
          const until = alertUntilMs(a);
          return (
            <div key={a.id} className="flex gap-2.5 py-2 first:pt-0 last:pb-0">
              <AlertTriangle
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  tone.tone === "red"
                    ? "text-red-400"
                    : tone.tone === "cyan"
                      ? "text-cyan-300"
                      : "text-amber-300"
                }`}
              />
              <div>
                <p className="text-sm text-white/85">
                  <span className="font-mono text-[10px] tracking-widest text-white/45 mr-2">
                    {tone.label}
                  </span>
                  {a.header}
                </p>
                {until != null && (
                  <p className="text-xs text-white/40 mt-0.5">
                    Until{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(until))}
                  </p>
                )}
                {a.description && (
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">{a.description}</p>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
