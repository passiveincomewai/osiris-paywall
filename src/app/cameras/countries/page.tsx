import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Camera, Globe, MapPin } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import data from "@/data/camera-directory.json";

export const metadata: Metadata = {
  title: "Live Street Cameras by Country — 105 Countries",
  description:
    "Browse live street cameras across 105 countries — 74,229 public webcam feeds mapped by nation and region. Find your country and start watching.",
  alternates: { canonical: "https://worldeye.app/cameras/countries" },
  openGraph: {
    title: "Live Street Cameras by Country — 105 Countries | WorldEye",
    description:
      "74,229 live street cameras across 105 countries, mapped by nation and region. Find your country and start watching.",
    url: "https://worldeye.app/cameras/countries",
    type: "website",
  },
};

const TOP_30_SLUGS = new Set([
  "united-states", "taiwan", "spain", "austria", "canada", "hong-kong",
  "italy", "japan", "united-kingdom", "sweden", "finland", "iceland",
  "lithuania", "netherlands", "australia", "new-zealand", "turkey",
  "indonesia", "vietnam", "russia", "south-korea", "poland", "thailand",
  "norway", "malta", "france", "romania", "brazil", "bulgaria", "croatia",
]);

const fmt = (n: number) => n.toLocaleString("en-US");
const generatedDate = new Date(data.generatedAt).toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
const largest = data.countries[0];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Live Street Cameras by Country — 105 Countries",
  description:
    "A directory of 74,229 live public street cameras across 105 countries, with per-country camera counts and top regions.",
  url: "https://worldeye.app/cameras/countries",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  numberOfItems: data.countries.length,
  dateModified: data.generatedAt,
};

