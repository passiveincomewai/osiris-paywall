import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Globe, Waves } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import {
  fetchQuakeEvent,
  formatQuakeTimeUtc,
  quakeHeadline,
  quakeLocalTimeLabel,
  type QuakeEvent,
} from "@/lib/events/earthquakes";

/**
 * One earthquake, as its own indexable page. Data comes from the USGS
 * FDSN event service (the catalog behind the same summary feed the
 * globe uses), so the page stays valid after the event ages out of the
 * 24-hour feed. Short revalidation: USGS revises early figures as more
 * stations report, and the page should follow those revisions.
 */
export const revalidate = 300;

const BASE = "https://worldeye.app";

function dateLabel(epochMs: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(epochMs));
}

function descriptionFor(q: QuakeEvent): string {
  const parts: string[] = [];
  parts.push(
    `A magnitude ${q.magnitude?.toFixed(1) ?? "—"} earthquake struck ${q.place} on ${dateLabel(q.time)} at ${formatQuakeTimeUtc(q.time)}.`,
  );
  if (q.depthKm !== null) parts.push(`Depth ${Math.round(q.depthKm)} km.`);
  if (q.felt) parts.push(`${q.felt} people reported feeling it.`);
  if (q.tsunami) parts.push("USGS set the tsunami flag for this event.");
  parts.push("Live USGS data, tracked on the WorldEye globe.");
  return parts.join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const q = await fetchQuakeEvent(id).catch(() => null);
  if (!q) {
    return {
      title: "Earthquake | WorldEye",
      alternates: { canonical: `/earthquake-tracker/${id}` },
    };
  }
  const title = `${quakeHeadline(q)} — ${dateLabel(q.time)} | WorldEye`;
  const description = descriptionFor(q);
  return {
    title,
    description,
    alternates: { canonical: `/earthquake-tracker/${q.id}` },
    openGraph: {
      title,
      description,
      url: `/earthquake-tracker/${q.id}`,
      type: "article",
    },
  };
}

interface Fact {
  label: string;
  value: string;
}

function factsFor(q: QuakeEvent): Fact[] {
  const facts: Fact[] = [];
  if (q.magnitude !== null) facts.push({ label: "Magnitude", value: q.magnitude.toFixed(1) });
  if (q.depthKm !== null) facts.push({ label: "Depth", value: `${Math.round(q.depthKm)} km` });
  facts.push({ label: "Time (UTC)", value: formatQuakeTimeUtc(q.time) });
  const local = quakeLocalTimeLabel(q);
  if (local) facts.push({ label: "Local time at epicenter", value: local });
  facts.push({
    label: "Epicenter",
    value: `${Math.abs(q.lat).toFixed(3)}°${q.lat >= 0 ? "N" : "S"}, ${Math.abs(q.lng).toFixed(3)}°${q.lng >= 0 ? "E" : "W"}`,
  });
  facts.push({ label: "Tsunami flag (USGS)", value: q.tsunami ? "Set" : "Not set" });
  if (q.felt !== null) facts.push({ label: "Felt reports", value: String(q.felt) });
  if (q.cdi !== null) facts.push({ label: "Felt intensity (CDI)", value: q.cdi.toFixed(1) });
  if (q.mmi !== null) facts.push({ label: "Instrumental intensity (MMI)", value: q.mmi.toFixed(1) });
  if (q.alert) facts.push({ label: "USGS PAGER alert", value: q.alert.toUpperCase() });
  if (q.sig !== null) facts.push({ label: "Significance (USGS)", value: String(q.sig) });
  if (q.status) facts.push({ label: "Status", value: q.status });
  if (q.type) facts.push({ label: "Event type", value: q.type });
  return facts;
}

export default async function EarthquakeEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const q = await fetchQuakeEvent(id).catch(() => null);
  if (!q) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: quakeHeadline(q),
        description: descriptionFor(q),
        url: `${BASE}/earthquake-tracker/${q.id}`,
        isPartOf: { "@type": "WebSite", name: "WorldEye", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "WorldEye", item: BASE },
          {
            "@type": "ListItem",
            position: 2,
            name: "Earthquake tracker",
            item: `${BASE}/earthquake-tracker`,
          },
          { "@type": "ListItem", position: 3, name: quakeHeadline(q) },
        ],
      },
    ],
  };

  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#ff6b35]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/earthquake-tracker"
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Earthquake tracker
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#ff8c5a] border border-[#ff8c5a]/30 rounded-full px-4 py-1.5 mb-6">
            EARTHQUAKE · {dateLabel(q.time).toUpperCase()}
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            {quakeHeadline(q)}
          </h1>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            {descriptionFor(q)}
          </p>
          {q.tsunami ? (
            <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-sky-300 border border-sky-400/30 bg-sky-500/10 rounded-2xl px-4 py-2.5">
              <Waves className="w-4 h-4" /> USGS set the tsunami flag for this
              event. For official tsunami warnings, follow your national
              tsunami warning center.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3 mt-8">
            <a
              href={`/?quake=${encodeURIComponent(q.id)}`}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              <Globe className="w-4 h-4" /> View on the globe
            </a>
            {q.url ? (
              <a
                href={q.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-white/15 text-white/80 font-semibold hover:bg-white/5 transition"
              >
                USGS event page <ExternalLink className="w-4 h-4" />
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-14">
          <h2 className="text-2xl font-bold mb-6">
            The numbers, <span className="text-[#D4AF37]">as USGS published them</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {factsFor(q).map((f) => (
              <div key={f.label} className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
                <p className="text-[11px] font-mono tracking-[0.2em] text-white/40 mb-1.5">
                  {f.label.toUpperCase()}
                </p>
                <p className="font-semibold text-white/90">{f.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-white/40 leading-relaxed max-w-3xl">
            Early earthquake figures are revised as more seismic stations
            report — magnitude, depth and even location can shift in the
            first hours. This page re-reads the USGS record every few
            minutes so it tracks the current published figures. Data: U.S.
            Geological Survey (USGS). WorldEye is a window onto that data,
            not an alert system — for safety guidance during an event,
            follow your local geological agency and emergency services.
          </p>
        </div>

        <div className="mt-14 rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 text-center">
          <h2 className="text-xl md:text-2xl font-bold">More earthquakes, live</h2>
          <p className="text-white/55 mt-2 mb-6">
            Every significant quake worldwide, updated the moment USGS publishes it.
          </p>
          <Link
            href="/earthquake-tracker"
            className="inline-block px-6 py-3 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Open the earthquake tracker
          </Link>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
