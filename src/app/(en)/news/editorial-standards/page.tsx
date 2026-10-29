import Link from "next/link";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import { ArrowLeft } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import { NEWS_AUTHOR } from "@/lib/news";

export const metadata = {
  title: "How WorldEye News Reports — Editorial Standards",
  description:
    "How WorldEye News reporting works: original reporting from the WorldEye public camera network and cited primary sources, a named author, honest dates, a corrections policy — and what we never do.",
  alternates: { canonical: "/news/editorial-standards" },
  openGraph: {
    title: "How WorldEye News Reports — Editorial Standards",
    description:
      "Original reporting from the public camera network and cited primary sources, with a named byline and a corrections policy.",
    url: "/news/editorial-standards",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "How WorldEye News Reports — Editorial Standards",
  description:
    "The editorial standards of WorldEye News: sourcing, verification, dates, corrections and attribution.",
  url: "https://worldeye.app/news/editorial-standards",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
};

const SECTIONS: { heading: string; body: string[] }[] = [
  {
    heading: "What WorldEye News is",
    body: [
      "WorldEye News is the news desk of WorldEye, the live public-camera globe at worldeye.app. It publishes original reporting on the subjects the site itself watches: the public camera network, significant weather events, satellite and geospatial technology, transportation, and the tools people use to see the world in real time.",
      "News stories are kept separate from the WorldEye Blog's evergreen guides and explainers. A story is published as news only when it reports something that happened or is scheduled to happen — an opening, an event, a change — and it is flagged as news in our publishing system, which is what places it on the /news page, in the news feed and in the news sitemap.",
    ],
  },
  {
    heading: "How our reporting works",
    body: [
      "Our primary instrument is WorldEye's own network: more than 74,000 public cameras, live flight, satellite, weather and hazard feeds, and the datasets the site publishes openly (including the Live Camera Index and the monthly camera-network reports). When a WorldEye News story states a number, it comes from that network's data or from a cited primary source — a government agency, a resort, an operator — never from another outlet's reporting.",
      "The primary sources our reporting and trackers rely on include the U.S. Geological Survey (earthquakes), NOAA and the National Weather Service (weather and storm data), the National Hurricane Center, the NOAA Storm Prediction Center (tornado reports), state departments of transportation (road cameras and conditions), and resort announcements compiled by OnTheSnow (ski opening dates). Every news story ends with a Sources list naming what its claims rest on.",
    ],
  },
  {
    heading: "Verification and honest labels",
    body: [
      "Claims are checked against the source before publication, and anything that has not happened yet is labelled as what it is: a projection, a forecast or an announced target, with its source and the date it was reported. Opening dates move with the weather; eruption windows are forecasts, not schedules; camera counts are counted from the catalogue, not estimated.",
      "Publication dates are real. A story's date is the day it was published, updates change its modification date, and stories are never backdated or re-dated to look fresher than they are. For the same reason, our news sitemap lists a story only while it is genuinely new — within 48 hours of publication, the window Google News specifies.",
    ],
  },
  {
    heading: "Corrections",
    body: [
      "If a story is wrong, we fix the story — not the date. Corrections are made in place, the modification date is updated, and a material correction is noted on the story itself. To report an error, contact us via the contact page and name the story; corrections from readers are checked against the same primary sources the story cites.",
    ],
  },
  {
    heading: "What we never do",
    body: [
      "We do not republish wire copy or other outlets' reporting. We do not fabricate events, sources, quotes, authors or dates. We do not publish press-release rewrites as reporting, and we do not present generated text as eyewitness fact — when a story describes what a camera shows, a person has looked at the camera.",
    ],
  },
  {
    heading: "Who writes it, and discovery",
    body: [
      "Every WorldEye News story carries a named human byline. The publication's author is Jameson Lythgoe, WorldEye's founder and publisher — there is no anonymous 'staff' byline on news stories.",
      "WorldEye News is published on the open web with NewsArticle structured data, a news sitemap and an RSS feed, in line with the technical guidelines of Google News and Bing News. Inclusion in those services is decided by Google and Microsoft respectively and is never guaranteed; meeting the technical bar is our job, the decision is theirs.",
    ],
  },
];

export default function EditorialStandardsPage() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100">
      <JsonLd data={jsonLd} />
      <article className="max-w-3xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/news" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to news
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link><span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">NEWS</span>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>
        <BreadcrumbLd trail={[{ label: "News", href: "/news" }, { label: "Editorial standards" }]} />

        <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
          How WorldEye News reports
        </h1>
        <p className="text-white/55 leading-relaxed mt-5 text-[17px]">
          The short version: original reporting, named author, cited sources,
          real dates. The long version is this page.
        </p>

        <div className="mt-10 space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="text-2xl font-bold tracking-tight mb-4">
                <span className="text-[#D4AF37]">▸</span> {s.heading}
              </h2>
              <div className="space-y-4">
                {s.body.map((para, i) => (
                  <p key={i} className="text-white/65 leading-relaxed text-[17px]">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-14 rounded-3xl border border-white/10 bg-white/[0.02] p-8">
          <h2 className="text-xl font-bold">About the author</h2>
          <p className="text-white/55 leading-relaxed mt-3">
            {NEWS_AUTHOR.bio}
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <Link href={`/news/authors/${NEWS_AUTHOR.slug}`} className="px-4 py-2 rounded-full border border-white/15 text-white/70 hover:bg-white/5 transition">
              Author profile — {NEWS_AUTHOR.name}
            </Link>
            <Link href="/contact" className="px-4 py-2 rounded-full border border-white/15 text-white/70 hover:bg-white/5 transition">
              Contact WorldEye
            </Link>
          </div>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
