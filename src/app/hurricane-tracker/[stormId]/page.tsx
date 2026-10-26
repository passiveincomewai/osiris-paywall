import type { Metadata } from "next";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Globe } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import { getStormFeatures } from "@/lib/events/hurricanes-data";
import {
  classificationLabel,
  compassDirection,
  findStormGroup,
  groupStormFeatures,
  ktToMph,
  saffirSimpsonCategory,
  type StormGroup,
} from "@/lib/events/hurricanes";

/**
 * One active tropical cyclone, as its own page. Reads the exact NHC
 * pipeline the globe uses (lib/events/hurricanes-data — CurrentStorms +
 * MapServer, cached 10 min), so this page and the map never disagree.
 * NHC only publishes active storms: when a storm dissipates, this page
 * honestly stops existing (404) rather than freezing stale numbers.
 */
export const revalidate = 300;

const BASE = "https://worldeye.app";

async function loadStorm(stormId: string): Promise<StormGroup | null> {
  const features = await getStormFeatures().catch(() => null);
  if (!features) return null;
  return findStormGroup(groupStormFeatures(features as any[]), stormId);
}

function titleFor(g: StormGroup): string {
  return `${classificationLabel(g.current.classification)} ${g.current.name}`;
}

function descriptionFor(g: StormGroup): string {
  const c = g.current;
  const parts = [
    `${titleFor(g)} — live position, sustained winds and NHC forecast, tracked on WorldEye.`,
  ];
  if (c.intensityKt !== null) {
    parts.push(`Sustained winds ${c.intensityKt} kt (${ktToMph(c.intensityKt)} mph).`);
  }
  if (c.pressureMb !== null) parts.push(`Central pressure ${c.pressureMb} mb.`);
  parts.push("Data: NOAA National Hurricane Center.");
  return parts.join(" ");
}

/** Category + where the number came from, so the label is honest. */
function categoryInfo(g: StormGroup): { value: number; nhcPublished: boolean } | null {
  const analysis = g.points.find((p) => p.fcstHrs === 0 && p.category !== null);
  if (analysis?.category) return { value: analysis.category, nhcPublished: true };
  if (g.current.classification.trim().toUpperCase() === "HU") {
    const derived = saffirSimpsonCategory(g.current.intensityKt);
    if (derived) return { value: derived, nhcPublished: false };
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stormId: string }>;
}): Promise<Metadata> {
  const { stormId } = await params;
  const g = await loadStorm(stormId);
  if (!g) {
    return {
      title: "Storm | WorldEye",
      alternates: { canonical: `/hurricane-tracker/${stormId}` },
    };
  }
  const title = `${titleFor(g)} — live position, winds & forecast | WorldEye`;
  const description = descriptionFor(g);
  return {
    title,
    description,
    alternates: { canonical: `/hurricane-tracker/${g.current.stormId}` },
    openGraph: {
      title,
      description,
      url: `/hurricane-tracker/${g.current.stormId}`,
      type: "article",
    },
  };
}

