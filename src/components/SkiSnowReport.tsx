import Link from "next/link";
import { ExternalLink, Snowflake } from "lucide-react";
import type { SkiResort } from "@/lib/ski-resorts";
import type { SkiStakeCam } from "@/data/ski-stake-cams";
import { fetchResortSnow } from "@/lib/ski/openmeteo";
import {
  buildSnowReportView,
  formatSnowfall,
  snowReportHasFigures,
} from "@/lib/ski/snow-report";
import SkiPlowsNear from "@/components/SkiPlowsNear";

/**
 * The snow report section on a resort page (Wave 2 item 8, 2026-11-06).
 *
 * Every block is real data with its source named on the page:
 *  - modelled snowfall from Open-Meteo (a weather MODEL — labelled
 *    modelled everywhere, with the fetch time; never presented as a
 *    measured report);
 *  - the operator's own snow-stake camera, where the operator labels
 *    one (src/data/ski-stake-cams) — shown as a picture to read, never
 *    converted into a number;
 *  - live DOT snow plows near the resort (client component over
 *    /api/plows; renders only when the feed actually has vehicles);
 *  - a link out to the resort's OWN snow report for the measured
 *    snowfall, base depth and lift status WorldEye does not publish.
 * A block with no data renders nothing. Base depth appears nowhere:
 * no source in this codebase provides it.
 */

function fetchedLabel(iso: string, timezone: string | null): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone ?? "UTC",
      timeZoneName: "short",
    }).format(d);
  } catch {
    return "";
  }
}

