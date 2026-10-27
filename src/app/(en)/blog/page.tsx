import Link from "next/link";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import { ArrowLeft, ArrowRight, CalendarDays, Rss } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import { POSTS } from "./posts";

export const metadata = {
  title: "WorldEye Blog",
  description:
    "Guides and explainers from the WorldEye team: OSINT basics, live flight tracking, the public camera network, and how to read the world in real time.",
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "/blog/feed.xml" },
  },
  openGraph: {
    title: "WorldEye Blog",
    description:
      "Guides and explainers on OSINT, flight tracking and the public camera network — the skills behind the map.",
    url: "/blog",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "WorldEye Blog",
  description:
    "Guides and explainers from the WorldEye team: OSINT basics, live flight tracking, the public camera network, and how to read the world in real time.",
  url: "https://worldeye.app/blog",
  isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  blogPost: POSTS.map((p) => ({
    "@type": "BlogPosting",
    headline: p.title,
    description: p.seoDescription,
    url: `https://worldeye.app/blog/${p.slug}`,
    datePublished: p.date,
    dateModified: p.updated ?? p.date,
    author: { "@type": "Organization", name: "WorldEye Team", url: "https://worldeye.app/about" },
  })),
};

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndex() {
  return (
    <main className="docs-root min-h-screen bg-[#050508] text-zinc-100">
      <JsonLd data={jsonLd} />
      <div className="max-w-5xl mx-auto px-6 py-10 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> Back to the map
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="WorldEye — back to the live globe" className="shrink-0 inline-flex items-center"><img src="/worldeye-header-logo.png" alt="WorldEye" width={1063} height={290} className="h-6 w-auto" /></Link><span className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37]">BLOG</span>
            <LanguageHeaderControl variant="mobile" />
          </div>
        </div>
        <BreadcrumbLd trail={[{ label: "Blog" }]} />

        {/* Hero */}
        <div className="max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Read the world <span className="text-[#D4AF37]">in real time.</span>
          </h1>
          <p className="text-white/55 mt-4 text-base md:text-lg leading-relaxed">
            Guides and explainers on open-source intelligence, flight tracking,
            and the public camera network — the skills behind the map.
          </p>
          <a
            href="/blog/feed.xml"
            className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-[#D4AF37] hover:brightness-125 transition"
          >
            <Rss className="w-4 h-4" /> Subscribe via RSS
          </a>
        </div>

        {/* Post grid */}
        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {POSTS.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group rounded-3xl border border-white/10 bg-white/[0.02] hover:border-[#D4AF37]/40 hover:bg-white/[0.04] transition p-7 flex flex-col"
            >
              <div className="flex items-center gap-2 text-xs text-white/40 mb-4">
                <CalendarDays className="w-3.5 h-3.5" />
                <time dateTime={post.date}>{formatDate(post.date)}</time>
              </div>
              <h2 className="text-xl font-bold leading-snug group-hover:text-[#D4AF37] transition">
                {post.title}
              </h2>
              <p className="text-sm text-white/50 mt-3 leading-relaxed flex-1">{post.excerpt}</p>
              <div className="flex flex-wrap gap-2 mt-5">
                {post.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/25"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 group-hover:text-[#D4AF37] transition">
                Read more <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