export default async function HurricaneStormPage({
  params,
}: {
  params: Promise<{ stormId: string }>;
}) {
  const { stormId } = await params;
  const g = await loadStorm(stormId);
  if (!g) notFound();

  const c = g.current;
  const cat = categoryInfo(g);
  const dir = compassDirection(c.movementDir);
  const coordLabel = `${Math.abs(c.lat).toFixed(2)}°${c.lat >= 0 ? "N" : "S"}, ${Math.abs(c.lng).toFixed(2)}°${c.lng >= 0 ? "E" : "W"}`;

  const facts: Array<{ label: string; value: string }> = [
    { label: "Classification", value: classificationLabel(c.classification) },
    ...(cat
      ? [
          {
            label: "Category (Saffir–Simpson)",
            value: cat.nhcPublished
              ? `Category ${cat.value} (NHC)`
              : `Category ${cat.value} (from sustained winds)`,
          },
        ]
      : []),
    ...(c.intensityKt !== null
      ? [
          {
            label: "Sustained winds",
            value: `${c.intensityKt} kt · ${ktToMph(c.intensityKt)} mph`,
          },
        ]
      : []),
    ...(c.pressureMb !== null
      ? [{ label: "Central pressure", value: `${c.pressureMb} mb` }]
      : []),
    ...(dir
      ? [
          {
            label: "Movement",
            value: `Toward ${dir}${c.movementSpeedKt !== null ? ` at ${c.movementSpeedKt} kt (${ktToMph(c.movementSpeedKt)} mph)` : ""}`,
          },
        ]
      : []),
    { label: "Position", value: coordLabel },
    ...(c.lastUpdate ? [{ label: "NHC last update", value: c.lastUpdate }] : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: titleFor(g),
        description: descriptionFor(g),
        url: `${BASE}/hurricane-tracker/${c.stormId}`,
        isPartOf: { "@type": "WebSite", name: "WorldEye", url: BASE },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "WorldEye", item: BASE },
          {
            "@type": "ListItem",
            position: 2,
            name: "Hurricane tracker",
            item: `${BASE}/hurricane-tracker`,
          },
          { "@type": "ListItem", position: 3, name: titleFor(g) },
        ],
      },
    ],
  };

  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100 relative overflow-x-clip">
      <JsonLd data={jsonLd} />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-15 blur-[120px] bg-[#0ea5e9]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-10 md:py-16">
        <div className="flex items-center justify-between mb-12">
          <Link
            href="/hurricane-tracker"
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Hurricane tracker
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>

        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-sky-300 border border-sky-400/30 rounded-full px-4 py-1.5 mb-6">
            ACTIVE STORM · NHC {c.stormId.toUpperCase()}
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            {titleFor(g)}
            {cat ? <span className="text-red-300"> — Category {cat.value}</span> : null}
          </h1>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            {descriptionFor(g)}
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <a
              href={`/?storm=${encodeURIComponent(c.stormId)}`}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              <Globe className="w-4 h-4" /> Track it on the globe
            </a>
            <a
              href="https://www.nhc.noaa.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-white/15 text-white/80 font-semibold hover:bg-white/5 transition"
            >
              NOAA National Hurricane Center <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          <p className="mt-4 text-sm text-white/40">
            Official watches, warnings and evacuation guidance come from NHC
            and your local emergency management — never from this page.
          </p>
        </div>

        <div className="mt-14">
          <h2 className="text-2xl font-bold mb-6">
            The storm, <span className="text-[#D4AF37]">as NHC published it</span>
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
        </div>

        <div className="mt-14">
          <h2 className="text-2xl font-bold mb-6">
            NHC forecast <span className="text-[#D4AF37]">points</span>
          </h2>
          {g.points.length > 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/40 border-b border-white/10">
                    <th className="px-5 py-3 font-medium">Valid</th>
                    <th className="px-5 py-3 font-medium">Forecast hour</th>
                    <th className="px-5 py-3 font-medium">Max winds</th>
                    <th className="px-5 py-3 font-medium">Gusts</th>
                    <th className="px-5 py-3 font-medium">Pressure</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {g.points.map((p, i) => (
                    <tr key={i} className="border-b border-white/5 text-white/70">
                      <td className="px-5 py-3 text-white/90">{p.validLabel || "—"}</td>
                      <td className="px-5 py-3">{p.fcstHrs !== null ? `+${p.fcstHrs} h` : "—"}</td>
                      <td className="px-5 py-3">
                        {p.maxWindKt !== null ? `${p.maxWindKt} kt (${ktToMph(p.maxWindKt)} mph)` : "—"}
                      </td>
                      <td className="px-5 py-3">{p.gustKt !== null ? `${p.gustKt} kt` : "—"}</td>
                      <td className="px-5 py-3">{p.pressureMb !== null ? `${p.pressureMb} mb` : "—"}</td>
                      <td className="px-5 py-3">
                        {p.category !== null && p.category > 0 ? `Category ${p.category}` : p.stormType || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-white/50 text-sm leading-relaxed max-w-3xl">
              NHC&apos;s GIS forecast points aren&apos;t available for this
              storm at the moment — the globe still shows its current
              position and official track.
            </p>
          )}
          <p className="mt-5 text-sm text-white/40 leading-relaxed max-w-3xl">
            {g.hasCone || g.hasTrack
              ? "The official forecast cone and track line for this storm are drawn on the globe — open it with the button above. "
              : ""}
            Forecast data: NOAA National Hurricane Center, via the same feed
            the WorldEye globe draws from. NHC issues advisories on its own
            schedule (typically every six hours, more often near landfall);
            this page follows those updates automatically.
          </p>
        </div>

        <div className="mt-14 rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-8 text-center">
          <h2 className="text-xl md:text-2xl font-bold">Every active storm, live</h2>
          <p className="text-white/55 mt-2 mb-6">
            All tropical cyclones NHC is tracking, on one page and one globe.
          </p>
          <Link
            href="/hurricane-tracker"
            className="inline-block px-6 py-3 rounded-2xl bg-[#D4AF37] text-black font-bold hover:brightness-110 transition"
          >
            Open the hurricane tracker
          </Link>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
