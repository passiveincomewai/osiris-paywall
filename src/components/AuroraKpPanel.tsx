"use client";

import { useEffect, useState } from "react";

/**
 * Live Kp readout for /aurora-webcams — the same NOAA SWPC feed the
 * globe's status bar reads, via the site's own /api/space-weather
 * route. The verdict line is a plain-language reading of the current
 * Kp band only; it never promises a display. When NOAA does not
 * answer, the panel says the reading is unavailable rather than
 * inventing a calm sky.
 */

interface SpaceWeather {
  kp_index: number | null;
  kp_available: boolean;
  storm_level: string;
  storm_color: string;
  kp_timestamp: string;
  alerts: Array<{ id: string; message: string }>;
}

function verdict(kp: number): string {
  if (kp >= 5)
    return "Storm level — the auroral oval is pushed well south. Cameras across Finland, Iceland and Norway have a strong chance on clear, dark skies, and displays can reach mid-latitude feeds too.";
  if (kp >= 4)
    return "Active — at the G1 (minor storm) threshold. Cameras under the oval — Lapland, Iceland, northern Norway, Fairbanks — have a real chance tonight where skies are dark and clear.";
  if (kp >= 3)
    return "Unsettled — arcs are plausible under the oval itself (Finnish and Swedish Lapland, Iceland, Tromsø, Fairbanks) on dark, clear nights. Further south, displays are unlikely at this level.";
  if (kp >= 2)
    return "Mostly quiet — only the far-north cameras under the oval's usual position are worth checking, and only on genuinely dark, clear nights.";
  return "Quiet — displays are unlikely tonight even at high latitude. The cameras below still show the aurora belt's night weather; check back when the index climbs.";
}

export default function AuroraKpPanel() {
  const [data, setData] = useState<SpaceWeather | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/space-weather")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("space weather"))))
      .then((json: SpaceWeather) => {
        if (live) setData(json);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <section aria-label="Live Kp index" className="mt-12">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-white/40">
              LIVE GEOMAGNETIC INDEX (NOAA SWPC)
            </p>
            {data && data.kp_available && data.kp_index !== null ? (
              <>
                <p className="mt-3 text-5xl md:text-6xl font-bold tabular-nums">
                  Kp {data.kp_index.toFixed(1)}
                  <span
                    className="ml-4 align-middle text-sm font-semibold px-3 py-1.5 rounded-full border"
                    style={{ color: data.storm_color, borderColor: `${data.storm_color}66` }}
                  >
                    {data.storm_level}
                  </span>
                </p>
                <p className="mt-4 text-sm md:text-base text-white/65 leading-relaxed max-w-2xl">
                  {verdict(data.kp_index)}
                </p>
                {data.kp_timestamp ? (
                  <p className="mt-3 text-xs text-white/35">
                    Latest NOAA reading: {data.kp_timestamp} UTC. The index updates
                    continuously; cloud and daylight at the camera still decide what a
                    feed can show.
                  </p>
                ) : null}
              </>
            ) : failed || (data && !data.kp_available) ? (
              <p className="mt-3 text-sm md:text-base text-white/65 leading-relaxed max-w-2xl">
                The live Kp reading is unavailable right now — NOAA&apos;s feed did not
                answer. Check{" "}
                <a
                  href="https://www.swpc.noaa.gov"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#00E5FF] hover:underline"
                >
                  NOAA SWPC
                </a>{" "}
                for the current index, and judge any camera by its own sky: genuinely
                dark, clear and current is the test.
              </p>
            ) : (
              <p className="mt-3 text-sm text-white/45">Reading the live Kp index…</p>
            )}
          </div>
        </div>

        {data && data.alerts.length > 0 ? (
          <div className="mt-6 border-t border-white/10 pt-5 space-y-2">
            {data.alerts.slice(0, 3).map((a) => (
              <p key={a.id} className="text-xs text-white/50 leading-relaxed">
                <span className="text-white/70 font-semibold">NOAA alert: </span>
                {a.message}
              </p>
            ))}
          </div>
        ) : null}

        <p className="mt-6 border-t border-white/10 pt-5 text-sm text-white/55 leading-relaxed">
          <span className="text-white/75 font-semibold">Late-October outlook:</span>{" "}
          NOAA&apos;s outlooks for the final week of October 2026 have flagged possible
          G1 (minor) storm periods, including a window around October 31. Treat that as
          an outlook, never a promise — geomagnetic forecasts only firm up one to three
          days ahead, coronal holes and CMEs permitting, and the live Kp above is the
          verdict on any given night.
        </p>
      </div>
    </section>
  );
}
