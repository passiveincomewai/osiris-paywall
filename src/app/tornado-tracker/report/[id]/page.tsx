import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Globe } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import {
  fetchSpcReportById,
  type TornadoReport,
} from "@/lib/events/tornadoes";

/**
 * One SPC tornado report, as its own page. The report is a preliminary
 * local storm report collected by the NOAA Storm Prediction Center —
 * the page says so everywhere it matters and never upgrades it to a
 * confirmed tornado. The id embeds the SPC day, so the row is re-read
 * from its own source file; a long revalidation is fine because the
 * underlying report is a historical record.
 */
export const revalidate = 3600;

const BASE = "https://worldeye.app";

function titleFor(r: TornadoReport): string {
  return `Tornado reported near ${r.location}, ${r.county} County, ${r.state}`;
}

function dateLabel(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

function timeLabel(timeUtc: string): string {
  return `${timeUtc.slice(0, 2)}:${timeUtc.slice(2)} UTC`;
}

function scaleLabel(r: TornadoReport): string {
  if (!r.fScale) return "Not stated in the report";
  if (r.fScale.toUpperCase() === "UNK") return "UNK — no rating in the report";
  return `${r.fScale} (as reported)`;
}

function descriptionFor(r: TornadoReport): string {
  return (
    `A tornado was reported near ${r.location} in ${r.county} County, ${r.state} on ` +
    `${dateLabel(r.date)} at ${timeLabel(r.timeUtc)}. This is a preliminary local storm ` +
    `report collected by the NOAA Storm Prediction Center — reported, not confirmed; ` +
    `any official rating comes from a later NWS damage survey.`
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const r = await fetchSpcReportById(id).catch(() => null);
  if (!r) {
    return {
      title: "Tornado report | WorldEye",
      alternates: { canonical: `/tornado-tracker/report/${id}` },
    };
  }
  const title = `${titleFor(r)} — ${dateLabel(r.date)} | WorldEye`;
  const description = descriptionFor(r);
  return {
    title,
    description,
    alternates: { canonical: `/tornado-tracker/report/${r.id}` },
    openGraph: {
      title,
      description,
      url: `/tornado-tracker/report/${r.id}`,
      type: "article",
    },
  };
}

export default async function TornadoReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await fetchSpcReportById(id).catch(() => null);
  if (!r) notFound();

  const facts: Array<{ label: string; value: string }> = [
    { label: "Location (as reported)", value: r.location },
    { label: "County", value: `${r.county} County` },
    { label: "State", value: r.state },
    { label: "Date", value: dateLabel(r.date) },
    { label: "Time", value: timeLabel(r.timeUtc) },
    { label: "Reported scale", value: scaleLabel(r) },
    {
      label: "Coordinates",
      value: `${Math.abs(r.lat).toFixed(2)}°${r.lat >= 0 ? "N" : "S"}, ${Math.abs(r.lng).toFixed(2)}°${r.lng >= 0 ? "E" : "W"}`,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: titleFor(r),
        description: descriptionFor(r),
        url: `${BASE}/tornado-tracker/report/${r.id}`,
        isPartOf: { "@type": "WebSite", name: "WorldEye", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "WorldEye", item: BASE },
          {
            "@type": "ListItem",
            position: 2,
            name: "Tornado tracker",
            item: `${BASE}/tornado-tracker`,
          },
          { "@type": "ListItem", position: 3, name: titleFor(r) },
        ],
      },
    ],
  };

  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#e11d48]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/tornado-tracker"
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Tornado tracker
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-red-300 border border-red-400/30 rounded-full px-4 py-1.5 mb-6">
            REPORTED TORNADO · PRELIMINARY
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            {titleFor(r)}
          </h1>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            {descriptionFor(r)}
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <a
              href="/?layers=weather"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              <Globe className="w-4 h-4" /> Live weather on the globe
            </a>
            <a
              href={`https://www.spc.noaa.gov/climo/reports/${r.spcDay}_rpts_torn.csv`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-white/15 text-white/80 font-semibold hover:bg-white/5 transition"
            >
              Source data at SPC <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="mt-14">
          <h2 className="text-2xl font-bold mb-6">
            The report, <span className="text-[#D4AF37]">as filed</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {facts.map((f) => (
              <div key={f.label} className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-[11px] font-mono tracking-[0.2em] text-white/40 mb-1.5">
                  {f.label.toUpperCase()}
                </p>
                <p className="font-semibold text-white/90">{f.value}</p>
              </div>
            ))}
          </div>

          {r.comments ? (
            <figure className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
              <blockquote className="text-white/70 leading-relaxed">
                “{r.comments}”
              </blockquote>
              <figcaption className="text-sm text-white/40 mt-4">
                — Report narrative, verbatim from the NOAA Storm Prediction
                Center&apos;s storm reports for {dateLabel(r.date)}.
              </figcaption>
            </figure>
          ) : null}

          <div className="mt-8 max-w-3xl space-y-4 text-white/60 leading-relaxed text-sm md:text-base">
            <h3 className="font-semibold text-white/90 text-lg">What this page is — and isn&apos;t</h3>
            <p>
              Storm reports are the weather service&apos;s raw incoming
              accounts during an event: spotters, law enforcement, emergency
              managers, media and residents describing what they saw. SPC
              collects and publishes them the same day. They are{" "}
              <strong className="text-white/85">not verified</strong> — a
              report can describe damage that a survey later attributes to
              straight-line winds, and the hardest-hit tornadoes sometimes
              appear in the file as a single terse line.
            </p>
            <p>
              Confirmation and any EF rating come only from a National
              Weather Service damage survey, usually days later, published
              by the local NWS office — not by SPC and not by this page.
              Where a report&apos;s own narrative mentions survey findings,
              that text is SPC&apos;s, quoted verbatim above.
            </p>
          </div>
        </div>

        <div className="mt-14 rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 text-center">
          <h2 className="text-xl md:text-2xl font-bold">Tornadoes, live and reported</h2>
          <p className="text-white/55 mt-2 mb-6">
            Active NWS warnings and watches, plus the last three days of reports.
          </p>
          <Link
            href="/tornado-tracker"
            className="inline-block px-6 py-3 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Open the tornado tracker
          </Link>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
