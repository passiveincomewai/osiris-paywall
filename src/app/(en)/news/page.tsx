import Link from "next/link";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import { ArrowLeft, ArrowRight, CalendarDays, Rss } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import { POSTS } from "../blog/posts";
import {
  getNewsPosts,
  NEWS_AUTHOR,
  NEWS_DESCRIPTION,
  NEWS_NAME,
  NEWS_URL,
} from "@/lib/news";

export const metadata = {
  title: "WorldEye News",
  description: NEWS_DESCRIPTION,
  alternates: {
    canonical: "/news",
    types: { "application/rss+xml": "/news/feed.xml" },
  },
  openGraph: {
    title: "WorldEye News",
    description: NEWS_DESCRIPTION,
    url: "/news",
    type: "website",
  },
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function NewsIndex() {
  const stories = getNewsPosts(POSTS);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: NEWS_NAME,
    description: NEWS_DESCRIPTION,
    url: NEWS_URL,
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: stories.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://worldeye.app/blog/${p.slug}`,
        name: p.title,
      })),
    },
  };

  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100">
      <JsonLd data={jsonLd} />
      <div className="max-w-5xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the globe
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link><span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">NEWS</span>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>
        <BreadcrumbLd trail={[{ label: "Home", href: "/" }, { label: "News" }]} />

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">WorldEye News</h1>
        <p className="text-white/55 leading-relaxed mt-5 max-w-3xl text-[17px]">
          Original reporting from WorldEye — the public camera network, weather
          events, satellite and geospatial technology, and transportation,
          reported from our own network data and cited primary sources. Every
          story carries a named byline and a sources list. Evergreen guides
          live on the{" "}
          <Link href="/blog" className="text-[#D4AF37] underline decoration-[#D4AF37]/40 underline-offset-4 hover:decoration-[#D4AF37] transition">
            WorldEye Blog
          </Link>
          ; this page is the news desk.
        </p>
        <div className="flex flex-wrap gap-3 mt-6 text-sm">
          <Link href="/news/editorial-standards" className="px-4 py-2 rounded-full border border-white/15 text-white/70 hover:bg-white/5 transition">
            How we report — editorial standards
          </Link>
          <Link href={`/news/authors/${NEWS_AUTHOR.slug}`} className="px-4 py-2 rounded-full border border-white/15 text-white/70 hover:bg-white/5 transition">
            About the author — {NEWS_AUTHOR.name}
          </Link>
          <a href="/news/feed.xml" className="px-4 py-2 rounded-full border border-white/15 text-white/70 hover:bg-white/5 transition inline-flex items-center gap-2">
            <Rss className="w-4 h-4" /> News RSS feed
          </a>
        </div>

        {/* Stories */}
        <div className="mt-14 space-y-5">
          {stories.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 text-white/55 leading-relaxed">
              No news stories have been published yet. When reporting from the
              camera network is published, it will appear here — each story on
              its own page, with its sources cited.
            </div>
          ) : (
            stories.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="block rounded-3xl border border-white/10 bg-white/[0.02] hover:border-[#D4AF37]/40 transition p-6 md:p-8 group"
              >
                <div className="flex flex-wrap gap-2 mb-4">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/25"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug group-hover:text-[#D4AF37] transition">
                  {p.title}
                </h2>
                <p className="text-white/55 leading-relaxed mt-3">{p.excerpt}</p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/40 mt-5">
                  <CalendarDays className="w-4 h-4" />
                  <time dateTime={p.date}>{formatDate(p.date)}</time>
                  <span className="text-white/20">·</span>
                  <span>By {NEWS_AUTHOR.name}</span>
                  <span className="text-white/20">·</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#D4AF37]">
                    Read the story <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