export default async function SkiSnowReport({
  resort,
  stakeCam,
  snowReportUrl,
}: {
  resort: SkiResort;
  stakeCam?: SkiStakeCam;
  snowReportUrl?: string;
}) {
  const data = await fetchResortSnow(resort.lat, resort.lng, {
    pastDays: 2,
    forecastDays: 4,
    revalidateSeconds: 1800,
  }).catch(() => null);
  const view = data ? buildSnowReportView(data, new Date()) : null;
  const hasFigures = view != null && snowReportHasFigures(view);
  const fetched = view ? fetchedLabel(view.fetchedAtIso, view.timezone) : "";

  const reportHost = snowReportUrl
    ? new URL(snowReportUrl).hostname.replace(/^www\./, "")
    : null;

  const officialTail = snowReportUrl
    ? "the patrol's measured report is the official one, linked below"
    : "the patrol's measured report is the official one";
  const intro = !hasFigures
    ? `The modelled snowfall feed returned no figures for ${resort.name} on its latest run, so this page prints none — the live cameras further down are the conditions check, and the measured numbers are in ${resort.name}'s official report.`
    : view!.last24hCm != null && view!.last24hCm > 0.05
      ? `The weather model puts ${formatSnowfall(view!.last24hCm)} of new snow on ${resort.name} over the last 24 hours${
          view!.upcomingTotalCm != null && view!.upcomingTotalCm > 0.05
            ? `, with ${formatSnowfall(view!.upcomingTotalCm)} more modelled over the next three days`
            : ""
        }. Modelled is not measured — it is the forecast model's read at the resort's coordinates, and ${officialTail}.`
      : `The weather model shows no meaningful new snow on ${resort.name} over the last 24 hours${
          view!.upcomingTotalCm != null && view!.upcomingTotalCm > 0.05
            ? `, but it models ${formatSnowfall(view!.upcomingTotalCm)} over the next three days`
            : " and none in the next three days either"
        }. Modelled is not measured — ${officialTail}.`;

  const tiles: Array<{ label: string; value: string }> = [];
  if (view?.last24hCm != null) {
    tiles.push({ label: "New snow, last 24 hours · modelled", value: formatSnowfall(view.last24hCm) });
  }
  if (view?.today?.snowfallCm != null) {
    tiles.push({ label: "Today · modelled", value: formatSnowfall(view.today.snowfallCm) });
  }
  if (view?.upcomingTotalCm != null) {
    tiles.push({ label: "Next 3 days · modelled", value: formatSnowfall(view.upcomingTotalCm) });
  }

  return (
    <section id="snow-report" className="mt-12 scroll-mt-24">
      <h2 className="text-xl md:text-2xl font-bold mb-2">
        Snow report — {resort.name}
      </h2>
      <p className="text-sm text-white/50 mb-5 max-w-3xl">
        What the model, the stake camera and the plows say about {resort.name} right
        now — each figure labelled with its source. WorldEye never invents a snow
        number: measured snowfall, base depth and lift status live in the
        resort&apos;s official report{snowReportUrl ? ", linked from this section" : ""}.
      </p>
      <p className="text-white/70 leading-relaxed max-w-3xl">{intro}</p>

      {tiles.length > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-3 max-w-2xl text-center">
          {tiles.map(t => (
            <div
              key={t.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="text-lg md:text-2xl font-bold text-[#D4AF37]">{t.value}</div>
              <div className="text-xs text-white/45 mt-1">{t.label}</div>
            </div>
          ))}
        </div>
      )}

      {view && view.upcoming.length > 0 && (
        <div className="mt-5 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 font-semibold text-white/90 mb-3">
            <Snowflake className="w-4 h-4 text-[#00E5FF]" /> Modelled snowfall, day by day
          </div>
          <ul className="divide-y divide-white/5 text-sm">
            {view.today && (
              <li className="flex items-baseline justify-between gap-4 py-2">
                <span className="text-white/70">Today — {view.today.label}</span>
                <span className="font-semibold text-white/90">
                  {view.today.snowfallCm != null ? formatSnowfall(view.today.snowfallCm) : "—"}
                </span>
              </li>
            )}
            {view.upcoming.map(d => (
              <li key={d.date} className="flex items-baseline justify-between gap-4 py-2">
                <span className="text-white/70">{d.label}</span>
                <span className="font-semibold text-white/90">
                  {d.snowfallCm != null ? formatSnowfall(d.snowfallCm) : "—"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-white/40">
            Snowfall modelled by Open-Meteo (open-meteo.com) at {resort.name}&apos;s
            coordinates{fetched ? `, fetched ${fetched}` : ""}. A weather model is
            not a measurement on the mountain — for patrol-measured snowfall and
            base depth, use the official snow report.
          </p>
        </div>
      )}

      {stakeCam && (
        <div className="mt-5 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="font-semibold text-white/90 mb-2">
            The snow stake, live — read the board yourself
          </div>
          <p className="text-sm text-white/55 leading-relaxed mb-4">
            This is the camera {stakeCam.operator} itself labels
            &ldquo;{stakeCam.label}&rdquo;, pointed at the measuring board the patrol
            reads. WorldEye doesn&apos;t turn the picture into a number — open the
            feed, or watch the overnight frames replay in the{" "}
            <Link href="#snow-stake" className="font-semibold text-[#00E5FF] hover:underline">
              snow-stake section below
            </Link>
            .
          </p>
          {/* The operator's own live still, hot-linked exactly as the
              stake section below serves it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={stakeCam.feedUrl}
            alt={`${stakeCam.operator} ${stakeCam.label} camera at ${resort.name} — live still`}
            className="w-full rounded-xl border border-white/10"
            loading="lazy"
          />
          <p className="mt-3 text-xs text-white/40">
            Live still from {stakeCam.operator} —{" "}
            <a
              href={stakeCam.sourcePage}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/30 hover:decoration-white"
            >
              the operator&apos;s own camera page
            </a>
            .
          </p>
        </div>
      )}

      <div className="mt-5 max-w-2xl">
        <SkiPlowsNear lat={resort.lat} lng={resort.lng} resortName={resort.name} />
      </div>

      {snowReportUrl && (
        <div className="mt-5 max-w-2xl">
          <a
            href={snowReportUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black text-sm font-bold hover:brightness-110 transition"
          >
            Official snow report &amp; lift status
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
          <p className="mt-3 text-sm text-white/45">
            Measured snowfall, base depth, grooming and lift &amp; terrain status —
            on {resort.name}&apos;s own snow report
            {reportHost ? ` (${reportHost})` : ""}. Lift status only ever comes
            from the resort itself.
          </p>
        </div>
      )}
    </section>
  );
}
