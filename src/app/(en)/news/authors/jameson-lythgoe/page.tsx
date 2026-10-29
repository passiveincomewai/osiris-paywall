import Link from "next/link";
import LanguageHeaderControl from "@/components/translate/LanguageHeaderControl";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/JsonLd";
import BreadcrumbLd from "@/components/BreadcrumbLd";
import { POSTS } from "../../../blog/posts";
import { getNewsPosts, NEWS_AUTHOR } from "@/lib/news";

export const metadata = {
  title: "Jameson Lythgoe — Founder & Publisher | WorldEye News",
  description:
    "Jameson Lythgoe is the founder and publisher of WorldEye and the author of WorldEye News, the site's original reporting on the public camera network, weather events and geospatial technology.",
  alternates: { canonical: "/news/authors/jameson-lythgoe" },
  openGraph: {
    title: "Jameson Lythgoe — Founder & Publisher, WorldEye",
    description:
      "Author of WorldEye News: original reporting from the WorldEye public camera network and cited primary sources.",
    url: "/news/authors/jameson-lythgoe",
    type: "profile",
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

export default function AuthorPage() {
  const stories = getNewsPosts(POSTS);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: NEWS_AUTHOR.name,
      url: NEWS_AUTHOR.url,
      jobTitle: NEWS_AUTHOR.role,
      description: NEWS_AUTHOR.bio,
      worksFor: {
        "@type": "Organization",
        name: "WorldEye",
        url: "https://worldeye.app",
      },
    },
    isPartOf: { "@type": "WebSite", name: "WorldEye", url: "https://worldeye.app" },
  };

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
        <BreadcrumbLd trail={[{ label: "News", href: "/news" }, { label: NEWS_AUTHOR.name }]} />

        <p className="text-[11px] font-mono tracking-[0.3em] text-[#D4AF37] mb-4">
          {NEWS_AUTHOR.role.toUpperCase()} — WORLDEYE
        </p>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">{NEWS_AUTHOR.name}</h1>
        <p className="text-white/65 leading-relaxed mt-6 text-[17px]">{NEWS_AUTHOR.bio}</p>
        <p className="text-white/65 leading-relaxed mt-4 text-[17px]">
          How his reporting is sourced, verified and corrected is set out in the{" "}
          <Link href="/news/editorial-standards" className="text-[#D4AF37] underline decoration-[#D4AF37]/40 underline-offset-4 hover:decoration-[#D4AF37] transition">
            WorldEye News editorial standards
          </Link>
          . To reach the news desk — a tip, a correction, a question — use the{" "}
          <Link href="/contact" className="text-[#D4AF37] underline decoration-[#D4AF37]/40 underline-offset-4 hover:decoration-[#D4AF37] transition">
            contact page
          </Link>
          .
        </p>

        <h2 className="text-2xl font-bold tracking-tight mt-14 mb-6">
          <span className="text-[#D4AF37]">▸</span> Stories by {NEWS_AUTHOR.name}
        </h2>
        <div className="space-y-5">
          {stories.length === 0 ? (
            <p className="text-white/50 leading-relaxed">
              No news stories have been published under this byline yet.
            </p>
          ) : (
            stories.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="block rounded-3xl border border-white/10 bg-white/[0.02] hover:border-[#D4AF37]/40 transition p-6 group"
              >
                <h3 className="text-xl font-bold tracking-tight leading-snug group-hover:text-[#D4AF37] transition">
                  {p.title}
                </h3>
                <p className="text-white/55 leading-relaxed mt-2 text-[15px]">{p.excerpt}</p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/40 mt-4">
                  <CalendarDays className="w-4 h-4" />
                  <time dateTime={p.date}>{formatDate(p.date)}</time>
                  <span className="text-white/20">·</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#D4AF37]">
                    Read the story <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