export default function CameraCountriesPage() {
  return (
    <main className="docs-root min-h-screen bg-[#05070d] text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-6xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-10">
          <Link href="/cameras" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to Cameras
          </Link>
          <span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">WORLDEYE</span>
        </div>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-white/40 mb-8">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="hover:text-white transition">Home</Link></li>
            <li aria-hidden="true">›</li>
            <li><Link href="/cameras" className="hover:text-white transition">Cameras</Link></li>
            <li aria-hidden="true">›</li>
            <li aria-current="page" className="text-white/70">Countries</li>
          </ol>
        </nav>

        {/* Hero */}
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#D4AF37] border border-[#D4AF37]/30 rounded-full px-4 py-1.5 mb-6">
            <Camera className="w-3.5 h-3.5" /> CAMERA DIRECTORY
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Live Street Cameras <span className="text-[#D4AF37]">by Country</span>
          </h1>
          <p className="text-white/55 mt-5 text-base md:text-lg leading-relaxed">
            WorldEye collects {fmt(data.totalCameras)} publicly available live street
            cameras from {data.countries.length} countries into one directory. Every entry
            below is a camera that its operator — a transport agency, city, resort or
            business — already publishes openly on the web. Pick a country to see where
            its cameras cluster, then jump straight to the live map to watch them.
          </p>
        </div>

        {/* Stat cards */}
        <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <Camera className="w-5 h-5 text-[#D4AF37] mb-3" />
            <p className="text-2xl md:text-3xl font-bold">{fmt(data.totalCameras)}</p>
            <p className="text-sm text-white/45 mt-1">Total live cameras</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <Globe className="w-5 h-5 text-[#D4AF37] mb-3" />
            <p className="text-2xl md:text-3xl font-bold">{data.countries.length}</p>
            <p className="text-sm text-white/45 mt-1">Countries covered</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <MapPin className="w-5 h-5 text-[#D4AF37] mb-3" />
            <p className="text-2xl md:text-3xl font-bold">{fmt(largest.count)}</p>
            <p className="text-sm text-white/45 mt-1">Cameras in {largest.name}, the largest</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <p className="w-5 h-5 mb-3 text-[#D4AF37] font-bold text-lg">↻</p>
            <p className="text-lg md:text-xl font-bold">{generatedDate}</p>
            <p className="text-sm text-white/45 mt-1">Directory last updated</p>
          </div>
        </div>

        {/* Full table */}
        <div className="mt-14">
          <h2 className="text-2xl md:text-3xl font-bold">
            All {data.countries.length} countries
          </h2>
          <p className="text-white/50 mt-2 max-w-2xl text-sm md:text-base">
            Sorted by camera count. The 30 busiest countries have dedicated pages with
            regional breakdowns — the rest are listed with their busiest area.
          </p>
          <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm md:text-base">
              <thead>
                <tr className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-white/45">
                  <th scope="col" className="px-4 md:px-6 py-4 font-semibold">#</th>
                  <th scope="col" className="px-4 md:px-6 py-4 font-semibold">Country</th>
                  <th scope="col" className="px-4 md:px-6 py-4 font-semibold text-right">Cameras</th>
                  <th scope="col" className="px-4 md:px-6 py-4 font-semibold hidden sm:table-cell">Top area</th>
                </tr>
              </thead>
              <tbody>
                {data.countries.map((c, i) => {
                  const linked = TOP_30_SLUGS.has(c.slug);
                  return (
                    <tr
                      key={c.slug}
                      className="border-t border-white/[0.06] hover:bg-white/[0.03] transition"
                    >
                      <td className="px-4 md:px-6 py-3.5 text-white/35 tabular-nums">{i + 1}</td>
                      <td className="px-4 md:px-6 py-3.5 font-medium">
                        {linked ? (
                          <Link
                            href={`/cameras/countries/${c.slug}`}
                            className="text-[#D4AF37] hover:underline"
                          >
                            {c.name}
                          </Link>
                        ) : (
                          <span className="text-white/85">{c.name}</span>
                        )}
                      </td>
                      <td className="px-4 md:px-6 py-3.5 text-right tabular-nums text-white/85">
                        {fmt(c.count)}
                      </td>
                      <td className="px-4 md:px-6 py-3.5 text-white/50 hidden sm:table-cell">
                        {c.areas[0]?.name ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold">Camera directory — FAQ</h2>
          <div className="mt-6 space-y-4">
            {[
              {
                q: "Where do these cameras come from?",
                a: "Every camera in the directory is published openly by its operator — transport agencies, cities, resorts, and businesses. WorldEye collects the public feeds into one index and plots them on the map; it does not operate its own camera network.",
              },
              {
                q: "Why do some countries have thousands of cameras and others only a few?",
                a: "It reflects what is published openly. Countries whose transport agencies publish dense highway camera networks (the US, Taiwan, the UK) dominate the counts; countries without open camera programs have whatever their cities and businesses publish.",
              },
              {
                q: "Which countries have dedicated pages?",
                a: "The 30 busiest countries each have a dedicated page with regional breakdowns, camera counts by area, and viewing tips — they are linked from the table above. The rest are listed with their busiest area.",
              },
              {
                q: "How often is the directory updated?",
                a: "The index regenerates automatically — the 'last updated' date above shows the latest build. New public feeds are picked up as their operators publish them, and dead feeds drop out.",
              },
              {
                q: "Are the cameras really live?",
                a: "The directory indexes live public feeds. Individual cameras can go offline for maintenance or be replaced by their operators, so a specific feed may occasionally be dark — but coverage is broad enough that alternatives are usually nearby.",
              },
              {
                q: "Is it free to watch?",
                a: "Yes. Every camera in the directory opens free on the WorldEye map — no account, no signup, no paywall.",
              },
            ].map((f) => (
              <details key={f.q} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 group">
                <summary className="font-semibold text-white/90 cursor-pointer list-none flex items-center justify-between gap-4">
                  {f.q}
                  <span className="text-[#D4AF37] group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="text-sm text-white/55 mt-3 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/[0.08] to-transparent p-10 md:p-14">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">
            Find your country. <span className="text-[#D4AF37]">Watch it live.</span>
          </h2>
          <p className="text-white/55 mt-4 max-w-xl mx-auto">
            The full network is plotted on the WorldEye globe — free to browse, no
            account needed.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-b from-[#e8c55a] to-[#D4AF37] text-black font-bold text-lg tracking-wide hover:brightness-110 transition shadow-[0_8px_32px_rgba(212,175,55,0.35)]"
            >
              Open the live map <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/cameras"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl border border-white/15 text-white/75 hover:text-white hover:border-white/30 transition font-semibold"
            >
              Camera overview
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
