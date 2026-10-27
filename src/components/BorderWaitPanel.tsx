"use client";

import { Fragment, useEffect, useState } from "react";

/**
 * Live CBP wait times for one /border-crossings page. The page server-
 * renders the same snapshot for the first paint (and for crawlers);
 * this panel hydrates from that seed, then re-reads the site's own
 * /api/border/wait-times route every two minutes.
 *
 * Honesty rules, inherited from the feed's nature (lib/border/
 * wait-times): CBP's words are rendered verbatim — a lane CBP has not
 * updated says "Update Pending", never a dressed-up zero — every
 * reading carries CBP's own update phrasing, and when the feed is
 * unreachable the panel says wait times are unavailable instead of
 * holding up an old number as current.
 */

export interface BorderLaneView {
  key: string;
  label: string;
  status: string;
  delayMinutes: number | null;
  lanesOpen: number | null;
  updateTime: string | null;
}

export interface BorderPortView {
  portNumber: string;
  portName: string;
  crossingName: string;
  hours: string;
  portStatus: string;
  feedDate: string;
  feedTime: string;
  constructionNotice: string;
  groups: Array<{
    key: string;
    label: string;
    maximumLanes: number | null;
    lanes: BorderLaneView[];
  }>;
}

export interface BorderWaitView {
  ports: BorderPortView[];
  fetchedAt: string | null;
  stale: boolean;
}

function delayText(lane: BorderLaneView): string {
  if (lane.status === "Lanes Closed") return "Closed";
  if (lane.status === "Update Pending") return "No current reading";
  if (lane.status === "N/A") return "Not reported";
  if (lane.delayMinutes != null) {
    return lane.delayMinutes === 0 ? "No delay" : `${lane.delayMinutes} min delay`;
  }
  return lane.status;
}

function delayClass(lane: BorderLaneView): string {
  if (lane.status === "Lanes Closed") return "text-red-300";
  if (lane.delayMinutes != null && lane.delayMinutes >= 30) return "text-red-300";
  if (lane.delayMinutes != null && lane.delayMinutes > 0) return "text-amber-300";
  if (lane.status === "no delay" || lane.delayMinutes === 0) return "text-emerald-300";
  return "text-white/50";
}

export default function BorderWaitPanel({
  portNumbers,
  crossingName,
  initial,
}: {
  portNumbers: string[];
  crossingName: string;
  initial: BorderWaitView;
}) {
  const [view, setView] = useState<BorderWaitView>(initial);

  useEffect(() => {
    let live = true;
    const load = () =>
      fetch(`/api/border/wait-times?ports=${encodeURIComponent(portNumbers.join(","))}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("wait times"))))
        .then((json: BorderWaitView) => {
          if (live) setView(json);
        })
        .catch(() => {
          /* Keep the server snapshot; its own "as of" stamp says how
             old it is. The next poll retries. */
        });
    load();
    const t = setInterval(load, 120_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [portNumbers]);

  const fetchedLabel = view.fetchedAt
    ? new Date(view.fetchedAt).toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <section aria-label={`Border wait times at ${crossingName}`} className="mt-12">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-white/40">
              LIVE WAIT TIMES — U.S. CUSTOMS AND BORDER PROTECTION
            </p>
            <h2 className="text-xl md:text-2xl font-bold mt-2">
              {crossingName} border wait times
            </h2>
          </div>
          <p className="text-xs text-white/40 text-right">
            {view.stale || !fetchedLabel ? (
              <>Live readings are unavailable right now — see the note below.</>
            ) : (
              <>
                As reported by CBP · feed read {fetchedLabel}
                <br />
                Refreshes on this page every 2 minutes
              </>
            )}
          </p>
        </div>

        {view.ports.length === 0 ? (
          <p className="mt-6 text-sm leading-relaxed text-white/60 max-w-3xl">
            CBP&apos;s wait-time feed isn&apos;t answering, so this page won&apos;t show you a
            number it can&apos;t stand behind. The cameras below are live regardless — a
            visible queue is its own reading — and official wait times are posted at{" "}
            <a
              href="https://bwt.cbp.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00E5FF] hover:underline"
            >
              bwt.cbp.gov
            </a>
            .
          </p>
        ) : (
          <div className="mt-6 space-y-8">
            {view.ports.map((port) => (
              <div key={port.portNumber}>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h3 className="text-base md:text-lg font-semibold">
                    {port.crossingName && port.crossingName !== port.portName
                      ? `${port.portName} — ${port.crossingName}`
                      : port.portName}
                  </h3>
                  <span className="text-xs text-white/40">
                    Port {port.portNumber}
                    {port.hours ? ` · Hours: ${port.hours}` : ""}
                    {port.portStatus ? ` · ${port.portStatus}` : ""}
                  </span>
                </div>
                {port.constructionNotice && (
                  <p className="mt-2 text-sm text-amber-200/80">
                    Construction notice (CBP): {port.constructionNotice}
                  </p>
                )}
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="text-left text-white/40 border-b border-white/10">
                        <th className="py-2 pr-4 font-medium">Lane</th>
                        <th className="py-2 pr-4 font-medium">Wait</th>
                        <th className="py-2 pr-4 font-medium">Lanes open</th>
                        <th className="py-2 font-medium">CBP update</th>
                      </tr>
                    </thead>
                    <tbody>
                      {port.groups.map((group) => (
                        <Fragment key={`${port.portNumber}-${group.key}`}>
                          <tr>
                            <td
                              colSpan={4}
                              className="pt-4 pb-1 text-xs font-semibold tracking-[0.18em] text-white/40"
                            >
                              {group.label.toUpperCase()}
                              {group.maximumLanes != null
                                ? ` — UP TO ${group.maximumLanes} LANES`
                                : ""}
                            </td>
                          </tr>
                          {group.lanes.map((lane) => (
                            <tr
                              key={`${port.portNumber}-${group.key}-${lane.key}`}
                              className="border-b border-white/5"
                            >
                              <td className="py-2 pr-4 text-white/80">{lane.label}</td>
                              <td className={`py-2 pr-4 font-medium ${delayClass(lane)}`}>
                                {delayText(lane)}
                              </td>
                              <td className="py-2 pr-4 text-white/60">
                                {lane.lanesOpen != null ? lane.lanesOpen : "—"}
                              </td>
                              <td className="py-2 text-white/40">
                                {lane.updateTime ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-white/35">
                  CBP record stamped {port.feedDate} {port.feedTime} — the times in the
                  right-hand column are CBP&apos;s own update notes for each lane.
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-6 text-xs leading-relaxed text-white/35 max-w-3xl">
          Wait times are CBP&apos;s published estimates for reaching the inspection booth,
          shown exactly as the feed reports them — including &quot;Update Pending&quot;,
          which means the port has not published a fresh reading for that lane. A lane
          with no current reading is not an empty lane.
        </p>
      </div>
    </section>
  );
}
